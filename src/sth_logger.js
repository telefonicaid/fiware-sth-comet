/* globals module, require */

(function() {
  "use strict";

  var fs = require('fs');
  var mkdirp = require('mkdirp');
  var path = require('path');
  var winston = require('winston');

  var sthConfig;

  var LOG_LEVEL = {
    trace: 'trace',
    info: 'info',
    debug: 'debug',
    warn: 'warn',
    error: 'error',
    fatal: 'fatal'
  };

  var LOG_LEVEL_CONFIG = {
    trace: 0,
    info: 1,
    debug: 2,
    warn: 3,
    error: 4,
    fatal: 5
  };

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

  /**
   * Formatter function for the winston logger
   * @param log Log data
   * @returns {string} The formatted text to be logged
   */
  function formatter(log) {
    return 'time=' + getISODateString(new Date()) +
      ' | vl=' + log.level.toUpperCase() +
      ' | corr=' + (log.meta.unicaCorrelator || sthConfig.UNICA_CORRELATOR. NOT_AVAILABLE) +
      ' | trans=' + (log.meta.transactionId || sthConfig.TRANSACTION_ID.NOT_AVAILABLE) +
      ' | op=' + (log.meta.operationType || sthConfig.OPERATION_TYPE.NOT_AVAILABLE) +
      ' | msg=' + log.message +
      ((log.level === LOG_LEVEL.fatal) ? ', alarm_status=ALARM' : '');
  }

  module.exports = function(theSthConfig) {
    sthConfig = theSthConfig;

    // Create the directory for the logging files if it does not exist
    if (fs.existsSync(sthConfig.LOG_DIR)) {
      // The path exists
      if (!fs.statSync(sthConfig.LOG_DIR).isDirectory()) {
        // The paths exists but it is not a directory
        mkdirp.sync(sthConfig.LOG_DIR);
      }
    } else {
      // The path does not exist
      mkdirp.sync(sthConfig.LOG_DIR);
    }

    // Logger configuration
    var transports = [];
    if (sthConfig.LOG_TO_CONSOLE) {
      transports.push(new winston.transports.Console({
        level: sthConfig.LOG_LEVEL,
        formatter: formatter
      }));
    }
    if (sthConfig.LOG_TO_FILE) {
      // TODO:
      // Using a File transport instead of the DailyRotateFile one due to
      //  https://github.com/winstonjs/winston/issues/150
      // Issue created to get the problem fixed:
      //  https://github.com/winstonjs/winston/issues/567
      transports.push(new winston.transports.File({
        level: sthConfig.LOG_LEVEL,
        filename: sthConfig.LOG_DIR + path.sep + sthConfig.LOG_FILE_NAME,
        json: false,
        formatter: formatter
      }));
    }

    // Instantiate the logger
    return new winston.Logger({
      levels: LOG_LEVEL_CONFIG,
      transports: transports
    });
  };
})();
