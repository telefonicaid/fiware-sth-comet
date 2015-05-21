/* globals module, process, require */

(function() {
  "use strict";

  var mongoose = require('mongoose');
  var crypto = require('crypto');
  var bytesCounter = require('bytes-counter');

  var sthConfig, sthLogger, sthHelper, connectionURL, eventSchema, aggregatedSchema;

  /**
   * Declares the Mongoose schemas.
   */
  function defineSchemas() {
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        eventSchema = mongoose.Schema({
          recvTime: Date,
          entityId: String,
          entityType: String,
          attrName: String,
          attrType: String,
          attrValue: Number
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        eventSchema = mongoose.Schema({
          recvTime: Date,
          attrName: String,
          attrType: String,
          attrValue: Number
        });
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        eventSchema = mongoose.Schema({
          recvTime: Date,
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
   * @param {string} dbURI The database URI
   * @param {string} replicaSet The replica set name, if any
   * @param {string} database The name of the database to connect to
   * @param {Number} poolSize The size of the pool of connections to the database
   * @param {Function} callback A callback to inform about the result of the operation
   */
  function connect(authentication, dbURI, replicaSet, database, poolSize, callback) {
    connectionURL = 'mongodb://' + authentication + '@' + dbURI + '/' + database +
      (replicaSet ? '/?replicaSet=' + replicaSet : '');

    defineSchemas();

    mongoose.connect(connectionURL,
      {
        server: {
          poolSize: poolSize
        }
      },
      function (err) {
        return callback(err);
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
    return sthConfig.DB_PREFIX + service;
  }

  /**
   * Return the name of the collection which will store the raw events
   * @param {string} databaseName The database name
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Events(databaseName, servicePath, entityId, entityType, attrName) {
    var collectionName4Events;
    switch(sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        collectionName4Events = servicePath;
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        collectionName4Events =  servicePath + '_' + entityId + (entityType ? '_' + entityType : '');
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        collectionName4Events =  servicePath + '_' + entityId + (entityType ? '_' + entityType : '') +
          '_' + attrName;
        break;
    }
    // The maximum number of bytes accepted by MongoDB for namespaces is 120 bytes.
    var limit = 119 - bytesCounter.count(databaseName) - bytesCounter.count(sthConfig.COLLECTION_PREFIX) -
      bytesCounter.count('.aggr');
    return sthConfig.COLLECTION_PREFIX + generateHash(collectionName4Events, limit);
  }

  /**
   * Return the name of the collection which will store the aggregated data
   * @param {string} databaseName The database name
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Aggregated(databaseName, servicePath, entityId, entityType,
                                        attrName) {
    return getCollectionName4Events(
        databaseName, servicePath, entityId, entityType, attrName) + '.aggr';
  }

  /**
   * Returns a reference to a collection of the database asynchronously
   * @param {object} params Params (service, service path, entity, attribute or collection) for which the collection
   *  should be returned
   * @param {boolean} isAggregated Flag indicating if the aggregated collection is desired. If false, the raw data
   *  collection is the one requiered
   * @param {boolean} shouldCreate Flag indicating if the collection should be created
   *  if it does not exist
   * @param {boolean} shouldStoreHash Flag indicating if the collection hash should be stored in case the collection
   *  is created
   * @param {Function} callback Callback function to be called with the results
   */
  function getCollection(params, isAggregated, shouldCreate, shouldStoreHash, callback) {
    var databaseName = getDatabase(params.service);

    var collectionName;
    if (params.collection) {
      collectionName = params.collection;
    } else {
      collectionName = isAggregated ?
        getCollectionName4Aggregated(databaseName, params.servicePath, params.entityId, params.entityType,
          params.attrName) :
        getCollectionName4Events(databaseName, params.servicePath, params.entityId, params.entityType,
          params.attrName);
    }

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
              if (!err && shouldStoreHash) {
                storeCollectionHash(params, isAggregated, collectionName, function(err) {
                  if (err) {
                    // There was an error when storing the collection hash
                    // Do nothing
                    sthLogger.warn('Error when storing the collection name (hash) into the database', {
                      operationType: sthConfig.OPERATION_TYPE.DB_LOG
                    });
                  }
                });
              }
              if (err && err.message === 'collection already exists') {
                // We have observed that although leaving the strict option to the default value, sometimes
                //  we get a 'collection already exists' error when executing connection.db#createCollection()
                connection.db.collection(collectionName, {strict: true},
                  function (err, collection) {
                    return callback(err, collection);
                  }
                );
              } else {
                return callback(err, collection);
              }
            }
          );
        } else {
          return callback(err, collection);
        }
      }
    );
  }

  /**
   * Returns the required raw data from the database asynchronously
   * @param {object} collection The collection from where the data should be extracted
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @param {number} lastN Only return the last n matching entries
   * @param {number} hLimit Maximum number of results to retrieve when paginating
   * @param {number} hOffset Offset to apply when paginating
   * @param {Date} from The date from which retrieve the aggregated data
   * @param {Date} to The date to which retrieve the aggregated data
   * @param {Function} callback Callback to inform about any possible error or results
   */
  function getRawData(collection, entityId, entityType, attrName, lastN, hLimit, hOffset,
                      from, to, callback) {
    var findCondition;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        findCondition = {
          'entityId': entityId,
          'entityType': entityType,
          'attrName': attrName
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        findCondition = {
          'attrName': attrName
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        findCondition = {};
        break;
    }

    var recvTimeFilter;
    if (from && to) {
      recvTimeFilter = {
        $lte: to,
        $gte: from
      };
    } else if (from) {
      recvTimeFilter = {
        $gte: from
      };
    } else if (to) {
      recvTimeFilter = {
        $lte: to
      };
    }
    if (recvTimeFilter) {
      findCondition.recvTime = recvTimeFilter;
    }

    var cursor = collection.find(
      findCondition,
      {
        _id: 0,
        attrType: 1,
        attrValue: 1,
        recvTime: 1
      }
    ).sort({'recvTime': -1});

    if (lastN) {
      cursor.limit(lastN).toArray(function(err, results) {
        if (!err) {
          results.reverse();
        }
        return process.nextTick(callback.bind(null, err, results));
      });
    } else {
      cursor.skip(hOffset).limit(hLimit);
      return cursor.toArray(callback);
    }
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
      originFilter = {
        $lte: sthHelper.getOrigin(to, resolution),
        $gte: sthHelper.getOrigin(from, resolution)
      };
    } else if (from) {
      originFilter = {
        $gte: sthHelper.getOrigin(from, resolution)
      };
    } else if (to) {
      originFilter = {
        $lte: sthHelper.getOrigin(to, resolution)
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
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          matchCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          matchCondition = {
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
      }
      if (originFilter) {
        matchCondition['_id.origin'] = originFilter;
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
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
          findCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
        case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          findCondition = {
            '_id.resolution': resolution,
            '_id.range': sthHelper.getRange(resolution)
          };
          break;
      }
      if (originFilter) {
        findCondition['_id.origin'] = originFilter;
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
   * @param {Date} recvTime The date (or recvTime) of the notification (attribute value change)
   * @returns {Object} The update condition
   */
  function getAggregateUpdateCondition(
    entityId, entityType, attrName, resolution, recvTime) {
    var offset;
    switch (resolution) {
      case sthConfig.RESOLUTION.SECOND:
        offset = recvTime.getUTCSeconds();
        break;
      case sthConfig.RESOLUTION.MINUTE:
        offset = recvTime.getUTCMinutes();
        break;
      case sthConfig.RESOLUTION.HOUR:
        offset = recvTime.getUTCHours();
        break;
      case sthConfig.RESOLUTION.DAY:
        offset = recvTime.getUTCDate();
        break;
      case sthConfig.RESOLUTION.MONTH:
        offset = recvTime.getUTCMonth() + 1;
        break;
    }

    var aggregateUpdateCondition;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        aggregateUpdateCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          'points.offset': offset
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        aggregateUpdateCondition = {
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
          '_id.resolution': resolution,
          '_id.range': sthHelper.getRange(resolution),
          'points.offset': offset
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        aggregateUpdateCondition = {
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
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
        offsetOrigin = 1;
        totalValues = 13;
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
   * @param {Date} recvTime The date the event arrived
   * @param {Function} callback Function to call once the operation completes
   */
  function storeAggregatedData4Resolution(
    collection, entityId, entityType, attrName, attrType, attrValue,
    resolution, recvTime, callback) {
    /*
     Currently the MongoDB $ positional update operator cannot be combined with upserts
      (see http://docs.mongodb.org/manual/reference/operator/update/positional/#upsert).
      This issue is known and currently under study: https://jira.mongodb.org/browse/SERVER-3326
      Once the issue is solved, it will be possible to prepopulate collections or update their docs
      using just one update operation like this:
      collection.update(
        // Returning all the update operators currently returned by getAggregateUpdate4Insert
        //  and getAggregateUpdate4Update in the same object
        getAggregateUpdateCondition(entityId, entityType, attrName, resolution, recvTime),
        getAggregateUpdate(attrValue),
        {
          upsert: true,
          writeConcern: {
            w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN) : sthConfig.WRITE_CONCERN
          }
        },
        function (err) {
          callback(err);
        }
      );
     */
    // Prepopulate the aggregated data collection if there is no entry for the concrete
    //  origin, resolution and range.
    collection.update(
      getAggregateUpdateCondition(
        entityId, entityType, attrName, resolution, recvTime),
      getAggregateUpdate4Insert(attrType, resolution),
      {
        upsert: true,
        writeConcern: {
          w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN) : sthConfig.WRITE_CONCERN
        }
      },
      function (err) {
        if (err && callback) {
          return callback(err);
        }
        // Once the aggregated data collection has been prepopulated (if needed),
        //  aggregate the new value received.
        collection.update(
          getAggregateUpdateCondition(
            entityId, entityType, attrName, resolution, recvTime),
          getAggregateUpdate4Update(attrType, parseFloat(attrValue)),
          {
            writeConcern: {
              w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN) : sthConfig.WRITE_CONCERN
            }
          },
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
   * @param {Date} recvTime The date the event arrived
   * @param {string} entityId The entity id associated to updated attribute
   * @param {string} entityType The entity type associated to the updated attribute
   * @param {string} attrName The updated attribute id
   * @param {string} attrType The updated attribute type
   * @param {string} attrValue The updated attribute value
   * @param {Function} callback Function to call once the operation completes
   */
  function storeAggregatedData(
    collection, recvTime, servicePath, entityId, entityType, attrName, attrType, attrValue, callback) {
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
      sthConfig.RESOLUTION.SECOND, recvTime, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.MINUTE, recvTime, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.HOUR, recvTime, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.DAY, recvTime, onCompletion);

    storeAggregatedData4Resolution(
      collection, entityId, entityType, attrName, attrType, attrValue,
      sthConfig.RESOLUTION.MONTH, recvTime, onCompletion);
  }

  /**
   * Stores the raw data for a new event (attribute value)
   * @param {object} The collection where the data should be stored in
   * @param {Date} recvTime The date the event arrived
   * @param {string} entityId The entity id associated to updated attribute
   * @param {string} entityType The entity type associated to the updated attribute
   * @param {string} attrName The updated attribute id
   * @param {string} attrType The updated attribute type
   * @param {string} attrValue The updated attribute value
   * @param {Function} callback Function to call once the operation completes
   */
  function storeRawData(
    collection, recvTime, servicePath, entityId, entityType, attrName,
    attrType, attrValue, callback) {
    var theEvent;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        theEvent = {
          recvTime: recvTime,
          entityId: entityId,
          entityType: entityType,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ENTITY:
        theEvent = {
          recvTime: recvTime,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        theEvent = {
          recvTime: recvTime,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
    }
    collection.insert(
      theEvent,
      {
        writeConcern: {
          w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN) : sthConfig.WRITE_CONCERN
        }
      },
      function(err) {
      if (callback) {
        callback(err);
      }
    });
  }

  /**
   * Generates a hash based on an input and a maximum number of bytes
   * @param input The input to generate the hash from
   * @param limit The maximum number of bytes of the hash
   */
  function generateHash(input, limit) {
    var shasum = crypto.createHash('sha512');
    shasum.update(input);
    var hash = shasum.digest('hex');
    if (limit) {
      hash = hash.substr(0, limit);
    }
    return hash;
  }

  /**
   * Stores the collection name (hash) in the database
   * @param params The params used to generate the collection name (hash)
   * @param hash The generated hash used as part of the collection names
   * @param callback A callback function
   */
  function storeCollectionHash(params, isAggregated, hash, callback) {
    getCollection({
      service: params.service,
      collection: sthConfig.COLLECTION_PREFIX + 'collection_names'
    }, false, true, false, function(err, collection) {
      if (err) {
        return callback(err);
      }
      // 2 updates operations are needed since MongoDB currently does not support the possibility
      //  to address the same field in a $set operation as a $setOnInsert operation
      collection.update(
        {
          _id: hash
        },
        {
          '$setOnInsert': {
            dataModel: sthConfig.DATA_MODEL,
            isAggregated: isAggregated,
            service: params.service,
            servicePath: params.servicePath,
            entityId: params.entityId,
            entityType: params.entityType,
            attrName: params.attrName
          }
        }, {
          upsert: true
        },
        function(err) {
          if (err && callback) {
            return callback(err);
          }
          collection.update(
            {
              _id: hash
            },
            {
              '$set': {
                dataModel: sthConfig.DATA_MODEL,
                isAggregated: isAggregated,
                service: params.service,
                servicePath: params.servicePath,
                entityId: params.entityId,
                entityType: params.entityType,
                attrName: params.attrName
              }
            },
            function(err) {
              if (callback) {
                return callback(err);
              }
            }
          );
        }
      );
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
      getRawData: getRawData,
      getAggregatedData: getAggregatedData,
      getAggregateUpdateCondition: getAggregateUpdateCondition,
      getAggregatePrepopulatedData: getAggregatePrepopulatedData,
      storeAggregatedData: storeAggregatedData,
      storeAggregatedData4Resolution: storeAggregatedData4Resolution,
      storeRawData: storeRawData
    };
  };
})();
