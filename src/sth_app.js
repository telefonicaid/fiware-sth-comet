/* globals process, require */

(function() {
  "use strict";

  var sthConfig = require('./sth_configuration');
  var sthLogger = require('./sth_logger')(sthConfig);
  var sthHelper = require('./sth_helper.js')(sthConfig);
  var sthDatabase = require('./sth_database')(sthConfig, sthLogger, sthHelper);
  var sthServer = require('./sth_server')(sthConfig, sthLogger, sthHelper);

  /**
   * Stops the application stopping the server after completing all the
   *  pending requests and closing the server afterwards
   * @param {Error} err The error provoking the exit if any
   */
  function exitGracefully(err) {
    function callback(err) {
      if (err) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    }

    if (err) {
      sthLogger.fatal(err.toString(), {
        operationType: sthConfig.OPERATION_TYPE.SHUTDOWN
      });
    }

    sthServer.stopServer(sthDatabase.closeConnection.bind(null, callback));
  }

  // Connect to the MongoDB database
  sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_HOST,
    sthConfig.DB_PORT, sthConfig.DB_NAME, function (err) {
      if (err) {
        // Error when connecting to the MongoDB database
        return exitGracefully(err);
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
        sthConfig.HOST, sthConfig.PORT, sthDatabase, function (err) {
          if (err) {
            sthLogger.fatal(err.toString(), {
              operationType: sthConfig.OPERATION_TYPE.SERVER_START
            });
          } else {
            sthLogger.info('Server started at', sthServer.server.info.uri, {
              operationType: sthConfig.OPERATION_TYPE.SERVER_START
            });
          }
        });
    }
  );

  // In case Control+C is clicked, exit gracefully
  process.on('SIGINT', function () {
    return exitGracefully(null);
  });

  // In case of an uncaught exception exists gracefully
  process.on('uncaughtException', function(exception) {
    return exitGracefully(exception);
  });
})();
