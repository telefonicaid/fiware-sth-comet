/* globals module, process */

(function() {
  "use strict";

  var sthConfig, sthLogger;

  function stopServer(server, callback) {
    if (server) {
      server.stop(function () {
        // Server successfully stopped
        sthLogger.info('hapi server successfully stopped');
        return callback();
      });
    } else {
        return callback();
    }
  }

  function closeDBConnection(connection, callback) {
    if (connection &&
      (connection.readyState === 1 || connection.readyState === 2)) {
      connection.close(function () {
        // Connection to database closed
        sthLogger.info('Connection to MongoDb succesfully closed');
          return callback();
      });
    } else {
        return callback();
    }
  }

  function exitGracefully(err, server, connection) {
    if (err) {
      sthLogger.error(err);
    }

    stopServer(server, closeDBConnection.bind(null, connection, function () {
      if (err) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    }));
  }

  function getOrigin(aDate, resolution) {
    var year = aDate.getUTCFullYear(),
      month = aDate.getUTCMonth(),
      date = aDate.getUTCDate(),
      hours = aDate.getUTCHours(),
      minutes = aDate.getUTCMinutes(),
      seconds = aDate.getUTCSeconds();

    switch (resolution) {
      case sthConfig.RESOLUTION.MONTH:
        month = 0;
      /* falls through */
      case sthConfig.RESOLUTION.DAY:
        date = 1;
      /* falls through */
      case sthConfig.RESOLUTION.HOUR:
        hours = 0;
      /* falls through */
      case sthConfig.RESOLUTION.MINUTE:
        minutes = 0;
      /* falls through */
      case sthConfig.RESOLUTION.SECOND:
        seconds = 0;
        break;
      default:
        return null;
    }
    return new Date(Date.UTC(year, month, date, hours, minutes, seconds));
  }

  function getRange(resolution) {
    var RESOLUTION = sthConfig.RESOLUTION,
      RANGE = sthConfig.RANGE;
    if (resolution === RESOLUTION.MONTH) {
      return RANGE.YEAR;
    } else if (resolution === RESOLUTION.WEEK) {
      return RANGE.YEAR;
    } else if (resolution === RESOLUTION.DAY) {
      return RANGE.MONTH;
    } else if (resolution === RESOLUTION.HOUR) {
      return RANGE.DAY;
    } else if (resolution === RESOLUTION.MINUTE) {
      return RANGE.HOUR;
    } else if (resolution === RESOLUTION.SECOND) {
      return RANGE.MINUTE;
    } else {
      return null;
    }
  }

  function getEmptyResponse(resolution, range) {
    return {
      resolution: resolution,
      range: range,
      origin: null,
      values: []
    };
  }

  module.exports = function (aSthConfig, aSthLogger) {
    sthConfig = aSthConfig;
    sthLogger = aSthLogger;
    return {
      exitGracefully: exitGracefully,
      getOrigin: getOrigin,
      getRange: getRange,
      getEmptyResponse: getEmptyResponse
    };
  };
})();
