/* globals console, describe, it, require */

/*
 Currently there is an issue (https://github.com/Automattic/mongoose/issues/2073) about a possible memory leak
  when using #connection.useDB() which makes the following warning to be shown during the tests: "(node) warning:
  possible EventEmitter memory leak detected. 11 error listeners added. Use emitter.setMaxListeners() to increase limit."
 Another issue in Node.js related to this issue can be located at https://github.com/joyent/node/issues/5108
 There are also some StackOverflow questions about this issue at:
  - http://stackoverflow.com/questions/26018752/warning-when-connecting-to-mongodb-warning-possible-eventemitter-memory-leak
  - http://stackoverflow.com/questions/15581978/nodejs-how-to-debug-eventemitter-memory-leak-detected-11-listeners-added
 */

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

  console.log();
  console.log('*** IMPORTANT NOTE: Currently there is an issue (https://github.com/Automattic/mongoose/issues/2073) ' +
  'about a possible memory leak when using #connection.useDB() which makes the following warning to be shown ' +
  'during the tests: "(node) warning: possible EventEmitter memory leak detected. 11 error listeners added. ' +
  'Use emitter.setMaxListeners() to increase limit." It does not affect the result of the execution of the tests.');
  console.log();

  console.log('*** Running the server tests with the following environment variables:');
  console.log('\n***** STH app environment variables:');
  console.log(sthConfig);
  console.log('\n***** Unit tests environment variables:');
  console.log(sthTestConfig);

  describe('database connection', function() {
    it('should be a database available', function(done) {
      sthApp.sthDatabase.connect(sthConfig.DB_AUTHENTICATION, sthConfig.DB_HOST,
        sthConfig.DB_PORT, sthApp.sthDatabase.getDatabase(sthConfig.SERVICE), sthConfig.POOL_SIZE, function(err) {
          done(err);
        });

    });
  });

  describe('database clean up', function() {
    it('should drop the event raw data collection if it exists',
      sthTestHelper.dropRawEventCollectionTest);

    it('should drop the aggregated data collection if it exists',
      sthTestHelper.dropAggregatedDataCollectionTest);
  });

  describe('server start', function() {
    it('should start gracefully', function(done) {
      sthApp.sthServer.startServer(
        sthConfig.HOST,
        sthConfig.PORT,
        sthApp.sthDatabase,
        function(err, server) {
          expect(err).to.equal(null);
          expect(server).to.be.a(hapi.Server);
          done();
        });
    });
  });

  describe('invalid routes', function() {
    it('should respond with 404 - Not Found if invalid HTTP method', function(done) {
      request({
        uri: sthTestHelper.getValidURL(sthTestConfig.API_OPERATION.READ),
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
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
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
        uri: sthTestHelper.getValidURL(sthTestConfig.API_OPERATION.READ),
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
        uri: sthTestHelper.getValidURL(sthTestConfig.API_OPERATION.READ),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE
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

    it('should respond with 400 - Bad Request if missing aggrMethod param', function(done) {
      request({
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
          noAggrMethod: true
        }),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE,
          'Fiware-ServicePath': sthConfig.SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(400);
        expect(bodyJSON.statusCode).to.equal(400);
        expect(bodyJSON.error).to.equal('Bad Request');
        expect(bodyJSON.validation.source).to.equal('query');
        expect(bodyJSON.validation.keys).to.be.an(Array);
        expect(bodyJSON.validation.keys[0]).to.equal('aggrMethod');
        done();
      });
    });

    it('should respond with 400 - Bad Request if missing aggrPeriod param', function(done) {
      request({
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
          noAggrPeriod: true
        }),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE,
          'Fiware-ServicePath': sthConfig.SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(400);
        expect(bodyJSON.statusCode).to.equal(400);
        expect(bodyJSON.error).to.equal('Bad Request');
        expect(bodyJSON.validation.source).to.equal('query');
        expect(bodyJSON.validation.keys).to.be.an(Array);
        expect(bodyJSON.validation.keys[0]).to.equal('aggrPeriod');
        done();
      });
    });

    it('should respond with 200 - OK if missing fromDate param', function(done) {
      request({
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
          noDateFrom: true
        }),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE,
          'Fiware-ServicePath': sthConfig.SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(200);
        expect(response.statusMessage).to.equal('OK');
        expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
        expect(bodyJSON.contextResponses[0].contextElement.type).to.equal(sthTestConfig.ENTITY_TYPE);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
        done();
      });
    });

    it('should respond with 200 - OK if missing toDate param', function(done) {
      request({
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
          noDateTo: true
        }),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE,
          'Fiware-ServicePath': sthConfig.SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(200);
        expect(response.statusMessage).to.equal('OK');
        expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
        expect(bodyJSON.contextResponses[0].contextElement.type).to.equal(sthTestConfig.ENTITY_TYPE);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
        done();
      });
    });

    it('should respond with 200 - OK if missing fromDate and toDate params', function(done) {
      request({
        uri: sthTestHelper.getInvalidURL(sthTestConfig.API_OPERATION.READ, {
          noDateFrom: true,
          noDateTo: true
        }),
        method: 'GET',
        headers: {
          'Fiware-Service': sthConfig.SERVICE,
          'Fiware-ServicePath': sthConfig.SERVICE_PATH
        }
      }, function(err, response, body) {
        var bodyJSON = JSON.parse(body);
        expect(err).to.equal(null);
        expect(response.statusCode).to.equal(200);
        expect(response.statusMessage).to.equal('OK');
        expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
        expect(bodyJSON.contextResponses[0].contextElement.type).to.equal(sthTestConfig.ENTITY_TYPE);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
        done();
      });
    });
  });

  function eachEventTestSuiteContainer() {
    describe('for each new event', sthTestHelper.eachEventTestSuite);
  }

  for(var i = 0; i < sthTestConfig.SAMPLES; i ++) {
    describe('data storage', eachEventTestSuiteContainer);

    describe('data retrieval',
      sthTestHelper.dataRetrievalSuite.bind(null, 'min'));

    describe('data retrieval',
      sthTestHelper.dataRetrievalSuite.bind(null, 'max'));

    describe('data retrieval',
      sthTestHelper.dataRetrievalSuite.bind(null, 'sum'));

    describe('data retrieval',
      sthTestHelper.dataRetrievalSuite.bind(null, 'sum2'));
  }

  describe('event notification by the Orion Context Broker', sthTestHelper.eventNotificationSuite);

  describe('should clean the data if requested', sthTestHelper.cleanDatabaseSuite);

  describe('server stop', function() {
    it('should stop gracefully', function(done) {
      sthApp.exitGracefully(null, done);
    });
  });
})();
