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
var sthUtils = require(ROOT_PATH + '/lib/utils/sthUtils.js');
var sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
var sthServer = require(ROOT_PATH + '/lib/server/sthServer');

var isStarted = false, proofOfLifeInterval;

/**
 * Stops the application stopping the server after completing all the
 *  pending requests and closing the server afterwards
 * @param {Error} err The error provoking the exit if any
 */
function exitGracefully(err, callback) {
  function onStopped() {
    isStarted = false;
    var exitCode = 0;
    if (err) {
      exitCode = 1;

    } else {
      sthLogger.info(
        sthConfig.LOGGING_CONTEXT.SHUTDOWN,
        'Application exited successfully'
      );
    }
    if (callback) {
      callback(err);
    }
    // TODO:
    // Due to https://github.com/winstonjs/winston/issues/228 we use the
    //  setTimeout() hack. Once the issue is solved, we will fix it.
    setTimeout(process.exit.bind(null, exitCode), 500);
  }

  if (err) {
    var message = err.toString();
    if (message.indexOf('listen EADDRINUSE') !== -1) {
      message += ' (another STH instance maybe already listening on the same port)';
    }
    sthLogger.error(
      sthConfig.LOGGING_CONTEXT.SHUTDOWN,
      message
    );
  }

  if (proofOfLifeInterval) {
    clearInterval(proofOfLifeInterval);
  }
  sthServer.stopServer(sthDatabase.closeConnection.bind(null, onStopped));
}

/**
 * Convenience method to startup the Node.js STH application in case the module
 *  has not been loaded via require
 * @param {Function} callback Callback function to notify when startup process
 *  has concluded
 * @return {*}
 */
function startup(callback) {
  if (isStarted) {
    if (callback) {
      return process.nextTick(callback);
    }
    return;
  }

  var version = sthUtils.getVersion();
  sthLogger.info(
    sthConfig.LOGGING_CONTEXT.SERVER_START,
    'Starting up the STH server version %s...',
    version.version
  );

  // Connect to the MongoDB database
  sthDatabase.connect(
    {
      authentication: sthConfig.DB_AUTHENTICATION,
      dbURI: sthConfig.DB_URI,
      replicaSet: sthConfig.REPLICA_SET,
      database: sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE),
      poolSize: sthConfig.POOL_SIZE
    },
    function (err) {
      if (err) {
        // Error when connecting to the MongoDB database
        return exitGracefully(err, callback);
      }

      // Start the hapi server
      sthServer.startServer(
        sthConfig.STH_HOST, sthConfig.STH_PORT, function (err) {
          if (err) {
            sthLogger.error(
              sthConfig.LOGGING_CONTEXT.SERVER_START,
              err.toString()
            );
            // Error when starting the server
            return exitGracefully(err, callback);
          } else {
            isStarted = true;
            sthLogger.info(
              sthConfig.LOGGING_CONTEXT.SERVER_START,
              'Server started at',
              sthServer.server.info.uri
            );
            proofOfLifeInterval = setInterval(function () {
              sthLogger.info(
                sthConfig.LOGGING_CONTEXT.SERVER_LOG,
                'Everything OK, ' + sthServer.getKPIs().attendedRequests + ' requests attended in the last ' +
                sthConfig.PROOF_OF_LIFE_INTERVAL + 's interval'
              );
              sthServer.resetKPIs();
            }, sthConfig.PROOF_OF_LIFE_INTERVAL * 1000);
            if (callback) {
              return callback();
            }
          }
        }
      );
    }
  );
}

// Starts the STH application up in case this file has not been 'require'd,
//  such as, for example, for testing
if (!module.parent) {
  startup();
}

// In case Control+C is clicked, exit gracefully
process.on('SIGINT', function () {
  return exitGracefully(null);
});

// In case of an uncaught exception exists gracefully
process.on('uncaughtException', function (exception) {
  return exitGracefully(exception);
});

module.exports = {
  startup: startup,
  get sthServer() {
    return sthServer;
  },
  get sthDatabase() {
    return sthDatabase;
  },
  exitGracefully: exitGracefully
};
