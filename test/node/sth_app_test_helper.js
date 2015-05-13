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
   * @param recvTime The event timestamp
   * @returns {{recvTime: Date, type: string, value: string}} The created raw event
   */
  function createEvent(recvTime) {
    var theEvent;
    var attrValue = (Math.random() *
      (parseFloat(sthTestConfig.MAX_VALUE) - parseFloat(sthTestConfig.MIN_VALUE)) -
        Math.abs(parseFloat(sthTestConfig.MIN_VALUE))).toFixed(2);
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        theEvent = {
          recvTime: recvTime,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attrName: sthTestConfig.ATTRIBUTE_NAME,
          attrType: sthTestConfig.ATTRIBUTE_TYPE,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        theEvent = {
          recvTime: recvTime,
          attrName: sthTestConfig.ATTRIBUTE_NAME,
          attrType: sthTestConfig.ATTRIBUTE_TYPE,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        theEvent = {
          recvTime: recvTime,
          attrType: sthTestConfig.ATTRIBUTE_TYPE,
          attrValue: attrValue
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
    var databaseName = sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE);

    var collectionName4Events = sthDatabase.getCollectionName4Events(
      sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_NAME);

    // Check if the collection exists
    sthDatabase.getCollection(
      databaseName,
      collectionName4Events,
      true,
      function (err, collection) {
        if (err) {
          done(err);
        } else {
          sthDatabase.storeRawData(collection, anEvent.recvTime, sthConfig.DEFAULT_SERVICE_PATH,
            sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE, sthTestConfig.ATTRIBUTE_NAME,
            sthTestConfig.ATTRIBUTE_TYPE, anEvent.attrValue, done);
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
    var databaseName = sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE);

    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_NAME);

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
            collection, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
            sthTestConfig.ATTRIBUTE_NAME, sthTestConfig.ATTRIBUTE_TYPE, anEvent.attrValue,
            resolution, anEvent.recvTime, done);
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
      sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_NAME);
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
      sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
      sthTestConfig.ATTRIBUTE_NAME);
    sthDatabase.connection.db.dropCollection(collectionName4Aggregated, function (err) {
      if (err && err.message === 'ns not found') {
        err = null;
      }
      return done(err);
    });
  }

  /**
   * Returns an URL based on certain criteria passed as arguments
   * @param {string} type The type of operation
   * @param {Object} options The options to apply when generating the invalid
   *  URL (possible keys are 'invalidPath', and an entry for each one of the accepted
   *  query params ('lastN', 'hLimit', 'hOffset', aggrMethod', 'aggrPeriod', 'dateFrom' and 'dateTo').
   * @returns {string}
   */
  function getURL(type, options) {
    var url = 'http://' + sthConfig.STH_HOST + ':' + sthConfig.STH_PORT,
      isParams = false;

    function getQuerySeparator() {
      var separator;
      if (!isParams) {
        separator = '?';
        isParams = true;
      } else {
        separator = '&';
      }
      return separator;
    }

    switch(type) {
      case sthTestConfig.API_OPERATION.READ:
        if (options && options.invalidPath) {
          url += '/this/is/an/invalid/path';
        } else {
          url += '/STH/v1/contextEntities/type/' + sthTestConfig.ENTITY_TYPE + '/' +
            'id/' + sthTestConfig.ENTITY_ID +
            '/attributes/' + sthTestConfig.ATTRIBUTE_NAME;
        }
        if (options && (options.lastN || options.lastN === 0)) {
          url += (getQuerySeparator() + 'lastN=' + options.lastN);
        }
        if (options && (options.hLimit || options.hLimit === 0)) {
          url += (getQuerySeparator() + 'hLimit=' + options.hLimit);
        }
        if (options && (options.hOffset || options.hOffset === 0)) {
          url += (getQuerySeparator() + 'hOffset=' + options.hOffset);
        }
        if (options && options.aggrMethod) {
          url += (getQuerySeparator() + 'aggrMethod=' + options.aggrMethod);
        }
        if (options && options.aggrPeriod) {
          url += (getQuerySeparator() + 'aggrPeriod=' + options.aggrPeriod);
        }
        if (options && options.dateFrom) {
          url += (getQuerySeparator() + 'dateFrom=' + options.dateFrom);
        }
        if (options && options.dateTo) {
          url += (getQuerySeparator() + 'dateTo=' + options.dateTo);
        }
        break;
      case sthTestConfig.API_OPERATION.NOTIFY:
        if (options && options.invalidPath) {
          url += '/invalidNotificationPath';
        } else {
          url += '/notify';
        }
        break;
      case sthTestConfig.API_OPERATION.VERSION:
        if (options && options.invalidPath) {
          url += '/invalidVersionPath';
        } else {
          url += '/version';
        }
        break;
    }
    return url;
  }

  /**
   * A mocha test forcing the server to retrieve no aggregated data from the database for
   *  the passed aggregation method and resolution
   * @param {string} service The service
   * @param {string} servicePath The service path
   * @param {Object} options To generate the URL
   * @param {Function} done The mocha done() callback function
   */
  function noRawDataSinceDateTest(service, servicePath, options, done) {
    request({
      uri: getURL(sthTestConfig.API_OPERATION.READ,
        options
      ),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
      }
    }, function (err, response, body) {
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(response.statusMessage).to.equal('OK');
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_NAME);
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
   * @param {Object} options To generate the URL
   * @param {boolean} checkRecvTime Flag indicating of the recvTime should be checked
   * @param {Function} done The mocha done() callback function
   */
  function rawDataAvailableSinceDateTest(service, servicePath, options, checkRecvTime, done) {
    options.dateFrom = sthHelper.getISODateString(events[0].recvTime);
    request({
      uri: getURL(sthTestConfig.API_OPERATION.READ, options),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
      }
    }, function (err, response, body) {
      var theEvent = events[events.length - 1];
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(response.statusMessage).to.equal('OK');
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_NAME);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).
        to.equal(1);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).
        to.equal(theEvent.attrValue);
      if (checkRecvTime) {
        expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].recvTime).
          to.equal(sthHelper.getISODateString(theEvent.recvTime));
      }
      expect(bodyJSON.contextResponses[0].statusCode.code).
        to.equal('200');
      expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).
        to.equal('OK');
      done();
    });
  }

  /**
   * A mocha test forcing the server to retrieve no aggregated data from the database for
   *  the passed aggregation method and resolution
   * @param {string} service The service
   * @param {string} servicePath The service path
   * @param {string} aggrMethod The aggregation method
   * @param {string} resolution The resolution
   * @param {string} done The mocha done() callback function
   */
  function noAggregatedDataSinceDateTest(service, servicePath, aggrMethod, resolution, done) {
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
      uri: getURL(sthTestConfig.API_OPERATION.READ,
        {
          aggrMethod: aggrMethod,
          aggrPeriod: resolution,
          dateFrom: sthHelper.getISODateString(
            sthHelper.getOrigin(
              new Date(
                events[0].recvTime.getTime() + offset),
              resolution))
        }
      ),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
      }
    }, function (err, response, body) {
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(response.statusMessage).to.equal('OK');
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_NAME);
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
  function aggregatedDataAvailableSinceDateTest(service, servicePath, aggrMethod, resolution, done) {
    request({
      uri: getURL(sthTestConfig.API_OPERATION.READ,
        {
          aggrMethod: aggrMethod,
          aggrPeriod: resolution,
          dateFrom: sthHelper.getISODateString(
            sthHelper.getOrigin(
              events[0].recvTime,
              resolution))
        }
      ),
      method: 'GET',
      headers: {
        'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
      }
    }, function (err, response, body) {
      var theEvent = events[0];
      var index, entries;
      switch(resolution) {
        case 'second':
          index = theEvent.recvTime.getUTCSeconds();
          entries = 60;
          break;
        case 'minute':
          index = theEvent.recvTime.getUTCMinutes();
          entries = 60;
          break;
        case 'hour':
          index = theEvent.recvTime.getUTCHours();
          entries = 24;
          break;
        case 'day':
          index = theEvent.recvTime.getUTCDate() - 1;
          entries = 31;
          break;
        case 'month':
          index = theEvent.recvTime.getUTCMonth();
          entries = 12;
          break;
      }
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(200);
      expect(response.statusMessage).to.equal('OK');
      expect(bodyJSON.contextResponses[0].contextElement.id).
        to.equal(sthTestConfig.ENTITY_ID);
      expect(bodyJSON.contextResponses[0].contextElement.isPattern).
        to.equal(false);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).
        to.equal(sthTestConfig.ATTRIBUTE_NAME);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.resolution).
        to.equal(resolution);
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.range).
        to.equal(sthHelper.getRange(resolution));
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.origin).
        to.be(sthHelper.getISODateString(
          sthHelper.getOrigin(
            theEvent.recvTime,
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
          value = parseFloat(theEvent.attrValue).toFixed(2);
          break;
        case 'sum':
          value = (events.length * parseFloat(theEvent.attrValue)).toFixed(2);
          break;
        case 'sum2':
          value = (events.length * (Math.pow(parseFloat(theEvent.attrValue), 2))).toFixed(2);
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
   * A mocha test suite including tests to check the retrieval of raw data
   *  from the database
   * @param {object} options Options to generate the URL
   * @param {boolean} checkRecvTime Flag indicating if the recvTime should be checked
   */
  function rawDataRetrievalSuite(options, checkRecvTime) {
    describe('should respond', function() {
      it('with empty aggregated data if no data since dateFrom',
        noRawDataSinceDateTest.bind(
          null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, options));

      it('with raw data if data since dateFrom',
        rawDataAvailableSinceDateTest.bind(
          null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, options, checkRecvTime));
    });
  }

  /**
   * A mocha test suite including tests to check the retrieval of aggregated data
   *  from the database for the passed aggregation method
   * @param {string} aggrMethod The aggregation method
   */
  function aggregatedDataRetrievalSuite(aggrMethod) {
    describe('with aggrMethod as ' + aggrMethod, function() {
      describe('and aggrPeriod as ' + sthConfig.RESOLUTION.SECOND, function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noAggregatedDataSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.SECOND));

        it('should respond with aggregated data if data since dateFrom',
          aggregatedDataAvailableSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.SECOND));
      });

      describe('and aggrPeriod as minute', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noAggregatedDataSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MINUTE));

        it('should respond with aggregated data if data since dateFrom',
          aggregatedDataAvailableSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH,aggrMethod, sthConfig.RESOLUTION.MINUTE));
      });

      describe('and aggrPeriod as hour', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noAggregatedDataSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.HOUR));

        it('should respond with aggregated data if data since dateFrom',
          aggregatedDataAvailableSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.HOUR));
      });

      describe('and aggrPeriod as day', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noAggregatedDataSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.DAY));

        it('should respond with aggregated data if data since dateFrom',
          aggregatedDataAvailableSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.DAY));
      });

      describe('and aggrPeriod as month', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noAggregatedDataSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MONTH));

        it('should respond with aggregated data if data since dateFrom',
          aggregatedDataAvailableSinceDateTest.bind(
            null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH, aggrMethod, sthConfig.RESOLUTION.MONTH));
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
          sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
          sthTestConfig.ATTRIBUTE_NAME);
        sthDatabase.getCollection(sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE), collectionName4Events, false,
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
          sthConfig.DEFAULT_SERVICE_PATH, sthTestConfig.ENTITY_ID, sthTestConfig.ENTITY_TYPE,
          sthTestConfig.ATTRIBUTE_NAME);
        sthDatabase.getCollection(sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE),
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
   * Notification including no attributes test case
   * @param service The Fiware-Service header
   * @param servicePath The Fiware-ServicePath header
   * @param done The test case callback function
   */
  function noAttributesTest(service, servicePath, done) {
    request({
      uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Fiware-Service': service || sthConfig.SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
      },
      json: true,
      body: {
        "subscriptionId": "1234567890ABCDF123456789",
        "originator": "orion.contextBroker.instance",
        "contextResponses": [
          {
            "contextElement": {
              "attributes": [],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          },
          {
            "contextElement": {
              "attributes": [],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          },
          {
            "contextElement": {
              "attributes": [],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          }
        ]
      }
    }, function (err, response, body) {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(400);
      expect(body.statusCode).to.equal(400);
      expect(response.statusMessage).to.equal('Bad Request');
      expect(body.error).to.equal('Bad Request');
      expect(body.validation.source).to.equal('payload');
      expect(body.validation.keys).to.be.an(Array);
      expect(body.validation.keys.indexOf('attributes')).to.not.equal(-1);
      done();
    });
  }

  /**
   * Notification including invalid attribute values test case
   * @param service The Fiware-Service header
   * @param servicePath The Fiware-ServicePath header
   * @param done The test case callback function
   */
  function invalidAttributeValuesTest(service, servicePath, done) {
    request({
      uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Fiware-Service': service || sthConfig.SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.SERVICE_PATH
      },
      json: true,
      body: {
        "subscriptionId": "1234567890ABCDF123456789",
        "originator": "orion.contextBroker.instance",
        "contextResponses": [
          {
            "contextElement": {
              "attributes": [
                {
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : sthTestConfig.ATTRIBUTE_TYPE,
                  "value" : 'just a string'
                }
              ],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          },
          {
            "contextElement": {
              "attributes": [
                {
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : sthTestConfig.ATTRIBUTE_TYPE,
                  "value" : ['just', 'an', 'array']
                }
              ],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          },
          {
            "contextElement": {
              "attributes": [
                {
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : sthTestConfig.ATTRIBUTE_TYPE,
                  "value" : {
                    just: 'an object'
                  }
                }
              ],
              "type": "entityType",
              "isPattern": "false",
              "id": "entityId"
            },
            "statusCode": {
              "code": "200",
              "reasonPhrase": "OK"
            }
          }
        ]
      }
    }, function (err, response, body) {
      expect(err).to.equal(null);
      expect(response.statusCode).to.equal(400);
      expect(body.statusCode).to.equal(400);
      expect(response.statusMessage).to.equal('Bad Request');
      expect(body.error).to.equal('Bad Request');
      expect(body.validation.source).to.equal('payload');
      expect(body.validation.keys).to.be.an(Array);
      expect(body.validation.keys.indexOf('attributes')).to.not.equal(-1);
      done();
    });
  }

  /**
   * A mocha test suite to check the reception of notifications by the Orion Context Broker
   */
  function eventNotificationSuite() {
    describe('no attribute values notification', function() {
      it('should respond with 400 - Bad Request', noAttributesTest.bind(
        null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH));
    });

    describe('invalid attribute values notification', function() {
      it('should respond with 400 - Bad Request', invalidAttributeValuesTest.bind(
        null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH));
    });

    describe('complex notification', function() {
      before(function () {
        events = [];
      });

      describe('reception', function () {
        it('should attend the notification', complexNotificationTest.bind(
          null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH));
      });

      describe('for each new notification', function () {
        describe('raw data retrieval with lastN',
          rawDataRetrievalSuite.bind(null, {lastN: 1}, false));

        describe('raw data retrieval with hLimit and hOffset',
          rawDataRetrievalSuite.bind(null, {hLimit: 1, hOffset: 0}, false));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, 'min'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, 'max'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, 'sum'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, 'sum2'));
      });
    });
  }

  /**
   * A mocha test to check the reception of a new notification by the Orion Context Broker
   * @param {Function} done The mocha done() callback function
   */
  function complexNotificationTest(service, servicePath, done) {
    var anEvent = {
      recvTime: new Date(),
      attrType: sthTestConfig.ATTRIBUTE_TYPE,
      attrValue: 66.6
    };
    request({
      uri: getURL(sthTestConfig.API_OPERATION.NOTIFY),
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
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
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : anEvent.attrType,
                  "value" : anEvent.attrValue
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
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : anEvent.attrType,
                  "value" : anEvent.attrValue
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
                  "name" : sthTestConfig.ATTRIBUTE_NAME,
                  "type" : anEvent.attrType,
                  "value" : anEvent.attrValue
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

  /**
   * Successfull 200 status test case
   * @param {Object} options Options to generate the URL
   * @param {Function} done Callback
   */
  function status200Test(options, done) {
    request({
      uri: getURL(sthTestConfig.API_OPERATION.READ, options),
      method: 'GET',
      headers: {
        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
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
  };

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
      getURL: getURL,
      rawDataRetrievalSuite: rawDataRetrievalSuite,
      aggregatedDataRetrievalSuite: aggregatedDataRetrievalSuite,
      cleanDatabaseSuite: cleanDatabaseSuite,
      eventNotificationSuite: eventNotificationSuite,
      status200Test: status200Test
    };
  };
})();
