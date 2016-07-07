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
var headerValidator = require(ROOT_PATH + '/lib/server/validators/sthHeaderValidator');
var getDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetDataHandler');
var getVersionHandler = require(ROOT_PATH + '/lib/server/handlers/sthGetVersionHandler');
var notificationHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotificationHandler');
var removeDataHandler = require(ROOT_PATH + '/lib/server/handlers/sthRemoveDataHandler');
var setLogLevelHandler = require(ROOT_PATH + '/lib/server/handlers/sthSetLogLevelHandler');
var notFoundHandler = require(ROOT_PATH + '/lib/server/handlers/sthNotFoundHandler');
var hapi = require('hapi');
var joi = require('joi');

var server;

var attendedRequests = 0;

/**
 * Starts the server asynchronously
 * @param {String} host The STH server host
 * @param {String} port The STH server port
 * @param {Function} callback Callback function to notify the result of the operation
 */
function startServer(host, port, callback) {
  server = new hapi.Server();

  server.on('log', function (event, tags) {
    if (tags.load) {
      sthLogger.warn(
        sthConfig.LOGGING_CONTEXT.SERVER_LOG,
        'event=' + JSON.stringify(event)
      );
    }
  });

  server.on('request-internal', function (request, event, tags) {
    if (tags.error) {
      if (tags.auth || tags.handler || tags.state || tags.payload || tags.validation) {
        sthLogger.warn(
          sthServerUtils.getContext(request),
          request.method.toUpperCase() + ' ' + request.url.path +
          ', event=' + JSON.stringify(event)
        );
      } else {
        sthLogger.error(
          sthServerUtils.getContext(request),
          request.method.toUpperCase() + ' ' + request.url.path +
          ', event=' + JSON.stringify(event)
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
      handler: getDataHandler,
      config: {
        validate: {
          headers: headerValidator,
          query: {
            lastN: joi.number().integer().greater(-1).optional(),
            hLimit: joi.number().integer().greater(-1).optional(),
            hOffset: joi.number().integer().greater(-1).optional(),
            aggrMethod: joi.string().valid('max', 'min', 'sum', 'sum2', 'occur').optional(),
            aggrPeriod: joi.string().required().valid('month', 'day', 'hour', 'minute', 'second').optional(),
            dateFrom: joi.date().optional(),
            dateTo: joi.date().optional(),
            filetype: joi.string().optional()
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/version',
      handler: getVersionHandler
    },
    {
      method: 'POST',
      path: '/notify',
      handler: notificationHandler,
      config: {
        validate: {
          headers: headerValidator
        }
      }
    },
    {
      method: 'DELETE',
      path: '/STH/v1/contextEntities',
      handler: removeDataHandler,
      config: {
        validate: {
          headers: headerValidator
        }
      }
    },
    {
      method: 'DELETE',
      path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}',
      handler: removeDataHandler,
      config: {
        validate: {
          headers: headerValidator
        }
      }
    },
    {
      method: 'DELETE',
      path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
      handler: removeDataHandler,
      config: {
        validate: {
          headers: headerValidator
        }
      }
    },
    {
      method: 'PUT',
      path: '/admin/log',
      handler: setLogLevelHandler,
      config: {
        validate: {
          query: {
            level: joi.string().insensitive().valid('FATAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG').required()
          }
        }
      }
    },
    {
      method: '*',
      path: '/{p*}',
      handler: notFoundHandler
    }
  ]);

  // Start the server
  server.start(function (err) {
    return callback(err, server);
  });
}

/**
 * Stops the server asynchronously
 * @param {Function} callback Callback function to notify the result
 *  of the operation
 */
function stopServer(callback) {
  sthLogger.info(
    sthConfig.LOGGING_CONTEXT.SERVER_STOP,
    'Stopping the STH server...'
  );
  if (server && server.info && server.info.started) {
    server.stop(function (err) {
      // Server successfully stopped
      sthLogger.info(
        sthConfig.LOGGING_CONTEXT.SERVER_STOP,
        'hapi server successfully stopped'
      );
      return callback(err);
    });
  } else {
    sthLogger.info(
      sthConfig.LOGGING_CONTEXT.SERVER_STOP,
      'No hapi server running'
    );
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
