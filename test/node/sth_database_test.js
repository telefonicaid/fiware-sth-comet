/* global before, console, describe, it, require  */

(function() {
  "use strict";

  var sthTestConfig = require('./sth_app_test_configuration');
  var sthConfig = require('../../src/sth_configuration');
  var sthLogger = require('../../src/sth_logger')(sthConfig);
  var sthHelper = require('../../src/sth_helper')(sthConfig, sthLogger);
  var sthDatabase = require('../../src/sth_database')(sthConfig, sthLogger, sthHelper);
  var sthTestHelper = require('./sth_app_test_helper')
    (sthTestConfig, sthConfig, sthDatabase, sthHelper);
  var expect = require('expect.js');

  console.log('*** Running the database tests with the following environment variables:');
  console.log('\n***** STH app environment variables:');
  console.log(sthConfig);
  console.log('\n***** Unit tests environment variables:');
  console.log(sthTestConfig);

  var databaseName = sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE);
  var collectionName4Events = sthDatabase.getCollectionName4Events(
    databaseName, sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID,
    sthTestConfig.ENTITY_TYPE, sthTestConfig.ATTRIBUTE_NAME);
  var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
    databaseName, sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID,
    sthTestConfig.ENTITY_TYPE, sthTestConfig.ATTRIBUTE_NAME);

  describe('Database operation', function () {
    it('should establish a connection to the database', function (done) {
      sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_URI,
        sthConfig.REPLICA_SET, sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE), sthConfig.POOL_SIZE, function (err) {
          done(err);
        });
    });

    it('should generate the collection name for the event raw data', function () {
      var collectionName;
      switch(sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH;
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH +
            '_' + sthTestConfig.ENTITY_ID +
            '_' + sthTestConfig.ENTITY_TYPE;
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH +
            '_' + sthTestConfig.ENTITY_ID +
            '_' + sthTestConfig.ENTITY_TYPE +
            '_' + sthTestConfig.ATTRIBUTE_NAME +
            '_' + sthTestConfig.ATTRIBUTE_TYPE;
          break;
      }
      expect(collectionName4Events).to.equal(collectionName);
    });

    it('should drop the event raw data collection if it exists',
      sthTestHelper.dropRawEventCollectionTest);

    it('should generate the collection name for the aggregated data', function () {
      var collectionName;
      switch(sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH;
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH +
          '_' + sthTestConfig.ENTITY_ID +
          '_' + sthTestConfig.ENTITY_TYPE;
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          collectionName = sthConfig.COLLECTION_PREFIX + '_' + sthConfig.DEFAULT_SERVICE_PATH +
          '_' + sthTestConfig.ENTITY_ID +
          '_' + sthTestConfig.ENTITY_TYPE +
          '_' + sthTestConfig.ATTRIBUTE_NAME +
          '_' + sthTestConfig.ATTRIBUTE_TYPE;
          break;
      }
      collectionName += '.aggr';
      expect(collectionName4Aggregated).to.equal(collectionName);
    });

    it('should drop the aggregated data collection if it exists',
      sthTestHelper.dropAggregatedDataCollectionTest);

    it('should check if the collection for the aggregated data exists', function (done) {
      sthDatabase.getCollection(
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attrName: sthTestConfig.ATTRIBUTE_NAME
        },
        true,
        false,
        false,
        function (err, collection) {
          if (err && !collection) {
            // The collection does not exist
            done();
          }
        }
      );
    });

    it('should create the collection for the single events', function (done) {
      sthDatabase.connection.db.createCollection(collectionName4Events, function (err) {
        done(err);
      });
    });

    it('should create the collection for the aggregated data', function (done) {
      sthDatabase.connection.db.createCollection(collectionName4Aggregated, function (err) {
        done(err);
      });
    });

    describe('should store individual raw events and aggregated data', function () {
      for(var i = 0; i < sthTestConfig.SAMPLES; i++) {
        describe('for each new event', sthTestHelper.eachEventTestSuite);
      }
    });

    describe('should clean the data if requested', sthTestHelper.cleanDatabaseSuite);
  });
})();
