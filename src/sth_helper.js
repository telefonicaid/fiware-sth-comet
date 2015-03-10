/* globals module, process */

(function() {
  "use strict";

  var sthConfig;

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

  module.exports = function (aSthConfig) {
    sthConfig = aSthConfig;
    return {
      getOrigin: getOrigin,
      getRange: getRange,
      getEmptyResponse: getEmptyResponse
    };
  };
})();
