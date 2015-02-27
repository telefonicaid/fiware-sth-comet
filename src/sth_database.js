/* globals module, process, require */

(function() {
  "use strict";

  var mongoose = require('mongoose');

  var sthConfig, sthHelper, connectionURL, eventSchema, aggregatedSchema;

  function connect(authentication, host, port, database, callback) {
    connectionURL = 'mongodb://' + authentication + '@' + host + ':' + port +
    '/' + database;

    mongoose.connect(connectionURL, function (err) {
      if (err) {
        // Error when connecting to the MongoDB database
        return callback(err);
      }

      // Event collection schema
      eventSchema = mongoose.Schema({
        timestamp: Date,
        type: String,
        value: Number
      });

      // Aggregated collection schema
      aggregatedSchema = mongoose.Schema({
        range: String,
        resolution: String,
        type: String,
        origin: Date,
        values: [{
          offset: Number,
          samples: Number,
          sum: Number,
          sum2: Number,
          min: Number,
          max: Number
        }]
      });

      return callback();
    });
  }

  function getEventModel(name) {
    return mongoose.model(
      name,
      eventSchema,
      name);
  }

  function getAggregatedModel(name) {
    return mongoose.model(
      name,
      aggregatedSchema,
      name);
  }

  function getCollectionName4Events(entityId, attributeId) {
    return 'sth.' + entityId + '.' + attributeId;
  }

  function getCollectionName4Aggregated(entityId, attributeId) {
    return getCollectionName4Events(entityId, attributeId) + '.aggregated';
  }

  function getCollection(name, callback) {
    mongoose.connection.db.collection(name, {strict: true}, callback);
  }

  function getAggregatedData(collectionName, aggregatedFunction, resolution, from, to, callback) {
    var fieldFilter = {
      '_id': 0,
      'resolution': 1,
      'range': 1,
      'origin': 1,
      'type': 1,
      'values.offset': 1,
      'values.samples': 1
    };
    fieldFilter['values.' + aggregatedFunction] = 1;

    var originFilter;
    if (!from || !to) {
      originFilter = sthHelper.getOrigin(new Date(), resolution);
    } else if (from === to) {
      originFilter = sthHelper.getOrigin(from, resolution);
    } else {
      originFilter = {
        $lte: sthHelper.getOrigin(to, resolution),
        $gte: sthHelper.getOrigin(from, resolution)
      };
    }

    // Get the aggregated data from the database
    // Return the data in ascending order based on the origin
    getAggregatedModel(collectionName).find(
      {
        resolution: resolution,
        range: sthHelper.getRange(resolution),
        origin: originFilter
      },
      fieldFilter
    ).sort({'origin': 'asc'}).exec(callback);
  }

  module.exports = function (theSthConfig, theSthHelper) {
    sthConfig = theSthConfig;
    sthHelper = theSthHelper;
    return {
      get driver() {
        return mongoose;
      },
      get connectionURL() {
        return connectionURL;
      },
      connect: connect,
      getEventModel: getEventModel,
      getAggregatedModel: getAggregatedModel,
      getCollectionName4Events: getCollectionName4Events,
      getCollectionName4Aggregated: getCollectionName4Aggregated,
      getCollection: getCollection,
      getAggregatedData: getAggregatedData
    };
  };
})();
