/* globals before, console, describe, it, module, require */

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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var sthTestConfig = require('./sth_test_configuration');
var sthConfig = require('../../lib/sth_configuration');
var sthHelper = require('../../lib/sth_helper');
var sthDatabase = require('../../lib/sth_database');

var request = require('request');
var expect = require('expect.js');

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
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {Date} recvTime The event timestamp
 * @returns {Object} The created raw event
 */
function createEvent(attrName, attrType, recvTime) {
  var theEvent;
  var attrValue = attrType !== 'string' ? (Math.random() *
  (parseFloat(sthTestConfig.MAX_VALUE) - parseFloat(sthTestConfig.MIN_VALUE)) -
  Math.abs(parseFloat(sthTestConfig.MIN_VALUE))).toFixed(2) : 'just a string';
  switch (sthDatabase.DATA_MODEL) {
    case sthDatabase.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
      theEvent = {
        recvTime: recvTime,
        entityId: sthTestConfig.ENTITY_ID,
        entityType: sthTestConfig.ENTITY_TYPE,
        attrName: attrName,
        attrType: attrType,
        attrValue: attrValue
      };
      break;
    case sthDatabase.DATA_MODELS.COLLECTIONS_PER_ENTITY:
      theEvent = {
        recvTime: recvTime,
        attrName: attrName,
        attrType: attrType,
        attrValue: attrValue
      };
      break;
    case sthDatabase.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
      theEvent = {
        recvTime: recvTime,
        // This property is not really stored for the collections per attribute model.
        //  It is included just to ease its recovery
        attrName: attrName,
        attrType: attrType,
        attrValue: attrValue
      };
      break;
  }
  return theEvent;
}

function cleanEvents() {
  events = [];
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
 * @param {boolean} includeTimeInstantMetadata The test case should include a TimeInstant attribute metadata
 * @param {Function} done The mocha done() callback function
 */
function addEventTest(anEvent, includeTimeInstantMetadata, done) {
  // Check if the collection exists
  sthDatabase.getCollection(
    {
      service: sthConfig.DEFAULT_SERVICE,
      servicePath: sthConfig.DEFAULT_SERVICE_PATH,
      entityId: sthTestConfig.ENTITY_ID,
      entityType: sthTestConfig.ENTITY_TYPE,
      attrName: anEvent.attrName
    },
    {
      isAggregated: false,
      shouldCreate: true,
      shouldStoreHash: true,
      shouldTruncate: true
    },
    function (err, collection) {
      if (err) {
        done(err);
      } else {
        if (includeTimeInstantMetadata) {
          sthDatabase.storeRawData(
            {
              collection: collection,
              recvTime: null,
              entityId: sthTestConfig.ENTITY_ID,
              entityType: sthTestConfig.ENTITY_TYPE,
              attribute: {
                name: anEvent.attrName,
                type: anEvent.attrType,
                value: anEvent.attrValue,
                metadatas: [
                  {
                    name: 'TimeInstant',
                    type: 'ISO8601',
                    value: anEvent.recvTime
                  }
                ]
              }
            },
            done);
        } else {
          sthDatabase.storeRawData(
            {
              collection: collection,
              recvTime: anEvent.recvTime,
              entityId: sthTestConfig.ENTITY_ID,
              entityType: sthTestConfig.ENTITY_TYPE,
              attribute: {
                name: anEvent.attrName,
                type: anEvent.attrType,
                value: anEvent.attrValue
              }
            },
            done);
        }
      }
    }
  );
}

/**
 * A mocha test which adds aggregated data to the aggregated data collection
 *  for an event based on a resolution
 * @param {Object} anEvent The event
 * @param {Function} done The mocha done() callback function
 */
function addAggregatedDataTest(anEvent, done) {
  var counter = 0;
  var callback = function (err) {
    if (err) {
      done(err);
    }
    if (++counter === 5) {
      done();
    }
  };
  // Check if the collection exists
  sthDatabase.getCollection(
    {
      service: sthConfig.DEFAULT_SERVICE,
      servicePath: sthConfig.DEFAULT_SERVICE_PATH,
      entityId: sthTestConfig.ENTITY_ID,
      entityType: sthTestConfig.ENTITY_TYPE,
      attrName: anEvent.attrName
    },
    {
      isAggregated: true,
      aggregationType: sthHelper.getAggregationTypeFromValue(anEvent.attrValue),
      shouldCreate: true,
      shouldStoreHash: true,
      shouldTruncate: true
    },
    function (err, collection) {
      if (err) {
        done(err);
      } else {
        sthDatabase.storeAggregatedData4Resolution(
          {
            collection: collection,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName,
            attrType: anEvent.attrType,
            attrValue: anEvent.attrValue,
            resolution: sthConfig.RESOLUTION.SECOND,
            timestamp: anEvent.recvTime
          },
          callback
        );
        sthDatabase.storeAggregatedData4Resolution(
          {
            collection: collection,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName,
            attrType: anEvent.attrType,
            attrValue: anEvent.attrValue,
            resolution: sthConfig.RESOLUTION.MINUTE,
            timestamp: anEvent.recvTime
          },
          callback
        );
        sthDatabase.storeAggregatedData4Resolution(
          {
            collection: collection,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName,
            attrType: anEvent.attrType,
            attrValue: anEvent.attrValue,
            resolution: sthConfig.RESOLUTION.HOUR,
            timestamp: anEvent.recvTime
          },
          callback
        );
        sthDatabase.storeAggregatedData4Resolution(
          {
            collection: collection,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName,
            attrType: anEvent.attrType,
            attrValue: anEvent.attrValue,
            resolution: sthConfig.RESOLUTION.DAY,
            timestamp: anEvent.recvTime
          },
          callback
        );
        sthDatabase.storeAggregatedData4Resolution(
          {
            collection: collection,
            entityId: sthTestConfig.ENTITY_ID,
            entityType: sthTestConfig.ENTITY_TYPE,
            attrName: anEvent.attrName,
            attrType: anEvent.attrType,
            attrValue: anEvent.attrValue,
            resolution: sthConfig.RESOLUTION.MONTH,
            timestamp: anEvent.recvTime
          },
          callback
        );
      }
    }
  );
}

/**
 * A mocha test suite to be run for each new raw event
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The test case should include a TimeInstant metadata
 */
function eachEventTestSuite(attrName, attrType, includeTimeInstantMetadata) {
  var anEvent;

  before(function () {
    if (events.length === sthTestConfig.SAMPLES) {
      cleanEvents();
    }
    anEvent = events[0] || createEvent(
        attrName, attrType, getRandomDate(sthTestConfig.START_DATE, sthTestConfig.END_DATE));
    events.push(anEvent);
    console.log('New event: %s', JSON.stringify(anEvent));
  });

  it('should store the single event', function (done) {
    addEventTest(anEvent, includeTimeInstantMetadata, done);
  });

  it('should store aggregated data for each resolution',
    function (done) {
      addAggregatedDataTest(anEvent, done);
    }
  );
}

/**
 * A mocha test to drop the raw event data collection from the database
 * @param {Function} done The mocha done() callback function
 */
function dropRawEventCollectionTest(done) {
  var databaseName = sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE);
  var collectionName4Events = sthDatabase.getCollectionName4Events(
    {
      databaseName: databaseName,
      servicePath: sthConfig.DEFAULT_SERVICE_PATH,
      entityId: sthTestConfig.ENTITY_ID,
      entityType: sthTestConfig.ENTITY_TYPE,
      attrName: sthTestConfig.ATTRIBUTE_NAME
    }
  );
  sthDatabase.connection.dropCollection(collectionName4Events, function (err) {
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
function dropAggregatedDataCollectionTest(aggregationType, done) {
  var databaseName = sthDatabase.getDatabase(sthConfig.DEFAULT_SERVICE);
  var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
    {
      databaseName: databaseName,
      servicePath: sthConfig.DEFAULT_SERVICE_PATH,
      entityId: sthTestConfig.ENTITY_ID,
      entityType: sthTestConfig.ENTITY_TYPE,
      attrName: sthTestConfig.ATTRIBUTE_NAME,
      aggregationType: aggregationType
    }
  );
  sthDatabase.connection.dropCollection(collectionName4Aggregated, function (err) {
    if (err && err.message === 'ns not found') {
      err = null;
    }
    return done(err);
  });
}

/**
 * A mocha test to drop the collection names collection from the database
 * @param {Function} done The mocha done() callback function
 */
function dropCollectionNamesCollectionTest(done) {
  var collectionName = sthConfig.COLLECTION_PREFIX + 'collection_names';
  sthDatabase.connection.dropCollection(collectionName, function (err) {
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
 *  query params ('lastN', 'hLimit', 'hOffset', aggrMethod', 'aggrPeriod', 'dateFrom' and 'dateTo')
 *  @param {string} attrName The attribute name
 * @returns {string}
 */
function getURL(type, options, attrName) {
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

  switch (type) {
    case sthTestConfig.API_OPERATION.READ:
      if (options && options.invalidPath) {
        url += '/this/is/an/invalid/path';
      } else {
        url += '/STH/v1/contextEntities/type/' + sthTestConfig.ENTITY_TYPE + '/' +
          'id/' + sthTestConfig.ENTITY_ID +
          '/attributes/' + attrName || sthTestConfig.ATTRIBUTE_NAME;
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
 * A mocha test forcing the server to retrieve aggregated data from the database
 *  for the passed aggregation method and resolution
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {object} options To generate the URL
 *  - {boolean} checkRecvTime Flag indicating of the recvTime should be checked
 * @param {Function} done The mocha done() callback function
 */
function rawDataAvailableDateFilter(params, done) {
  var service = params.service,
      servicePath = params.servicePath,
      attrName = params.attrName,
      options = params.options,
      checkRecvTime = params.checkRecvTime;

  request({
    uri: getURL(sthTestConfig.API_OPERATION.READ, options, attrName),
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
    expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
    expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
      attrName || sthTestConfig.ATTRIBUTE_NAME);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(
      options.lastN ? events.length : 1);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[options.lastN ? events.length - 1 : 0].
      attrValue).to.equal(events[events.length - 1].attrValue);
    if (checkRecvTime) {
      expect(bodyJSON.contextResponses[0].contextElement.attributes[0].
        values[options.lastN ? events.length - 1 : 0].recvTime).to.equal(
        sthHelper.getISODateString(events[events.length - 1].recvTime));
    }
    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
    done();
  });
}

/**
 * A mocha test forcing the server to retrieve no aggregated data from the database for
 *  the passed aggregation method and resolution
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {string} aggrMethod The aggregation method
 *  - {string} resolution The resolution
 * @param {string} done The mocha done() callback function
 */
function noAggregatedDataSinceDateTest(params, done) {
  var service = params.service,
      servicePath = params.servicePath,
      attrName = params.attrName,
      aggrMethod = params.aggrMethod,
      resolution = params.resolution;

  var offset;
  switch (resolution) {
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
              events[events.length - 1].recvTime.getTime() + offset),
            resolution))
      },
      attrName
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
    expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
    expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
      attrName || sthTestConfig.ATTRIBUTE_NAME);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values).to.be.an(Array);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(0);
    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
    done();
  });
}

/**
 * A mocha test forcing the server to retrieve aggregated data from the database
 *  for the passed aggregation method and resolution
 * @param {object} param It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {string} aggrMethod The aggregation method
 *  - {string} resolution The resolution
 * @param {Function} done The mocha done() callback function
 */
function aggregatedDataAvailableSinceDateTest(params, done) {
  var service = params.service,
      servicePath = params.servicePath,
      attrName = params.attrName,
      attrType = params.attrType,
      aggrMethod = params.aggrMethod,
      resolution = params.resolution;

  request({
    uri: getURL(sthTestConfig.API_OPERATION.READ,
      {
        aggrMethod: aggrMethod,
        aggrPeriod: resolution,
        dateFrom: sthHelper.getISODateString(
          sthHelper.getOrigin(
            events[events.length - 1].recvTime,
            resolution))
      },
      attrName
    ),
    method: 'GET',
    headers: {
      'Fiware-Service': service || sthConfig.DEFAULT_SERVICE,
      'Fiware-ServicePath': servicePath || sthConfig.DEFAULT_SERVICE_PATH
    }
  }, function (err, response, body) {
    var theEvent = events[events.length - 1];
    var index, entries;
    switch (resolution) {
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
    expect(bodyJSON.contextResponses[0].contextElement.id).to.equal(sthTestConfig.ENTITY_ID);
    expect(bodyJSON.contextResponses[0].contextElement.isPattern).to.equal(false);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].name).to.equal(
      attrName || sthTestConfig.ATTRIBUTE_NAME);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.resolution).to.equal(resolution);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0]._id.origin).to.be(
      sthHelper.getISODateString(
        sthHelper.getOrigin(
          theEvent.recvTime,
          resolution
        )
      )
    );
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
      points.length).to.equal(sthConfig.FILTER_OUT_EMPTY ? 1 : entries);
    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
      points[sthConfig.FILTER_OUT_EMPTY ? 0 : index].samples).to.equal(events.length);
    var value;
    switch (aggrMethod) {
      case 'min':
      case 'max':
        value = parseFloat(theEvent.attrValue).toFixed(2);
        break;
      case 'sum':
        value = (events.length * parseFloat(theEvent.attrValue)).toFixed(2);
        break;
      case 'sum2':
        value = ((events.length) * (Math.pow(parseFloat(theEvent.attrValue), 2))).toFixed(2);
        break;
      case 'occur':
        value = events.length;
        break;
    }
    if (attrType === 'float') {
      expect(parseFloat(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
        points[sthConfig.FILTER_OUT_EMPTY ? 0 : index][aggrMethod]).toFixed(2)).to.equal(value);
    } else if (attrType === 'string') {
      expect(parseFloat(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].
        points[sthConfig.FILTER_OUT_EMPTY ? 0 : index][aggrMethod]['just a string'])).to.equal(value);
    }
    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
    done();
  });
}

/**
 * A mocha test suite including tests to check the retrieval of raw data
 *  from the database
 * @param {object} options Options to generate the URL
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} checkRecvTime Flag indicating if the recvTime should be checked
 */
function rawDataRetrievalSuite(options, attrName, attrType, checkRecvTime) {
  describe('should respond', function () {
    var optionsWithNoDates = {},
      optionsWithDateFrom = {},
      optionsWithDateTo = {},
      optionsWithFromAndToDate = {};

    before(function () {
      for (var prop in options) {
        optionsWithNoDates[prop] = options[prop];
        optionsWithDateFrom[prop] = options[prop];
        optionsWithDateTo[prop] = options[prop];
        optionsWithFromAndToDate[prop] = options[prop];
      }
      if (sthTestConfig.COMPLEX_NOTIFICATION_STARTED && 'hLimit' in optionsWithNoDates) {
        optionsWithNoDates.hOffset = sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS - 1;
      }
      optionsWithDateFrom.dateFrom = sthHelper.getISODateString(events[0].recvTime);
      optionsWithDateTo.dateTo = sthHelper.getISODateString(new Date());
      if (sthTestConfig.COMPLEX_NOTIFICATION_STARTED && 'hLimit' in optionsWithDateTo) {
        optionsWithDateTo.hOffset = sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS - 1;
      }
      optionsWithFromAndToDate.dateFrom = sthHelper.getISODateString(events[0].recvTime);
      optionsWithFromAndToDate.dateTo = sthHelper.getISODateString(new Date());
    });

    it('with raw data if data and no dateFrom or dateTo',
      rawDataAvailableDateFilter.bind(
        null,
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          attrName: attrName,
          options: optionsWithNoDates,
          checkRecvTime: checkRecvTime
        }
      )
    );

    it('with raw data if data since dateFrom',
      rawDataAvailableDateFilter.bind(
        null,
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          attrName: attrName,
          options: optionsWithDateFrom,
          checkRecvTime: checkRecvTime
        }
      )
    );

    it('with raw data if data before dateTo',
      rawDataAvailableDateFilter.bind(
        null,
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          attrName: attrName,
          options: optionsWithDateTo,
          checkRecvTime: checkRecvTime
        }
      )
    );

    it('with raw data if data from dateFrom and before dateTo',
      rawDataAvailableDateFilter.bind(
        null,
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          attrName: attrName,
          options: optionsWithFromAndToDate,
          checkRecvTime: checkRecvTime
        }
      )
    );
  });
}

/**
 * Tests of the aggregated data retrieval suite
 * @param index The index
 * @param attrName The attribute name
 * @param attrType The attribyte type
 * @param aggrMethod The aggregation method
 */
function aggregatedDataRetrievalTests(index, attrName, attrType, aggrMethod) {
  it('should respond with empty aggregated data if no data since dateFrom',
    noAggregatedDataSinceDateTest.bind(
      null,
      {
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        attrName: attrName,
        aggrMethod: aggrMethod,
        resolution: sthConfig.AGGREGATE_BY[index]
      }
    )
  );

  it('should respond with aggregated data if data since dateFrom',
    aggregatedDataAvailableSinceDateTest.bind(
      null,
      {
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        attrName: attrName,
        attrType: attrType,
        aggrMethod: aggrMethod,
        resolution: sthConfig.AGGREGATE_BY[index]
      }
    )
  );
}

/**
 * A mocha test suite including tests to check the retrieval of aggregated data
 *  from the database for the passed aggregation method
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {string} aggrMethod The aggregation method
 */
function aggregatedDataRetrievalSuite(attrName, attrType, aggrMethod) {
  describe('with aggrMethod as ' + aggrMethod, function () {
    for (var i = 0; i < sthConfig.AGGREGATE_BY.length; i++) {
      describe('and aggrPeriod as ' + sthConfig.AGGREGATE_BY[i],
        aggregatedDataRetrievalTests.bind(null, i, attrName, attrType, aggrMethod));
    }
  });
}

/**
 * A mocha test suite to clean the database (i.e., the raw event data and
 *  aggregated data collections
 */
function cleanDatabaseSuite() {
  if (sthTestConfig.CLEAN) {
    it('should drop the collection created for the events', function (done) {
      sthDatabase.getCollection(
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attrName: sthTestConfig.ATTRIBUTE_NAME
        },
        {
          isAggregated: false,
          shouldCreate: false,
          shouldStoreHash: false,
          shouldTruncate: false
        },
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

    it('should drop the collection created for the numeric aggregated data', function (done) {
      sthDatabase.getCollection(
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attrName: sthTestConfig.ATTRIBUTE_NAME
        },
        {
          isAggregated: true,
          aggregationType: sthConfig.AGGREGATION.TYPES.NUMERIC,
          shouldCreate: false,
          shouldStoreHash: false,
          shouldTruncate: false
        },
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

    it('should drop the collection created for the textual aggregated data', function (done) {
      sthDatabase.getCollection(
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          entityId: sthTestConfig.ENTITY_ID,
          entityType: sthTestConfig.ENTITY_TYPE,
          attrName: sthTestConfig.ATTRIBUTE_NAME
        },
        {
          isAggregated: true,
          aggregationType: sthConfig.AGGREGATION.TYPES.TEXTUAL,
          shouldCreate: false,
          shouldStoreHash: false,
          shouldTruncate: false
        },
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
      'subscriptionId': '1234567890ABCDF123456789',
      'originator': 'orion.contextBroker.instance',
      'contextResponses': [
        {
          'contextElement': {
            'attributes': [],
            'type': sthTestConfig.ENTITY_TYPE,
            'isPattern': 'false',
            'id': sthTestConfig.ENTITY_ID
          },
          'statusCode': {
            'code': '200',
            'reasonPhrase': 'OK'
          }
        },
        {
          'contextElement': {
            'attributes': [],
            'type': sthTestConfig.ENTITY_TYPE,
            'isPattern': 'false',
            'id': sthTestConfig.ENTITY_ID
          },
          'statusCode': {
            'code': '200',
            'reasonPhrase': 'OK'
          }
        },
        {
          'contextElement': {
            'attributes': [],
            'type': sthTestConfig.ENTITY_TYPE,
            'isPattern': 'false',
            'id': sthTestConfig.ENTITY_ID
          },
          'statusCode': {
            'code': '200',
            'reasonPhrase': 'OK'
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
  var body = {
    'subscriptionId': '1234567890ABCDF123456789',
    'originator': 'orion.contextBroker.instance',
    'contextResponses': [
      {
        'contextElement': {
          'attributes': [
            {
              'name': sthTestConfig.ATTRIBUTE_NAME,
              'type': sthTestConfig.ATTRIBUTE_TYPE,
              'value': ''
            }
          ],
          'type': sthTestConfig.ENTITY_TYPE,
          'isPattern': 'false',
          'id': sthTestConfig.ENTITY_ID
        },
        'statusCode': {
          'code': '200',
          'reasonPhrase': 'OK'
        }
      },
      {
        'contextElement': {
          'attributes': [
            {
              'name': sthTestConfig.ATTRIBUTE_NAME,
              'type': sthTestConfig.ATTRIBUTE_TYPE,
              'value': ['just', 'an', 'array']
            }
          ],
          'type': sthTestConfig.ENTITY_TYPE,
          'isPattern': 'false',
          'id': sthTestConfig.ENTITY_ID
        },
        'statusCode': {
          'code': '200',
          'reasonPhrase': 'OK'
        }
      },
      {
        'contextElement': {
          'attributes': [
            {
              'name': sthTestConfig.ATTRIBUTE_NAME,
              'type': sthTestConfig.ATTRIBUTE_TYPE,
              'value': {
                just: 'an object'
              }
            }
          ],
          'type': sthTestConfig.ENTITY_TYPE,
          'isPattern': 'false',
          'id': sthTestConfig.ENTITY_ID
        },
        'statusCode': {
          'code': '200',
          'reasonPhrase': 'OK'
        }
      }
    ]
  };
  if (sthConfig.IGNORE_BLANK_SPACES) {
    body.contextResponses.push(
      {
        'contextElement': {
          'attributes': [
            {
              'name': sthTestConfig.ATTRIBUTE_NAME,
              'type': sthTestConfig.ATTRIBUTE_TYPE,
              'value': ' ' // Blank space
            }
          ],
          'type': sthTestConfig.ENTITY_TYPE,
          'isPattern': 'false',
          'id': sthTestConfig.ENTITY_ID
        },
        'statusCode': {
          'code': '200',
          'reasonPhrase': 'OK'
        }
      },
      {
        'contextElement': {
          'attributes': [
            {
              'name': sthTestConfig.ATTRIBUTE_NAME,
              'type': sthTestConfig.ATTRIBUTE_TYPE,
              'value': '   ' // Several blank space
            }
          ],
          'type': sthTestConfig.ENTITY_TYPE,
          'isPattern': 'false',
          'id': sthTestConfig.ENTITY_ID
        },
        'statusCode': {
          'code': '200',
          'reasonPhrase': 'OK'
        }
      }
    );
  }
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
    body: body
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
 * To avoid needing to set the 'jslint latedef: true' option to true for the whole file, we declare the
 *  complexNotificationTest function before its definition and before the complexNotificationSuite() function definition
 */
var complexNotificationTest;

/**
 * Complex notification suite
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 */
function complexNotificationSuite(attrName, attrType, includeTimeInstantMetadata) {
  describe('attribute of type ' + attrType, function () {
    before(function () {
      sthTestConfig.COMPLEX_NOTIFICATION_STARTED = true;
    });

    describe('reception', function () {
      it('should attend the notification', complexNotificationTest.bind(
        null,
        {
          service: sthConfig.DEFAULT_SERVICE,
          servicePath: sthConfig.DEFAULT_SERVICE_PATH,
          attrName: attrName,
          attrType: attrType,
          includeTimeInstantMetadata: includeTimeInstantMetadata
        }
      ));
    });

    describe('for each new notification', function () {
      describe('raw data retrieval with lastN',
        rawDataRetrievalSuite.bind(null, {lastN: sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS},
          attrName, attrType, false));

      describe('raw data retrieval with hLimit and hOffset',
        rawDataRetrievalSuite.bind(null, {hLimit: 1, hOffset: 0}, attrName, attrType, false));

      if (attrType === 'float') {
        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'min'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'max'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'sum'));

        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'sum2'));
      } else if (attrType === 'string') {
        describe('aggregated data retrieval',
          aggregatedDataRetrievalSuite.bind(null, attrName, attrType, 'occur'));
      }
    });
  });
}

/**
 * A mocha test suite to check the reception of notifications by the Orion Context Broker
 * @param {string} attrName The attribute name
 * @param {string} attrType The attribute type
 * @param {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 */
function eventNotificationSuite(attrName, attrType, includeTimeInstantMetadata) {
  before(function () {
    cleanEvents();
  });

  describe('no attribute values notification', function () {
    it('should respond with 400 - Bad Request', noAttributesTest.bind(
      null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH));
  });

  describe('invalid attribute values notification', function () {
    it('should respond with 400 - Bad Request', invalidAttributeValuesTest.bind(
      null, sthConfig.DEFAULT_SERVICE, sthConfig.DEFAULT_SERVICE_PATH));
  });

  describe('value changed of', complexNotificationSuite.bind(null, attrName, attrType, includeTimeInstantMetadata));
}

/**
 * A mocha test to check the reception of a new notification by the Orion Context Broker
 * @param {object} params It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} attrName The attribute name
 *  - {string} attrType The attribute type
 *  - {boolean} includeTimeInstantMetadata The attribute should include a TimeInstant metadata
 * @param {Function} done The mocha done() callback function
 */
complexNotificationTest = function complexNotificationTest(params, done) {
  var service = params.service,
    servicePath = params.servicePath,
    attrName = params.attrName,
    attrType = params.attrType,
    includeTimeInstantMetadata = params.includeTimeInstantMetadata;
  var now = new Date();
  var anEvent = createEvent(attrName, attrType, now);
  var contextResponses = [];
  var attribute = {
    'name': anEvent.attrName,
    'type': anEvent.attrType,
    'value': anEvent.attrValue
  };

  if (includeTimeInstantMetadata) {
    attribute.metadatas = [
      {
        name: 'TimeInstant',
        type: 'ISO8601',
        value: now
      }
    ];
  }

  for (var i = 0; i < sthTestConfig.EVENT_NOTIFICATION_CONTEXT_ELEMENTS; i++) {
    contextResponses.push({
      'contextElement': {
        'attributes': [
          attribute
        ],
        'type': sthTestConfig.ENTITY_TYPE,
        'isPattern': 'false',
        'id': sthTestConfig.ENTITY_ID
      },
      'statusCode': {
        'code': '200',
        'reasonPhrase': 'OK'
      }
    });
  }
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
      'subscriptionId': '1234567890ABCDF123456789',
      'originator': 'orion.contextBroker.instance',
      'contextResponses': contextResponses
    }
  }, function (err, response, body) {
    for (var i = 0; i < 3; i++) {
      events.push(anEvent);
    }
    expect(body).to.be(undefined);
    done(err);
  });
};

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
  }, function (err, response, body) {
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
}

module.exports = {
  getDayOfYear: getDayOfYear,
  addEventTest: addEventTest,
  eachEventTestSuite: eachEventTestSuite,
  dropRawEventCollectionTest: dropRawEventCollectionTest,
  dropAggregatedDataCollectionTest: dropAggregatedDataCollectionTest,
  dropCollectionNamesCollectionTest: dropCollectionNamesCollectionTest,
  getURL: getURL,
  rawDataRetrievalSuite: rawDataRetrievalSuite,
  aggregatedDataRetrievalSuite: aggregatedDataRetrievalSuite,
  cleanDatabaseSuite: cleanDatabaseSuite,
  eventNotificationSuite: eventNotificationSuite,
  status200Test: status200Test
};
