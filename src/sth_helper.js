/* globals module, process */

(function() {
  "use strict";

  var sthConfig, sthLogger;

  /**
   * Stops the server asynchronously
   * @param {hapi.Server} server The server to be stopped
   * @param {Function} callback Callback function to notify the result
   *  of the operation
   */
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

  /**
   * Closes a connection to the database asynchronously
   * @param {mongoose.connection} connection The connection to be closed
   * @param {Function} callback Callback function to notify the result
   *  of the operation
   */
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

  /**
   * Stops the application stopping the server after completing all the
   *  pending requests and closing the server afterwards
   * @param {Error} err
   * @param {hapi.Server} server The server to stop
   * @param {mongoose.connection} connection The connection to the database
   *  to close
   */
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

  /**
   * Returns the 'origin' based on a date and a resolution. The 'origin' is the
   *  date taken as the reference and starting point for the aggregated data
   *  provided to the clients
   * @param {Date} aDate The data for which the origin has to be calculated
   * @param {string} resolution The resolution (typically, second, minute, hour,
   *  day or month)
   * @returns {Date} The origin calculated for the passed date and resolution
   */
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

  /**
   * Returns the range associated to certain resolution
   * @param {string} resolution The resolution (typically, second, minute,
   *  hour, day or month)
   * @returns {string} The range associated to the passed resolution
   */
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

  /**
   * Returns the object to return in case no aggregated data exists for
   *  certain criteria
   * @param {string} resolution The resolution (typically, second, minute,
   *  hour, day or month)
   * @param {string} range The range (typically, minute, hour, day, month,
   *  or year)
   * @returns {{resolution: *, range: *, origin: null, values: Array}} The
   *  empty response to be responded to the client
   */
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
