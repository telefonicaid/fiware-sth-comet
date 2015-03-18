/* global before, console, describe, it, require  */

(function() {
  "use strict";

  var sthTestConfig = require('./sth_app_test_configuration');
  var sthConfig = require('../src/sth_configuration');
  var sthLogger = require('../src/sth_logger')(sthConfig);
  var sthHelper = require('../src/sth_helper')(sthConfig, sthLogger);
  var sthDatabase = require('../src/sth_database')(sthConfig, sthLogger, sthHelper);
  var sthTestHelper = require('./sth_app_test_helper')
    (sthTestConfig, sthConfig, sthDatabase, sthHelper);
  var expect = require('expect.js');

  console.log('*** Running the database tests with the following environment variables:');
  console.log('***   - SAMPLES: %s', sthTestConfig.SAMPLES);
  console.log('***   - ENTITY_ID: %s', sthTestConfig.ENTITY_ID);
  console.log('***   - ATTRIBUTE_ID: %s', sthTestConfig.ATTRIBUTE_ID);
  console.log('***   - TYPE: %s', sthTestConfig.TYPE);
  console.log('***   - START_DATE: %s', sthTestConfig.START_DATE);
  console.log('***   - END_DATE: %s', sthTestConfig.END_DATE);
  console.log('***   - MIN_VALUE: %s', sthTestConfig.MIN_VALUE);
  console.log('***   - MAX_VALUE: %s', sthTestConfig.MAX_VALUE);
  console.log('***   - DB_USERNAME: %s', sthConfig.DB_USERNAME);
  console.log('***   - DB_PASSWORD: %s', sthConfig.DB_PASSWORD);
  console.log('***   - DB_HOST: %s', sthConfig.DB_HOST);
  console.log('***   - DB_PORT: %s', sthConfig.DB_PORT);
  console.log('***   - DB_NAME: %s', sthConfig.DB_NAME);
  console.log('***   - CLEAN: %s ', sthTestConfig.CLEAN);

  var collectionName4Events = sthDatabase.getCollectionName4Events(
    sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
  var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
    sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);

  describe('Database operation', function () {
    it('should establish a connection to the database', function (done) {
      sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_HOST,
        sthConfig.DB_PORT, sthConfig.DB_NAME, function (err) {
          done(err);
        });
    });

    it('should generate the collection name for the event raw data', function () {
      expect(collectionName4Events).to.equal(
        'sth.' + sthTestConfig.ENTITY_ID + '.' +
        sthTestConfig.ATTRIBUTE_ID);
    });

    it('should drop the event raw data collection if it exists',
      sthTestHelper.dropRawEventCollectionTest);

    it('should generate the collection name for the aggregated data', function () {
      expect(collectionName4Aggregated).to.equal(
        'sth.' + sthTestConfig.ENTITY_ID + '.' +
        sthTestConfig.ATTRIBUTE_ID + '.aggregated');
    });

    it('should drop the aggregated data collection if it exists',
      sthTestHelper.dropAggregatedDataCollectionTest);

    it('should check if the collection for the aggregated data exists', function (done) {
      sthDatabase.getCollection(collectionName4Aggregated, function (err, collection) {
        if (err && !collection) {
          // The collection does not exist
          done();
        }
      });
    });

    it('should create the collection for the single events', function (done) {
      sthDatabase.driver.connection.db.createCollection(collectionName4Events, function (err) {
        done(err);
      });
    });

    it('should create the collection for the aggregated data', function (done) {
      sthDatabase.driver.connection.db.createCollection(collectionName4Aggregated, function (err) {
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
