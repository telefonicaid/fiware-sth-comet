/* globals module */

(function() {
  "use strict";

  var sthTestConfiguration;
  var sthConfiguration;
  var sthDatabase;
  var sthHelper;

  function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  function createEvent(timestamp) {
    var value = (Math.random() *
    (parseFloat(sthTestConfiguration.MAX_VALUE) - parseFloat(sthTestConfiguration.MIN_VALUE)) -
    Math.abs(parseFloat(sthTestConfiguration.MIN_VALUE))).toFixed(2);
    return {
      timestamp: timestamp,
      type: sthTestConfiguration.TYPE,
      value: value
    };
  }

  function prePopulateAggregated(event, resolution, callback) {
    var values = [],
      totalValues,
      range,
      offsetOrigin = 0;

    switch (resolution) {
      case sthConfiguration.RESOLUTION.SECOND:
        totalValues = 60;
        range = sthConfiguration.RANGE.MINUTE;
        break;
      case sthConfiguration.RESOLUTION.MINUTE:
        totalValues = 60;
        range = sthConfiguration.RANGE.HOUR;
        break;
      case sthConfiguration.RESOLUTION.HOUR:
        totalValues = 24;
        range = sthConfiguration.RANGE.DAY;
        break;
      case sthConfiguration.RESOLUTION.DAY:
        offsetOrigin = 1;
        totalValues = 32;
        range = sthConfiguration.RANGE.MONTH;
        break;
      case sthConfiguration.RESOLUTION.MONTH:
        totalValues = 12;
        range = sthConfiguration.RANGE.YEAR;
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
      sthTestConfiguration.ENTITY_ID, sthTestConfiguration.ATTRIBUTE_ID);

    var aggregatedData = new sthDatabase.getAggregatedModel(collectionName4Aggregated)({
      range: range,
      resolution: resolution,
      type: sthTestConfiguration.TYPE,
      origin: sthHelper.getOrigin(event.timestamp, resolution),
      values: values
    });

    aggregatedData.save(function (err) {
      return callback(err);
    });
  }

  function getAggregateUpdateCondition(event, resolution) {
    var offset;
    switch (resolution) {
      case sthConfiguration.RESOLUTION.SECOND:
        offset = event.timestamp.getUTCSeconds();
        break;
      case sthConfiguration.RESOLUTION.MINUTE:
        offset = event.timestamp.getUTCMinutes();
        break;
      case sthConfiguration.RESOLUTION.HOUR:
        offset = event.timestamp.getUTCHours();
        break;
      case sthConfiguration.RESOLUTION.DAY:
        offset = event.timestamp.getUTCDate();
        break;
      case sthConfiguration.RESOLUTION.MONTH:
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

  function getDayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil(diff / oneDay);
  }

  module.exports = function (theSthTestConfiguration, theSthConfiguration, theSthDatabase, theSthHelper) {
    sthTestConfiguration = theSthTestConfiguration;
    sthConfiguration = theSthConfiguration;
    sthDatabase = theSthDatabase;
    sthHelper = theSthHelper;
    return {
      randomDate: randomDate,
      createEvent: createEvent,
      prePopulateAggregated: prePopulateAggregated,
      getAggregateUpdateCondition: getAggregateUpdateCondition,
      getAggregateUpdate: getAggregateUpdate,
      getDayOfYear: getDayOfYear
    };
  };
})();
