/* globals console, describe, it, require */

(function() {
  'use strict';

  var sthApp = require('../../src/sth_app');
  var sthTestConfig = require('./sth_app_test_configuration');
  var sthConfig = require('../../src/sth_configuration');
  var sthLogger = require('../../src/sth_logger')(sthConfig);
  var sthHelper = require('../../src/sth_helper.js')(sthConfig, sthLogger);
  var sthTestHelper = require('./sth_app_test_helper.js')
    (sthTestConfig, sthConfig, sthApp.sthDatabase, sthHelper);
  var hapi = require('hapi');
  var request = require('request');
  var expect = require('expect.js');

  console.log('*** Running the server tests with the following environment variables:');
  console.log('\n***** STH app environment variables:');
  console.log(sthConfig);
  console.log('\n***** Unit tests environment variables:');
  console.log(sthTestConfig);

  describe('database connection', function() {
    it('should be a database available', function(done) {
      sthApp.sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_URI,
        sthConfig.REPLICA_SET, sthApp.sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE), sthConfig.POOL_SIZE,
        function(err) {
          console.log(err);
          done(err);
        }
      );
    });
  });

  describe('database clean up', function() {
    it('should drop the event raw data collection if it exists',
      sthTestHelper.dropRawEventCollectionTest);

    it('should drop the aggregated data collection if it exists',
      sthTestHelper.dropAggregatedDataCollectionTest);

    it('should drop the collection names collection if it exists',
      sthTestHelper.dropCollectionNamesCollectionTest);
  });

  describe('server start', function() {
    it('should start gracefully', function(done) {
      sthApp.sthServer.startServer(
        sthConfig.STH_HOST,
        sthConfig.STH_PORT,
        sthApp.sthDatabase,
        function(err, server) {
          expect(err).to.equal(undefined);
          expect(server).to.be.a(hapi.Server);
          done();
        });
    });
  });

  describe('invalid routes', function() {
    it('should respond with 404 - Not Found if invalid HTTP method', function(done) {
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.READ),
        method: 'PUT'
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(404);
        expect(bodyJSON.statusCode).to.equal(404);
        expect(bodyJSON.error).to.equal('Not Found');
        done();
      });
    });

    it('should respond with 404 - Not Found if invalid path', function(done) {
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.READ, {
          invalidPath: true
        }),
        method: 'GET'
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(404);
        expect(bodyJSON.statusCode).to.equal(404);
        expect(bodyJSON.error).to.equal('Not Found');
        done();
      });
    });

    it('should respond with 400 - Bad Request if missing Fiware-Service header', function(done) {
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.READ),
        method: 'GET'
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(400);
        expect(bodyJSON.statusCode).to.equal(400);
        expect(response.statusMessage).to.equal('Bad Request');
        expect(bodyJSON.error).to.equal('Bad Request');
        done();
      });
    });

    it('should respond with 400 - Bad Request if missing Fiware-ServicePath header', function(done) {
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.READ),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.DEFAULT_SERVICE
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(400);
        expect(bodyJSON.statusCode).to.equal(400);
        expect(response.statusMessage).to.equal('Bad Request');
        expect(bodyJSON.error).to.equal('Bad Request');
        done();
      });
    });

    it('should respond with 400 - Bad Request if missing lastN, hLimit and hOffset or aggrMethod and aggrPeriod query params',
      function(done) {
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.READ),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.DEFAULT_SERVICE,
          'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(400);
        expect(bodyJSON.statusCode).to.equal(400);
        expect(bodyJSON.error).to.equal('Bad Request');
        expect(bodyJSON.validation.source).to.equal('query');
        expect(bodyJSON.validation.keys).to.be.an(Array);
        expect(bodyJSON.validation.keys.indexOf('lastN')).to.not.equal(-1);
        expect(bodyJSON.validation.keys.indexOf('hLimit')).to.not.equal(-1);
        expect(bodyJSON.validation.keys.indexOf('hOffset')).to.not.equal(-1);
        expect(bodyJSON.validation.keys.indexOf('aggrMethod')).to.not.equal(-1);
        expect(bodyJSON.validation.keys.indexOf('aggrPeriod')).to.not.equal(-1);
        done();
      });
    });

    it('should respond with 200 - OK if lastN query param', sthTestHelper.status200Test.bind(null, {lastN: 1}));

    it('should respond with 200 - OK if hLimit and hOffset query params',
      sthTestHelper.status200Test.bind(
        null,
        {
          hLimit: 1,
          hOffset: 1
        }
      )
    );

    it('should respond with 200 - OK if aggrMethod and aggrPeriod query params',
      sthTestHelper.status200Test.bind(
        null,
        {
          aggrMethod: 'min',
          aggrPeriod: 'second'
        }
      )
    );
  });

  function eachEventTestSuiteContainer(attrName, attrType, includeTimeInstantMetadata) {
    describe('for each new event with attribute of type ' + attrType,
      sthTestHelper.eachEventTestSuite.bind(null, attrName, attrType, includeTimeInstantMetadata));
  }

  for(var i = 0; i < sthTestConfig.SAMPLES; i ++) {
    describe('data storage', eachEventTestSuiteContainer.bind(
      null, 'attribute-float', 'float', !!(i % 2)));

    describe('raw data retrieval',
      sthTestHelper.rawDataRetrievalSuite.bind(null, {lastN: i+1}, 'attribute-float', 'float', true));

    describe('raw data retrieval',
      sthTestHelper.rawDataRetrievalSuite.bind(null, {hLimit: 1, hOffset: i}, 'attribute-float', 'float', true));

    describe('aggregated data retrieval',
      sthTestHelper.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'min'));

    describe('aggregated data retrieval',
      sthTestHelper.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'max'));

    describe('aggregated data retrieval',
      sthTestHelper.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'sum'));

    describe('aggregated data retrieval',
      sthTestHelper.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'sum2'));
  }

  for(var i = 0; i < sthTestConfig.SAMPLES; i ++) {
    describe('data storage', eachEventTestSuiteContainer.bind(
     null, 'attribute-string', 'string', !!(i % 2)));

    describe('raw data retrieval',
      sthTestHelper.rawDataRetrievalSuite.bind(null, {lastN: i+1}, 'attribute-string', 'string', true));

    describe('raw data retrieval',
      sthTestHelper.rawDataRetrievalSuite.bind(null, {hLimit: 1, hOffset: i}, 'attribute-string', 'string', true));

    describe('aggregated data retrieval',
      sthTestHelper.aggregatedDataRetrievalSuite.bind(null, 'attribute-string', 'string', 'occur'));
  }

  describe('notification without TimeInstant metadata by the Orion Context Broker of',
    sthTestHelper.eventNotificationSuite.bind(null, 'attribute-float-1', 'float', false));

  describe('notification without TimeInstant metadata by the Orion Context Broker of',
    sthTestHelper.eventNotificationSuite.bind(null, 'attribute-string-1', 'string', false));

  describe('notification with TimeInstant metadata by the Orion Context Broker of',
    sthTestHelper.eventNotificationSuite.bind(null, 'attribute-float-2', 'float', true));

  describe('notification with TimeInstant metadata by the Orion Context Broker of',
    sthTestHelper.eventNotificationSuite.bind(null, 'attribute-string-2', 'string', true));

  describe('GET /version', function() {
    it('should provide version information', function(done){
      request({
        uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.VERSION),
        method: 'GET'
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(bodyJSON.version).not.to.be(undefined);
        done();
      });
    });
  });

  describe('should clean the data if requested', sthTestHelper.cleanDatabaseSuite);

  describe('server stop', function() {
    it('should stop gracefully', function(done) {
      sthApp.exitGracefully(null, done);
    });
  });
})();
