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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var ROOT_PATH = require('app-root-path');
var config = require(ROOT_PATH + '/config.js');
var sthLogger = require('logops');

var ENV = process.env;

module.exports = {
  RESOLUTION: {
    MONTH: 'month',
    DAY: 'day',
    HOUR: 'hour',
    MINUTE: 'minute',
    SECOND: 'second'
  },
  HEADER: {
    CORRELATOR: 'fiware-correlator',
    FIWARE_SERVICE: 'fiware-service',
    FIWARE_SERVICE_PATH: 'fiware-servicepath',
    FIWARE_TOTAL_COUNT: 'fiware-total-count',
    X_REAL_IP: 'x-real-ip'
  },
  OPERATION_TYPE_PREFIX: 'OPER_STH_',
  OPERATION_TYPE: {
    NOT_AVAILABLE: 'NA',
    STARTUP: 'OPER_STH_STARTUP',
    SHUTDOWN: 'OPER_STH_SHUTDOWN',
    DB_CONN_OPEN: 'OPER_STH_DB_CONN_OPEN',
    DB_LOG: 'OPER_STH_DB_LOG',
    DB_CONN_CLOSE: 'OPER_STH_DB_CONN_CLOSE',
    SERVER_START: 'OPER_STH_SERVER_START',
    SERVER_LOG: 'OPER_STH_SERVER_LOG',
    SERVER_STOP: 'OPER_STH_SERVER_STOP'
  },
  DATA_TO_STORE: {
    ONLY_RAW: 'only-raw',
    ONLY_AGGREGATED: 'only-aggregated',
    BOTH: 'both'
  },
  DATA_MODELS: {
    COLLECTION_PER_ATTRIBUTE: 'collection-per-attribute',
    COLLECTION_PER_ENTITY: 'collection-per-entity',
    COLLECTION_PER_SERVICE_PATH: 'collection-per-service-path'
  },
  AGGREGATIONS: {
    NUMERIC: 'numeric',
    TEXTUAL: 'textual'
  }
};

module.exports.LOGGING_CONTEXT = {
  STARTUP: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.STARTUP
  },
  SHUTDOWN: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.SHUTDOWN
  },
  SERVER_START: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.SERVER_START
  },
  SERVER_STOP: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.SERVER_STOP
  },
  SERVER_LOG: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.SERVER_LOG
  },
  DB_CONN_OPEN: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.DB_CONN_OPEN
  },
  DB_CONN_CLOSE: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.DB_CONN_CLOSE
  },
  DB_LOG: {
    from: 'n/a',
    srv: 'n/a',
    subsrv: 'n/a',
    comp: 'STH',
    op: module.exports.OPERATION_TYPE.DB_LOG
  }
};

var invalidLoggingLevel;
var LOGGING_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
if (ENV.LOGOPS_LEVEL && LOGGING_LEVELS.indexOf(ENV.LOGOPS_LEVEL.toUpperCase()) !== -1) {
  module.exports.LOGOPS_LEVEL = ENV.LOGOPS_LEVEL.toUpperCase();
} else if (config && config.logging && config.logging.level &&
  LOGGING_LEVELS.indexOf(config.logging.level.toUpperCase()) !== -1) {
  module.exports.LOGOPS_LEVEL = config.logging.level.toUpperCase();
} else {
  invalidLoggingLevel = true;
  module.exports.LOGOPS_LEVEL = 'INFO';
}
sthLogger.setLevel(module.exports.LOGOPS_LEVEL);

var invalidLoggingFormat;
var LOGGING_FORMATS = ['json', 'dev', 'pipe'];
if (ENV.LOGOPS_FORMAT && LOGGING_FORMATS.indexOf(ENV.LOGOPS_FORMAT.toLowerCase()) !== -1) {
  module.exports.LOGOPS_FORMAT = ENV.LOGOPS_FORMAT.toLowerCase();
} else if (config && config.logging && config.logging.format &&
  LOGGING_FORMATS.indexOf(config.logging.format.toLowerCase()) !== -1) {
  module.exports.LOGOPS_FORMAT = config.logging.format.toLowerCase();
} else {
  invalidLoggingFormat = true;
  module.exports.LOGOPS_FORMAT = 'pipe';
}
switch (module.exports.LOGOPS_FORMAT) {
  case 'json':
    sthLogger.format = sthLogger.formatters.json;
    break;
  case 'dev':
    sthLogger.format = sthLogger.formatters.dev;
    break;
  case 'pipe':
    sthLogger.format = sthLogger.formatters.pipe;
    break;
}

sthLogger.info(
  module.exports.LOGGING_CONTEXT.STARTUP,
  'Starting the STH component configuration...'
);

if (invalidLoggingLevel) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured logging level, setting to default value: ' + module.exports.LOGOPS_LEVEL
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Logging level set to value: ' + module.exports.LOGOPS_LEVEL
  );
}

if (invalidLoggingFormat) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured logging format, setting to default value: ' + module.exports.LOGOPS_FORMAT
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Logging format set to value: ' + module.exports.LOGOPS_FORMAT
  );
}

module.exports.STH_HOST = ENV.STH_HOST || (config && config.server && config.server.host) || 'localhost';
if (!ENV.STH_HOST && !(config && config.server && config.server.host)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured STH host, setting to default value: ' + module.exports.STH_HOST
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'STH host set to value: ' + module.exports.STH_HOST
  );
}

if (ENV.STH_PORT && !isNaN(ENV.STH_PORT)) {
  module.exports.STH_PORT = parseInt(ENV.STH_PORT, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'STH port set to value: ' + module.exports.STH_PORT
  );
} else if (config && config.server && config.server.port && !isNaN(config.server.port)) {
  module.exports.STH_PORT = parseInt(config.server.port, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'STH port set to value: ' + module.exports.STH_PORT
  );
} else {
  module.exports.STH_PORT = 8666;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured STH port, setting to default value: ' + module.exports.STH_PORT
  );
}

module.exports.DEFAULT_SERVICE = ENV.DEFAULT_SERVICE || config.server.defaultService || 'testservice';
if (!ENV.DEFAULT_SERVICE && !(config && config.server && config.server.defaultService)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured default service, setting to default value: ' + module.exports.DEFAULT_SERVICE
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Default service set to value: ' + module.exports.DEFAULT_SERVICE
  );
}

if (ENV.DEFAULT_SERVICE_PATH && ENV.DEFAULT_SERVICE_PATH.charAt(0) === '/') {
  module.exports.DEFAULT_SERVICE_PATH = ENV.DEFAULT_SERVICE_PATH;
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Default service path set to value: ' + module.exports.DEFAULT_SERVICE_PATH
  );
} else if (config && config.server && config.server.defaultServicePath &&
  config.server.defaultServicePath.charAt(0) === '/') {
    module.exports.DEFAULT_SERVICE_PATH = config.server.defaultServicePath;
    sthLogger.info(
      module.exports.LOGGING_CONTEXT.STARTUP,
      'Default service path set to value: ' + module.exports.DEFAULT_SERVICE_PATH
    );
} else {
  module.exports.DEFAULT_SERVICE_PATH = '/testservicepath';
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured default service path, setting to default value: ' + module.exports.DEFAULT_SERVICE_PATH
  );
}

if (ENV.FILTER_OUT_EMPTY) {
  module.exports.FILTER_OUT_EMPTY = (ENV.FILTER_OUT_EMPTY.toLowerCase() !== 'false');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Filter out empty option set to value: ' + module.exports.FILTER_OUT_EMPTY
  );
} else if (config && config.server && config.server.filterOutEmpty) {
  module.exports.FILTER_OUT_EMPTY = (config.server.filterOutEmpty.toLowerCase() !== 'false');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Filter out empty option set to value: ' + module.exports.FILTER_OUT_EMPTY
  );
} else {
  module.exports.FILTER_OUT_EMPTY = true;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured filter out empty option, setting to default value: ' + module.exports.FILTER_OUT_EMPTY
  );
}

module.exports.AGGREGATION_BY = [];
var isEnvAggregationBy = false,
    envAggregationByParseError = false;
if (ENV.AGGREGATION_BY) {
  try {
    var envAggregationBy = JSON.parse(ENV.AGGREGATION_BY);
    if (Array.isArray(envAggregationBy) && envAggregationBy.length) {
      isEnvAggregationBy = true;
      envAggregationBy.forEach(function (entry) {
        if (module.exports.RESOLUTION[entry.toUpperCase()]) {
          module.exports.AGGREGATION_BY.push(entry);
        } else {
          sthLogger.warn(
            module.exports.LOGGING_CONTEXT.STARTUP,
            'The following resolution to include in aggregations is not valid: ' + entry +
            '. It will be ignored. Valid values are: month, day, hour, minute and second.'
          );
        }
      });
    }
  } catch (exception) {
    envAggregationByParseError = true;
  }
}
if (!isEnvAggregationBy || envAggregationByParseError) {
  if (config && config.server && config.server.aggregationBy && Array.isArray(config.server.aggregationBy) &&
    config.server.aggregationBy.length) {
    config.server.aggregationBy.forEach(function (entry) {
      if (module.exports.RESOLUTION[entry.toUpperCase()]) {
        module.exports.AGGREGATION_BY.push(entry);
      } else {
        sthLogger.warn(
          module.exports.LOGGING_CONTEXT.STARTUP,
          'The following resolution to include in aggregations is not valid: ' + entry +
          '. It will be ignored. Valid values are: month, day, hour, minute and second.'
        );
      }
    });
  }
}

if (module.exports.AGGREGATION_BY.length === 0) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'No valid resolutions to aggregate the data by has been configured. Nothing will be aggregated. ' +
    'Please, configure it according to the component documentation in Github.'
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Component configured to aggregate data by the following resolutions: ' + module.exports.AGGREGATION_BY.toString()
  );
}

module.exports.TEMPORAL_DIR = ENV.TEMPORAL_DIR || (config && config.server && config.server.temporalDir) || 'temp';
if (!ENV.TEMPORAL_DIR && !(config && config.server && config.server.temporalDir)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured temporal directory, setting to default value: ' + module.exports.TEMPORAL_DIR
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Temporal directory set to value: ' + module.exports.TEMPORAL_DIR
  );
}

module.exports.MAX_PAGE_SIZE = ENV.MAX_PAGE_SIZE || (config && config.server && config.server.maxPageSize) || '100';
if (!ENV.MAX_PAGE_SIZE && !(config && config.server && config.server.maxPageSize)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured maxPageSize, setting to default value: ' + module.exports.MAX_PAGE_SIZE
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'maxPageSize set to value: ' + module.exports.MAX_PAGE_SIZE
  );
}


var dataModels = [module.exports.DATA_MODELS.COLLECTION_PER_ATTRIBUTE,
  module.exports.DATA_MODELS.COLLECTION_PER_ENTITY,
  module.exports.DATA_MODELS.COLLECTION_PER_SERVICE_PATH];
if(dataModels.indexOf(ENV.DATA_MODEL) !== -1) {
  module.exports.DATA_MODEL = ENV.DATA_MODEL;
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Data model set to value: ' + module.exports.DATA_MODEL);
} else if (dataModels.indexOf(config.database.dataModel) !== -1) {
  module.exports.DATA_MODEL = config.database.dataModel;
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Data model set to value: ' + module.exports.DATA_MODEL);
} else {
  module.exports.DATA_MODEL = module.exports.DATA_MODELS.COLLECTIONS_PER_ENTITY;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured data model, setting to default value: ' + module.exports.DATA_MODEL);
}

module.exports.DB_USERNAME = ENV.DB_USERNAME || (config && config.database && config.database.user) || '';
if (!ENV.DB_USERNAME && !(config && config.database && config.database.user)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured database user, setting to default value: \'' +
      module.exports.DB_USERNAME + '\'');
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database user set to value: ' + module.exports.DB_USERNAME);
}

module.exports.DB_PASSWORD = ENV.DB_PASSWORD || (config && config.database && config.database.password) || '';
if (!ENV.DB_PASSWORD && !(config && config.database && config.database.password)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured database password, setting to default value: \'' +
      module.exports.DB_PASSWORD + '\'');
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database password set to value: ' + module.exports.DB_PASSWORD);
}

module.exports.DB_AUTHENTICATION = (module.exports.DB_USERNAME && module.exports.DB_PASSWORD) ?
  (module.exports.DB_USERNAME + ':' + module.exports.DB_PASSWORD) : '';

module.exports.DB_URI = ENV.DB_URI || (config && config.database && config.database.URI) || 'localhost:27017';
if (!ENV.DB_URI && !(config && config.database && config.database.URI)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured database URI, setting to default value: \'' +
      module.exports.DB_URI + '\'');
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database URI set to value: ' + module.exports.DB_URI);
}

module.exports.REPLICA_SET = ENV.REPLICA_SET || (config && config.database && config.database.replicaSet) || '';
if (!ENV.REPLICA_SET && !(config && config.database && config.database.replicaSet)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured database replica set, setting to default value: \'' +
      module.exports.REPLICA_SET + '\'');
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database replica set set to value: ' + module.exports.REPLICA_SET);
}

module.exports.DB_PREFIX = ENV.DB_PREFIX || config.database.prefix || 'sth_';
if (!ENV.DB_PREFIX && !(config && config.database && config.database.prefix)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured database prefix, setting to default value: ' + module.exports.DB_PREFIX
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database prefix set to value: ' + module.exports.DB_PREFIX
  );
}

module.exports.COLLECTION_PREFIX = ENV.COLLECTION_PREFIX || config.database.collectionPrefix || 'sth_';
if (!ENV.COLLECTION_PREFIX && !(config && config.database && config.database.collectionPrefix)) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Not configured collection prefix, setting to default value: ' + module.exports.COLLECTION_PREFIX
  );
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Collection prefix set to value: ' + module.exports.COLLECTION_PREFIX
  );
}

if (ENV.POOL_SIZE && !isNaN(ENV.POOL_SIZE) && parseInt(ENV.POOL_SIZE, 10) > 0) {
  module.exports.POOL_SIZE = parseInt(ENV.POOL_SIZE, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database pool size set to value: ' + module.exports.POOL_SIZE);
} else if (config.database.poolSize && !isNaN(config.database.poolSize) && parseInt(config.database.poolSize, 10) > 0) {
  module.exports.POOL_SIZE = parseInt(config.database.poolSize, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database pool size set to value: ' + module.exports.POOL_SIZE);
} else {
  module.exports.POOL_SIZE = 5;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database pool size, setting to default value: ' + module.exports.POOL_SIZE
  );
}

try {
  if (ENV.WRITE_CONCERN &&
    (!isNaN(ENV.WRITE_CONCERN) || ENV.WRITE_CONCERN === 'majority' || JSON.parse(ENV.WRITE_CONCERN))) {
    module.exports.WRITE_CONCERN = ENV.WRITE_CONCERN;
    sthLogger.info(
      module.exports.LOGGING_CONTEXT.STARTUP,
      'Database write concern set to value: ' + module.exports.WRITE_CONCERN);
  } else if (config && config.database && config.database.writeConcern &&
    (!isNaN(config.database.writeConcern) || config.database.writeConcern === 'majority' ||
    JSON.parse(config.database.writeConcern))) {
    module.exports.WRITE_CONCERN = config.database.writeConcern;
    sthLogger.info(
      module.exports.LOGGING_CONTEXT.STARTUP,
      'Database write concern set to value: ' + module.exports.WRITE_CONCERN);
  } else {
    module.exports.WRITE_CONCERN = '1';
    sthLogger.warn(
      module.exports.LOGGING_CONTEXT.STARTUP,
      'Invalid or not configured database write concern, setting to default value: ' + module.exports.WRITE_CONCERN);
  }
} catch (exception) {
  module.exports.WRITE_CONCERN = '1';
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database write concern, setting to default value: ' + module.exports.WRITE_CONCERN);
}

if ([
    module.exports.DATA_TO_STORE.ONLY_RAW,
    module.exports.DATA_TO_STORE.ONLY_AGGREGATED,
    module.exports.DATA_TO_STORE.BOTH
  ].indexOf(ENV.SHOULD_STORE) !== -1) {
  module.exports.SHOULD_STORE = ENV.SHOULD_STORE;
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database should store data set to value: ' + module.exports.SHOULD_STORE);
} else if ([
    module.exports.DATA_TO_STORE.ONLY_RAW,
    module.exports.DATA_TO_STORE.ONLY_AGGREGATED,
    module.exports.DATA_TO_STORE.BOTH
  ].indexOf(config.database.shouldStore) !== -1) {
  module.exports.SHOULD_STORE = config.database.shouldStore;
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database should store data set to value: ' + module.exports.SHOULD_STORE);
} else {
  module.exports.SHOULD_STORE = 'both';
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database should store data value, setting to default value: ' +
      module.exports.SHOULD_STORE);
}

if (ENV.TRUNCATION_EXPIRE_AFTER_SECONDS && !isNaN(ENV.TRUNCATION_EXPIRE_AFTER_SECONDS) &&
  parseInt(ENV.TRUNCATION_EXPIRE_AFTER_SECONDS, 10) >= 0) {
  module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS = parseInt(ENV.TRUNCATION_EXPIRE_AFTER_SECONDS, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation expiration time set to value: ' + module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS);
} else if (config && config.database && config.database.truncation && config.database.truncation.expireAfterSeconds &&
  parseInt(config.database.truncation.expireAfterSeconds, 10) >= 0) {
  module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS = parseInt(config.database.truncation.expireAfterSeconds, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation expiration time set to value: ' + module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS);
} else {
  module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS = 0;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database truncation expiration time, setting to default value: ' +
      module.exports.TRUNCATION_EXPIRE_AFTER_SECONDS);
}

if (ENV.TRUNCATION_SIZE && parseInt(ENV.TRUNCATION_SIZE, 10) >= 0) {
  module.exports.TRUNCATION_SIZE = parseInt(ENV.TRUNCATION_SIZE, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation size set to value: ' + module.exports.TRUNCATION_SIZE);
} else if (config && config.database && config.database.truncation && config.database.truncation.size &&
  parseInt(config.database.truncation.size, 10) >= 0) {
  module.exports.TRUNCATION_SIZE = parseInt(config.database.truncation.size, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation size set to value: ' + module.exports.TRUNCATION_SIZE);
} else {
  module.exports.TRUNCATION_SIZE = 0;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database truncation size, setting to default value: ' +
      module.exports.TRUNCATION_SIZE);
}

if (ENV.TRUNCATION_MAX && parseInt(ENV.TRUNCATION_MAX, 10) >= 0) {
  module.exports.TRUNCATION_MAX = parseInt(ENV.TRUNCATION_MAX, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation document number set to value: ' + module.exports.TRUNCATION_MAX);
} else if (config && config.database && config.database.truncation && config.database.truncation.max &&
  parseInt(config.database.truncation.max, 10) >= 0) {
  module.exports.TRUNCATION_MAX = parseInt(config.database.truncation.max, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database truncation document number set to value: ' + module.exports.TRUNCATION_MAX);
} else {
  module.exports.TRUNCATION_MAX = 0;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database truncation document number, setting to default value: ' +
      module.exports.TRUNCATION_MAX);
}

if (ENV.IGNORE_BLANK_SPACES) {
  module.exports.IGNORE_BLANK_SPACES = (ENV.IGNORE_BLANK_SPACES.toLowerCase() !== 'false');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database ignore blank spaces set to value: ' + module.exports.IGNORE_BLANK_SPACES);
} else if (config && config.database && config.database.ignoreBlankSpaces) {
  module.exports.IGNORE_BLANK_SPACES = (config.database.ignoreBlankSpaces.toLowerCase() !== 'false');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database ignore blank spaces set to value: ' + module.exports.IGNORE_BLANK_SPACES);
} else {
  module.exports.IGNORE_BLANK_SPACES = true;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database ignore blank spaces, setting to default value: ' +
      module.exports.IGNORE_BLANK_SPACES);
}

var nameMapping;
if (ENV.NAME_MAPPING) {
  try {
    nameMapping = JSON.parse(ENV.NAME_MAPPING);
  } catch (exception) {
    // Do nothing
  }
}
if (!nameMapping) {
  if (config && config.database && config.database.nameMapping) {
    nameMapping = config.database.nameMapping;
  }
}
if (nameMapping && nameMapping.hasOwnProperty('enabled') && nameMapping.hasOwnProperty('configFile')) {
  if (nameMapping.enabled.toLocaleLowerCase() !== 'false' && !!nameMapping.enabled) {
    try {
      if (typeof nameMapping.configFile === 'string' && nameMapping.configFile[0] === '/') {
        module.exports.NAME_MAPPING = require(nameMapping.configFile);
      } else if (typeof nameMapping.configFile === 'string' && nameMapping.configFile[0] === '.') {
        module.exports.NAME_MAPPING = require(ROOT_PATH + nameMapping.configFile.substring(1));
      } else {
        module.exports.NAME_MAPPING = require(ROOT_PATH + nameMapping.configFile);
      }
    } catch (exception) {
      // Do nothing
    }
  }
}
if (!module.exports.NAME_MAPPING) {
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Disabled, invalid or not configured database name mapping, ignoring the mapping mechanism');
} else {
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database name mapping to be applied: ' + JSON.stringify(module.exports.NAME_MAPPING));
}

if (ENV.NAME_ENCODING) {
  // Default value: "true" (although we will set it to false until the Cygnus counterpart is ready and landed)
  // module.exports.NAME_ENCODING = (ENV.NAME_ENCODING.toLowerCase() !== 'false');
  module.exports.NAME_ENCODING = (ENV.NAME_ENCODING.toLowerCase() === 'true');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database name encoding set to value: ' + module.exports.NAME_ENCODING);
} else if (config && config.database && config.database.nameEncoding) {
  module.exports.NAME_ENCODING = (config.database.nameEncoding.toLowerCase() !== 'false');
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Database name encoding set to value: ' + module.exports.NAME_ENCODING);
} else {
  // Default value: "true" (although we will set it to false until the Cygnus counterpart is ready and landed)
  // module.exports.NAME_ENCODING = true;
  module.exports.NAME_ENCODING = false;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured database name encoding, setting to default value: ' +
      module.exports.NAME_ENCODING);
}

if (module.exports.NAME_ENCODING) {
  module.exports.NAME_SEPARATOR = 'xffff';
} else {
  module.exports.NAME_SEPARATOR = '_';
}

if (ENV.PROOF_OF_LIFE_INTERVAL && !isNaN(ENV.PROOF_OF_LIFE_INTERVAL)) {
  module.exports.PROOF_OF_LIFE_INTERVAL = parseInt(ENV.PROOF_OF_LIFE_INTERVAL, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Proof of life interval set to value: ' + module.exports.PROOF_OF_LIFE_INTERVAL
  );
} else if (config && config.logging && config.logging.proofOfLifeInterval &&
  !isNaN(config.logging.proofOfLifeInterval)) {
  module.exports.PROOF_OF_LIFE_INTERVAL = parseInt(config.logging.proofOfLifeInterval, 10);
  sthLogger.info(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Proof of life interval set to value: ' + module.exports.PROOF_OF_LIFE_INTERVAL
  );
} else {
  module.exports.PROOF_OF_LIFE_INTERVAL = 60;
  sthLogger.warn(
    module.exports.LOGGING_CONTEXT.STARTUP,
    'Invalid or not configured proof of life interval, setting to default value: ' +
      module.exports.PROOF_OF_LIFE_INTERVAL
  );
}

sthLogger.info(
  module.exports.LOGGING_CONTEXT.STARTUP,
  'STH component configuration successfully completed'
);
