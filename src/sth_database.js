/* globals module, process, require */

(function() {
  "use strict";

  var mongoose = require('mongoose');

  var sthConfig, sthLogger, sthHelper, connectionURL, eventSchema, aggregatedSchema;

  /**
   * Declares the Mongoose schemas.
   */
  function defineSchemas() {
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        eventSchema = mongoose.Schema({
          timestamp: Date,
          entityId: String,
          entityType: String,
          attrName: String,
          attrType: String,
          attrValue: Number
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        eventSchema = mongoose.Schema({
          timestamp: Date,
          attrName: String,
          attrType: String,
          attrValue: Number
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        eventSchema = mongoose.Schema({
          timestamp: Date,
          attrType: String,
          attrValue: Number
        });
        break;
    }

    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        aggregatedSchema = mongoose.Schema({
          _id: {
            type: {
              entityId: String,
              entityType: String,
              attrName: String,
              range: String,
              resolution: String,
              origin: Date
            },
            select: true
          },
          attrType: String,
          points: [{
            offset: Number,
            samples: Number,
            sum: Number,
            sum2: Number,
            min: Number,
            max: Number
          }]
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        aggregatedSchema = mongoose.Schema({
          _id: {
            type: {
              attrName: String,
              range: String,
              resolution: String,
              origin: Date
            },
            select: true
          },
          attrType: String,
          points: [{
            offset: Number,
            samples: Number,
            sum: Number,
            sum2: Number,
            min: Number,
            max: Number
          }]
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        aggregatedSchema = mongoose.Schema({
          _id: {
            type: {
              range: String,
              resolution: String,
              origin: Date
            },
            select: true
          },
          attrType: String,
          points: [{
            offset: Number,
            samples: Number,
            sum: Number,
            sum2: Number,
            min: Number,
            max: Number
          }]
        });
        break;
    }
  }

  /**
   * Connects to a (MongoDB) database endpoint asynchronously
   * @param {string} authentication The authentication schema to use for the connection
   * @param {string} host The host hosting the database
   * @param {string} port The port where the database server is listening to
   * @param {string} database The name of the database to connect to
   * @param {Number} poolSize The size of the pool of connections to the database
   * @param {Function} callback A callback to inform about the result of the operation
   */
  function connect(authentication, host, port, database, poolSize, callback) {
    connectionURL = 'mongodb://' + authentication + '@' + host + ':' + port +
    '/' + database;

    defineSchemas();

    mongoose.connect(connectionURL,
      {
        server: {
          poolSize: poolSize
        }
      },
      function (err) {
        if (err) {
          // Error when connecting to the MongoDB database
          return callback(err);
        }
        return callback();
      }
    );
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
    if (mongoose.connection &&
      (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2)) {
      mongoose.connection.close(function() {
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
   * Returns the database name based on the service
   * @param {string} service The service
   * @return {string} The database name
   */
  function getDatabase(service) {
    return sthConfig.DB_PREFIX + '_' + service;
  }

  /**
   * Return the name of the collection which will store the raw events
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Events(servicePath, entityId, entityType, attrName) {
    switch(sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        return sthConfig.COLLECTION_PREFIX + '_' + servicePath;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        return sthConfig.COLLECTION_PREFIX + '_' + servicePath + '_' + entityId + (entityType ? '_' + entityType : '');
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        return sthConfig.COLLECTION_PREFIX + '_' + servicePath + '_' + entityId + (entityType ? '_' + entityType : '') +
          '_' + attrName;
    }
  }

  /**
   * Return the name of the collection which will store the aggregated data
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Aggregated(servicePath, entityId, entityType,
                                        attrName) {
    return getCollectionName4Events(
        servicePath, entityId, entityType, attrName) + '.aggr';
  }

  /**
   * Returns a reference to a collection of the database asynchronously
   * @param {string} databaseName The database's name
   * @param {string} collectionName The collection's name
   * @param {boolean} shouldCreate Flag indicating if the collection should be created
   *  if it does not exist
   * @param {Function} callback Callback function to be called with the results
   */
  function getCollection(databaseName, collectionName, shouldCreate, callback) {
    // Switch to the right database
    var connection = mongoose.connection.useDb(databaseName);

    // Get the connection and notify it via the callback.
    connection.db.collection(collectionName, {strict: true},
      function (err, collection) {
        if (err &&
          (err.message === 'Collection ' + collectionName + ' does not exist. Currently in strict mode.') &&
          shouldCreate) {
          connection.db.createCollection(collectionName,
            function (err, collection) {
              if (err && err.message === 'collection already exists') {
                // We have observed that although leaving the strict option to the default value, sometimes
                //  we get a 'collection already exists' error when executing connection.db#createCollection()
                connection.db.collection(collectionName, {strict: true},
                  function (err, collection) {
                    return callback(err, collection);
                  }
                );
              }
              return callback(err, collection);
            }
          );
        } else {
          if (err) {
            return callback(err);
          } else {
            return callback(null, collection);
          }
        }
      }
    );
  }

  /**
   * Returns the required aggregated data from the database asynchronously
   * @param {object} collection The collection from where the data should be extracted
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @param {string} aggregatedFunction The aggregated function or method to retrieve
   * @param {string} resolution The resolution of the data to use
   * @param {Date} from The date from which retrieve the aggregated data
   * @param {Date} to The date to which retrieve the aggregated data
   * @param {boolean} shouldFilter If true, the null results are filter out
   * @param {Function} callback Callback to inform about any possible error or results
   */
  function getAggregatedData(collection, servicePath, entityId, entityType, attrName,
                             aggregatedFunction, resolution, from, to, shouldFilter, callback) {
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

      var matchCondition;
      switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          matchCondition = {
            '_id.entityId': entityId,
            '_id.entityType': entityType,
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          matchCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          matchCondition = {
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
      }

      var groupId;
      switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          groupId = {
            entityId: '$_id.entityId',
            entityType: '$_id.entityType',
            attrName: '$_id.attrName',
            origin: '$_id.origin',
            range: '$_id.range',
            resolution: '$_id.resolution'
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          groupId = {
            attrName: '$_id.attrName',
            origin: '$_id.origin',
            range: '$_id.range',
            resolution: '$_id.resolution'
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          groupId = {
            origin: '$_id.origin',
            range: '$_id.range',
            resolution: '$_id.resolution'
          };
          break;
      }

      collection.aggregate([
        {
          $match: matchCondition
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
            _id: groupId,
            points: {
              $push: pushAccumulator
            }
          }
        }
      ], callback);
    } else {
      // Get the aggregated data from the database
      // Return the data in ascending order based on the origin
      var findCondition;
      switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          findCondition = {
            '_id.entityId': entityId,
            '_id.entityType': entityType,
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          findCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          findCondition = {
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution),
            '_id.origin': originFilter
          };
          break;
      }

      collection.find(
        findCondition,
        fieldFilter
      ).sort({'_id.origin': 1}).toArray(callback);
    }
  }

  /**
   * Returns the condition to be used in the MongoDB update operation for aggregated data
   * @param {string} entityId The entity id
   * @param {string} entityType The entity type
   * @param {string} attrName The attribute id
   * @param {string} resolution The resolution
   * @param {Date} timestamp The date (or timestamp) of the notification (attribute value change)
   * @returns {Object} The update condition
   */
  function getAggregateUpdateCondition(
    entityId, entityType, attrName, resolution, timestamp) {
    var offset;
    switch (resolution) {
      case sthConfig.RESOLUTION.SECOND:
        offset = timestamp.getUTCSeconds();
        break;
      case sthConfig.RESOLUTION.MINUTE:
        offset = timestamp.getUTCMinutes();
        break;
      case sthConfig.RESOLUTION.HOUR:
        offset = timestamp.getUTCHours();
        break;
      case sthConfig.RESOLUTION.DAY:
        offset = timestamp.getUTCDate();
        break;
      case sthConfig.RESOLUTION.MONTH:
        offset = timestamp.getUTCMonth();
        break;
    }

    var aggregateUpdateCondition;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        aggregateUpdateCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(timestamp, resolution),
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          'points.offset': offset
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        aggregateUpdateCondition = {
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(timestamp, resolution),
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          'points.offset': offset
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        aggregateUpdateCondition = {
          '_id.origin': sthHelper.getOrigin(timestamp, resolution),
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          'points.offset': offset
        };
        break;
    }
    return aggregateUpdateCondition;
  }

  /**
   * Returns the data to prepopulate the aggregated data collection with
   * @param {string} resolution The resolution
   */
  function getAggregatePrepopulatedData(resolution) {
    var points = [],
      totalValues,
      offsetOrigin = 0;

    switch (resolution) {
      case sthConfig.RESOLUTION.SECOND:
        totalValues = 60;
        break;
      case sthConfig.RESOLUTION.MINUTE:
        totalValues = 60;
        break;
      case sthConfig.RESOLUTION.HOUR:
        totalValues = 24;
        break;
      case sthConfig.RESOLUTION.DAY:
        offsetOrigin = 1;
        totalValues = 32;
        break;
      case sthConfig.RESOLUTION.MONTH:
        totalValues = 12;
        break;
    }

    for (var i = offsetOrigin; i < totalValues; i++) {
      points.push({
        offset: i,
        samples: 0,
        sum: 0,
        sum2: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      });
    }

    return points;
  }

  /**
   * Returns the update to be used in the MongoDB update operation for aggregated data
   * @param {string} attrType The type of the attribute to aggregate
   * @param {string} resolution The resolution
   * @returns {Object} The update operation
   */
  function getAggregateUpdate4Insert(attrType, resolution) {
    return {
      '$setOnInsert': {
        attrType: attrType,
        points: getAggregatePrepopulatedData(resolution)
      }
    };
  }

  /**
   * Returns the update to be used in the MongoDB update operation for aggregated data
   * @param {number} attrType The type of the attribute to aggregate
   * @param {number} attrValue The value of the attribute to aggregate
   * @returns {Object} The update operation
   */
  function getAggregateUpdate4Update(attrType, attrValue) {
    return {
      '$set': {
        'attrType': attrType
      },
      '$inc': {
        'points.$.samples': 1,
        'points.$.sum': attrValue,
        'points.$.sum2': Math.pow(attrValue, 2)
      },
      '$min': {
        'points.$.min': attrValue
      },
      '$max': {
        'points.$.max': attrValue
      }
    };
  }

  /**
   * Stores the aggregated data for a new event (attribute value)
   * @param {string} collection The collection where the data should be stored
   * @param {string} entityId The entity id
   * @param {string} entityType The entity type
   * @param {string} attrName The attribute id
   * @param {string} attrType The attribute type
   * @param {string} resolution The resolution
   * @param {Date} timestamp The date the event arrived
   * @param {Function} callback Function to call once the operation completes
   */
  function storeAggregatedData4Resolution(
    collection, entityId, entityType, attrName, attrType, attrValue,
    resolution, timestamp, callback) {
    /*
     Currently the MongoDB $ positional update operator cannot be combined with upserts
      (see http://docs.mongodb.org/manual/reference/operator/update/positional/#upsert).
      This issue is known and currently under study: https://jira.mongodb.org/browse/SERVER-3326
      Once the issue is solved, it will be possible to prepopulate collections or update their docs
      using just one update operation like this:
      collection.update(
        // Returning all the update operators currently returned by getAggregateUpdate4Insert
        //  and getAggregateUpdate4Update in the same object
        getAggregateUpdateCondition(entityId, entityType, attrName, resolution, timestamp),
        getAggregateUpdate(attrValue),
        {upsert: true},
        function (err) {
          callback(err);
        }
      );
     */
    // Prepopulate the aggregated data collection if there is no entry for the concrete
    //  origin, resolution and range.
    collection.update(
      getAggregateUpdateCondition(
        entityId, entityType, attrName, resolution, timestamp),
      getAggregateUpdate4Insert(attrType, resolution),
      {upsert: true},
      function (err) {
        if (err && callback) {
          return callback(err);
        }
        // Once the aggregated data collection has been prepopulated (if needed),
        //  aggregate the new value received.
        collection.update(
          getAggregateUpdateCondition(
            entityId, entityType, attrName, resolution, timestamp),
          getAggregateUpdate4Update(attrType, parseFloat(attrValue)),
          function (err) {
            if (callback) {
              callback(err);
            }
          }
        );
      }
    );
  }

  /**
   * Stores the aggregated data for a new event (attribute value)
   * @param {object} The collection where the data should be stored in
   * @param {Date} timestamp The date the event arrived
   * @param {string} entityId The entity id associated to updated attribute
   * @param {string} entityType The entity type associated to the updated attribute
   * @param {string} attrName The updated attribute id
   * @param {string} attrType The updated attribute type
   * @param {string} attrValue The updated attribute value
   * @param {Function} callback Function to call once the operation completes
   */
  function storeAggregatedData(
    collection, timestamp, servicePath, entityId, entityType, attrName, attrType, attrValue, callback) {
    var counter = 0,
        error;
    function onCompletion(err) {
      error = err;
      if (++counter === 5) {
        callback(err);
      }
    }

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.SECOND, timestamp, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.MINUTE, timestamp, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.HOUR, timestamp, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.DAY, timestamp, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.MONTH, timestamp, onCompletion);
  }

  /**
   * Stores the raw data for a new event (attribute value)
   * @param {object} The collection where the data should be stored in
   * @param {Date} timestamp The date the event arrived
   * @param {string} entityId The entity id associated to updated attribute
   * @param {string} entityType The entity type associated to the updated attribute
   * @param {string} attrName The updated attribute id
   * @param {string} attrType The updated attribute type
   * @param {string} attrValue The updated attribute value
   * @param {Function} callback Function to call once the operation completes
   */
  function storeRawData(
    collection, timestamp, servicePath, entityId, entityType, attrName,
    attrType, attrValue, callback) {
    var theEvent;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        theEvent = {
          timestamp: timestamp,
          entityId: entityId,
          entityType: entityType,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        theEvent = {
          timestamp: timestamp,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        theEvent = {
          timestamp: timestamp,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
    }
    collection.insert(theEvent, function(err) {
      if (callback) {
        callback(err);
      }
    });
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
      get connection() {
        return mongoose.connection;
      },
      connect: connect,
      closeConnection: closeConnection,
      getDatabase: getDatabase,
      getCollectionName4Events: getCollectionName4Events,
      getCollectionName4Aggregated: getCollectionName4Aggregated,
      getCollection: getCollection,
      getAggregatedData: getAggregatedData,
      getAggregateUpdateCondition: getAggregateUpdateCondition,
      getAggregatePrepopulatedData: getAggregatePrepopulatedData,
      storeAggregatedData: storeAggregatedData,
      storeAggregatedData4Resolution: storeAggregatedData4Resolution,
      storeRawData: storeRawData
    };
  };
})();
