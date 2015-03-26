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
        _id: {
          type: {
            range: String,
            resolution: String,
            attrType: String,
            origin: Date
          },
          select: true
        },
        points: [{
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
    sthLogger.info('Closing the connection to the database...', {
      operationType: sthConfig.OPERATION_TYPE.DB_CONN_CLOSE
    });
    var connection = mongoose.connection;
    if (connection &&
      (connection.readyState === 1 || connection.readyState === 2)) {
      connection.close(function() {
        // Connection to database closed
        sthLogger.info('Connection to MongoDb succesfully closed', {
          operationType: sthConfig.OPERATION_TYPE.DB_CONN_CLOSE
        });
        return callback();
      });
    } else {
      sthLogger.info('No connection to the database available', {
        operationType: sthConfig.OPERATION_TYPE.DB_CONN_CLOSE
      });
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
   * @param {boolean} shouldFilter If true, the null results are filter out
   * @param {Function} callback Callback to inform about any possible error or results
   */
  function getAggregatedData(collectionName, aggregatedFunction, resolution, from, to, shouldFilter, callback) {
    var fieldFilter = {
      'points.offset': 1,
      'points.samples': 1
    };
    fieldFilter['points.' + aggregatedFunction] = 1;

    var originFilter;
    if (from && to) {
      if (from !== to) {
        originFilter = {
          $lte: sthHelper.getOrigin(to, resolution),
          $gte: sthHelper.getOrigin(from, resolution)
        };
      } else {
        originFilter = sthHelper.getOrigin(from, resolution);
      }
    } else if (!from && !to) {
      originFilter = sthHelper.getOrigin(new Date(), resolution);
    } else if (!from) {
      originFilter = sthHelper.getOrigin(to, resolution);
    } else if (!to) {
      originFilter = {
        $lte: sthHelper.getOrigin(new Date(), resolution),
        $gte: sthHelper.getOrigin(from, resolution)
      };
    }

    if (shouldFilter) {
      var pushAccumulator = {
        offset: '$points.offset',
        samples: '$points.samples'
      };
      pushAccumulator[aggregatedFunction] = '$points.' + aggregatedFunction;
      getAggregatedModel(collectionName).aggregate([
        {
          $match: {
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          }
        },
        {
          $project: fieldFilter
        },
        {
          $unwind: '$points'
        },
        {
          $match: {
            'points.samples': {
              $gt: 0
            }
          }
        },
        {
          $group: {
            _id: {
              origin: '$_id.origin',
              range: '$_id.range',
              resolution: '$_id.resolution'
            },
            points: {
              $push: pushAccumulator
            }
          }
        }
      ]).exec(callback);
    } else {
      // Get the aggregated data from the database
      // Return the data in ascending order based on the origin
      getAggregatedModel(collectionName).find(
        {
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          '_id.origin': originFilter
        },
        fieldFilter
      ).sort({'_id.origin': 'asc'}).exec(callback);
    }
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
