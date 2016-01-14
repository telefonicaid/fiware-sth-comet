/* globals module, require */

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

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var winston = require('winston');

var sthConfig;

var LOG_LEVEL = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error'
};

var LOG_LEVEL_CONFIG = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Returns a date in RFC 3339 format
 * @return {string} The formatted date
 */
function getISODateString(date) {
  function pad(n, isMs) {
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
    ' | lvl=' + log.level.toUpperCase() +
    ' | corr=' + (log.meta.unicaCorrelator || sthConfig.UNICA_CORRELATOR.NOT_AVAILABLE) +
    ' | trans=' + (log.meta.transactionId || sthConfig.TRANSACTION_ID.NOT_AVAILABLE) +
    ' | op=' + (log.meta.operationType || sthConfig.OPERATION_TYPE.NOT_AVAILABLE) +
    ' | msg=' + log.message +
    ((log.level === LOG_LEVEL.error) ? ', alarm_status=ALARM' : '');
}

module.exports = function (theSthConfig) {
  sthConfig = theSthConfig;

  // Create the directory for the logging files if it does not exist
  if (!fs.existsSync(sthConfig.LOG_DIR) ||
    (fs.existsSync(sthConfig.LOG_DIR) && !fs.statSync(sthConfig.LOG_DIR).isDirectory())) {
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
      maxsize: sthConfig.LOG_FILE_MAX_SIZE_IN_BYTES,
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
