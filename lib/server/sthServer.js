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

'use strict';

var ROOT_PATH = require('app-root-path');
var sthLogger = require('logops');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');
var sthHeaderValidator = require(ROOT_PATH + '/lib/server/validators/sthHeaderValidator');
var sthGetDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetDataHandler');
var sthGetVersionHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetVersionHandler');
var sthNotificationHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotificationHandler');
var sthRemoveDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthRemoveDataHandler');
var sthGetLogLevelHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetLogLevelHandler');
var sthSetLogLevelHandler = require(ROOT_PATH + '/lib/server/handlers/sthSetLogLevelHandler');
var sthNotFoundHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotFoundHandler');
var hapi = require('hapi');
var joi = require('joi');

var server;

var attendedRequests = 0;

/**
 * Effectively starts and configures the hapi server
 * @param  {String}   host     The host
 * @param  {Number}   port     The port
 * @param  {Function} callback The callback
 */
function doStartServer(host, port, callback) {
    server = new hapi.Server();

    server.on('log', function(event, tags) {
        if (tags.load) {
            sthLogger.warn(sthConfig.LOGGING_CONTEXT.SERVER_LOG, 'event=' + JSON.stringify(event));
        }
    });

    server.on('request-internal', function(request, event, tags) {
        if (tags.error) {
            if (tags.auth || tags.handler || tags.state || tags.payload || tags.validation) {
                sthLogger.warn(
                    sthServerUtils.getContext(request),
                    request.method.toUpperCase() + ' ' + request.url.path + ', event=' + JSON.stringify(event)
                );
            } else {
                sthLogger.error(
                    sthServerUtils.getContext(request),
                    request.method.toUpperCase() + ' ' + request.url.path + ', event=' + JSON.stringify(event)
                );
            }
        }
    });

    server.connection({
        host: host,
        port: port
    });

    server.route([
        {
            method: 'GET',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
            handler: sthGetDataHandler,
            config: {
                validate: {
                    headers: sthHeaderValidator,
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
            }
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
            config: {
                validate: {
                    headers: sthHeaderValidator
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities',
            handler: sthRemoveDataHandler,
            config: {
                validate: {
                    headers: sthHeaderValidator
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}',
            handler: sthRemoveDataHandler,
            config: {
                validate: {
                    headers: sthHeaderValidator
                }
            }
        },
        {
            method: 'DELETE',
            path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
            handler: sthRemoveDataHandler,
            config: {
                validate: {
                    headers: sthHeaderValidator
                }
            }
        },
        {
            method: 'PUT',
            path: '/admin/log',
            handler: sthSetLogLevelHandler,
            config: {
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
    server.start(function(err) {
        return callback(err, server);
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
    } else {
        doStartServer(host, port, callback);
    }
}

/**
 * Stops the server asynchronously
 * @param {Function} callback Callback function to notify the result
 *  of the operation
 */
function stopServer(callback) {
    sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'Stopping the STH server...');
    if (server && server.info && server.info.started) {
        server.stop(function(err) {
            // Server successfully stopped
            sthLogger.info(sthConfig.LOGGING_CONTEXT.SERVER_STOP, 'hapi server successfully stopped');
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
        attendedRequests: attendedRequests
    };
}

/**
 * Resets the server KPIs
 */
function resetKPIs() {
    attendedRequests = 0;
}

module.exports = {
    get server() {
        return server;
    },
    startServer: startServer,
    stopServer: stopServer,
    getKPIs: getKPIs,
    resetKPIs: resetKPIs
};
