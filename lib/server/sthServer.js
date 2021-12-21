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

/* eslint-disable consistent-return */

const ROOT_PATH = require('app-root-path');
const sthLogger = require('logops');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');
const sthHeaderValidator = require(ROOT_PATH + '/lib/server/validators/sthHeaderValidator');
const sthGetDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetDataHandler');
const sthGetDataHandlerV2 = require(ROOT_PATH + '/lib/server/handlers/sthGetDataHandlerV2');
const sthGetVersionHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetVersionHandler');
const sthNotificationHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotificationHandler');
const sthRemoveDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthRemoveDataHandler');
const sthGetLogLevelHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetLogLevelHandler');
const sthSetLogLevelHandler = require(ROOT_PATH + '/lib/server/handlers/sthSetLogLevelHandler');
const sthNotFoundHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotFoundHandler');
const hapi = require('@hapi/hapi');
const joi = require('joi');

let server;

let attendedRequests = 0;

let processedRequestsWithError = 0;

/**
 * Effectively starts and configures the hapi server
 * @param  {String}   host     The host
 * @param  {Number}   port     The port
 * @param  {Function} callback The callback
 */
function doStartServer(host, port, callback) {
    /**
     * Returns the configuration for NGSI handlers
     * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
     */
    function getNgsiHandlerConfig(ngsiVersion) {
        function failActionHandler(request, reply, error) {
            sthLogger.info('failActionHandler %j', error);
            let response;
            // In the case of NGSIv2, this function adapts from the error response format used
            // by hapi to the one used in NGSIv2
            response = reply
                .response({ error: 'BadRequest', description: error.output.payload.message })
                .code(400)
                .takeover();
            return response;
        }

        const options = {
            validate: {
                //headers: sthHeaderValidator,
                query: {
                    // prettier-ignore
                    lastN: joi.number().integer().greater(-1).optional(),
                    // prettier-ignore
                    hLimit: joi.number().integer().greater(-1).optional(),
                    // prettier-ignore
                    hOffset: joi.number().integer().greater(-1).optional(),
                    // prettier-ignore
                    aggrMethod: joi.string().valid(
                        'max', 'min', 'sum', 'sum2', 'occur').optional(),
                    // prettier-ignore
                    aggrPeriod: joi.string().required().valid(
                        'month', 'day', 'hour', 'minute', 'second').optional(),
                    dateFrom: joi.date().optional(),
                    dateTo: joi.date().optional(),
                    filetype: joi.string().optional(),
                    count: joi.boolean().optional()
                }
            }
        };

        if (ngsiVersion === 2) {
            options.validate.failAction = failActionHandler;

            // In NGSIv2 type query param is mandatory
            options.validate.query.type = joi.string().required();
        }

        return options;
    }
    if (sthConfig.corsEnabled) {
        sthLogger.info('CORS is enabled');
        server = new hapi.Server({
            host: host,
            port: port,
            routes: {
                cors: {
                    origin: sthConfig.corsOptions.origin,
                    headers: sthConfig.corsOptions.headers,
                    additionalHeaders: sthConfig.corsOptions.additionalHeaders,
                    credentials: sthConfig.corsOptions.credentials
                }
            }
        });
    } else {
        sthLogger.info('CORS is disabled');
        server = new hapi.Server({
            host: host,
            port: port
        });
    }

    server.events.on('log', function(event, tags) {
        if (tags.load) {
            sthLogger.warn(sthConfig.LOGGING_CONTEXT.SERVER_LOG, 'event=' + JSON.stringify(event));
        }
    });

    // server.events.on('request-internal', function(request, event, tags) {
    //     if (tags.error) {
    //         processedRequestsWithError++;
    //         if (tags.auth || tags.handler || tags.state || tags.payload || tags.validation) {
    //             sthLogger.warn(
    //                 sthServerUtils.getContext(request),
    //                 request.method.toUpperCase() + ' ' + request.url.path + ', event=' + JSON.stringify(event)
    //             );
    //         } else {
    //             sthLogger.error(
    //                 sthServerUtils.getContext(request),
    //                 request.method.toUpperCase() + ' ' + request.url.path + ', event=' + JSON.stringify(event)
    //             );
    //         }
    //     } else if (tags.error === undefined && request._isReplied) {
    //         attendedRequests++;
    //     }
    // });

    server.route([
        {
            method: 'GET',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
            handler: sthGetDataHandler,
            options: getNgsiHandlerConfig(1)
        },
        {
            method: 'GET',
            path: '/STH/v2/entities/{entityId}/attrs/{attrName}',
            handler: sthGetDataHandlerV2,
            options: getNgsiHandlerConfig(2)
        },
        {
            method: 'GET',
            path: '/version',
            handler: sthGetVersionHandler
        },
        {
            method: 'POST',
            path: '/notify',
            handler: sthNotificationHandler,
            options: {
                validate: {
                    //headers: sthHeaderValidator // TBD
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities',
            handler: sthRemoveDataHandler,
            options: {
                validate: {
                    //headers: sthHeaderValidator // TBD
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}',
            handler: sthRemoveDataHandler,
            options: {
                validate: {
                    //headers: sthHeaderValidator // TBD
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
            handler: sthRemoveDataHandler,
            options: {
                validate: {
                    //headers: sthHeaderValidator // TBD
                }
            }
        },
        {
            method: 'PUT',
            path: '/admin/log',
            handler: sthSetLogLevelHandler,
            options: {
                validate: {
                    query: {
                        // prettier-ignore
                        level: joi.string().insensitive().valid('FATAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG').required()
                    }
                }
            }
        },
        {
            method: 'GET',
            path: '/admin/log',
            handler: sthGetLogLevelHandler
        },
        {
            method: '*',
            path: '/{p*}',
            handler: sthNotFoundHandler
        }
    ]);
    // Start the server
    server
        .start()
        .then(() => {
            sthLogger.info('Server running on %s', server.info.uri);
            return callback(null, server);
        }) // if needed
        .catch((err) => {
            sthLogger.error('Server error  %s', err);
            return callback(err, null);
        });
}

/**
 * Starts the server asynchronously
 * @param {String} host The STH server host
 * @param {String} port The STH server port
 * @param {Function} callback Callback function to notify the result of the operation
 */
function startServer(host, port, callback) {
    if (server && server.info && server.info.started) {
        sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'STH server already started');
        return process.nextTick(callback.bind(null, null, server));
    }
    doStartServer(host, port, callback);
}

/**
 * Stops the server asynchronously
 * @param {Function} callback Callback function to notify the result
 *  of the operation
 */
function stopServer(callback) {
    sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'Stopping the STH server...');
    if (server && server.info && server.info.started) {
        // or use a promise
        server
            .stop()
            .then(() => {
                // Server successfully stopped
                sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'hapi server successfully stopped');
                return callback(null);
            }) // if needed
            .catch((err) => {
                sthLogger.error(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'hapi server error stopped %s', err);
                return callback(err);
            });
    } else {
        sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'No hapi server running');
        return process.nextTick(callback);
    }
}

/**
 * Returns the server KPIs
 * @return {{attendedRequests: number}}
 */
function getKPIs() {
    return {
        attendedRequests
    };
}

/**
 * Returns the counter for processed requests with error
 * @return {{processedRequestsWithError: number}}
 */
function getProcessedRequestsWithErrorCount() {
    return {
        processedRequestsWithError
    };
}

/**
 * Resets the server KPIs
 */
function resetKPIs() {
    attendedRequests = 0;
}

/**
 * Resets the counter for processed requests with error
 */
function resetProcessedRequestsWithErrorCount() {
    processedRequestsWithError = 0;
}

module.exports = {
    get server() {
        return server;
    },
    startServer,
    stopServer,
    getKPIs,
    getProcessedRequestsWithErrorCount,
    resetKPIs,
    resetProcessedRequestsWithErrorCount
};
