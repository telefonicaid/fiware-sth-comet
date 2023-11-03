/*
 * Copyright 2016 Telefónica Investigación y Desarrollo, S.A.U
 *
 * This file is part of the Short Time Historic (STH) component
 *
 * STH is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * STH is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with STH.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

/* eslint-disable consistent-return */

const ROOT_PATH = require('app-root-path');
const sthLogger = require('logops');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
const boom = require('boom');

/**
 * Returns the total number of attributes to be processed
 * @param  {Object} contextResponses The contextResponses element received in the request
 * @return {number}                  The total number of attributes to be processed
 */
function getTotalAttributes(contextResponses) {
    let totalAttributes = 0;
    for (let l1 = 0; l1 < contextResponses.length; l1++) {
        if (
            contextResponses[l1].contextElement &&
            contextResponses[l1].contextElement.attributes &&
            Array.isArray(contextResponses[l1].contextElement.attributes)
        ) {
            totalAttributes += contextResponses[l1].contextElement.attributes.length;
        }
    }
    return totalAttributes;
}

/**
 * Returns information about the notification once analysed
 * @param  {Object}   data     The received data (it is an object including the following properties:
 *                             - {Object} contextElement The context element
 *                             - {Object} attribute      The attribute
 *                             - {Date}  recvTime        The timestamp of the notification when it reached the server
 * @param  {Function} callback The callback to notify once the function finishes it processing
 * @return {object}            Information about the notification
 */
function getNotificationInfo(data, callback) {
    const request = data.request;
    const contextElement = data.contextElement;
    const attribute = data.attribute;
    const recvTime = data.recvTime;

    const service = request.headers[sthConfig.HEADER.FIWARE_SERVICE];
    const servicePath = request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH];

    // Get the collection
    sthDatabase.getCollection(
        {
            service,
            servicePath,
            entityId: contextElement.id,
            entityType: contextElement.type,
            attrName: attribute.name
        },
        {
            isAggregated: false,
            shouldCreate: false,
            shouldTruncate: false
        },
        function(err, collection) {
            if (err) {
                let result;
                // There was an error when getting the collection, it probably does not exist
                sthLogger.debug(request.sth.context, 'Error when getting the collection: ' + JSON.stringify(err));
                if (err.name === 'MongoError' && err.message.indexOf('does not exist. Currently in strict mode')) {
                    result = { inserts: true };
                    process.nextTick(callback.bind(null, null, result));
                } else {
                    process.nextTick(callback.bind(null, err));
                }
            } else {
                // The collection exists
                sthLogger.debug(request.sth.context, 'The collection exists');

                sthDatabase.getNotificationInfo(
                    {
                        collection,
                        recvTime,
                        entityId: contextElement.id,
                        entityType: contextElement.type,
                        attribute
                    },
                    function(err, result) {
                        if (err) {
                            sthLogger.error(request.sth.context, 'Error when getting the notification info');
                        }
                        process.nextTick(callback.bind(null, err, result));
                    }
                );
            }
        }
    );
}

/**
 * Stores raw data into the database
 * @param {Object}    data     The received data (it is an object including the following properties:
 *                             - {Object} contextElement The context element
 *                             - {Object} attribute      The attribute
 *                             - {Date}   recvTime       The timestamp of the notification when it reached the server
 *                             - {Object} counterObj     A helper counter object. This is needed since Javascript
 *                                                       implements calls by sharing when passing parameters
 *                                                       and the counter is shared between rawAggregatedData() and
 *                                                       storeAggregatedData() functions to let them synchronize
 *                             - {Number} totalTasks     The total number of writings to make
 *  @param {Function} reply    The reply functin provided by the hapi server
 *  @param {Function} callback The callback to notify that the operation has completed with error or successfully
 */
function storeRawData(data, reply, callback) {
    const request = data.request;
    const contextElement = data.contextElement;
    const attribute = data.attribute;
    const recvTime = data.recvTime;
    const notificationInfo = data.notificationInfo;
    const counterObj = data.counterObj;
    const totalTasks = data.totalTasks;
    let response;

    const service = request.headers[sthConfig.HEADER.FIWARE_SERVICE];
    const servicePath = request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH];

    sthLogger.debug(request.sth.context, 'Getting access to the raw data collection for storing...');

    sthDatabase.getCollection(
        {
            service,
            servicePath,
            entityId: contextElement.id,
            entityType: contextElement.type,
            attrName: attribute.name
        },
        {
            isAggregated: false,
            shouldCreate: true,
            shouldTruncate: true
        },
        function(err, collection) {
            if (err) {
                // There was an error when getting the collection
                sthLogger.error(request.sth.context, 'Error when getting the raw data collection for storing:' + err);
                if (++counterObj.counter === totalTasks) {
                    response = reply.response(err);
                    sthServerUtils.addFiwareCorrelator(request, response);
                }
                process.nextTick(callback.bind(null, err));
            } else {
                // The collection exists
                sthLogger.debug(request.sth.context, 'The raw data collection for storing exists');

                if (
                    sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_RAW ||
                    sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH
                ) {
                    sthDatabase.storeRawData(
                        {
                            collection,
                            recvTime,
                            entityId: contextElement.id,
                            entityType: contextElement.type,
                            attribute,
                            notificationInfo
                        },
                        function(err) {
                            if (err) {
                                if (err.code === 11000 && err.message.indexOf('duplicate key error') >= 0) {
                                    sthLogger.debug(request.sth.context, 'Error when storing the raw data: ' + err);
                                } else {
                                    sthLogger.error(request.sth.context, 'Error when storing the raw data: ' + err);
                                }
                            } else {
                                sthLogger.debug(request.sth.context, 'Raw data successfully stored');
                            }
                            if (++counterObj.counter === totalTasks) {
                                response = reply.response(err);
                                sthServerUtils.addFiwareCorrelator(request, response);
                            }
                            process.nextTick(callback.bind(null, err));
                        }
                    );
                } else {
                    process.nextTick(callback);
                }
            }
        }
    );
}

/**
 * Stores aggregated data into the database
 * @param {Object}    data  The received data (it is an object including the following properties:
 *                          - {Object} contextElement The context element
 *                          - {Object} attribute      The attribute
 *                          - {Date}   recvTime       The timestamp of the notification when it reached the server
 *                          - {Object} counterObj     A helper counter object. This is needed since Javascript
 *                                                    implements calls-by-sharing when passing arguments and the counter
 *                                                    is shared between rawAggregatedData() and storeAggregatedData()
 *                                                    functions to let them synchronize
 *                          - {Number} totalTasks The total number of writings to make
 *  @param {Function} reply The hapi() function provided by the hapi server
 */
function storeAggregatedData(data, reply) {
    const request = data.request;
    const contextElement = data.contextElement;
    const attribute = data.attribute;
    const recvTime = data.recvTime;
    const notificationInfo = data.notificationInfo;
    const counterObj = data.counterObj;
    const totalTasks = data.totalTasks;
    let response;

    const service = request.headers[sthConfig.HEADER.FIWARE_SERVICE];
    const servicePath = request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH];

    sthLogger.debug(request.sth.context, 'Getting access to the aggregated data collection for storing...');

    sthDatabase.getCollection(
        {
            service,
            servicePath,
            entityId: contextElement.id,
            entityType: contextElement.type,
            attrName: attribute.name
        },
        {
            isAggregated: true,
            shouldCreate: true,
            shouldTruncate: true
        },
        function(err, collection) {
            if (err) {
                // There was an error when getting the collection
                sthLogger.error(request.sth.context, 'Error when getting the aggregated data collection for storing');
                if (++counterObj.counter === totalTasks) {
                    response = reply.response(err);
                    sthServerUtils.addFiwareCorrelator(request, response);
                }
            } else {
                // The collection exists
                sthLogger.debug(request.sth.context, 'The aggregated data collection for storing exists');

                if (
                    sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_AGGREGATED ||
                    sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH
                ) {
                    sthDatabase.storeAggregatedData(
                        {
                            collection,
                            recvTime,
                            entityId: contextElement.id,
                            entityType: contextElement.type,
                            attribute,
                            notificationInfo
                        },
                        function(err) {
                            if (err) {
                                sthLogger.error(request.sth.context, 'Error when storing the aggregated data');
                            } else {
                                sthLogger.debug(request.sth.context, 'Aggregated data successfully stored');
                            }
                            if (++counterObj.counter === totalTasks) {
                                response = reply.response(err);
                                sthServerUtils.addFiwareCorrelator(request, response);
                            }
                        }
                    );
                }
            }
        }
    );
}

/**
 * Processes each attribute received in a new notification
 * @param {Object} data Data object including the following properties:
 *                      - {Object} request        The request received
 *                      - {Object} contextElement The context element included in the received request
 *                      - {Object} attribute      The attribute to process
 *                      - {Date}   recvTime       The date and time when the notification was received
 *                      - {Object} counterObj     A helper counter object. This is needed since Javascript implements
 *                                                calls-by-sharing when passing arguments and the counter is shared
 *                                                between rawAggregatedData() and storeAggregatedData() functions to let
 *                                                them synchronize
 *                      - {number} totalTasks The total number of writings to make
 * @param {function} hapi's reply function
 */
function processAttribute(data, reply) {
    const attribute = data.attribute;
    let isAggregatableValue = true;
    if (
        !attribute.value ||
        (typeof attribute.value !== 'string' && typeof attribute.value !== 'number') ||
        (sthConfig.IGNORE_BLANK_SPACES && typeof attribute.value === 'string' && attribute.value.trim() === '')
    ) {
        sthLogger.warn(
            data.request.sth.context,
            'Attribute value not aggregatable: ' + JSON.stringify(attribute.value)
        );
        isAggregatableValue = false;
    }

    getNotificationInfo(data, function onNotificationInfo(err, result) {
        data.notificationInfo = result;

        if (!err && !result.exists) {
            // Store the raw data into the database
            storeRawData(data, reply, function(err) {
                if (err) {
                    if (err.code === 11000 && err.message.indexOf('duplicate key error') >= 0) {
                        sthLogger.debug(data.request.sth.context, 'Ignoring the notification since already registered');
                        err = null;
                    }
                    if (++data.counterObj.counter === data.totalTasks) {
                        reply.response(err);
                    }
                } else if (isAggregatableValue) {
                    // Store the aggregated data into the database
                    storeAggregatedData(data, reply);
                } else if (++data.counterObj.counter === data.totalTasks) {
                    reply.response();
                }
            });
        } else {
            if (err) {
                sthLogger.debug(data.request.sth.context, 'Error when getting the notification information: ' + err);
            } else if (result.exists) {
                sthLogger.debug(data.request.sth.context, 'Ignoring the notification since already registered');
            }
            data.counterObj.counter += sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH ? 2 : 1;
            if (data.counterObj.counter === data.totalTasks) {
                reply(err);
            }
        }
    });
}

/**
 * Processes and stores the raw and aggregated data associated to the attribute values received in a
 * notification request
 * @param {Date}     recvTime The time the request was received
 * @param {Object}   request  The received request
 * @param {Function} reply    The reply function provided by the hapi server
 */
function processNotification(recvTime, request, reply) {
    let contextElement;
    let attributes;

    // An object is needed since Javascript implements calls-by-sharing
    //  (see http://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) and the counter is shared between
    //  rawAggregatedData() and storeAggregatedData() functions to let them synchronize
    const counterObj = {
        counter: 0
    };

    const contextResponses = request.payload.contextResponses;

    const totalAttributes = getTotalAttributes(contextResponses);

    const totalTasks =
        sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH ? 2 * totalAttributes : Number(totalAttributes);

    if (totalAttributes === 0) {
        const message = 'At least one attribute with an aggregatable value should be included in the notification';
        sthLogger.warn(
            request.sth.context,
            request.method.toUpperCase() + ' ' + request.url.path + ', error=' + message
        );
        const error = boom.badRequest(message);
        error.output.payload.validation = { source: 'payload', keys: ['attributes'] };
        return reply.response(error);
    }

    for (let i = 0; i < contextResponses.length; i++) {
        if (
            contextResponses[i].contextElement &&
            contextResponses[i].contextElement.attributes &&
            Array.isArray(contextResponses[i].contextElement.attributes)
        ) {
            contextElement = contextResponses[i].contextElement;
            attributes = contextElement.attributes;
            for (let j = 0; j < attributes.length; j++) {
                processAttribute(
                    {
                        request,
                        contextElement,
                        attribute: attributes[j],
                        recvTime,
                        counterObj,
                        totalTasks
                    },
                    reply
                );
            }
        }
    }
}

/**
 * Handler of notification sent by the Context Broker
 * @param {Object}   request The request
 * @param {Function} reply   The reply() function provided by the hapi server
 */
function notificationHandler(request, reply) {
    const recvTime = new Date();

    request.sth = request.sth || {};
    request.sth.context = sthServerUtils.getContext(request);

    sthLogger.debug(
        request.sth.context,
        request.method.toUpperCase() + ' ' + request.url.path + ' with payload: ' + JSON.stringify(request.payload)
    );

    if (request.payload && request.payload.contextResponses && Array.isArray(request.payload.contextResponses)) {
        processNotification(recvTime, request, reply);
    }
}

module.exports = notificationHandler;
