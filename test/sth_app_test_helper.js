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
    var value = (Math.random() *
      (parseFloat(sthTestConfig.MAX_VALUE) - parseFloat(sthTestConfig.MIN_VALUE)) -
        Math.abs(parseFloat(sthTestConfig.MIN_VALUE))).toFixed(2);
    return {
      timestamp: timestamp,
      type: sthTestConfig.TYPE,
      value: value
    };
  }

  /**
   * Prepopulates the aggregated data collection based on an event and
   *  a resolution
   * @param {Object} event The event
   * @param {string} resolution The resolution
   * @param {Function} callback Callback function to invoke with the results
   *  of the operation
   */
  function prePopulateAggregated(event, resolution, callback) {
    var values = [],
      totalValues,
      range,
      offsetOrigin = 0;

    switch (resolution) {
      case sthConfig.RESOLUTION.SECOND:
        totalValues = 60;
        range = sthConfig.RANGE.MINUTE;
        break;
      case sthConfig.RESOLUTION.MINUTE:
        totalValues = 60;
        range = sthConfig.RANGE.HOUR;
        break;
      case sthConfig.RESOLUTION.HOUR:
        totalValues = 24;
        range = sthConfig.RANGE.DAY;
        break;
      case sthConfig.RESOLUTION.DAY:
        offsetOrigin = 1;
        totalValues = 32;
        range = sthConfig.RANGE.MONTH;
        break;
      case sthConfig.RESOLUTION.MONTH:
        totalValues = 12;
        range = sthConfig.RANGE.YEAR;
        break;
    }

    for (var i = offsetOrigin; i < totalValues; i++) {
      values.push({
        offset: i,
        samples: 0,
        sum: 0,
        sum2: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      });
    }

    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);

    var aggregatedData = new sthDatabase.getAggregatedModel(collectionName4Aggregated)({
      range: range,
      resolution: resolution,
      type: sthTestConfig.TYPE,
      origin: sthHelper.getOrigin(event.timestamp, resolution),
      values: values
    });

    aggregatedData.save(function (err) {
      return callback(err);
    });
  }

  /**
   * Returns the condition to be used in the MongoDB update operation for aggregated data
   * @param {Object} event The event
   * @param {string} resolution The resolution
   * @returns {Object} The update condition
   */
  function getAggregateUpdateCondition(event, resolution) {
    var offset;
    switch (resolution) {
      case sthConfig.RESOLUTION.SECOND:
        offset = event.timestamp.getUTCSeconds();
        break;
      case sthConfig.RESOLUTION.MINUTE:
        offset = event.timestamp.getUTCMinutes();
        break;
      case sthConfig.RESOLUTION.HOUR:
        offset = event.timestamp.getUTCHours();
        break;
      case sthConfig.RESOLUTION.DAY:
        offset = event.timestamp.getUTCDate();
        break;
      case sthConfig.RESOLUTION.MONTH:
        offset = event.timestamp.getUTCMonth();
        break;
    }

    return {
      'origin': sthHelper.getOrigin(event.timestamp, resolution),
      'resolution': resolution,
      'range': sthHelper.getRange(resolution),
      'values.offset': offset
    };
  }

  /**
   * Returns the update to be used in the MongoDB update operation for aggregated data
   * @param {Object} event The event
   * @returns {Object} The update operation
   */
  function getAggregateUpdate(event) {
    var value = event.value;
    return {
      '$inc': {
        'values.$.samples': 1,
        'values.$.sum': value,
        'values.$.sum2': Math.pow(value, 2)
      },
      '$min': {
        'values.$.min': value
      },
      '$max': {
        'values.$.max': value
      }
    };
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
    var collectionName4Events = sthDatabase.getCollectionName4Events(
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
    var theEvent = new sthDatabase.getEventModel(collectionName4Events)(anEvent);
    theEvent.save(
      function (err) {
        return done(err);
      }
    );
  }

  /**
   * A mocha test which pre-populates the aggregated data collection based on
   *  an event and a resolution
   * @param {Object} anEvent The event
   * @param {string} resolution The resolution
   * @param {Function} done The mocha done() callback function
   */
  function prePopulateAggregatedTest(anEvent, resolution, done) {
    var origin;
    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
    switch(resolution) {
      case sthConfig.RESOLUTION.SECOND:
        origin = sthHelper.getOrigin(anEvent.timestamp, sthConfig.RESOLUTION.SECOND);
        break;
      case sthConfig.RESOLUTION.MINUTE:
        origin = sthHelper.getOrigin(anEvent.timestamp, sthConfig.RESOLUTION.MINUTE);
        break;
      case sthConfig.RESOLUTION.HOUR:
        origin = sthHelper.getOrigin(anEvent.timestamp, sthConfig.RESOLUTION.HOUR);
        break;
      case sthConfig.RESOLUTION.DAY:
        origin = sthHelper.getOrigin(anEvent.timestamp, sthConfig.RESOLUTION.DAY);
        break;
      case sthConfig.RESOLUTION.MONTH:
        origin = sthHelper.getOrigin(anEvent.timestamp, sthConfig.RESOLUTION.MONTH);
        break;
    }

    // Check if the document for the aggregated data associated to the event already exists
    sthDatabase.getAggregatedModel(collectionName4Aggregated).findOne({
      resolution: resolution,
      range: sthHelper.getRange(resolution),
      origin: origin
    }, function (err, result) {
      if (err) {
        done(err);
      }

      if (!result) {
        // The document for this aggregated data has not been created
        // Create and pre-populate it
        prePopulateAggregated(
          anEvent, resolution, done);
      } else {
        return done();
      }
    });
  }

  /**
   * A mocha test which adds aggregated data to the aggregated data collection
   *  for an event based on a resolution
   * @param {Object} anEvent The event
   * @param {string} resolution The resolution
   * @param {Function} done The mocha done() callback function
   */
  function addAggregatedDataTest(anEvent, resolution, done) {
    var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
    sthDatabase.getAggregatedModel(collectionName4Aggregated).update(
      getAggregateUpdateCondition(anEvent, resolution),
      getAggregateUpdate(anEvent),
      function (err) {
        return done(err);
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

    it('should pre-populate the aggregated collection (resolution: second, range: minute)',
      function(done) {
        prePopulateAggregatedTest(
          anEvent, sthConfig.RESOLUTION.SECOND, done);
      }
    );

    it('should store aggregated data (resolution: second, range: minute)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.SECOND, done);
      }
    );

    it('should pre-populate the aggregated collection (resolution: minute, range: hour)',
      function(done) {
        prePopulateAggregatedTest(
          anEvent, sthConfig.RESOLUTION.MINUTE, done);
      }
    );

    it('should store aggregated data (resolution: minute, range: hour)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.MINUTE, done);
      }
    );

    it('should pre-populate the aggregated collection (resolution: hour, range: day)',
      function(done) {
        prePopulateAggregatedTest(
          anEvent, sthConfig.RESOLUTION.HOUR, done);
      }
    );

    it('should store aggregated data (resolution: hour, range: day)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.HOUR, done);
      }
    );

    it('should pre-populate the aggregated collection (resolution: day, range: month)',
      function(done) {
        prePopulateAggregatedTest(
          anEvent, sthConfig.RESOLUTION.DAY, done);
      }
    );

    it('should store aggregated data (resolution: day, range: month)',
      function(done) {
        addAggregatedDataTest(
          anEvent, sthConfig.RESOLUTION.DAY, done);
      }
    );

    it('should pre-populate the aggregated collection (resolution: month, range: year)',
      function(done) {
        prePopulateAggregatedTest(
          anEvent, sthConfig.RESOLUTION.MONTH, done);
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
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
    sthDatabase.driver.connection.db.dropCollection(collectionName4Events, function (err) {
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
      sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
    sthDatabase.driver.connection.db.dropCollection(collectionName4Aggregated, function (err) {
      if (err && err.message === 'ns not found') {
        err = null;
      }
      return done(err);
    });
  }

  /**
   * Returns a valid URL based on the aggregation method, the aggregation period and
   *  a range of dates
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
  function getValidURL(aggrMethod, aggrPeriod, dateFrom, dateTo) {
    return 'http://' + sthConfig.HOST + ':' + sthConfig.PORT +
      '/STH/v1/contextEntities/type/quantity/' +
      'id/' + sthTestConfig.ENTITY_ID +
      '/attributes/' + sthTestConfig.ATTRIBUTE_ID +
      '?aggrMethod=' + (aggrMethod || 'min') +
      '&aggrPeriod=' + (aggrPeriod || 'second') +
      (dateFrom ? '&dateFrom=' + dateFrom : '') +
      (dateTo ? '&dateTo=' + dateTo : '');
  }

  /**
   * Returns an invalid URL based on certain criteria passed as arguments
   * @param {Object} options The options to apply when generating the invalid
   *  URL (possible keys are 'invalidPath', 'noAggrMethod', 'noAggrPeriod',
   *  'noDateFrom' and 'noDateTo'
   * @returns {string}
   */
  function getInvalidURL(options) {
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

    if (!options.invalidPath) {
      url += '/STH/v1/contextEntities/type/quantity/' +
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

  /**
   * A mocha test forcing the server to retrieve no data from the database for
   *  the passed aggregation method and resolution
   * @param {string} aggrMethod The aggregation method
   * @param {string} resolution The resolution
   * @param {string} done The mocha done() callback function
   */
  function noDataSinceDateTest(aggrMethod, resolution, done) {
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
      uri: getValidURL(aggrMethod, resolution,
        sthHelper.getISODateString(
          sthHelper.getOrigin(
            new Date(
              events[0].timestamp.getTime() + offset),
            resolution)),
        null),
      method: 'GET'
    }, function (err, response, body) {
      var bodyJSON = JSON.parse(body);
      expect(err).to.equal(null);
      expect(bodyJSON.resolution).to.equal(resolution);
      expect(bodyJSON.range).to.equal(
        sthHelper.getRange(resolution),
        resolution);
      expect(bodyJSON.origin).to.equal(null);
      expect(bodyJSON.values.length).to.equal(0);
      done();
    });
  }

  /**
   * A mocha test forcing the server to retrieve aggregated data from the database
   *  for the passed aggregation method and resolution
   * @param {string} aggrMethod The aggregation method
   * @param {string} resolution The resolution
   * @param {Function} done The mocha done() callback function
   */
  function dataAvailableSinceDateTest(aggrMethod, resolution, done) {
    request({
      uri: getValidURL(aggrMethod, resolution,
        sthHelper.getISODateString(
          sthHelper.getOrigin(
            events[0].timestamp,
            resolution)),
        null),
      method: 'GET'
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
      expect(bodyJSON[0].resolution).to.equal(resolution);
      expect(bodyJSON[0].range).to.equal(
        sthHelper.getRange(resolution),
        resolution);
      expect(bodyJSON[0].origin).to.equal(
        sthHelper.getISODateString(
          sthHelper.getOrigin(
            theEvent.timestamp,
            resolution
          )
        )
      );
      expect(bodyJSON[0].values.length).to.equal(entries);
      expect(bodyJSON[0].values[index].samples).to.equal(events.length);
      var value;
      switch(aggrMethod) {
        case 'min':
        case 'max':
          value = parseFloat(theEvent.value).toFixed(2);
          break;
        case 'sum':
          value = (events.length * parseFloat(theEvent.value)).toFixed(2);
          break;
        case 'sum2':
          value = (events.length * (Math.pow(parseFloat(theEvent.value), 2))).toFixed(2);
      }
      expect(parseFloat(bodyJSON[0].values[index][aggrMethod]).toFixed(2)).to.equal(value);
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
            null, aggrMethod, sthConfig.RESOLUTION.SECOND));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.SECOND));
      });

      describe('and aggrPeriod as minute', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.MINUTE));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.MINUTE));
      });

      describe('and aggrPeriod as hour', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.HOUR));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.HOUR));
      });

      describe('and aggrPeriod as day', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.DAY));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.DAY));
      });

      describe('and aggrPeriod as month', function() {
        it('should respond with empty aggregated data if no data since dateFrom',
          noDataSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.MONTH));

        it('should respond with aggregated data if data since dateFrom',
          dataAvailableSinceDateTest.bind(
            null, aggrMethod, sthConfig.RESOLUTION.MONTH));
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
          sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
        sthDatabase.getCollection(collectionName4Events, function (err, collection) {
          collection.drop(function (err) {
            done(err);
          });
        });
      });

      it('should drop the collection created for the aggregated data', function (done) {
        var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
          sthTestConfig.ENTITY_ID, sthTestConfig.ATTRIBUTE_ID);
        sthDatabase.getCollection(collectionName4Aggregated, function (err, collection) {
          collection.drop(function (err) {
            done(err);
          });
        });
      });
    }
  }

  module.exports = function (theSthTestConfiguration, theSthConfiguration, theSthDatabase, theSthHelper) {
    sthTestConfig = theSthTestConfiguration;
    sthConfig = theSthConfiguration;
    sthDatabase = theSthDatabase;
    sthHelper = theSthHelper;
    return {
      getRandomDate: getRandomDate,
      createEvent: createEvent,
      prePopulateAggregated: prePopulateAggregated,
      getAggregateUpdateCondition: getAggregateUpdateCondition,
      getAggregateUpdate: getAggregateUpdate,
      getDayOfYear: getDayOfYear,
      addEventTest: addEventTest,
      prePopulateAggregatedTest: prePopulateAggregatedTest,
      addAggregatedDataTest: addAggregatedDataTest,
      eachEventTestSuite: eachEventTestSuite,
      get events() {
        return events;
      },
      dropRawEventCollectionTest: dropRawEventCollectionTest,
      dropAggregatedDataCollectionTest: dropAggregatedDataCollectionTest,
      getValidURL: getValidURL,
      getInvalidURL: getInvalidURL,
      noDataSinceDateTest: noDataSinceDateTest,
      dataAvailableSinceDateTest: dataAvailableSinceDateTest,
      dataRetrievalSuite: dataRetrievalSuite,
      cleanDatabaseSuite: cleanDatabaseSuite
    };
  };
})();
