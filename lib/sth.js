/* globals module, process, require */

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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var sthConfig = require('./sth_configuration');
var sthLogger = require('./sth_logger')(sthConfig);
var sthHelper = require('./sth_helper.js')(sthConfig);
var sthDatabase = require('./sth_database')(sthConfig, sthLogger, sthHelper);
var sthServer = require('./sth_server')(sthConfig, sthLogger, sthHelper);

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
      sthLogger.info('Application exited successfully', {
        operationType: sthConfig.OPERATION_TYPE.SHUTDOWN
      });
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
    sthLogger.error(message, {
      operationType: sthConfig.OPERATION_TYPE.SHUTDOWN
    });
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
    return process.nextTick(callback);
  }

  var version = sthHelper.getVersion();
  sthLogger.info(
    'Starting up STH server version %s...',
    version.version,
    {
      operationType: sthConfig.OPERATION_TYPE.SERVER_START
    }
  );
  sthLogger.info(
    'STH server configuration parameters:',
    JSON.stringify(sthConfig),
    {
      operationType: sthConfig.OPERATION_TYPE.SERVER_START
    }
  );
  if (sthConfig.TRUNCATION_SIZE === '0' && sthConfig.TRUNCATION_MAX !== '0') {
    sthLogger.info(
      'Setting the TRUNCATION_MAX configuration parameter and not setting the TRUNCATION_SIZE one has no effect ' +
      'regarding collection size truncation as imposed by MongoDB...',
      {
        operationType: sthConfig.OPERATION_TYPE.SERVER_START
      }
    );
  }

  // Connect to the MongoDB database
  sthDatabase.connect(
    {
      authentication: sthConfig.DB_AUTHENTICATION,
      dbURI: sthConfig.DB_URI,
      replicaSet: sthConfig.REPLICA_SET,
      database: sthConfig.DEFAULT_SERVICE,
      poolSize: sthConfig.POOL_SIZE
    },
    function (err) {
      if (err) {
        // Error when connecting to the MongoDB database
        return exitGracefully(err, callback);
      }

      // Connection to the MongoDB database successfully established
      sthLogger.info(
        'Connection to MongoDB %s successfully established',
        sthDatabase.connectionURL,
        {
          operationType: sthConfig.OPERATION_TYPE.DB_CONN_OPEN
        }
      );

      // Start the hapi server
      sthServer.startServer(
        sthConfig.STH_HOST, sthConfig.STH_PORT, sthDatabase, function (err) {
          if (err) {
            sthLogger.error(err.toString(), {
              operationType: sthConfig.OPERATION_TYPE.SERVER_START
            });
            // Error when starting the server
            return exitGracefully(err, callback);
          } else {
            isStarted = true;
            sthLogger.info('Server started at', sthServer.server.info.uri, {
              operationType: sthConfig.OPERATION_TYPE.SERVER_START
            });
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
  startup(function () {
    proofOfLifeInterval = setInterval(function () {
      sthLogger.info('Everything OK, ' + sthServer.getKPIs().attendedRequests + ' requests attended in the last ' +
        sthConfig.PROOF_OF_LIFE_INTERVAL + 's interval', {
        operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
      });
      sthServer.resetKPIs();
    }, parseInt(sthConfig.PROOF_OF_LIFE_INTERVAL, 10) * 1000);
  });
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
