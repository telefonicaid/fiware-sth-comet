/*
 * Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
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

const ROOT_PATH = require('app-root-path');
const sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthUtils = require(ROOT_PATH + '/lib/utils/sthUtils');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const request = require('request');
const expect = require('expect.js');

let events = [];

/**
 * Returns a new random Date in the range defined by the passed dates
 * @param {Date} start The starting date
 * @param {Date} end The ending date
 * @returns {Date} The calculated random date
 */
function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Returns a new raw event
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {Date} recvTime The event timestamp
 * @returns {Object} The created raw event
 */
function createEvent(attrName, attrType, recvTime) {
    let theEvent;
    const attrValue =
        attrType !== 'string'
            ? (
                  Math.random() * (parseFloat(sthTestConfig.MAX_VALUE) - parseFloat(sthTestConfig.MIN_VALUE)) -
                  Math.abs(parseFloat(sthTestConfig.MIN_VALUE))
              ).toFixed(2)
            : 'just a string';
    switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            theEvent = {
                recvTime,
                entityId: sthTestConfig.ENTITY_ID,
                entityType: sthTestConfig.ENTITY_TYPE,
                attrName,
                attrType,
                attrValue
            };
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            theEvent = {
                recvTime,
                attrName,
                attrType,
                attrValue
            };
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            theEvent = {
                recvTime,
                // This property is not really stored for the collections per attribute model.
                //  It is included just to ease its recovery
                attrName,
                attrType,
                attrValue
            };
            break;
    }
    return theEvent;
}

function cleanEvents() {
    events = [];
}

/**
 * Returns the day of the year from a date
 * @param {Date} date The date
 * @returns {number} The day of the year (a number between 1 and 366)
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil(diff / oneDay);
}

/**
 * A mocha test which stores an event to the raw event data collection
 * @param {Object} anEvent The event to store
 * @param {boolean} includeTimeInstantMetadata The test case should include a TimeInstant attribute metadata
 * @param {Function} done The mocha done() callback function
 */
function addEventTest(anEvent, includeTimeInstantMetadata, done) {
    // Check if the collection exists
    sthDatabase.getCollection(
        {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName
        },
        {
            isAggregated: false,
            shouldCreate: true,
            shouldTruncate: true
        },
        function(err, collection) {
            if (err) {
                done(err);
            } else if (includeTimeInstantMetadata) {
                sthDatabase.storeRawData(
                    {
                        collection,
                        recvTime: null,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attribute: {
                            name: anEvent.attrName,
                            type: anEvent.attrType,
                            value: anEvent.attrValue,
                            metadatas: [
                                {
                                    name: 'TimeInstant',
                                    type: 'ISO8601',
                                    value: anEvent.recvTime
                                }
                            ]
                        },
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    done
                );
            } else {
                sthDatabase.storeRawData(
                    {
                        collection,
                        recvTime: anEvent.recvTime,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attribute: {
                            name: anEvent.attrName,
                            type: anEvent.attrType,
                            value: anEvent.attrValue
                        },
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    done
                );
            }
        }
    );
}

/**
 * A mocha test which adds aggregated data to the aggregated data collection
 *  for an event based on a resolution
 * @param {Object} anEvent The event
 * @param {Function} done The mocha done() callback function
 */
function addAggregatedDataTest(anEvent, done) {
    let counter = 0;
    const callback = function(err) {
        if (err) {
            done(err);
        }
        if (++counter === 5) {
            done();
        }
    };
    // Check if the collection exists
    sthDatabase.getCollection(
        {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName
        },
        {
            isAggregated: true,
            shouldCreate: true,
            shouldTruncate: true
        },
        function(err, collection) {
            if (err) {
                done(err);
            } else {
                sthDatabase.storeAggregatedData4Resolution(
                    {
                        collection,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attrName: anEvent.attrName,
                        attrType: anEvent.attrType,
                        attrValue: anEvent.attrValue,
                        resolution: sthConfig.RESOLUTION.SECOND,
                        timestamp: anEvent.recvTime,
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    callback
                );
                sthDatabase.storeAggregatedData4Resolution(
                    {
                        collection,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attrName: anEvent.attrName,
                        attrType: anEvent.attrType,
                        attrValue: anEvent.attrValue,
                        resolution: sthConfig.RESOLUTION.MINUTE,
                        timestamp: anEvent.recvTime,
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    callback
                );
                sthDatabase.storeAggregatedData4Resolution(
                    {
                        collection,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attrName: anEvent.attrName,
                        attrType: anEvent.attrType,
                        attrValue: anEvent.attrValue,
                        resolution: sthConfig.RESOLUTION.HOUR,
                        timestamp: anEvent.recvTime,
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    callback
                );
                sthDatabase.storeAggregatedData4Resolution(
                    {
                        collection,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attrName: anEvent.attrName,
                        attrType: anEvent.attrType,
                        attrValue: anEvent.attrValue,
                        resolution: sthConfig.RESOLUTION.DAY,
                        timestamp: anEvent.recvTime,
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    callback
                );
                sthDatabase.storeAggregatedData4Resolution(
                    {
                        collection,
                        entityId: sthTestConfig.ENTITY_ID,
                        entityType: sthTestConfig.ENTITY_TYPE,
                        attrName: anEvent.attrName,
                        attrType: anEvent.attrType,
                        attrValue: anEvent.attrValue,
                        resolution: sthConfig.RESOLUTION.MONTH,
                        timestamp: anEvent.recvTime,
                        notificationInfo: {
                            inserts: true
                        }
                    },
                    callback
                );
            }
        }
    );
}

/**
 * A mocha test suite to be run for each new raw event
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The test case should include a TimeInstant metadata
 */
function eachEventTestSuite(attrName, attrType, includeTimeInstantMetadata) {
    let anEvent;

    before(function() {
        if (events.length === sthTestConfig.SAMPLES) {
            cleanEvents();
        }
        anEvent =
            events[0] ||
            createEvent(attrName, attrType, getRandomDate(sthTestConfig.START_DATE, sthTestConfig.END_DATE));
        events.push(anEvent);
        /* eslint-disable-next-line no-console */
        console.log('New event: %s', JSON.stringify(anEvent));
    });

    it('should store the single event', function(done) {
        addEventTest(anEvent, includeTimeInstantMetadata, done);
    });

    it('should store aggregated data for each resolution', function(done) {
        addAggregatedDataTest(anEvent, done);
    });
}

/**
 * A mocha test to drop the raw event data collection from the database
 * @param {Function} done The mocha done() callback function
 */
function dropRawEventCollectionTest(done) {
    const collectionName4Events = sthDatabaseNaming.getRawCollectionName({
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        entityId: sthTestConfig.ENTITY_ID,
        entityType: sthTestConfig.ENTITY_TYPE,
        attrName: sthTestConfig.ATTRIBUTE_NAME
    });
    /* eslint-disable-next-line no-console */
    console.log(collectionName4Events);
    sthDatabase.connection.dropCollection(collectionName4Events, function(err) {
        if (err && err.message === 'ns not found') {
            err = null;
        }
        return done(err);
    });
}

/**
 * A mocha test to drop the aggregated data collection from the database
 * @param {Function} done The mocha done() callback function
 */
function dropAggregatedDataCollectionTest(done) {
    const collectionName4Aggregated = sthDatabaseNaming.getAggregatedCollectionName({
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        entityId: sthTestConfig.ENTITY_ID,
        entityType: sthTestConfig.ENTITY_TYPE,
        attrName: sthTestConfig.ATTRIBUTE_NAME
    });
    sthDatabase.connection.dropCollection(collectionName4Aggregated, function(err) {
        if (err && err.message === 'ns not found') {
            err = null;
        }
        return done(err);
    });
}

/**
 * Returns an URL based on certain criteria passed as arguments
 * @param {string} type The type of operation
 * @param {Object} options The options to apply when generating the
 *  URL (possible keys are 'invalidPath', 'changeEntityCase', and an entry for each one of the accepted
 *  query params ('lastN', 'hLimit', 'hOffset', aggrMethod', 'aggrPeriod', 'dateFrom' and 'dateTo')
 *  @param {string} attrName The attribute name
 * @returns {string}
 */
function getURL(type, options, attrName) {
    let url = 'http://' + sthConfig.STH_HOST + ':' + sthConfig.STH_PORT;
    let isParams = false;

    function getQuerySeparator() {
        let separator;
        if (!isParams) {
            separator = '?';
            isParams = true;
        } else {
            separator = '&';
        }
        return separator;
    }

    switch (type) {
        case sthTestConfig.API_OPERATION.READ:
            if (options && options.invalidPath) {
                url += '/STH/v1/this/is/an/invalid/path';
            } else {
                url +=
                    '/STH/v1/contextEntities/type/' +
                        (options && options.changeEntityCase
                            ? sthTestConfig.ENTITY_TYPE.toLowerCase()
                            : sthTestConfig.ENTITY_TYPE) +
                        '/id/' +
                        (options && options.changeEntityCase
                            ? sthTestConfig.ENTITY_ID.toLowerCase()
                            : sthTestConfig.ENTITY_ID) +
                        '/attributes/' +
                        attrName || sthTestConfig.ATTRIBUTE_NAME;
            }
            break;
        case sthTestConfig.API_OPERATION.READ_V2:
            if (options && options.invalidPath) {
                url += '/STH/v2/this/is/an/invalid/path';
            } else {
                url +=
                    '/STH/v2/entities/' +
                        (options && options.changeEntityCase
                            ? sthTestConfig.ENTITY_ID.toLowerCase()
                            : sthTestConfig.ENTITY_ID) +
                        '/attrs/' +
                        attrName || sthTestConfig.ATTRIBUTE_NAME;
            }
            url +=
                getQuerySeparator() +
                'type=' +
                (options && options.changeEntityCase
                    ? sthTestConfig.ENTITY_TYPE.toLowerCase()
                    : sthTestConfig.ENTITY_TYPE);
            break;
        case sthTestConfig.API_OPERATION.NOTIFY:
            if (options && options.invalidPath) {
                url += '/invalidNotificationPath';
            } else {
                url += '/notify';
            }
            break;
        case sthTestConfig.API_OPERATION.ADMIN.SET_LOG_LEVEL:
            url += '/admin/log';
            if (options && options.level) {
                url += '?level=' + options.level;
            }
            break;
        case sthTestConfig.API_OPERATION.ADMIN.GET_LOG_LEVEL:
            url += '/admin/log';
            break;
        case sthTestConfig.API_OPERATION.VERSION:
            if (options && options.invalidPath) {
                url += '/invalidVersionPath';
            } else {
                url += '/version';
            }
            break;
        case sthTestConfig.API_OPERATION.DELETE:
            url += '/STH/v1/contextEntities';
            if (options && options.entityType) {
                url += '/type/' + options.entityType;
            }
            if (options && options.entityId) {
                url += '/id/' + options.entityId;
            }
            if (options && options.attrName) {
                url += '/attributes/' + options.attrName;
            }
    }

    if (type === sthTestConfig.API_OPERATION.READ || type === sthTestConfig.API_OPERATION.READ_V2) {
        if (options && (options.lastN || options.lastN === 0)) {
            url += getQuerySeparator() + 'lastN=' + options.lastN;
        }
        if (options && (options.hLimit || options.hLimit === 0)) {
            url += getQuerySeparator() + 'hLimit=' + options.hLimit;
        }
        if (options && (options.hOffset || options.hOffset === 0)) {
            url += getQuerySeparator() + 'hOffset=' + options.hOffset;
        }
        if (options && options.aggrMethod) {
            url += getQuerySeparator() + 'aggrMethod=' + options.aggrMethod;
        }
        if (options && options.aggrPeriod) {
            url += getQuerySeparator() + 'aggrPeriod=' + options.aggrPeriod;
        }
        if (options && options.dateFrom) {
            url += getQuerySeparator() + 'dateFrom=' + options.dateFrom;
        }
        if (options && options.dateTo) {
            url += getQuerySeparator() + 'dateTo=' + options.dateTo;
        }
        if (options && options.count) {
            url += getQuerySeparator() + 'count=' + options.count;
        }
    }

    return url;
}

/**
 * A mocha test forcing the server to not to retrieve raw data from the database
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {object} options To generate the URL
 * @param {Function} done The mocha done() callback function
 */
function noRawDataIfEntityCaseChange(ngsiVersion, params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const options = params.options;

    options.changeEntityCase = true;

    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ_V2, options, attrName),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value).to.be.an(Array);
                expect(bodyJSON.value.length).to.equal(0);
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ, options, attrName),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
                    attrName || sthTestConfig.ATTRIBUTE_NAME
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done();
            }
        );
    }
}

/**
 * A mocha test forcing the server to retrieve raw data from the database
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {object} options To generate the URL
 *  - {boolean} checkRecvTime Flag indicating of the recvTime should be checked
 * @param {Function} done The mocha done() callback function
 */
function rawDataAvailableDateFilter(ngsiVersion, params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const options = params.options;
    const checkRecvTime = params.checkRecvTime;

    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ_V2, options, attrName),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                if (options && options.count) {
                    // Check fiware-total-count header
                    expect(response.headers['fiware-total-count']).to.not.be(undefined);
                }
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value.length).to.equal(options.lastN ? events.length : 1);
                expect(bodyJSON.value[options.lastN ? events.length - 1 : 0].attrValue).to.equal(
                    events[events.length - 1].attrValue
                );
                if (checkRecvTime) {
                    expect(bodyJSON.value[options.lastN ? events.length - 1 : 0].recvTime).to.equal(
                        sthUtils.getISODateString(events[events.length - 1].recvTime)
                    );
                }
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ, options, attrName),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                if (options && options.count) {
                    // Check fiware-total-count header
                    expect(response.headers['fiware-total-count']).to.not.be(undefined);
                }
                expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
                expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
                    attrName || sthTestConfig.ATTRIBUTE_NAME
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(
                    options.lastN ? events.length : 1
                );
                expect(
                    bodyJSON.contextResponses[0].contextElement.attributes[0].values[
                        options.lastN ? events.length - 1 : 0
                    ].attrValue
                ).to.equal(events[events.length - 1].attrValue);
                if (checkRecvTime) {
                    expect(
                        bodyJSON.contextResponses[0].contextElement.attributes[0].values[
                            options.lastN ? events.length - 1 : 0
                        ].recvTime
                    ).to.equal(sthUtils.getISODateString(events[events.length - 1].recvTime));
                }
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done();
            }
        );
    }
}

/**
 * A mocha test forcing the server to retrieve no aggregated data from the database for
 *  the passed aggregation method and resolution
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {string} aggrMethod The aggregation method
 *  - {string} resolution The resolution
 * @param {string} done The mocha done() callback function
 */
function noAggregatedDataIfEntityCaseChangeTest(ngsiVersion, params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const aggrMethod = params.aggrMethod;
    const resolution = params.resolution;

    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        changeEntityCase: true
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value).to.be.an(Array);
                expect(bodyJSON.value.length).to.equal(0);
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        changeEntityCase: true
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
                    attrName || sthTestConfig.ATTRIBUTE_NAME
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done();
            }
        );
    }
}

/**
 * A mocha test forcing the server to retrieve no aggregated data from the database for
 *  the passed aggregation method and resolution
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {string} aggrMethod The aggregation method
 *  - {string} resolution The resolution
 * @param {string} done The mocha done() callback function
 */
function noAggregatedDataSinceDateTest(ngsiVersion, params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const aggrMethod = params.aggrMethod;
    const resolution = params.resolution;

    let offset;
    switch (resolution) {
        case 'second':
            // 1 minute offset
            offset = 60 * 1000;
            break;
        case 'minute':
            // 1 hour offset
            offset = 60 * 60 * 1000;
            break;
        case 'hour':
            // 1 day offset
            offset = 24 * 60 * 60 * 1000;
            break;
        case 'day':
            // 1 month  offset
            offset = 31 * 24 * 60 * 60 * 1000;
            break;
        case 'month':
            // 1 year  offset
            offset = 365 * 31 * 24 * 60 * 60 * 1000;
            break;
    }

    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: sthUtils.getISODateString(
                            sthUtils.getOrigin(
                                new Date(events[events.length - 1].recvTime.getTime() + offset),
                                resolution
                            )
                        )
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value).to.be.an(Array);
                expect(bodyJSON.value.length).to.equal(0);
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: sthUtils.getISODateString(
                            sthUtils.getOrigin(
                                new Date(events[events.length - 1].recvTime.getTime() + offset),
                                resolution
                            )
                        )
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
                expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
                    attrName || sthTestConfig.ATTRIBUTE_NAME
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done();
            }
        );
    }
}

/**
 * A mocha test forcing the server to retrieve aggregated data from the database
 *  for the passed aggregation method and resolution
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {object} param It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {string} aggrMethod The aggregation method
 *  - {string} resolution The resolution
 * @param {Function} done The mocha done() callback function
 */
function aggregatedDataAvailableSinceDateTest(ngsiVersion, params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const attrType = params.attrType;
    const aggrMethod = params.aggrMethod;
    const resolution = params.resolution;

    const theEvent = events[events.length - 1];
    let index;
    let entries;
    switch (resolution) {
        case 'second':
            index = theEvent.recvTime.getUTCSeconds();
            entries = 60;
            break;
        case 'minute':
            index = theEvent.recvTime.getUTCMinutes();
            entries = 60;
            break;
        case 'hour':
            index = theEvent.recvTime.getUTCHours();
            entries = 24;
            break;
        case 'day':
            index = theEvent.recvTime.getUTCDate() - 1;
            entries = 31;
            break;
        case 'month':
            index = theEvent.recvTime.getUTCMonth();
            entries = 12;
            break;
    }

    let value;
    switch (aggrMethod) {
        case 'min':
        case 'max':
            value = parseFloat(theEvent.attrValue).toFixed(2);
            break;
        case 'sum':
            value = (events.length * parseFloat(theEvent.attrValue)).toFixed(2);
            break;
        case 'sum2':
            value = (events.length * Math.pow(parseFloat(theEvent.attrValue), 2)).toFixed(2);
            break;
        case 'occur':
            value = events.length;
            break;
    }

    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: sthUtils.getISODateString(
                            sthUtils.getOrigin(events[events.length - 1].recvTime, resolution)
                        )
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value[0]._id.resolution).to.equal(resolution);
                expect(bodyJSON.value[0]._id.origin).to.be(
                    sthUtils.getISODateString(sthUtils.getOrigin(theEvent.recvTime, resolution))
                );
                expect(bodyJSON.value[0].points.length).to.equal(sthConfig.FILTER_OUT_EMPTY ? 1 : entries);
                expect(bodyJSON.value[0].points[sthConfig.FILTER_OUT_EMPTY ? 0 : index].samples).to.equal(
                    events.length
                );
                if (attrType === 'float') {
                    expect(
                        parseFloat(
                            bodyJSON.value[0].points[sthConfig.FILTER_OUT_EMPTY ? 0 : index][aggrMethod]
                        ).toFixed(2)
                    ).to.equal(value);
                } else if (attrType === 'string') {
                    expect(
                        parseFloat(
                            bodyJSON.value[0].points[sthConfig.FILTER_OUT_EMPTY ? 0 : index][aggrMethod][
                                'just a string'
                            ]
                        )
                    ).to.equal(value);
                }
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: sthUtils.getISODateString(
                            sthUtils.getOrigin(events[events.length - 1].recvTime, resolution)
                        )
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
                expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
                    attrName || sthTestConfig.ATTRIBUTE_NAME
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.resolution).to.equal(
                    resolution
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.origin).to.be(
                    sthUtils.getISODateString(sthUtils.getOrigin(theEvent.recvTime, resolution))
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points.length).to.equal(
                    sthConfig.FILTER_OUT_EMPTY ? 1 : entries
                );
                expect(
                    bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[
                        sthConfig.FILTER_OUT_EMPTY ? 0 : index
                    ].samples
                ).to.equal(events.length);
                if (attrType === 'float') {
                    expect(
                        parseFloat(
                            bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[
                                sthConfig.FILTER_OUT_EMPTY ? 0 : index
                            ][aggrMethod]
                        ).toFixed(2)
                    ).to.equal(value);
                } else if (attrType === 'string') {
                    expect(
                        parseFloat(
                            bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[
                                sthConfig.FILTER_OUT_EMPTY ? 0 : index
                            ][aggrMethod]['just a string']
                        )
                    ).to.equal(value);
                }
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done();
            }
        );
    }
}

/**
 * A mocha test suite including tests to check the retrieval of raw data
 *  from the database
 * @param {object} options Options to generate the URL
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} checkRecvTime Flag indicating if the recvTime should be checked
 */
function rawDataRetrievalSuite(options, attrName, attrType, checkRecvTime) {
    describe('should respond', function() {
        const optionsForCaseSensitivity = {};
        const optionsWithNoDates = {};
        const optionsWithDateFrom = {};
        const optionsWithDateTo = {};
        const optionsWithFromAndToDate = {};

        before(function() {
            for (const prop in options) {
                optionsForCaseSensitivity[prop] = options[prop];
                optionsWithNoDates[prop] = options[prop];
                optionsWithDateFrom[prop] = options[prop];
                optionsWithDateTo[prop] = options[prop];
                optionsWithFromAndToDate[prop] = options[prop];
            }
            if (sthTestConfig.COMPLEX_NOTIFICATION_STARTED && 'hLimit' in optionsWithNoDates) {
                optionsWithNoDates.hOffset = 0;
            }
            optionsWithDateFrom.dateFrom = sthUtils.getISODateString(events[0].recvTime);
            optionsWithDateTo.dateTo = sthUtils.getISODateString(new Date());
            if (sthTestConfig.COMPLEX_NOTIFICATION_STARTED && 'hLimit' in optionsWithDateTo) {
                optionsWithDateTo.hOffset = 0;
            }
            optionsWithFromAndToDate.dateFrom = sthUtils.getISODateString(events[0].recvTime);
            optionsWithFromAndToDate.dateTo = sthUtils.getISODateString(new Date());
        });

        it(
            'without data if entity id and entity type case does not match',
            noRawDataIfEntityCaseChange.bind(null, 2, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsForCaseSensitivity,
                checkRecvTime
            })
        );

        it(
            'without data if entity id and entity type case does not match - NGSIv1',
            noRawDataIfEntityCaseChange.bind(null, 1, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsForCaseSensitivity,
                checkRecvTime
            })
        );

        it(
            'with raw data if data and no dateFrom or dateTo',
            rawDataAvailableDateFilter.bind(null, 2, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithNoDates,
                checkRecvTime
            })
        );

        it(
            'with raw data if data and no dateFrom or dateTo - NGSIv1',
            rawDataAvailableDateFilter.bind(null, 1, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithNoDates,
                checkRecvTime
            })
        );

        it(
            'with raw data if data since dateFrom',
            rawDataAvailableDateFilter.bind(null, 2, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithDateFrom,
                checkRecvTime
            })
        );

        it(
            'with raw data if data since dateFrom - NGSIv1',
            rawDataAvailableDateFilter.bind(null, 1, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithDateFrom,
                checkRecvTime
            })
        );

        it(
            'with raw data if data before dateTo',
            rawDataAvailableDateFilter.bind(null, 2, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithDateTo,
                checkRecvTime
            })
        );

        it(
            'with raw data if data before dateTo - NGSIv1',
            rawDataAvailableDateFilter.bind(null, 1, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithDateTo,
                checkRecvTime
            })
        );

        it(
            'with raw data if data from dateFrom and before dateTo',
            rawDataAvailableDateFilter.bind(null, 2, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithFromAndToDate,
                checkRecvTime
            })
        );

        it(
            'with raw data if data from dateFrom and before dateTo - NGSIv1',
            rawDataAvailableDateFilter.bind(null, 1, {
                service: sthConfig.DEFAULT_SERVICE,
                servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                attrName,
                options: optionsWithFromAndToDate,
                checkRecvTime
            })
        );
    });
}

/**
 * Tests of the aggregated data retrieval suite
 * @param index The index
 * @param attrName The attribute name
 * @param attrType The attribyte type
 * @param aggrMethod The aggregation method
 */
function aggregatedDataRetrievalTests(index, attrName, attrType, aggrMethod) {
    it(
        'should respond with empty aggregated data if entity id and entity type case does not match',
        noAggregatedDataIfEntityCaseChangeTest.bind(null, 2, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );

    it(
        'should respond with empty aggregated data if entity id and entity type case does not match - NGSIv1',
        noAggregatedDataIfEntityCaseChangeTest.bind(null, 1, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );

    it(
        'should respond with empty aggregated data if no data since dateFrom',
        noAggregatedDataSinceDateTest.bind(null, 2, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );

    it(
        'should respond with empty aggregated data if no data since dateFrom - NGSIv1',
        noAggregatedDataSinceDateTest.bind(null, 1, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );

    it(
        'should respond with aggregated data if data since dateFrom',
        aggregatedDataAvailableSinceDateTest.bind(null, 2, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            attrType,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );

    it(
        'should respond with aggregated data if data since dateFrom - NGSIv1',
        aggregatedDataAvailableSinceDateTest.bind(null, 1, {
            service: sthConfig.DEFAULT_SERVICE,
            servicePath: sthConfig.DEFAULT_SERVICE_PATH,
            attrName,
            attrType,
            aggrMethod,
            resolution: sthConfig.AGGREGATION_BY[index]
        })
    );
}

/**
 * A mocha test suite including tests to check the retrieval of aggregated data
 *  from the database for the passed aggregation method
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {string} aggrMethod The aggregation method
 */
function aggregatedDataRetrievalSuite(attrName, attrType, aggrMethod) {
    describe('with aggrMethod as ' + aggrMethod, function() {
        for (let i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
            describe(
                'and aggrPeriod as ' + sthConfig.AGGREGATION_BY[i],
                aggregatedDataRetrievalTests.bind(null, i, attrName, attrType, aggrMethod)
            );
        }
    });
}

/**
 * A mocha test suite to clean the database (i.e., the raw event data and
 *  aggregated data collections
 */
function cleanDatabaseSuite() {
    if (sthTestConfig.CLEAN) {
        it('should drop the event raw data collection if it exists', dropRawEventCollectionTest);

        it('should drop the aggregated data collection if it exists', dropAggregatedDataCollectionTest);
    }
}

/**
 * Notification including no attributes test case
 * @param service The Fiware-Service header
 * @param servicePath The Fiware-ServicePath header
 * @param done The test case callback function
 */
function noAttributesTest(service, servicePath, done) {
    request(
        {
            uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Fiware-Service': service || sthConfig.SERVICE,
                'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
            },
            json: true,
            body: {
                subscriptionId: '1234567890ABCDF123456789',
                originator: 'orion.contextBroker.instance',
                contextResponses: [
                    {
                        contextElement: {
                            attributes: [],
                            type: sthTestConfig.ENTITY_TYPE,
                            isPattern: 'false',
                            id: sthTestConfig.ENTITY_ID
                        },
                        statusCode: {
                            code: '200',
                            reasonPhrase: 'OK'
                        }
                    },
                    {
                        contextElement: {
                            attributes: [],
                            type: sthTestConfig.ENTITY_TYPE,
                            isPattern: 'false',
                            id: sthTestConfig.ENTITY_ID
                        },
                        statusCode: {
                            code: '200',
                            reasonPhrase: 'OK'
                        }
                    },
                    {
                        contextElement: {
                            attributes: [],
                            type: sthTestConfig.ENTITY_TYPE,
                            isPattern: 'false',
                            id: sthTestConfig.ENTITY_ID
                        },
                        statusCode: {
                            code: '200',
                            reasonPhrase: 'OK'
                        }
                    }
                ]
            }
        },
        function(err, response, body) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(400);
            expect(body.statusCode).to.equal(400);
            expect(body.error).to.equal('Bad Request');
            expect(body.validation.source).to.equal('payload');
            expect(body.validation.keys).to.be.an(Array);
            expect(body.validation.keys.indexOf('attributes')).to.not.equal(-1);
            done();
        }
    );
}

/**
 * Notification including non-aggregatable attribute values test case
 * @param service The Fiware-Service header
 * @param servicePath The Fiware-ServicePath header
 * @param done The test case callback function
 */
function nonAggregatableAttributeValuesTest(service, servicePath, done) {
    const body = {
        subscriptionId: '1234567890ABCDF123456789',
        originator: 'orion.contextBroker.instance',
        contextResponses: [
            {
                contextElement: {
                    attributes: [
                        {
                            name: sthTestConfig.ATTRIBUTE_NAME,
                            type: sthTestConfig.ATTRIBUTE_TYPE,
                            value: ''
                        }
                    ],
                    type: sthTestConfig.ENTITY_TYPE,
                    isPattern: 'false',
                    id: sthTestConfig.ENTITY_ID
                },
                statusCode: {
                    code: '200',
                    reasonPhrase: 'OK'
                }
            },
            {
                contextElement: {
                    attributes: [
                        {
                            name: sthTestConfig.ATTRIBUTE_NAME,
                            type: sthTestConfig.ATTRIBUTE_TYPE,
                            value: ['just', 'an', 'array']
                        }
                    ],
                    type: sthTestConfig.ENTITY_TYPE,
                    isPattern: 'false',
                    id: sthTestConfig.ENTITY_ID
                },
                statusCode: {
                    code: '200',
                    reasonPhrase: 'OK'
                }
            },
            {
                contextElement: {
                    attributes: [
                        {
                            name: sthTestConfig.ATTRIBUTE_NAME,
                            type: sthTestConfig.ATTRIBUTE_TYPE,
                            value: {
                                just: 'an object'
                            }
                        }
                    ],
                    type: sthTestConfig.ENTITY_TYPE,
                    isPattern: 'false',
                    id: sthTestConfig.ENTITY_ID
                },
                statusCode: {
                    code: '200',
                    reasonPhrase: 'OK'
                }
            }
        ]
    };
    if (sthConfig.IGNORE_BLANK_SPACES) {
        body.contextResponses.push(
            {
                contextElement: {
                    attributes: [
                        {
                            name: sthTestConfig.ATTRIBUTE_NAME,
                            type: sthTestConfig.ATTRIBUTE_TYPE,
                            value: ' ' // Blank space
                        }
                    ],
                    type: sthTestConfig.ENTITY_TYPE,
                    isPattern: 'false',
                    id: sthTestConfig.ENTITY_ID
                },
                statusCode: {
                    code: '200',
                    reasonPhrase: 'OK'
                }
            },
            {
                contextElement: {
                    attributes: [
                        {
                            name: sthTestConfig.ATTRIBUTE_NAME,
                            type: sthTestConfig.ATTRIBUTE_TYPE,
                            value: '   ' // Several blank space
                        }
                    ],
                    type: sthTestConfig.ENTITY_TYPE,
                    isPattern: 'false',
                    id: sthTestConfig.ENTITY_ID
                },
                statusCode: {
                    code: '200',
                    reasonPhrase: 'OK'
                }
            }
        );
    }
    request(
        {
            uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Fiware-Service': service || sthConfig.SERVICE,
                'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
            },
            json: true,
            body
        },
        function(err, response) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(200);
            done();
        }
    );
}

/**
 * To avoid needing to set the 'jslint latedef: true' option to true for the whole file, we declare the
 *  complexNotificationTest function before its definition and before the complexNotificationSuite() function definition
 */
/* eslint-disable-next-line prefer-const */
let complexNotificationTest;

/**
 * Complex notification suite
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 */
function complexNotificationSuite(attrName, attrType, includeTimeInstantMetadata) {
    describe('attribute of type ' + attrType, function() {
        before(function() {
            sthTestConfig.COMPLEX_NOTIFICATION_STARTED = true;
        });

        describe('reception', function() {
            it(
                'should attend the notification',
                complexNotificationTest.bind(null, {
                    service: sthConfig.DEFAULT_SERVICE,
                    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
                    attrName,
                    attrType,
                    includeTimeInstantMetadata
                })
            );
        });

        describe('for each new notification', function() {
            describe(
                'raw data retrieval with lastN',
                rawDataRetrievalSuite.bind(
                    null,
                    { lastN: sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS },
                    attrName,
                    attrType,
                    false
                )
            );

            describe(
                'raw data retrieval with hLimit and hOffset',
                rawDataRetrievalSuite.bind(null, { hLimit: 1, hOffset: 0 }, attrName, attrType, false)
            );

            if (attrType === 'float') {
                describe(
                    'aggregated data retrieval',
                    aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'min')
                );

                describe(
                    'aggregated data retrieval',
                    aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'max')
                );

                describe(
                    'aggregated data retrieval',
                    aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'sum')
                );

                describe(
                    'aggregated data retrieval',
                    aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'sum2')
                );
            } else if (attrType === 'string') {
                describe(
                    'aggregated data retrieval',
                    aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'occur')
                );
            }
        });
    });
}

/**
 * A mocha test suite to check the reception of notifications by the Orion Context Broker
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 */
function eventNotificationSuite(attrName, attrType, includeTimeInstantMetadata) {
    before(function() {
        cleanEvents();
    });

    describe('no attribute values notification', function() {
        it(
            'should respond with 400 - Bad Request',
            noAttributesTest.bind(null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH)
        );
    });

    describe('non-aggretabable values notification', function() {
        it(
            'should respond with 200 - OK',
            nonAggregatableAttributeValuesTest.bind(null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH)
        );
    });

    describe('value changed of', complexNotificationSuite.bind(null, attrName, attrType, includeTimeInstantMetadata));
}

/**
 * A mocha test to check the reception of a new notification by the Orion Context Broker
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 * @param {Function} done The mocha done() callback function
 */
complexNotificationTest = function complexNotificationTest(params, done) {
    const service = params.service;
    const servicePath = params.servicePath;
    const attrName = params.attrName;
    const attrType = params.attrType;
    const includeTimeInstantMetadata = params.includeTimeInstantMetadata;
    const now = new Date();
    const anEvent = createEvent(attrName, attrType, now);
    const contextResponses = [];
    const attribute = {
        name: anEvent.attrName,
        type: anEvent.attrType,
        value: anEvent.attrValue
    };

    if (includeTimeInstantMetadata) {
        attribute.metadatas = [
            {
                name: 'TimeInstant',
                type: 'ISO8601',
                value: now
            }
        ];
    }

    for (let i = 0; i < sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS; i++) {
        contextResponses.push({
            contextElement: {
                attributes: [attribute],
                type: sthTestConfig.ENTITY_TYPE,
                isPattern: 'false',
                id: sthTestConfig.ENTITY_ID
            },
            statusCode: {
                code: '200',
                reasonPhrase: 'OK'
            }
        });
    }
    request(
        {
            uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
                'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
            },
            json: true,
            body: {
                subscriptionId: '1234567890ABCDF123456789',
                originator: 'orion.contextBroker.instance',
                contextResponses
            }
        },
        function(err, response, body) {
            for (let i = 0; i < 3; i++) {
                if (events.indexOf(anEvent) < 0) {
                    events.push(anEvent);
                }
            }
            expect(body).to.be(undefined);
            done(err);
        }
    );
};

/**
 * Successful 200 status test case
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param {Object} options Options to generate the URL
 * @param {Function} done Callback
 */
function status200Test(ngsiVersion, options, done) {
    if (ngsiVersion === 2) {
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ_V2, options),
                method: 'GET',
                headers: {
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                if (options && options.count) {
                    // Check fiware-total-count header
                    expect(response.headers['fiware-total-count']).to.not.be(undefined);
                }
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value).to.be.an(Array);
                expect(bodyJSON.value.length).to.equal(0);
                done();
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.READ, options),
                method: 'GET',
                headers: {
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(err).to.equal(null);
                expect(response.statusCode).to.equal(200);
                if (options && options.count) {
                    // Check fiware-total-count header
                    expect(response.headers['fiware-total-count']).to.not.be(undefined);
                }
                expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
                expect(bodyJSON.contextResponses[0].contextElement.type).to.equal(sthTestConfig.ENTITY_TYPE);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                done();
            }
        );
    }
}

/**
 * Test to check that in case of updating a numeric attribute value aggregated data:
 *  - If the value of the attribute is the same, it is only aggregated once
 *  - If the value of the attribute changes, the aggregated data is properly updated
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param contextResponseFile The context response used for the notification of the update
 * @param aggrMethod The aggregation method
 * @param resolution The resolution
 * @param done The done() function
 */
function numericAggregatedDataUpdatedTest(ngsiVersion, contextResponseFile, aggrMethod, resolution, done) {
    let contextResponseNumericWithFixedTimeInstant;
    if (ngsiVersion === 2) {
        contextResponseNumericWithFixedTimeInstant = require('./contextResponses/' + contextResponseFile);

        // By construction, the file only have one key and that key is the attribute name
        const attrName = Object.keys(contextResponseNumericWithFixedTimeInstant)[0];

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: contextResponseNumericWithFixedTimeInstant[attrName].metadata.TimeInstant.value,
                        dateTo: contextResponseNumericWithFixedTimeInstant[attrName].metadata.TimeInstant.value
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.value[0].points.length).to.equal(1);
                expect(parseInt(bodyJSON.value[0].points[0].offset, 10)).to.equal(
                    sthUtils.getOffset(
                        resolution,
                        new Date(contextResponseNumericWithFixedTimeInstant[attrName].metadata.TimeInstant.value)
                    )
                );
                expect(bodyJSON.value[0].points[0].samples).to.equal(1);
                expect(bodyJSON.value[0].points[0][aggrMethod]).to.equal(
                    aggrMethod === 'sum2'
                        ? Math.pow(parseInt(contextResponseNumericWithFixedTimeInstant[attrName].value, 10), 2)
                        : parseInt(contextResponseNumericWithFixedTimeInstant[attrName].value, 10)
                );
                done(err);
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        contextResponseNumericWithFixedTimeInstant = require('./contextResponses/V1' + contextResponseFile);

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom:
                            contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value,
                        dateTo:
                            contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value
                    },
                    contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points.length).to.equal(1);
                expect(
                    parseInt(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0].offset, 10)
                ).to.equal(
                    sthUtils.getOffset(
                        resolution,
                        new Date(
                            contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].metadatas[0].value
                        )
                    )
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0].samples).to.equal(
                    1
                );
                expect(
                    bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0][aggrMethod]
                ).to.equal(
                    aggrMethod === 'sum2'
                        ? Math.pow(
                              parseInt(
                                  contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement
                                      .attributes[0].value,
                                  10
                              ),
                              2
                          )
                        : parseInt(
                              contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement
                                  .attributes[0].value,
                              10
                          )
                );
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done(err);
            }
        );
    }
}

/**
 * Test to check that in case of updating a textual attribute value aggregated data:
 *  - If the value of the attribute is the same, it is only aggregated once
 *  - If the value of the attribute changes, the aggregated data is properly updated
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param contextResponseFile The context response used for the notification of the update
 * @param resolution The resolution
 * @param done The done() function
 */
function textualAggregatedDataUpdatedTest(ngsiVersion, contextResponseFile, resolution, done) {
    let contextResponseTextualWithFixedTimeInstant;
    if (ngsiVersion === 2) {
        contextResponseTextualWithFixedTimeInstant = require('./contextResponses/' + contextResponseFile);

        // By construction, the file only have one key and that key is the attribute name
        const attrName = Object.keys(contextResponseTextualWithFixedTimeInstant)[0];

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod: 'occur',
                        aggrPeriod: resolution,
                        dateFrom: contextResponseTextualWithFixedTimeInstant[attrName].metadata.TimeInstant.value,
                        dateTo: contextResponseTextualWithFixedTimeInstant[attrName].metadata.TimeInstant.value
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.value[0].points.length).to.equal(1);
                expect(parseInt(bodyJSON.value[0].points[0].offset, 10)).to.equal(
                    sthUtils.getOffset(
                        resolution,
                        new Date(contextResponseTextualWithFixedTimeInstant[attrName].metadata.TimeInstant.value)
                    )
                );
                expect(bodyJSON.value[0].points[0].samples).to.equal(1);
                expect(
                    bodyJSON.value[0].points[0].occur[contextResponseTextualWithFixedTimeInstant[attrName].value]
                ).to.equal(1);
                done(err);
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        contextResponseTextualWithFixedTimeInstant = require('./contextResponses/V1' + contextResponseFile);
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod: 'occur',
                        aggrPeriod: resolution,
                        dateFrom:
                            contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value,
                        dateTo:
                            contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value
                    },
                    contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points.length).to.equal(1);
                expect(
                    parseInt(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0].offset, 10)
                ).to.equal(
                    sthUtils.getOffset(
                        resolution,
                        new Date(
                            contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].metadatas[0].value
                        )
                    )
                );
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0].samples).to.equal(
                    1
                );
                expect(
                    bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points[0].occur[
                        contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                            .value
                    ]
                ).to.equal(1);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done(err);
            }
        );
    }
}

/**
 * Test to check that in case of updating a numeric attribute value aggregated data:
 *  - If the value of the attribute is the same, it is only aggregated once
 *  - If the value of the attribute changes, the aggregated data is properly updated
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param contextResponseFile The context response used for the notification of the update
 * @param aggrMethod The aggregation method
 * @param resolution The resolution
 * @param done The done() function
 */
function aggregatedDataNonExistentTest(ngsiVersion, contextResponseFile, aggrMethod, resolution, done) {
    let contextResponseNumericWithFixedTimeInstant;
    if (ngsiVersion === 2) {
        contextResponseNumericWithFixedTimeInstant = require('./contextResponses/' + contextResponseFile);

        // By construction, the file only have one key and that key is the attribute name
        const attrName = Object.keys(contextResponseNumericWithFixedTimeInstant)[0];

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom: contextResponseNumericWithFixedTimeInstant[attrName].metadata.TimeInstant.value,
                        dateTo: contextResponseNumericWithFixedTimeInstant[attrName].metadata.TimeInstant.value
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.value.length).to.equal(0);
                done(err);
            }
        );
    } else {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        contextResponseNumericWithFixedTimeInstant = require('./contextResponses/V1' + contextResponseFile);
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        aggrMethod,
                        aggrPeriod: resolution,
                        dateFrom:
                            contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value,
                        dateTo:
                            contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                                .metadatas[0].value
                    },
                    contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done(err);
            }
        );
    }
}

/**
 * Suite of tests to verify the removal of data from the databse
 * @param aggregationType The aggregation type
 * @param removalOptions The removal options
 */
function dataRemovalSuite(aggregationType, removalOptions) {
    let contextResponsesObj;
    let contextResponsesObjV1;

    before(function() {
        const contextResponseFileV1 =
            './contextResponses/V1contextResponse' +
            (aggregationType === sthConfig.AGGREGATIONS.NUMERIC ? 'Numeric' : 'Textual') +
            'WithFixedTimeInstant';
        contextResponsesObjV1 = require(contextResponseFileV1);

        const contextResponseFile =
            './contextResponses/contextResponse' +
            (aggregationType === sthConfig.AGGREGATIONS.NUMERIC ? 'Numeric' : 'Textual') +
            'WithFixedTimeInstant';
        contextResponsesObj = require(contextResponseFile);
    });

    it('should store the raw and aggregated data for some ' + aggregationType + ' entity attribute', function(done) {
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                },
                json: true,
                body: {
                    subscriptionId: '1234567890ABCDF123456789',
                    originator: 'orion.contextBroker.instance',
                    contextResponses: contextResponsesObjV1.contextResponses
                }
            },
            function(err, response, body) {
                expect(body).to.be(undefined);
                done(err);
            }
        );
    });

    it('should retrieve the raw data', function(done) {
        // By construction, the file only have one key and that key is the attribute name
        const attrName = Object.keys(contextResponsesObj)[0];

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        lastN: 0,
                        dateFrom: contextResponsesObj[attrName].metadata.TimeInstant.value,
                        dateTo: contextResponsesObj[attrName].metadata.TimeInstant.value
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value.length).to.equal(1);
                expect(bodyJSON.value[0].attrValue).to.equal(contextResponsesObj[attrName].value);
                done(err);
            }
        );
    });

    it('should retrieve the raw data - NGSIv1', function(done) {
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        lastN: 0,
                        dateFrom:
                            contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].metadatas[0].value,
                        dateTo:
                            contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].metadatas[0].value
                    },
                    contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].name
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.equal(
                    contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].value
                );
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done(err);
            }
        );
    });

    for (let i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
        if (aggregationType === sthConfig.AGGREGATIONS.NUMERIC) {
            it(
                'should retrieve the sum updated aggregated data',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the sum updated aggregated data - NGSIv1',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the sum2 aggregated data',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the sum2 aggregated data - NGSIv1',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the max aggregated data',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the max aggregated data - NGSIv1',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the min aggregated data',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should retrieve the min aggregated data - NGSIv1',
                numericAggregatedDataUpdatedTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        } else {
            it(
                'should retrieve the occur aggregated data',
                textualAggregatedDataUpdatedTest.bind(
                    null,
                    2,
                    'contextResponseTextualWithFixedTimeInstant',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
            it(
                'should retrieve the occur aggregated data - NGSIv1',
                textualAggregatedDataUpdatedTest.bind(
                    null,
                    1,
                    'contextResponseTextualWithFixedTimeInstant',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        }
    }

    it('should delete the raw and aggregated data for the same ' + aggregationType + ' entity attribute', function(
        done
    ) {
        request(
            {
                uri: getURL(sthTestConfig.API_OPERATION.DELETE, removalOptions),
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                },
                json: true,
                body: {
                    subscriptionId: '1234567890ABCDF123456789',
                    originator: 'orion.contextBroker.instance',
                    contextResponses: contextResponsesObjV1.contextResponses
                }
            },
            function(err, response, body) {
                expect(body).to.be(undefined);
                done(err);
            }
        );
    });

    it('should not retrieve the deleted raw data', function(done) {
        // By construction, the file only have one key and that key is the attribute name
        const attrName = Object.keys(contextResponsesObj)[0];

        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ_V2,
                    {
                        lastN: 0,
                        dateFrom: contextResponsesObj[attrName].metadata.TimeInstant.value,
                        dateTo: contextResponsesObj[attrName].metadata.TimeInstant.value
                    },
                    attrName
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.type).to.equal('StructuredValue');
                expect(bodyJSON.value.length).to.equal(0);
                done(err);
            }
        );
    });

    it('should not retrieve the deleted raw data - NGSIv1', function(done) {
        // FIXME: remove the else branch when NGSIv1 becomes obsolete
        request(
            {
                uri: getURL(
                    sthTestConfig.API_OPERATION.READ,
                    {
                        lastN: 0,
                        dateFrom:
                            contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].metadatas[0].value,
                        dateTo:
                            contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].metadatas[0].value
                    },
                    contextResponsesObjV1.contextResponses[0].contextElement.attributes[0].name
                ),
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                    'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                }
            },
            function(err, response, body) {
                const bodyJSON = JSON.parse(body);
                expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
                expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                done(err);
            }
        );
    });

    for (let j = 0; j < sthConfig.AGGREGATION_BY.length; j++) {
        if (aggregationType === sthConfig.AGGREGATIONS.NUMERIC) {
            it(
                'should not retrieve the deleted sum updated aggregated data',
                aggregatedDataNonExistentTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted sum updated aggregated data - NGSIv1',
                aggregatedDataNonExistentTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted sum2 aggregated data',
                aggregatedDataNonExistentTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted sum2 aggregated data - NGSIv1',
                aggregatedDataNonExistentTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted max aggregated data',
                aggregatedDataNonExistentTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted max aggregated data - NGSIv1',
                aggregatedDataNonExistentTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted min aggregated data',
                aggregatedDataNonExistentTest.bind(
                    null,
                    2,
                    'contextResponseNumericWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted min aggregated data - NGSIv1',
                aggregatedDataNonExistentTest.bind(
                    null,
                    1,
                    'contextResponseNumericWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[j]
                )
            );
        } else {
            it(
                'should not retrieve the deleted occur aggregated data',
                aggregatedDataNonExistentTest.bind(
                    null,
                    2,
                    'contextResponseTextualWithFixedTimeInstant',
                    'occur',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the deleted occur aggregated data - NGSIv1',
                aggregatedDataNonExistentTest.bind(
                    null,
                    1,
                    'contextResponseTextualWithFixedTimeInstant',
                    'occur',
                    sthConfig.AGGREGATION_BY[j]
                )
            );
        }
    }
}

/**
 * Valid log level test
 * @param level The log level
 * @param done The done() function
 */
function validLogLevelChangeTest(level, done) {
    request(
        {
            uri: getURL(sthTestConfig.API_OPERATION.ADMIN.SET_LOG_LEVEL, {
                level
            }),
            method: 'PUT'
        },
        function(err, response) {
            expect(err).to.equal(null);
            expect(response.statusCode).to.equal(200);
            done();
        }
    );
}

module.exports = {
    getDayOfYear,
    addEventTest,
    eachEventTestSuite,
    dropRawEventCollectionTest,
    dropAggregatedDataCollectionTest,
    getURL,
    rawDataRetrievalSuite,
    aggregatedDataRetrievalSuite,
    cleanDatabaseSuite,
    eventNotificationSuite,
    status200Test,
    numericAggregatedDataUpdatedTest,
    textualAggregatedDataUpdatedTest,
    aggregatedDataNonExistentTest,
    dataRemovalSuite,
    validLogLevelChangeTest
};
