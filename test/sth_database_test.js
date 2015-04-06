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
  console.log('\n***** STH app environment variables:');
  console.log(sthConfig);
  console.log('\n***** Unit tests environment variables:');
  console.log(sthTestConfig);

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
