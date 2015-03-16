/* globals module, process, require */

(function() {
  "use strict";

  var mongoose = require('mongoose');

  var sthConfig, sthLogger, sthHelper, connectionURL, eventSchema, aggregatedSchema;

  /**
   * Connects to a (MongoDB) database endpoint asynchronously
   * @param {string} authentication The authentication schema to use for the connection
   * @param {string} host The host hosting the database
   * @param {string} port The port where the database server is listening to
   * @param {string} database The name of the database to connect to
   * @param {Function} callback A callback to inform about the result of the operation
   */
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

  /**
   * Closes a connection to the database asynchronously
   * @param {Function} callback Callback function to notify the result
   *  of the operation
   */
  function closeConnection(callback) {
    var connection = mongoose.connection;
    if (connection &&
      (connection.readyState === 1 || connection.readyState === 2)) {
      connection.close(function () {
        // Connection to database closed
        sthLogger.info('Connection to MongoDb succesfully closed');
        return callback();
      });
    } else {
      return process.nextTick(callback);
    }
  }

  /**
   * Compiles and returns the Mongoose model for the raw events stored
   *  in the database using the raw events schema
   * @param {string} name The name of the model (it corresponds to a MongoDB
   * collection of the database)
   * @returns {mongoose.Model} The compiled Mongoose model for the raw
   *  events
   */
  function getEventModel(name) {
    return mongoose.model(
      name,
      eventSchema,
      name);
  }

  /**
   * Compiles and returns the Mongoose model for the aggregated data
   *  stored in the database using the aggregated data schema
   * @param {string} name The name of the model (it corresponds to a MongoDB
   * collection of the database)
   * @returns {mongoose.Model} The compiled Mongoose model for the
   * aggregated data
   */
  function getAggregatedModel(name) {
    return mongoose.model(
      name,
      aggregatedSchema,
      name);
  }

  /**
   * Return the name of the collection which will store the raw events
   * @param {string} entityId The entity id related to the event
   * @param {string} attributeId The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Events(entityId, attributeId) {
    return 'sth.' + entityId + '.' + attributeId;
  }

  /**
   * Return the name of the collection which will store the aggregated data
   * @param {string} entityId The entity id related to the event
   * @param {string} attributeId The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Aggregated(entityId, attributeId) {
    return getCollectionName4Events(entityId, attributeId) + '.aggregated';
  }

  /**
   * Returns a reference to a collection of the database asynchronously
   * @param {string} name The collection's name
   * @param {Function} callback Callback function to be called with the results
   */
  function getCollection(name, callback) {
    // Passing {strict: true} makes the collection() function to call
    //  the callback with an error if the collection does not exist
    mongoose.connection.db.collection(name, {strict: true}, callback);
  }

  /**
   * Returns the required aggregated data from the database asynchronously
   * @param {string} collectionName The collection name from which the aggregated data
   *  should be collected
   * @param {string} aggregatedFunction The aggregated function or method to retrieve
   * @param {string} resolution The resolution of the data to use
   * @param {Date} from The date from which retrieve the aggregated data
   * @param {Date} to The date to which retrieve the aggregated data
   * @param {Function} callback Callback to inform about any possible error or results
   */
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

  module.exports = function (theSthConfig, theSthLogger, theSthHelper) {
    sthConfig = theSthConfig;
    sthLogger = theSthLogger;
    sthHelper = theSthHelper;
    return {
      get driver() {
        return mongoose;
      },
      get connectionURL() {
        return connectionURL;
      },
      connect: connect,
      closeConnection: closeConnection,
      getEventModel: getEventModel,
      getAggregatedModel: getAggregatedModel,
      getCollectionName4Events: getCollectionName4Events,
      getCollectionName4Aggregated: getCollectionName4Aggregated,
      getCollection: getCollection,
      getAggregatedData: getAggregatedData
    };
  };
})();
