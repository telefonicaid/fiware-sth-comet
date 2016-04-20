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

var sthDatabaseModel = require('../../lib/sth_database_model');
var sthConfig = require('../../lib/sth_configuration');
var sthHelper = require('../../lib/sth_helper');
var sthDatabase = require('../../lib/sth_database');
var sthTestConfig = require('./sth_test_configuration');
var expect = require('expect.js');
var async = require('async');

console.log('*** Running the server tests with the following environment variables:');
console.log('\n***** STH app environment variables:');
console.log(sthConfig);

var DATABASE_NAME = sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE);
var DATABASE_CONNECTION_PARAMS = {
  authentication: sthConfig.DB_AUTHENTICATION,
  dbURI: sthConfig.DB_URI,
  replicaSet: sthConfig.REPLICA_SET,
  database: DATABASE_NAME,
  poolSize: sthConfig.POOL_SIZE
};
var COLLECTION_NAME_PARAMS = {
  databaseName: DATABASE_NAME,
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME
};
var ATTRIBUTE = {
  NAME: 'attrName',
  TYPE: 'attrType',
  VALUE: {
    NUMERIC: 666
  },
  RECV_TIME: {}
};
ATTRIBUTE.RECV_TIME[sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH] = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
ATTRIBUTE.RECV_TIME[sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY] = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 555));
ATTRIBUTE.RECV_TIME[sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE] = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 999));

/**
 * Connects to the database and returns the database connection asynchronously
 * @param  {Function} callback The callblack
 */
function connectToDatabase(callback) {
  if (sthDatabase.connection) {
    return process.nextTick(callback.bind(null, null, sthDatabase.connection));
  }
  sthDatabase.connect(DATABASE_CONNECTION_PARAMS, callback);
}

/**
 * Drops a database collection for the provided data type and model asynchronously
 * @param  {String}   type      The data type
 * @param  {String}   dataModel The data model
 * @param  {Function} callback  The Callback
 */
function dropCollection(type, dataModel, callback) {
  sthConfig.DATA_MODEL = dataModel;
  var collectionName = (type === sthTestConfig.DATA_TYPES.RAW) ?
    sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
    sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS);

  sthDatabase.connection.dropCollection(collectionName, function (err) {
    if (err && err.code === 26 && err.name === 'MongoError' && err.message === 'ns not found') {
      // The collection does not exist
      return process.nextTick(callback);
    }
    return process.nextTick(callback.bind(null, err));
  });
}

/**
 * Drops the collection hash to name collectionName
 * @param  {Function} callback The callback
 */
function dropCollectionNamesCollection(callback) {
  sthDatabase.connection.dropCollection(sthConfig.COLLECTION_PREFIX + 'collection_names', function (err) {
    if (err && err.code === 26 && err.name === 'MongoError' && err.message === 'ns not found') {
      // The collection does not exist
      return process.nextTick(callback);
    }
    return process.nextTick(callback.bind(null, err));
  });
}

/**
 * Set of tests to drop the test collections from the database
 * @param  {String} dataType The data type
 */
function cleanDatabaseTests(dataType) {
  var dataModelsKeys = Object.keys(sthConfig.DATA_MODELS);
  describe('database clean up', function() {
    for (var index1 = 0; index1 < dataModelsKeys.length; index1++) {
      it('should drop the ' + sthConfig.DATA_MODELS[dataModelsKeys[index1]] + ' ' + dataType +
        ' data collection if it exists', dropCollection.bind(null, dataType,
          sthConfig.DATA_MODELS[dataModelsKeys[index1]]));
    }
    it('should drop the ' + sthConfig.COLLECTION_PREFIX + 'collection_names if it exists',
      dropCollectionNamesCollection);
  });
}

/**
 * Inserts data into the database for the provided data type and model asynchronously
 * @param  {String}   dataType        The data type
 * @param  {String}   aggregationType The aggregation type
 * @param  {String}   dataModel       The data model
 * @param  {Function} callback        The callback
 */
function insertData(dataType, aggregationType, dataModel, callback) {
  var INSERTION_PARAMS,
      collectionName,
      attribute = {};

  attribute.name = ATTRIBUTE.NAME;
  attribute.type = ATTRIBUTE.TYPE;
  attribute.value = (aggregationType === sthConfig.AGGREGATION.TYPES.NUMERIC ?
    ATTRIBUTE.VALUE.NUMERIC : dataModel);

  sthConfig.DATA_MODEL = dataModel;
  collectionName = (dataType === sthTestConfig.DATA_TYPES.RAW) ?
    sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
    sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS);

  sthDatabase.connection.collection(collectionName, function(err, collection) {
    if (err) {
      return process.nextTick(callback.bind(null, err));
    }

    INSERTION_PARAMS = {
      collection: collection,
      recvTime: ATTRIBUTE.RECV_TIME[dataModel],
      entityId: sthTestConfig.ENTITY_ID,
      entityType: sthTestConfig.ENTITY_TYPE,
      attribute: attribute,
      notificationInfo: { inserts: true }
    };

    if (sthConfig.SHOULD_HASH) {
      sthDatabase.storeCollectionHash(COLLECTION_NAME_PARAMS, sthDatabase.isAggregated(collectionName), collectionName,
        function(err) {
          if (err && (err.message !== 'Collection name hash collision' &&
              err.message.indexOf('E11000 duplicate key error collection') === -1)) {
            return process.nextTick(callback.bind(null, err));
          }
          if (dataType === sthTestConfig.DATA_TYPES.RAW) {
            sthDatabase.storeRawData(INSERTION_PARAMS, callback);
          } else {
            sthDatabase.storeAggregatedData(INSERTION_PARAMS, callback);
          }
        }
      );
    } else {
      if (dataType === sthTestConfig.DATA_TYPES.RAW) {
        sthDatabase.storeRawData(INSERTION_PARAMS, callback);
      } else {
        sthDatabase.storeAggregatedData(INSERTION_PARAMS, callback);
      }
    }
  });
}

/**
 * Checks if the passed database is included in the analysis result
 * @param  {Object}  analysis     The analysis result
 * @param  {String}  databaseName The database name
 * @return {Boolean}              True if the database is included in the analysis result, false otherwise
 */
function isDatabaseIncluded(analysis, databaseName) {
  for (var index = 0; index < analysis.result.length; index++) {
    if (analysis.result[index].databaseName === databaseName) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the passed collection of the passed database is included in the analysis result
 * @param  {Object}  analysis       The analysis result
 * @param  {String}  databaseName   The database name
 * @param  {String}  collectionName The collection name
 * @return {Boolean}                True if the collection is included in the analysis result, false otherwise
 */
function isCollectionIncluded(analysis, databaseName, collectionName) {
  for (var index1 = 0; index1 < analysis.result.length; index1++) {
    if (analysis.result[index1].databaseName === databaseName) {
      for (var index2 = 0; index2 < analysis.result[index1].collections2Migrate.length; index2++) {
        if (analysis.result[index1].collections2Migrate[index2].collectionName === collectionName) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Test case to validate that the expected database and collections are included in the analysis result for the passed
 *  data type and model
 * @param  {String}   dataType        The data type
 * @param  {String}   originDataModel The origin data model
 * @param  {String}   targetDataModel The target data model
 * @param  {Function} done            mocha's done() function
 */
function analysisInclusionTest(dataType, originDataModel, targetDataModel, done) {
  sthConfig.DATA_MODEL = targetDataModel;
  sthDatabaseModel.getDataModelAnalysis(function(err, analysis) {
    if (err) {
      return done(err);
    }
    expect(analysis.currentDataModel).to.equal(targetDataModel);
    expect(isDatabaseIncluded(analysis, DATABASE_NAME)).to.equal(true);
    sthConfig.DATA_MODEL = originDataModel;
    expect(
      isCollectionIncluded(analysis, DATABASE_NAME,
        dataType === sthTestConfig.DATA_TYPES.RAW ?
          sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
          sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS))
    ).to.equal(true);
    done();
  });
}

/**
 * Test case to validate that the expected database and collections are included in the analysis result for the passed
 *  data type and model
 * @param  {String}   dataType        The data type
 * @param  {String}   originDataModel The origin data model
 * @param  {String}   targetDataModel The target data model
 * @param  {Function} done            mocha's done() function
 */
function analysisExclusionTest(dataType, originDataModel, targetDataModel, done) {
  sthConfig.DATA_MODEL = targetDataModel;
  sthDatabaseModel.getDataModelAnalysis(function(err, analysis) {
    if (err) {
      return done(err);
    }
    expect(analysis.currentDataModel).to.equal(targetDataModel);
    sthConfig.DATA_MODEL = originDataModel;
    expect(
      isCollectionIncluded(analysis, DATABASE_NAME,
        dataType === sthTestConfig.DATA_TYPES.RAW ?
          sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
          sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS))
    ).to.equal(false);
    done();
  });
}

/**
 * Set of tests to check that the analysis works fine for the collection-per-attribute collections
 * @param  {String}  dataType        The data type
 * @param  {String}  aggregationType The aggregation type
 */
function collectionPerAttributeAnalysisTests(dataType, aggregationType) {
  describe('collection per attribute analysis', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE));

    it('should not detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' data model',
      analysisExclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    cleanDatabaseTests(dataType);
  });
}

/**
 * Set of tests to check that the analysis works fine for the collection-per-entity collections
 * @param  {String}  dataType        The data type
 * @param  {String}  aggregationType The aggregation type
 */
function collectionPerEntityAnalysisTests(dataType, aggregationType) {
  describe('collection per entity analysis', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType, sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should not detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' data model',
      analysisExclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    cleanDatabaseTests(dataType);
  });
}

/**
 * Set of tests to check that the analysis works fine for the collection-per-service-path collections
 * @param  {String}  dataType        The data type
 * @param  {String}  aggregationType The aggregation type
 */
function collectionPerServicePathAnalysisTests(dataType, aggregationType) {
  describe('collection per service path analysis', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    it('should not detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model',
      analysisExclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH,
        sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE));

    it('should detect the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection needs ' +
      'migration to the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' data model',
      analysisInclusionTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    cleanDatabaseTests(dataType);
  });
}

/**
 * Returns the MongoDB query to be used for the validation of the migration of raw data type
 * @param  {String} originDataModel The origin data model
 * @param  {String} targetDataModel The target data model
 * @return {Object}                 The query
 */
function getQuery4RawDataMigrationTest(originDataModel, targetDataModel) {
  var query = {};
  switch (targetDataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      query.entityId = sthTestConfig.ENTITY_ID;
      query.entityType = sthTestConfig.ENTITY_TYPE;
      query.attrName = ATTRIBUTE.NAME;
      query.attrType = ATTRIBUTE.TYPE;
      query.recvTime = ATTRIBUTE.RECV_TIME[originDataModel];
      return query;
    default:
      return;
  }
}

/**
 * Expects a collection to be removed
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function expectCollectionRemoved(collectionName, callback) {
  sthDatabase.connection.collection(collectionName, { strict: true}, function(err) {
    var error;
    if (err.message.indexOf('does not exist') === -1) {
      error = err;
    }
    callback(error);
  });
}

/**
 * Expectations to be validated for the migration of raw data type
 * @param  {Object}   params  An object including the following properties:
 *                              - dataType: The data type
 *                              - aggregationType: The aggregation type
 *                              - originCollectionName: The origin collection name
 *                              - originDataModel: The origin data model
 *                              - targetCollectionName: The target collection name
 *                              - targetDataModel: The target data model
 * @param  {Object}   options An object including the following properties:
 *                              - removeCollection: Flag indicating if the origin collection should be removed after
 *                                                    the migration
 *                              - updateCollection: Flag indicating if the target collection should be updated if it
 *                                                    exists
 * @param  {Function} done   mocha's done function
 */
function expectRawDataMigration(params, options, done) {
  sthDatabase.connection.collection(params.targetCollectionName, function(err, targetCollection) {
    targetCollection.find(getQuery4RawDataMigrationTest(params.originDataModel, params.targetDataModel)).
      toArray(function(err, results) {
        if (err) {
          return done(err);
        }
        expect(results.length).to.equal(1);
        expect(results[0].attrValue).to.equal(
          params.aggregationType === sthConfig.AGGREGATION.TYPES.NUMERIC ?
            ATTRIBUTE.VALUE.NUMERIC : params.originDataModel);
        targetCollection.find(getQuery4RawDataMigrationTest(params.targetDataModel, params.targetDataModel)).
          toArray(function(err, results) {
            if (err) {
              return done(err);
            }
            if (options.updateCollection) {
                expect(results.length).to.equal(1);
                expect(results[0].attrValue).to.equal(
                  params.aggregationType === sthConfig.AGGREGATION.TYPES.NUMERIC ?
                    ATTRIBUTE.VALUE.NUMERIC : params.targetDataModel);
            } else {
              expect(results.length).to.equal(0);
            }
            if (options.removeCollection) {
              expectCollectionRemoved(params.originCollectionName, done);
            } else {
              done();
            }
          });
      });
  });
}

/**
 * Returns the MongoDB query to be used for the validation of the migration of raw data type
 * @param  {String} originDataModel The origin data model
 * @param  {String} targetDataModel The target data model
 * @param  {String} resolution      The resolution
 * @return {Object}                 The query
 */
function getQuery4AggregatedDataMigrationTest(originDataModel, targetDataModel, resolution) {
  var query = {};
  switch (targetDataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      query['_id.entityId'] = sthTestConfig.ENTITY_ID;
      query['_id.entityType'] = sthTestConfig.ENTITY_TYPE;
      query['_id.attrName'] = ATTRIBUTE.NAME;
      query['_id.origin'] = sthHelper.getOrigin(ATTRIBUTE.RECV_TIME[originDataModel], resolution);
      query['_id.resolution'] = resolution;
      return query;
    default:
      return;
  }
}

/**
 * Returns the aggregated entry or point for certain offset
 * @param {Array} points The array of points
 * @param {Number} offset The offset
 */
function getAggregatedEntry4Offset(points, offset) {
  for (var index = 0; index < points.length; index++) {
    if (points[index].offset === offset) {
      return points[index];
    }
  }
}

/**
 * Expectations to be validated for the migration of aggregated data type for certain resolution
 * @param  {Object}   params           An object including the following properties:
 *                                       - dataType: The data type
 *                                       - aggregationType: The aggregation type
 *                                       - originCollectionName: The origin collection name
 *                                       - originDataModel: The origin data model
 *                                       - targetCollectionName: The target collection name
 *                                       - targetDataModel: The target data model
 *                                       - targetCollection: The target collection
 *                                       - resolution: The resolution
 * @param  {Object}   options          An object including the following properties:
 *                                       - removeCollection: Flag indicating if the origin collection should be removed
 *                                                             after the migration
 *                                       - updateCollection: Flag indicating if the target collection should be updated
 *                                                             if it exists
 * @param  {String}   resolution       The resolution
 * @param  {String}   targetCollection The target collection
 * @param  {Function} callback         The callback
 */
function expectAggregatedDataMigration4Resolution(params, options, callback) {
  params.targetCollection.find(
    getQuery4AggregatedDataMigrationTest(params.originDataModel, params.targetDataModel, params.resolution)
  ).toArray(function(err, results) {
    if (err) {
      return process.nextTick(callback.bind(this, err));
    }
    expect(results.length).to.equal(1);
    var point = getAggregatedEntry4Offset(results[0].points,
      sthHelper.getOffset(params.resolution, ATTRIBUTE.RECV_TIME[params.originDataModel]));
    if (options.updateCollection) {
      if (point.sum) {
        expect(point.samples).to.equal(2);
        expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC * 2);
        expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2) * 2);
        expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
        expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
      } else {
        expect(point.samples).to.equal(2);
        expect(point.occur[params.originDataModel]).to.equal(1);
        expect(point.occur[params.targetDataModel]).to.equal(1);
      }
    } else {
      if (point.sum) {
        expect(point.samples).to.equal(1);
        expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC);
        expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2));
        expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
        expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
      } else {
        expect(point.samples).to.equal(1);
        expect(point.occur[params.originDataModel]).to.equal(1);
      }
    }
    return process.nextTick(callback);
  });
}

/**
* Expectations to be validated for the migration of aggregated data type
* @param  {Object}   params  An object including the following properties:
*                              - dataType: The data type
*                              - aggregationType: The aggregation type
*                              - originCollectionName: The origin collection name
*                              - originDataModel: The origin data model
*                              - targetCollectionName: The target collection name
*                              - targetDataModel: The target data model
* @param  {Object}   options An object including the following properties:
*                              - removeCollection: Flag indicating if the origin collection should be removed after
*                                                    the migration
*                              - updateCollection: Flag indicating if the target collection should be updated if it
*                                                    exists
 * @param  {Function} done  mocha's done() function
 */
function expectAggregatedDataMigration(params, options, done) {
  async.waterfall(
    [
      async.apply(sthDatabase.connection.collection.bind(sthDatabase.connection, params.targetCollectionName)),
      function onTargetCollection(targetCollection, callback) {
        var expect4Resolution = [];
        sthConfig.AGGREGATION_BY.forEach(function(resolution) {
          params.resolution = resolution;
          params.targetCollection = targetCollection;
          expect4Resolution.push(
            async.apply(expectAggregatedDataMigration4Resolution, params, options));
        });
        async.parallel(expect4Resolution, callback);
      },
      function expectOriginCollectionRemoved(expect4ResolutionResult, callback) {
        if (options.removeCollection) {
          expectCollectionRemoved(params.originCollectionName, callback);
        } else {
          callback();
        }
      }
    ],
    done);
}

/**
 * Data migration test case
 * @param  {Object}   params  An object including the following properties:
 *                              - dataType: The data type
 *                              - aggregationType: The aggregation type
 *                              - originDataModel: The origin data model
 *                              - targetDataModel: The target data model
 * @param  {Object}   options An object including the following properties:
 *                              - removeCollection: Flag indicating if the origin collection should be removed after
 *                                                    the migration
 *                              - updateCollection: Flag indicating if the target collection should be updated if it
 *                                                    exists
 * @param  {Function} done   mocha's done() function
 */
function migrationTest(params, options, done) {
  sthConfig.DATA_MODEL = params.originDataModel;
  var originCollectionName = (params.dataType === sthTestConfig.DATA_TYPES.RAW ?
    sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
    sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS));
  params.originCollectionName = originCollectionName;

  sthConfig.DATA_MODEL = params.targetDataModel;
  var targetCollectionName = (params.dataType === sthTestConfig.DATA_TYPES.RAW ?
    sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
    sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS));
  params.targetCollectionName = targetCollectionName;

  sthDatabaseModel.migrateCollection(DATABASE_NAME, originCollectionName, options,
    function(err) {
    if (err) {
      return done(err);
    }
    if (params.dataType === sthTestConfig.DATA_TYPES.RAW) {
      expectRawDataMigration(params, options, done);
    } else {
      expectAggregatedDataMigration(params, options, done);
    }
  });
}

/**
 * No migration test case
 * @param  {String}   dataType        The data type
 * @param  {String}   originDataModel The origin data model
 * @param  {String}   targetDataModel The target data model
 * @param  {Function} done            mocha's done() function
 */
function noMigrationTest(dataType, originDataModel, targetDataModel, done) {
  sthConfig.DATA_MODEL = originDataModel;
  var originCollectionName = (dataType === sthTestConfig.DATA_TYPES.RAW ?
    sthDatabase.getCollectionName4Events(COLLECTION_NAME_PARAMS) :
    sthDatabase.getCollectionName4Aggregated(COLLECTION_NAME_PARAMS));

  sthConfig.DATA_MODEL = targetDataModel;
  sthDatabaseModel.migrateCollection(DATABASE_NAME, originCollectionName, function(err) {
    expect(err).to.exit;
    done();
  });
}

/**
 * Set of tests to check that collections needing migration from the collection-per-entity model work are not migrated
 *  if the target collection exists
 * @param  {String} dataType        The data type
 * @param  {String} aggregationType The aggregation type
 */
function collectionPerEntityNotUpdatableMigrationTests(dataType, aggregationType) {
  describe('collection per entity not updatable migration', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    it('should not migrate the ' + dataType + ' data collection from the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' to the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model',
      noMigrationTest.bind(null, dataType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH)
    );

    cleanDatabaseTests(dataType);
  });
}

/**
 * Set of tests to check that collections needing migration from the collection-per-entity model work as expected
 *  when the target collections do not exist
 * @param  {String} dataType        The data type
 * @param  {String} aggregationType The aggregation type
 * @param  {Object} options         An object including the following properties:
 *                                    - removeCollection: Flag indicating if the origin collection should be removed
 *                                                          after the migration
 *                                    - updateCollection: Flag indicating if the target collection should be updated if
 *                                                          it exists
 */
function collectionPerEntityCleanMigrationTests(dataType, aggregationType, options) {
  describe('collection per entity clean migration', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should migrate the ' + dataType + ' data collection from the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' to the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model' +
      (options.removeCollection ? ' removing the original collection afterwards': ''),
      migrationTest.bind(
        null,
        {
          dataType: dataType,
          aggregationType: aggregationType,
          originDataModel: sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
          targetDataModel: sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH
        },
        options
      )
    );

    cleanDatabaseTests(dataType);
  });
}

/**
 * Set of tests to check that collections needing migration from the collection-per-entity model work as expected
 *  when the target collections exists
 * @param  {String} dataType        The data type
 * @param  {String} aggregationType The aggregation type
 * @param  {Object} options         An object including the following properties:
 *                                    - removeCollection: Flag indicating if the origin collection should be removed
 *                                                          after the migration
 *                                    - updateCollection: Flag indicating if the target collection should be updated if
 *                                                          it exists
 */
function collectionPerEntityUpdateMigrationTests(dataType, aggregationType, options) {
  describe('collection per entity updatable migration', function() {
    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY));

    it('should insert data into the ' + sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' ' +
      dataType + ' data collection',
      insertData.bind(null, dataType, aggregationType,
        sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH));

    it('should migrate the ' + dataType + ' data collection from the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY + ' to the ' +
      sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH + ' data model updating the target collection' +
      (options.removeCollection ? ' and removing the original collection afterwards': ''),
      migrationTest.bind(
        null,
        {
          dataType: dataType,
          aggregationType: aggregationType,
          originDataModel: sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
          targetDataModel: sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH
        },
        options
      )
    );

    cleanDatabaseTests(dataType);
  });
}

describe('sth_database_model tests', function() {
  [sthConfig.AGGREGATION.TYPES.NUMERIC, sthConfig.AGGREGATION.TYPES.TEXTUAL].forEach(function(aggregationType) {
    describe(aggregationType + ' aggregation type', function() {
      var dataTypes = Object.keys(sthTestConfig.DATA_TYPES);
      dataTypes.forEach(function(dataType) {
        describe(sthTestConfig.DATA_TYPES[dataType] + ' data', function() {
          describe('data model analysis', function() {
            before(connectToDatabase);

            cleanDatabaseTests(dataType);

            collectionPerAttributeAnalysisTests(sthTestConfig.DATA_TYPES[dataType], aggregationType);

            collectionPerEntityAnalysisTests(sthTestConfig.DATA_TYPES[dataType], aggregationType);

            collectionPerServicePathAnalysisTests(sthTestConfig.DATA_TYPES[dataType], aggregationType);
          });

          describe('data model migration', function() {
            before(connectToDatabase);

            cleanDatabaseTests(dataType);

            collectionPerEntityNotUpdatableMigrationTests(sthTestConfig.DATA_TYPES[dataType], aggregationType);

            collectionPerEntityCleanMigrationTests(
              sthTestConfig.DATA_TYPES[dataType],
              aggregationType,
              {
                removeCollection: false,
                updateCollection: false
              }
            );

            collectionPerEntityCleanMigrationTests(
              sthTestConfig.DATA_TYPES[dataType],
              aggregationType,
              {
                removeCollection: true,
                updateCollection: false
              }
            );

            collectionPerEntityUpdateMigrationTests(
              sthTestConfig.DATA_TYPES[dataType],
              aggregationType,
              {
                removeCollection: false,
                updateCollection: true
              }
            );

            collectionPerEntityUpdateMigrationTests(
              sthTestConfig.DATA_TYPES[dataType],
              aggregationType,
              {
                removeCollection: true,
                updateCollection: true
              }
            );
          });
        });
      });
    });
  });
});
