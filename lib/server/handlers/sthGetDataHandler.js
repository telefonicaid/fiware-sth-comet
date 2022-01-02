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
const stream = require('stream');
const fs = require('fs');
const path = require('path');
const encodeRFC5987 = require('rfc5987-value-chars').encode;

/**
 * Returns historical raw data to the client
 * @param {Object}   request The request
 * @param {Function} reply   Hapi's reply function
 */
function getRawData(request, reply) {
    let response;

    var query = {
        service: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
        servicePath: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
        entityId: request.params.entityId,
        entityType: request.params.entityType,
        attrName: request.params.attrName
    };
    var sthOptions = {
        isAggregated: false,
        shouldCreate: false,
        shouldTruncate: false
    };
    sthLogger.debug(
        request.sth.context,
        'Getting access to the raw data collection for retrieval using query %j and sthOptions %j',
        query,
        sthOptions
    );
    sthDatabase.getCollection(query, sthOptions, function(err, collection) {
        if (err) {
            if(err.name === 'MongoNetworkError' && err.message.includes('failed to connect to server')){
                sthLogger.error(request.sth.context, 'DataBase is not connected');
                sthLogger.debug(request.sth.context, 'Responding with 500- Internal error');
                response = reply(err);
            } else {
                // The collection does not exist, reply with en empty response
                sthLogger.warn(
                request.sth.context,
                'Error %j when getting the raw data collection for retrieval using query %j and sthOptions %j',
                err,
                query,
                sthOptions
            );
            sthLogger.debug(request.sth.context, 'Responding with no points');
            const emptyResponse = sthServerUtils.getEmptyResponse();
            const ngsiPayload = sthServerUtils.getNGSIPayload(
                request.params.version,
                request.params.entityId,
                request.params.entityType,
                request.params.attrName,
                emptyResponse
            );
            response = reply(ngsiPayload);
            sthServerUtils.addFiwareCorrelator(request, response);
            if (request.query.count) {
                sthServerUtils.addFiwareTotalCount(0, response);
            }
            }
        } else {
            var rawQuery = {
                entityId: request.params.entityId,
                entityType: request.params.entityType,
                attrName: request.params.attrName,
                lastN: request.query.lastN,
                hLimit: request.query.hLimit,
                hOffset: request.query.hOffset,
                from: request.query.dateFrom,
                to: request.query.dateTo,
                filetype: request.query.filetype
            };
            sthLogger.debug(request.sth.context, 'Getting the raw data from collection using query %j', rawQuery);
            rawQuery.collection = collection;
            sthDatabase.getRawData(rawQuery, function(err, result, totalCount) {
                delete rawQuery.collection; // for log purposes
                if (err) {
                    // Error when getting the raw data
                    sthLogger.error(request.sth.context, 'Error %j when getting raw data with query %j', err, rawQuery);
                    sthLogger.debug(request.sth.context, 'Responding with 500 - Internal Error');
                    response = reply(err);
                } else if (!result || !(result.length || result instanceof stream)) {
                    // No raw data available for the request
                    sthLogger.info(
                        request.sth.context,
                        'No raw data available for the request: %j using query %j',
                        request.url.path,
                        rawQuery
                    );

                    sthLogger.debug(request.sth.context, 'Responding with no points');
                    response = reply(
                        sthServerUtils.getNGSIPayload(
                            request.params.version,
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            sthServerUtils.getEmptyResponse()
                        )
                    );
                } else if (result instanceof stream) {
                    sthLogger.debug(request.sth.context, 'Responding with a stream of docs');
                    response = reply(new stream.Readable().wrap(result));
                } else if (typeof result === 'string') {
                    sthLogger.debug(request.sth.context, "Responding with file '" + result + "'");
                    fs.readFile(result, function(err, data) {
                        response = reply(data);
                        const fileName = result.substring(result.lastIndexOf(path.sep) + 1);
                        response.header(
                            'Content-Disposition',
                            "attachment; filename*= utf-8''" + encodeRFC5987(fileName)
                        );
                        response.once('finish', function() {
                            sthLogger.debug(request.sth.context, "Removing file '" + result + "'");
                            fs.unlink(result, function(err) {
                                if (!err) {
                                    sthLogger.debug(request.sth.context, "File '" + result + "' successfully removed");
                                } else {
                                    sthLogger.warn(
                                        request.sth.context,
                                        "Error when removing file '" + result + "': " + err
                                    );
                                }
                            });
                        });
                    }); // readfile
                } else {
                    sthLogger.debug(request.sth.context, 'Responding with %s docs', result.length);
                    response = reply(
                        sthServerUtils.getNGSIPayload(
                            request.params.version,
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            result
                        )
                    );
                }
                sthServerUtils.addFiwareCorrelator(request, response);
                if (request.query.count) {
                    sthLogger.debug(request.sth.context, 'totalCount %j', totalCount);
                    sthServerUtils.addFiwareTotalCount(totalCount, response);
                }
            });
        }
    });
}

/**
 * Returns historical aggregated data to the client
 * @param {Object}   request The request
 * @param {Function} reply   Hapi's reply function
 */
function getAggregatedData(request, reply) {
    let response;

    var query = {
        service: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
        servicePath: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
        entityId: request.params.entityId,
        entityType: request.params.entityType,
        attrName: request.params.attrName
    };
    var sthOptions = {
        isAggregated: true,
        shouldCreate: false,
        shouldTruncate: false
    };
    sthLogger.debug(
        request.sth.context,
        'Getting access to the aggregated data collection for retrieval using query %j and options %j',
        query,
        sthOptions
    );
    sthDatabase.getCollection(query, sthOptions, function(err, collection) {
        if (err) {
            if(err.name === 'MongoNetworkError' && err.message.includes('failed to connect to server')){
                sthLogger.error(request.sth.context, 'DataBase is not connected');
                sthLogger.debug(request.sth.context, 'Responding with 500- Internal error');
                response = reply(err);
            } else {
                // The collection does not exist, reply with en empty response
                sthLogger.warn(
                    request.sth.context,
                    'Error %j when getting the aggregated data collection for retrieval' +
                        // Overly long line.
                        ' using query %j and options %j',
                    err,
                    query,
                    sthOptions
                );

            sthLogger.debug(request.sth.context, 'Responding with no points');
            const emptyResponse = sthServerUtils.getEmptyResponse();
            const ngsiPayload = sthServerUtils.getNGSIPayload(
                request.params.version,
                request.params.entityId,
                request.params.entityType,
                request.params.attrName,
                emptyResponse
            );
            response = reply(ngsiPayload);
            sthServerUtils.addFiwareCorrelator(request, response);
            }
        } else {
            var aggregatedQuery = {
                entityId: request.params.entityId,
                entityType: request.params.entityType,
                attrName: request.params.attrName,
                aggregatedFunction: request.query.aggrMethod,
                resolution: request.query.aggrPeriod,
                from: request.query.dateFrom,
                to: request.query.dateTo,
                shouldFilter: sthConfig.FILTER_OUT_EMPTY
            };
            sthLogger.debug(
                request.sth.context,
                'Getting aggregated data from collection using query %j',
                aggregatedQuery
            );
            aggregatedQuery.collection = collection;
            sthDatabase.getAggregatedData(aggregatedQuery, function(err, result) {
                delete aggregatedQuery.collection; // for log purposes
                if (err) {
                    // Error when getting the aggregated data
                    sthLogger.error(
                        request.sth.context,
                        'Error %j when getting aggregated data from collection using query %j',
                        err,
                        aggregatedQuery
                    );
                    sthLogger.debug(request.sth.context, 'Responding with 500 - Internal Error');
                    response = reply(err);
                } else if (!result || !result.length) {
                    // No aggregated data available for the request
                    sthLogger.debug(
                        request.sth.context,
                        'No aggregated data available for the request: %j using query %j',
                        request.url.path,
                        aggregatedQuery
                    );

                    sthLogger.debug(request.sth.context, 'Responding with no points');
                    response = reply(
                        sthServerUtils.getNGSIPayload(
                            request.params.version,
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            sthServerUtils.getEmptyResponse()
                        )
                    );
                } else {
                    sthLogger.debug(request.sth.context, 'Responding with %s docs', result.length);
                    response = reply(
                        sthServerUtils.getNGSIPayload(
                            request.params.version,
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            result
                        )
                    );
                }
                sthServerUtils.addFiwareCorrelator(request, response);
            });
        }
    });
}

/**
 * Handler for requests of historical raw and aggregated data
 * @param {Object}   request The request
 * @param {Function} reply   The reply() function of the hapi server
 */
function getDataHandler(request, reply) {
    request.sth = request.sth || {};
    request.sth.context = sthServerUtils.getContext(request);
    let message;
    let error;
    sthLogger.debug(request.sth.context, request.method.toUpperCase() + ' ' + request.url.path);

    if (
        request.query.lastN ||
        request.query.lastN === 0 ||
        ((request.query.hLimit || request.query.hLimit === 0) &&
            (request.query.hOffset || request.query.hOffset === 0)) ||
        (request.query.filetype && request.query.filetype.toLowerCase() === 'csv')
    ) {
        // Raw data is requested
        // Check & ensure hLimit<=lastN<=config.maxPageSize.
        if (request.query.hLimit || request.query.lastN) {
            if (
                (request.query.lastN && request.query.lastN > sthConfig.MAX_PAGE_SIZE) ||
                (request.query.hLimit && request.query.hLimit > sthConfig.MAX_PAGE_SIZE) ||
                (request.query.hLimit && request.query.lastN && request.query.hLimit > request.query.lastN)
            ) {
                message = 'hLimit <= lastN <= config.maxPageSize';
                sthLogger.warn(
                    request.sth.context,
                    request.method.toUpperCase() + ' ' + request.url.path + ', error=' + message
                );
                error = boom.badRequest(message);
                error.output.payload.validation = {
                    source: 'query',
                    keys: ['lastN', 'hLimit', 'hOffset', 'filetype', 'aggrMethod', 'aggrPeriod', 'count']
                };
                return reply(error);
            }
        }
        getRawData(request, reply);
    } else if (request.query.aggrMethod && request.query.aggrPeriod) {
        // Aggregated data is requested
        getAggregatedData(request, reply);
    } else {
        message =
            'A combination of the following query params is required: lastN, hLimit and hOffset, ' +
            'filetype, or aggrMethod and aggrPeriod';
        sthLogger.warn(
            request.sth.context,
            request.method.toUpperCase() + ' ' + request.url.path + ', error=' + message
        );
        error = boom.badRequest(message);
        error.output.payload.validation = {
            source: 'query',
            keys: ['lastN', 'hLimit', 'hOffset', 'filetype', 'aggrMethod', 'aggrPeriod', 'count']
        };
        return reply(error);
    }
}

module.exports = getDataHandler;
