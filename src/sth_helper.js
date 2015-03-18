/* globals module, process */

(function() {
  "use strict";

  var sthConfig, sthLogger;

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

  /**
   * Generates a 32 bit integer hash code
   * @param str The seed
   * @returns {number} The hash code
   */
  function getHashCode(str) {
    var hash = 0, i, chr, len;
    if (str && str.length === 0) {
      return hash;
    }
    for (i = 0, len = str.length; i < len; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Generates the UNICA correlator based on a request
   * @param request The HTTP request
   * @returns {string} The generated UNICA correlator
   */
  function getUnicaCorrelator(request) {
    if (!request) {
      return sthConfig.UNICA_CORRELATOR.NOT_AVAILABLE;
    } else {
      return getHashCode('from: ' + request.info.remoteAddress +
      ':' + request.info.remotePort +
      ', method: ' + request.method.toUpperCase() +
      ', url: ' + request.url.path);
    }
  }

  /**
   * Generates the transaction identifier to be used when for logging
   * @returns {string} The generated transaction id
   */
  function getTransactionId() {
    return new Date().getTime();
  }

  /**
   * Returns the operation type for a concrete request to be used for logging
   * @param request The request
   * @returns {string} The operation type
   */
  function getOperationType(request) {
    return sthConfig.OPERATION_TYPE_PREFIX + request.method.toUpperCase();
  }

  /**
   * Returns a date in RFC 3339 format
   * @return {string} The formatted date
   */
  function getISODateString(date){
    function pad(n, isMs){
      var result = n;
      if (!isMs) {
        result = (n < 10) ? '0' + n : n;
      } else if (n < 10) {
        result = '00' + n;
      } else if (n < 100) {
        result = '0' + n;
      }
      return result;
    }

    return date.getUTCFullYear() + '-' +
      pad(date.getUTCMonth() + 1) + '-' +
      pad(date.getUTCDate()) + 'T' +
      pad(date.getUTCHours()) + ':' +
      pad(date.getUTCMinutes()) + ':' +
      pad(date.getUTCSeconds()) + '.' +
      pad(date.getUTCMilliseconds(), true) + 'Z';
  }

  module.exports = function(aSthConfig, aSthLogger) {
    sthConfig = aSthConfig;
    sthLogger = aSthLogger;
    return {
      getOrigin: getOrigin,
      getRange: getRange,
      getEmptyResponse: getEmptyResponse,
      getUnicaCorrelator: getUnicaCorrelator,
      getTransactionId: getTransactionId,
      getOperationType: getOperationType,
      getISODateString: getISODateString
    };
  };
})();
