/* globals module, process, require */

(function() {
  "use strict";

  var config = require('../config.js');
  var path = require('path');

  var ENV = process.env;

  var dbUsername = ENV.DB_USERNAME || config.database.user || '';
  var dbPassword = ENV.DB_PASSWORD || config.database.password || '';

  module.exports = {
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
      DB_LOG: 'OPER_STH_DB_LOG',
      DB_CONN_CLOSE: 'OPER_STH_DB_CONN_CLOSE',
      SERVER_START: 'OPER_STH_SERVER_START',
      SERVER_LOG: 'OPER_STH_SERVER_LOG',
      SERVER_STOP: 'OPER_STH_SERVER_STOP'
    },
    DB_PREFIX: ENV.DB_PREFIX || config.database.prefix || 'sth_',
    COLLECTION_PREFIX: ENV.COLLECTION_PREFIX || config.database.collectionPrefix || 'sth_',
    DATA_MODELS: {
      COLLECTIONS_PER_SERVICE_PATH: 'collection-per-service-path',
      COLLECTIONS_PER_ENTITY: 'collection-per-entity',
      COLLECTIONS_PER_ATTRIBUTE: 'collection-per-attribute'
    },
    DATA_TO_STORE: {
      ONLY_RAW: 'only-raw',
      ONLY_AGGREGATED: 'only-aggregated',
      BOTH: 'both'
    }
  };

  module.exports.LOG_LEVEL = ENV.LOG_LEVEL || config.logging.level || 'info';
  if (ENV.LOG_TO_CONSOLE) {
    module.exports.LOG_TO_CONSOLE = ENV.LOG_TO_CONSOLE !== 'false';
  } else if (config.logging.toConsole) {
    module.exports.LOG_TO_CONSOLE = config.logging.toConsole !== 'false';
  } else {
    module.exports.LOG_TO_CONSOLE = true;
  }
  if (ENV.LOG_TO_FILE) {
    module.exports.LOG_TO_FILE = ENV.LOG_TO_FILE !== 'false';
  } else if (config.logging.toFile) {
    module.exports.LOG_TO_FILE = config.logging.toFile !== 'false';
  } else {
    module.exports.LOG_TO_FILE = true;
  }
  if (!isNaN(ENV.LOG_FILE_MAX_SIZE_IN_BYTES)) {
    module.exports.LOG_FILE_MAX_SIZE_IN_BYTES = parseInt(ENV.LOG_FILE_MAX_SIZE_IN_BYTES);
  } else if (!isNaN(config.logging.maxFileSize)) {
    module.exports.LOG_FILE_MAX_SIZE_IN_BYTES = parseInt(config.logging.maxFileSize);
  } else {
    module.exports.LOG_FILE_MAX_SIZE_IN_BYTES = 0;
  }
  module.exports.LOG_DIR = ENV.LOG_DIR || config.logging.directoryPath || ('.' + path.sep + 'log');
  module.exports.LOG_FILE_NAME = ENV.LOG_FILE_NAME || config.logging.fileName || 'sth_app.log';
  if (!isNaN(ENV.PROOF_OF_LIFE_INTERVAL)) {
    module.exports.PROOF_OF_LIFE_INTERVAL = ENV.PROOF_OF_LIFE_INTERVAL;
  } else if (!isNaN(config.logging.proofOfLifeInterval)) {
    module.exports.PROOF_OF_LIFE_INTERVAL = config.logging.proofOfLifeInterval;
  } else {
    module.exports.PROOF_OF_LIFE_INTERVAL = '60';
  }
  module.exports.DEFAULT_SERVICE = ENV.DEFAULT_SERVICE || config.database.defaultService || 'orion';
  module.exports.DEFAULT_SERVICE_PATH = ENV.DEFAULT_SERVICE_PATH || config.database.defaultServicePath || '/';
  if (ENV.POOL_SIZE && !isNaN(ENV.POOL_SIZE) && parseInt(ENV.POOL_SIZE) > 0) {
    module.exports.POOL_SIZE = parseInt(ENV.POOL_SIZE);
  } else if (config.database.poolSize && !isNaN(config.database.poolSize) && parseInt(config.database.poolSize) > 0) {
    module.exports.POOL_SIZE = parseInt(config.database.poolSize);
  } else {
    module.exports.POOL_SIZE = 5;
  }
  try {
    if (ENV.WRITE_CONCERN && (!isNaN(ENV.WRITE_CONCERN) || ENV.WRITE_CONCERN === 'majority' || JSON.parse(ENV.WRITE_CONCERN))) {
      module.exports.WRITE_CONCERN = ENV.WRITE_CONCERN;
    } else if (config.database.writeConcern && (!isNaN(config.database.writeConcern) || config.database.writeConcern === 'majority' || JSON.parse(config.database.writeConcern))) {
      module.exports.WRITE_CONCERN = config.database.writeConcern;
    } else {
      module.exports.WRITE_CONCERN = 1;
    }
  } catch (exception) {
    module.exports.WRITE_CONCERN = config.database.writeConcern || 1;
  }
  if ([
      module.exports.DATA_TO_STORE.ONLY_RAW,
      module.exports.DATA_TO_STORE.ONLY_AGGREGATED,
      module.exports.DATA_TO_STORE.BOTH
    ].indexOf(ENV.SHOULD_STORE) !== -1) {
    module.exports.SHOULD_STORE = ENV.SHOULD_STORE;
  } else if ([
      module.exports.DATA_TO_STORE.ONLY_RAW,
      module.exports.DATA_TO_STORE.ONLY_AGGREGATED,
      module.exports.DATA_TO_STORE.BOTH
    ].indexOf(config.database.shouldStore) !== -1) {
    module.exports.SHOULD_STORE = config.database.shouldStore;
  } else {
    module.exports.SHOULD_STORE = 'both';
  }
  if ([
      module.exports.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ENTITY,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE
    ].indexOf(ENV.DATA_MODEL) !== -1) {
    module.exports.DATA_MODEL = ENV.DATA_MODEL;
  } else if([
      module.exports.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ENTITY,
      module.exports.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE
    ].indexOf(config.database.dataModel) !== -1) {
    module.exports.DATA_MODEL = config.database.dataModel;
  } else {
    module.exports.DATA_MODEL = 'collection-per-entity';
  }
  if (ENV.SHOULD_HASH) {
    module.exports.SHOULD_HASH = ENV.SHOULD_HASH !== 'false';
  } else if (config.database.shouldHash) {
    module.exports.SHOULD_HASH = config.database.shouldHash !== 'false';
  } else {
    module.exports.SHOULD_HASH = false;
  }
  module.exports.DB_USERNAME = dbUsername;
  module.exports.DB_PASSWORD = dbPassword;
  module.exports.DB_AUTHENTICATION = (dbUsername && dbPassword) ?
      (dbUsername + ':' + dbPassword) : '';
  module.exports.DB_URI = ENV.DB_URI || config.database.URI || 'localhost:27017';
  module.exports.REPLICA_SET = ENV.REPLICA_SET || config.database.replicaSet || '';
  module.exports.STH_HOST = ENV.STH_HOST || config.server.host || 'localhost';
  if (!isNaN(ENV.STH_PORT)) {
    module.exports.STH_PORT = parseInt(ENV.STH_PORT);
  } else if (!isNaN(config.server.port)) {
    module.exports.STH_PORT = parseInt(config.server.port);
  } else {
    module.exports.STH_PORT = 8666;
  }
  if (ENV.FILTER_OUT_EMPTY) {
    module.exports.FILTER_OUT_EMPTY = ENV.FILTER_OUT_EMPTY !== 'false';
  } else if (config.server.filterOutEmpty) {
    module.exports.FILTER_OUT_EMPTY = config.server.filterOutEmpty !== 'false';
  } else {
    module.exports.FILTER_OUT_EMPTY = true;
  }
})();
