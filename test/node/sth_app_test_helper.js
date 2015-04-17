/* globals anEvent, before, console, describe, it, module, require */

(function() {
  "use strict";

  var request = require('request');
  var expect = require('expect.js');

  var sthTestConfig;
  var sthConfig;
  var sthDatabase;
  var sthHelper;

  var events = [];

  /**
   * Returns a new random Date in the range defined by the passed dates
   * @param {Date} start The starting date
   * @param {Date} end The ending date
   * @returns {Date} The calculated random date
   */
   function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Returns a new raw event
   * @param timestamp The event timestamp
   * @returns {{timestamp: Date, type: string, value: string}} The created raw event
   */
  function createEvent(timestamp) {
    var theEvent;
    var attributeValue = (Math.random() *
      (parseFloat(sthTestConfig.MAX_VALUE) - parseFloat(sthTestConfig.MIN_VALUE)) -
        Math.abs(parseFloat(sthTestConfig.MIN_VALUE))).toFixed(2);
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        theEvent = {
          timestamp: timestamp,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attributeName: sthTestConfig.ATTRIBUTE_ID,
          attributeType: sthTestConfig.ATTRIBUTE_TYPE,
          attributeValue: attributeValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        theEvent = {
          timestamp: timestamp,
          attributeName: sthTestConfig.ATTRIBUTE_ID,
          attributeType: sthTestConfig.ATTRIBUTE_TYPE,
          attributeValue: attributeValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        theEvent = {
          timestamp: timestamp,
          attributeType: sthTestConfig.ATTRIBUTE_TYPE,
          attributeValue: attributeValue
        };
        break;
    }
    return theEvent;
  }

  /**
   * Returns the day of the year from a date
   * @param {Date} date The date
   * @returns {number} The day of the year (a number between 1 and 366)
   */
  function getDayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil(diff / oneDay);
  }

  /**
   * A mocha test which stores an event to the raw event data collection
   * @param {Object} anEvent The event to store
   * @param {Function} done The mocha done() callback function
   */
  function addEventTest(anEvent, done) {
    var databaseName = sthDatabase.getDatabase(sthConfig.SERVICE);

    var collectionName4Events = sthDatabase.getCollectionName4Events(
      sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_ID);

    // Check if the collection exists
    sthDatabase.getCollection(
      databaseName,
      collectionName4Events,
      true,
      function (err, collection) {
        if (err) {
          done(err);
        } else {
          sthDatabase.storeRawData(anEvent.timestamp, sthConfig.SERVICE_PATH,
            sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE, sthTestConfig.ATTRIBUTE_ID,
            sthTestConfig.ATTRIBUTE_TYPE, anEvent.attributeValue, done);
        }
      }
    );
  }

  /**
   * A mocha test which adds aggregated data to the aggregated data collection
   *  for an event based on a resolution
   * @param {Object} anEvent The event
   * @param {string} resolution The resolution
   * @param {Function} done The mocha done() callback function
   */
  function addAggregatedDataTest(anEvent, resolution, done) {
    var databaseName = sthDatabase.getDatabase(sthConfig.SERVICE);

    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_ID);

    // Check if the collection exists
    sthDatabase.getCollection(
      databaseName,
      collectionName4Aggregated,
      true,
      function (err, collection) {
        if (err) {
          done(err);
        } else {
          sthDatabase.storeAggregatedData4Resolution(
            collectionName4Aggregated, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
            sthTestConfig.ATTRIBUTE_ID, sthTestConfig.ATTRIBUTE_TYPE, anEvent.attributeValue,
            resolution, anEvent.timestamp, done);
        }
      }
    );
  }

  /**
   * A mocha test suite to be run for each new raw event
   */
  function eachEventTestSuite() {
    var anEvent;

    before(function () {
      anEvent = events[0] || createEvent(getRandomDate(
        sthTestConfig.START_DATE, sthTestConfig.END_DATE));
      events.push(anEvent);
      console.log('New event: %s', JSON.stringify(anEvent));
    });

    it('should store the single event', function(done) {
      addEventTest(anEvent, done);
    });

    it('should store aggregated data (resolution: second, range: minute)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.SECOND, done);
      }
    );

    it('should store aggregated data (resolution: minute, range: hour)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.MINUTE, done);
      }
    );

    it('should store aggregated data (resolution: hour, range: day)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.HOUR, done);
      }
    );

    it('should store aggregated data (resolution: day, range: month)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.DAY, done);
      }
    );

    it('should store aggregated data (resolution: month, range: year)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.MONTH, done);
      }
    );
  }

  /**
   * A mocha test to drop the raw event data collection from the database
   * @param {Function} done The mocha done() callback function
   */
  function dropRawEventCollectionTest(done) {
    var collectionName4Events = sthDatabase.getCollectionName4Events(
      sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_ID);
    sthDatabase.connection.db.dropCollection(collectionName4Events, function (err) {
      if (err && err.message === 'ns not found') {
        err = null;
      }
      return done(err);
    });
  }

  /**
   * A mocha test to drop the aggregated data collection from the database
   * @param {Function} done The mocha done() callback function
   */
  function dropAggregatedDataCollectionTest(done) {
    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_ID);
    sthDatabase.connection.db.dropCollection(collectionName4Aggregated, function (err) {
      if (err && err.message === 'ns not found') {
        err = null;
      }
      return done(err);
    });
  }

  /**
   * Returns a valid URL based on the aggregation method, the aggregation period and
   *  a range of dates
   * @param {string} type The type of the operation (i.e.: read, notify)
   * @param {string} aggrMethod The aggregation method (typically: 'max', 'min',
   *  'sum', 'sum2')
   * @param {string} aggrPeriod The aggregation period (typically: 'month', 'day',
   *  'hour', 'minute', 'second'
   * @param {string} dateFrom The starting date for the filtering in IEEE RFC 3339
   *  format
   * @param {string} dateTo The ending date for the filtering in IEEE RFC 3339
   *  format
   * @returns {string} The generated valid URL
   */
  function getValidURL(type, aggrMethod, aggrPeriod, dateFrom, dateTo) {
    var url = 'http://' + sthConfig.HOST + ':' + sthConfig.PORT;
    switch(type) {
      case sthTestConfig.API_OPERATION.READ:
        return url + '/STH/v1/contextEntities/type/' + sthTestConfig.ENTITY_TYPE + '/' +
          'id/' + sthTestConfig.ENTITY_ID +
          '/attributes/' + sthTestConfig.ATTRIBUTE_ID +
          '?aggrMethod=' + (aggrMethod || 'min') +
          '&aggrPeriod=' + (aggrPeriod || 'second') +
          (dateFrom ? '&dateFrom=' + dateFrom : '') +
          (dateTo ? '&dateTo=' + dateTo : '');
      case sthTestConfig.API_OPERATION.NOTIFY:
        return url + '/notify';
    }
  }

  /**
   * Returns an invalid URL based on certain criteria passed as arguments
   * @param {Object} options The options to apply when generating the invalid
   *  URL (possible keys are 'invalidPath', 'noAggrMethod', 'noAggrPeriod',
   *  'noDateFrom' and 'noDateTo'
   * @returns {string}
   */
  function getInvalidURL(type, options) {
    var url = 'http://' + sthConfig.HOST + ':' + sthConfig.PORT,
      isParams = false;

    function getQuerySeparator(noAmpersand) {
      var separator;
      if (!isParams) {
        separator = '?';
        isParams = true;
      } else if (!noAmpersand) {
        separator = '&';
      }
      return separator;
    }

    switch(type) {
      case 'read':
        if (!options.invalidPath) {
          url += '/STH/v1/contextEntities/type/' + sthTestConfig.ENTITY_TYPE + '/' +
          'id/' + sthTestConfig.ENTITY_ID +
          '/attributes/' + sthTestConfig.ATTRIBUTE_ID;
        } else {
          url += '/this/is/an/invalid/path';
        }
        if (!options.noAggrMethod) {
          url += (getQuerySeparator(true) + 'aggrMethod=min');
        }
        if (!options.noAggrPeriod) {
          url += (getQuerySeparator() + 'aggrPeriod=second');
        }
        if (!options.noDateFrom) {
          url += (getQuerySeparator() + 'dateFrom=2015-01-01T00:00:00');
        }
        if (!options.noDateTo) {
          url += (getQuerySeparator() + 'dateTo=2015-02-20T23:00:00');
        }
        return url;
    }
  }

  /**
   * A mocha test forcing the server to retrieve no data from the database for
   *  the passed aggregation method and resolution
   * @param {string} service The service
   * @param {string} servicePath The service path
   * @param {string} aggrMethod The aggregation method
   * @param {string} resolution The resolution
   * @param {string} done The mocha done() callback function
   */
  function noDataSinceDateTest(service, servicePath, aggrMethod, resolution, done) {
    var offset;
    switch(resolution) {
      case 'second':
        // 1 minute offset
        offset = 60 * 1000;
        break;
      case 'minute':
        // 1 hour offset
        offset = 60 * 60 * 1000;
        break;
      case 'hour':
        // 1 day offset
        offset = 24 * 60 * 60 * 1000;
        break;
      case 'day':
        // 1 month  offset
        offset = 31 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        // 1 year  offset
        offset = 365 * 31 * 24 * 60 * 60 * 1000;
        break;
    }

    request({
      uri: getValidURL(sthTestConfig.API_OPERATION.READ, aggrMethod, resolution,
        sthHelper.getISODateString(
          sthHelper.getOrigin(
            new Date(
              events[0].timestamp.getTime() + offset),
            resolution)),
        null),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
      }
    }, function (err, response, body) {
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_ID);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).
        to.be.an(Array);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).
        to.equal(0);
      expect(bodyJSON.contextResponses[0].statusCode.code).
        to.equal('200');
      expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).
        to.equal('OK');
      done();
    });
  }

  /**
   * A mocha test forcing the server to retrieve aggregated data from the database
   *  for the passed aggregation method and resolution
   * @param {string} service The service
   * @param {string} servicePath The service path
   * @param {string} aggrMethod The aggregation method
   * @param {string} resolution The resolution
   * @param {Function} done The mocha done() callback function
   */
  function dataAvailableSinceDateTest(service, servicePath, aggrMethod, resolution, done) {
    request({
      uri: getValidURL(sthTestConfig.API_OPERATION.READ, aggrMethod, resolution,
        sthHelper.getISODateString(
          sthHelper.getOrigin(
            events[0].timestamp,
            resolution)),
        null),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
      }
    }, function (err, response, body) {
      var theEvent = events[0];
      var index, entries;
      switch(resolution) {
        case 'second':
          index = theEvent.timestamp.getUTCSeconds();
          entries = 60;
          break;
        case 'minute':
          index = theEvent.timestamp.getUTCMinutes();
          entries = 60;
          break;
        case 'hour':
          index = theEvent.timestamp.getUTCHours();
          entries = 24;
          break;
        case 'day':
          index = theEvent.timestamp.getUTCDate() - 1;
          entries = 31;
          break;
        case 'month':
          index = theEvent.timestamp.getUTCMonth();
          entries = 12;
          break;
      }
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_ID);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.resolution).
        to.equal(resolution);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.range).
        to.equal(sthHelper.getRange(resolution));
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.origin).
        to.be(sthHelper.getISODateString(
          sthHelper.getOrigin(
            theEvent.timestamp,
            resolution
          )
        ));
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].points.length).
        to.equal(sthConfig.FILTER_OUT_EMPTY ? 1 : entries);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
        points[sthConfig.FILTER_OUT_EMPTY ? 0 : index].samples).
        to.equal(events.length);
      var value;
      switch(aggrMethod) {
        case 'min':
        case 'max':
          value = parseFloat(theEvent.attributeValue).toFixed(2);
          break;
        case 'sum':
          value = (events.length * parseFloat(theEvent.attributeValue)).toFixed(2);
          break;
        case 'sum2':
          value = (events.length * (Math.pow(parseFloat(theEvent.attributeValue), 2))).toFixed(2);
      }
      expect(parseFloat(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
        points[sthConfig.FILTER_OUT_EMPTY ? 0 : index][aggrMethod]).toFixed(2)).to.equal(value);
      expect(bodyJSON.contextResponses[0].statusCode.code).
        to.equal('200');
      expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).
        to.equal('OK');
      done();
    });
  }

  /**
   * A mocha test suite including tests to check the retrieval of aggregated data
   *  from the database for the passed aggregation method
   * @param {string} aggrMethod The aggregation method
   */
  function dataRetrievalSuite(aggrMethod) {
    describe('with aggrMethod as ' + aggrMethod, function() {
      describe('and aggrPeriod as ' + sthConfig.RESOLUTION.SECOND, function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.SECOND));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.SECOND));
      });

      describe('and aggrPeriod as minute', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MINUTE));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH,aggrMethod, sthConfig.RESOLUTION.MINUTE));
      });

      describe('and aggrPeriod as hour', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.HOUR));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.HOUR));
      });

      describe('and aggrPeriod as day', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.DAY));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.DAY));
      });

      describe('and aggrPeriod as month', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MONTH));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, sthConfig.SERVICE, sthConfig.SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MONTH));
      });
    });
  }

  /**
   * A mocha test suite to clean the database (i.e., the raw event data and
   *  aggregated data collections
   */
  function cleanDatabaseSuite() {
    if (sthTestConfig.CLEAN) {
      it('should drop the collection created for the events', function (done) {
        var collectionName4Events = sthDatabase.getCollectionName4Events(
          sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
          sthTestConfig.ATTRIBUTE_ID);
        sthDatabase.getCollection(sthDatabase.getDatabase(sthConfig.SERVICE), collectionName4Events, false,
          function (err, collection) {
            if (err) {
              return done(err);
            }
            collection.drop(function (err) {
              done(err);
            });
          }
        );
      });

      it('should drop the collection created for the aggregated data', function (done) {
        var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
          sthConfig.SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
          sthTestConfig.ATTRIBUTE_ID);
        sthDatabase.getCollection(sthDatabase.getDatabase(sthConfig.SERVICE),
          collectionName4Aggregated,
          false,
          function (err, collection) {
            if (err) {
              return done(err);
            }
            collection.drop(function (err) {
              done(err);
            });
          }
        );
      });
    }
  }

  /**
   * A mocha test suite to check the reception of notifications by the Orion Context Broker
   */
  function eventNotificationSuite() {
    describe('complex notification', function() {
      before(function () {
        events = [];
      });

      describe('reception', function () {
        it('should attend the notification', complexNotificationTest.bind(
          null, sthConfig.SERVICE, sthConfig.SERVICE_PATH));
      });

      describe('for each new notification', function () {
        describe('data retrieval',
          dataRetrievalSuite.bind(null, 'min'));

        describe('data retrieval',
          dataRetrievalSuite.bind(null, 'max'));

        describe('data retrieval',
          dataRetrievalSuite.bind(null, 'sum'));

        describe('data retrieval',
          dataRetrievalSuite.bind(null, 'sum2'));
      });
    });
  }

  /**
   * A mocha test to check the reception of a new notification by the Orion Context Broker
   * @param {Function} done The mocha done() callback function
   */
  function complexNotificationTest(service, servicePath, done) {
    var anEvent = {
      timestamp: new Date(),
      attributeType: sthTestConfig.ATTRIBUTE_TYPE,
      attributeValue: 66.6
    };
    request({
      uri: getValidURL(sthTestConfig.API_OPERATION.NOTIFY),
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Fiware-Service': service || sthConfig.SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
      },
      json: true,
      body: {
        "subscriptionId" : "1234567890ABCDF123456789",
        "originator" : "orion.contextBroker.instance",
        "contextResponses" : [
          {
            "contextElement" : {
              "attributes" : [
                {
                  "name" : sthTestConfig.ATTRIBUTE_ID,
                  "type" : anEvent.attributeType,
                  "value" : anEvent.attributeValue
                }
              ],
              "type" : "entityType",
              "isPattern" : "false",
              "id" : "entityId"
            },
            "statusCode" : {
              "code" : "200",
              "reasonPhrase" : "OK"
            }
          },
          {
            "contextElement" : {
              "attributes" : [
                {
                  "name" : "attributeId",
                  "type" : anEvent.attributeType,
                  "value" : anEvent.attributeValue
                }
              ],
              "type" : "entityType",
              "isPattern" : "false",
              "id" : "entityId"
            },
            "statusCode" : {
              "code" : "200",
              "reasonPhrase" : "OK"
            }
          },
          {
            "contextElement" : {
              "attributes" : [
                {
                  "name" : sthTestConfig.ATTRIBUTE_ID,
                  "type" : anEvent.attributeType,
                  "value" : anEvent.attributeValue
                }
              ],
              "type" : "entityType",
              "isPattern" : "false",
              "id" : "entityId"
            },
            "statusCode" : {
              "code" : "200",
              "reasonPhrase" : "OK"
            }
          }
        ]
      }
    }, function (err, response, body) {
      for (var i = 0; i < 3; i++) {
        events.push(anEvent);
      }
      expect(body).to.be(undefined);
      done(err);
    });
  }

  module.exports = function (theSthTestConfiguration, theSthConfiguration, theSthDatabase, theSthHelper) {
    sthTestConfig = theSthTestConfiguration;
    sthConfig = theSthConfiguration;
    sthDatabase = theSthDatabase;
    sthHelper = theSthHelper;
    return {
      getDayOfYear: getDayOfYear,
      addEventTest: addEventTest,
      eachEventTestSuite: eachEventTestSuite,
      dropRawEventCollectionTest: dropRawEventCollectionTest,
      dropAggregatedDataCollectionTest: dropAggregatedDataCollectionTest,
      getValidURL: getValidURL,
      getInvalidURL: getInvalidURL,
      dataRetrievalSuite: dataRetrievalSuite,
      cleanDatabaseSuite: cleanDatabaseSuite,
      eventNotificationSuite: eventNotificationSuite
    };
  };
})();
