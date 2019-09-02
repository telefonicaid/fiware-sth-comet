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

'use strict';

var ROOT_PATH = require('app-root-path');
var sthLogger = require('logops');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');
var sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
var boom = require('boom');
var stream = require('stream');
var fs = require('fs');
var path = require('path');
var encodeRFC5987 = require('rfc5987-value-chars').encode;

/**
 * Returns historical raw data to the client
 * @param {Object}   request The request
 * @param {Function} reply   Hapi's reply function
 */
function getRawData(request, reply) {
    var response;

    sthLogger.debug(request.sth.context, 'Getting access to the raw data collection for retrieval...');

    sthDatabase.getCollection(
        {
            service: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
            servicePath: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
            entityId: request.params.entityId,
            entityType: request.params.entityType,
            attrName: request.params.attrName
        },
        {
            isAggregated: false,
            shouldCreate: false,
            shouldTruncate: false
        },
        function(err, collection) {
            if (err) {
                // The collection does not exist, reply with en empty response
                sthLogger.warn(
                    request.sth.context,
                    "Error when getting the raw data collection for retrieval (the collection '%s' may not exist)",
                    collection
                );

                sthLogger.debug(request.sth.context, 'Responding with no points');
                var emptyResponse = sthServerUtils.getEmptyResponse();
                var ngsiPayload = sthServerUtils.getNGSIPayload(
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
            } else {
                sthLogger.debug(request.sth.context, 'The raw data collection for retrieval exists');

                sthDatabase.getRawData(
                    {
                        collection: collection,
                        entityId: request.params.entityId,
                        entityType: request.params.entityType,
                        attrName: request.params.attrName,
                        lastN: request.query.lastN,
                        hLimit: request.query.hLimit,
                        hOffset: request.query.hOffset,
                        from: request.query.dateFrom,
                        to: request.query.dateTo,
                        filetype: request.query.filetype
                    },
                    function(err, result, totalCount) {
                        if (err) {
                            // Error when getting the raw data
                            sthLogger.error(
                                request.sth.context,
                                "Error when getting raw data from collection '%s'",
                                collection
                            );
                            sthLogger.debug(request.sth.context, 'Responding with 500 - Internal Error');
                            response = reply(err);
                        } else if (!result || !(result.length || result instanceof stream)) {
                            // No raw data available for the request
                            sthLogger.debug(
                                request.sth.context,
                                'No raw data available for the request: ' + request.url.path
                            );

                            sthLogger.debug(request.sth.context, 'Responding with no points');
                            response = reply(
                                sthServerUtils.getNGSIPayload(
                                    request.params.entityId,
                                    request.params.entityType,
                                    request.params.attrName,
                                    sthServerUtils.getEmptyResponse()
                                )
                            );
                        } else {
                            if (result instanceof stream) {
                                sthLogger.debug(request.sth.context, 'Responding with a stream of docs');
                                response = reply(new stream.Readable().wrap(result));
                            } else if (typeof result === 'string') {
                                sthLogger.debug(request.sth.context, "Responding with file '" + result + "'");
                                fs.readFile(result, function(err, data) {
                                    response = reply(data);
                                    var fileName = result.substring(result.lastIndexOf(path.sep) + 1);
                                    response.header(
                                        'Content-Disposition',
                                        "attachment; filename*= utf-8''" + encodeRFC5987(fileName)
                                    );
                                    response.once('finish', function() {
                                        sthLogger.debug(request.sth.context, "Removing file '" + result + "'");
                                        fs.unlink(result, function(err) {
                                            if (!err) {
                                                sthLogger.debug(
                                                    request.sth.context,
                                                    "File '" + result + "' successfully removed"
                                                );
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
                                        request.params.entityId,
                                        request.params.entityType,
                                        request.params.attrName,
                                        result
                                    )
                                );
                            }
                        }
                        sthServerUtils.addFiwareCorrelator(request, response);
                        if (request.query.count) {
                            sthLogger.debug(request.sth.context, 'totalCount %j', totalCount);
                            sthServerUtils.addFiwareTotalCount(totalCount, response);
                        }
                    }
                );
            }
        }
    );
}

/**
 * Returns historical aggregated data to the client
 * @param {Object}   request The request
 * @param {Function} reply   Hapi's reply function
 */
function getAggregatedData(request, reply) {
    var response;

    sthLogger.debug(request.sth.context, 'Getting access to the aggregated data collection for retrieval...');

    sthDatabase.getCollection(
        {
            service: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
            servicePath: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
            entityId: request.params.entityId,
            entityType: request.params.entityType,
            attrName: request.params.attrName
        },
        {
            isAggregated: true,
            shouldCreate: false,
            shouldTruncate: false
        },
        function(err, collection) {
            if (err) {
                // The collection does not exist, reply with en empty response
                sthLogger.warn(
                    request.sth.context,
                    'Error when getting the aggregated data collection for retrieval' +
                        // Overly long line.
                        " (the collection '%s' may not exist)",
                    collection
                );

                sthLogger.debug(request.sth.context, 'Responding with no points');
                var emptyResponse = sthServerUtils.getEmptyResponse();
                var ngsiPayload = sthServerUtils.getNGSIPayload(
                    request.params.entityId,
                    request.params.entityType,
                    request.params.attrName,
                    emptyResponse
                );
                response = reply(ngsiPayload);
                sthServerUtils.addFiwareCorrelator(request, response);
            } else {
                sthLogger.debug(request.sth.context, 'The aggregated data collection for retrieval exists');

                sthDatabase.getAggregatedData(
                    {
                        collection: collection,
                        entityId: request.params.entityId,
                        entityType: request.params.entityType,
                        attrName: request.params.attrName,
                        aggregatedFunction: request.query.aggrMethod,
                        resolution: request.query.aggrPeriod,
                        from: request.query.dateFrom,
                        to: request.query.dateTo,
                        shouldFilter: sthConfig.FILTER_OUT_EMPTY
                    },
                    function(err, result) {
                        if (err) {
                            // Error when getting the aggregated data
                            sthLogger.error(
                                request.sth.context,
                                "Error when getting aggregated data from collection '%s'",
                                collection
                            );
                            sthLogger.debug(request.sth.context, 'Responding with 500 - Internal Error');
                            response = reply(err);
                        } else if (!result || !result.length) {
                            // No aggregated data available for the request
                            sthLogger.debug(
                                request.sth.context,
                                'No aggregated data available for the request: ' + request.url.path
                            );

                            sthLogger.debug(request.sth.context, 'Responding with no points');
                            response = reply(
                                sthServerUtils.getNGSIPayload(
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
                                    request.params.entityId,
                                    request.params.entityType,
                                    request.params.attrName,
                                    result
                                )
                            );
                        }
                        sthServerUtils.addFiwareCorrelator(request, response);
                    }
                );
            }
        }
    );
}

/**
 * Handler for requests of historical raw and aggregated data
 * @param {Object}   request The request
 * @param {Function} reply   The reply() function of the hapi server
 */
function getDataHandler(request, reply) {
    request.sth = request.sth || {};
    request.sth.context = sthServerUtils.getContext(request);
    var message, error;
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
