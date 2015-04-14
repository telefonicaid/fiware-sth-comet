/* globals module, process, require */

(function() {
  "use strict";

  var path = require('path');

  var ENV = process.env;

  var dbUsername = ENV.DB_USERNAME || '';
  var dbPassword = ENV.DB_PASSWORD || '';

  if (['<servicePath>', '<servicePath-entity>', '<servicePath-entity-attribute>'].indexOf(ENV.DATA_MODEL))

  module.exports = {
    DATA_MODELS: {
      COLLECTIONS_PER_SERVICE_PATH: 1,
      COLLECTIONS_PER_ENTITY: 2,
      COLLECTIONS_PER_ATTRIBUTE: 3
    },
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
    }
  };

  module.exports.LOG_LEVEL = ENV.LOG_LEVEL || 'info';
  module.exports.LOG_TO_CONSOLE = ENV.LOG_TO_CONSOLE !== 'false';
  module.exports.LOG_TO_FILE = ENV.LOG_TO_FILE !== 'false';
  module.exports.LOG_DIR = ENV.LOG_DIR || '.' + path.sep + 'log';
  module.exports.LOG_FILE_NAME = ENV.LOG_FILE_NAME || 'sth_app.log';
  module.exports.SERVICE = ENV.SERVICE || 'orion';
  module.exports.SERVICE_PATH = ENV.SERVICE_PATH || '/';
  module.exports.POOL_SIZE = ENV.POOL_SIZE && !NaN(ENV.POOL_SIZE) ? parseInt(ENV.POOL_SIZE) : 5;
  module.exports.DATA_MODEL = [
      module.exports.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ENTITY,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE
    ].indexOf(ENV.DATA_MODEL) !== -1 ? ENV.DATA_MODEL :
      module.exports.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE;
  module.exports.DB_USERNAME = dbUsername;
  module.exports.DB_PASSWORD = dbPassword;
  module.exports.DB_AUTHENTICATION = (dbUsername && dbPassword) ?
      (dbUsername + ':' + dbPassword) : '';
  module.exports.DB_HOST = ENV.DB_HOST || 'localhost';
  module.exports.DB_PORT = ENV.DB_PORT || '27017';
  module.exports.HOST = ENV.HOST || 'localhost';
  module.exports.PORT = ENV.PORT || 8666;
  module.exports.FILTER_OUT_EMPTY = ENV.FILTER_OUT_EMPTY !== 'false';
})();
