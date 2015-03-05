/* globals process, require */

(function() {
  "use strict";

  var sthConfig = require('./sth_configuration');
  var sthLogger = require('./sth_logger');
  var sthHelper = require('./sth_helper.js')(sthConfig, sthLogger);
  var sthDatabase = require('./sth_database')(sthConfig, sthHelper);
  var sthServer = require('./sth_server')(sthConfig, sthLogger, sthHelper);

  // Connect to the MongoDB database
  sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_HOST,
    sthConfig.DB_PORT, sthConfig.DB_NAME, function (err) {
      if (err) {
        // Error when connecting to the MongoDB database
        return sthHelper.exitGracefully(
          err, sthServer.server, sthDatabase.driver.connection);
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
    sthHelper.exitGracefully(
      null, sthServer.server, sthDatabase.driver.connection);
  });
})();
