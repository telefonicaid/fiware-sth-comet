/* globals process, require */

(function() {
  "use strict";

  var sthConfig = require('./sth_configuration');
  var sthLogger = require('./sth_logger');
  var sthHelper = require('./sth_helper.js')(sthConfig);
  var sthDatabase = require('./sth_database')(sthConfig, sthHelper);
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
      sthLogger.error(err);
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
      sthLogger.info('Connection to MongoDB %s successfully established',
        sthDatabase.connectionURL);

      // Start the hapi server
      sthServer.startServer(
        sthConfig.HOST, sthConfig.PORT, sthDatabase, function (err) {
          if (err) {
            sthLogger.error(err);
          } else {
            sthLogger.info('Server started at', sthServer.server.info.uri);
          }
        });
    }
  );

  process.on('SIGINT', function () {
    return exitGracefully(null);
  });
})();
