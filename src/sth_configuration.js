/* globals module, process, require */

(function() {
  "use strict";

  var path = require('path');

  var ENV = process.env;

  var dbUsername = ENV.DB_USERNAME || '';
  var dbPassword = ENV.DB_PASSWORD || '';

  module.exports = {
    LOG_LEVEL: ENV.LOG_LEVEL || 'info',
    LOG_TO_CONSOLE: ENV.LOG_TO_CONSOLE !== 'false',
    LOG_TO_FILE: ENV.LOG_TO_FILE !== 'false',
    LOG_DIR: ENV.LOG_DIR || '.' + path.sep + 'log',
    LOG_FILE_NAME: ENV.LOG_FILE_NAME || 'sth_app.log',
    DB_NAME: ENV.DB_NAME || 'test',
    DB_USERNAME: dbUsername,
    DB_PASSWORD: dbPassword,
    DB_AUTHENTICATION: (dbUsername && dbPassword) ?
      (dbUsername + ':' + dbPassword) : '',
    DB_HOST: ENV.DB_HOST || 'localhost',
    DB_PORT: ENV.DB_PORT || '27017',
    HOST: ENV.HOST || 'localhost',
    PORT: ENV.PORT || 8666,
    RANGE: {
      YEAR: 'year',
      MONTH: 'month',
      WEEK: 'week',
      DAY: 'day',
      HOUR: 'hour',
      MINUTE: 'minute'
    },
    RESOLUTION: {
      MONTH: 'month',
      WEEK: 'week',
      DAY: 'day',
      HOUR: 'hour',
      MINUTE: 'minute',
      SECOND: 'second'
    },
    UNICA_CORRELATOR_HEADER: 'unica-correlator',
    UNICA_CORRELATOR: {
      NOT_AVAILABLE: 'NA'
    },
    OPERATION_TYPE_PREFIX: 'OPER_STH_',
    TRANSACTION_ID: {
      NOT_AVAILABLE: 'NA'
    },
    OPERATION_TYPE: {
      NOT_AVAILABLE: 'NA',
      SHUTDOWN: 'OPER_STH_SHUTDOWN',
      DB_CONN_OPEN: 'OPER_STH_DB_CONN_OPEN',
      DB_CONN_CLOSE: 'OPER_STH_DB_CONN_CLOSE',
      SERVER_START: 'OPER_STH_SERVER_START',
      SERVER_LOG: 'OPER_STH_SERVER_LOG',
      SERVER_STOP: 'OPER_STH_SERVER_STOP'
    },
    FILTER_OUT_EMPTY: ENV.FILTER_OUT_EMPTY !== 'false'
  };
})();
