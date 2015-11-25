/* globals module, process, require */

(function() {
  "use strict";

  var mongoClient = require('mongodb').MongoClient;
  var boom = require('boom');
  var crypto = require('crypto');
  var bytesCounter = require('bytes-counter');

  var db, sthConfig, sthLogger, sthHelper, connectionURL;

  /**
   * The maximumum namespace size in bytes has to be decreased to 113 bytes
   *  (from the original 120 bytes) to be able to ensure the TTL index on aggregated
   *  data collection if requested by the user in the corresponding configuration option.
   * @type {number} Maximum namespace size in bytes
   */
  var MAX_NAMESPACE_SIZE_IN_BYTES = 113;
  var MIN_HASH_SIZE_IN_BYTES = 20;

  var DATABASE_MODELS = {
    UNIQUE_DATABASE: 'unique-database',
    DATABASE_PER_SERVICE: 'database-per-service'
  };
  var DATABASE_MODEL = DATABASE_MODELS.UNIQUE_DATABASE;
  var COLLECTION_MODELS = {
    COLLECTIONS_PER_SERVICE_PATH: 'collection-per-service-path',
    COLLECTIONS_PER_ENTITY: 'collection-per-entity',
    COLLECTIONS_PER_ATTRIBUTE: 'collection-per-attribute'
  };
  var COLLECTION_MODEL = COLLECTION_MODELS.COLLECTIONS_PER_ENTITY;

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

    mongoClient.connect(connectionURL,
      {
        server: {
          poolSize: poolSize
        }
      },
      function (err, theDB) {
        db = theDB;
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
    if (db) {
      db.close(function() {
        // Connection to database closed
        sthLogger.info('Connection to MongoDb succesfully closed', {
          operationType: sthConfig.OPERATION_TYPE.DB_CONN_CLOSE
        });
        return process.nextTick(callback);
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
    if (DATABASE_MODEL === DATABASE_MODELS.UNIQUE_DATABASE) {
        return sthConfig.DB_PREFIX + sthConfig.DEFAULT_DATABASE;
    } else {
      return sthConfig.DB_PREFIX + service;
    }
  }

  /**
   * Return the name of the collection which will store the raw events
   * @param {string} databaseName The database name
   * @param {string} service The service of the entity the event is related to
   * @param {string} servicePath The service path of the entity the event is related to
   * @param {string} entityId The entity id related to the event
   * @param {string} entityType The type of entity related to the event
   * @param {string} attrName The attribute id related to the event
   * @returns {string} The collection name
   */
  function getCollectionName4Events(databaseName, service, servicePath, entityId, entityType, attrName) {
    var collectionName4Events;
    if (DATABASE_MODEL === DATABASE_MODELS.UNIQUE_DATABASE) {
      collectionName4Events = service;
    } else {
      collectionName4Events = '';
    }
    switch(COLLECTION_MODEL) {
      case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        collectionName4Events += servicePath;
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
        collectionName4Events +=  servicePath + '_' + entityId + (entityType ? '_' + entityType : '');
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        collectionName4Events +=  servicePath + '_' + entityId + (entityType ? '_' + entityType : '') +
          '_' + attrName;
        break;
    }
    collectionName4Events = collectionName4Events.toLowerCase();
    if (sthConfig.SHOULD_HASH) {
      var limit = getHashSizeInBytes(databaseName);
      if (limit < MIN_HASH_SIZE_IN_BYTES) {
        sthLogger.warn('The available bytes for the hashes to be used as part of the collection names are not enough (' +
          'currently ' + limit + ' and at least ' + MIN_HASH_SIZE_IN_BYTES + ' bytes are needed), ' +
          'please reduce the size of the DB_PREFIX ("' + sthConfig.DB_PREFIX + '" = ' + bytesCounter.count(sthConfig.DB_PREFIX) + ' bytes), ' +
          'the service ("' + databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length) + '" = ' +
          bytesCounter.count(databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length)) +
          ' bytes) and/or the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' + bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
          ' bytes) to save more bytes for the hash',
          {
            operationType: sthConfig.OPERATION_TYPE.DB_LOG
          }
        );
        return null;
      }
      return sthConfig.COLLECTION_PREFIX + generateHash(collectionName4Events, limit);
    } else if (getNamespaceSizeInBytes(databaseName, collectionName4Events) > MAX_NAMESPACE_SIZE_IN_BYTES) {
      sthLogger.warn('The size in bytes of the namespace for storing the aggregated data ("' + databaseName + '" plus "' +
        sthConfig.COLLECTION_PREFIX + collectionName4Events + '.aggr", ' + getNamespaceSizeInBytes(databaseName, collectionName4Events) +
        ' bytes)' + ' is bigger than ' + MAX_NAMESPACE_SIZE_IN_BYTES + ' bytes, ' +
        'please reduce the size of the DB_PREFIX ("' + sthConfig.DB_PREFIX + '" = ' + bytesCounter.count(sthConfig.DB_PREFIX) + ' bytes), ' +
        'the service ("' + databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length) + '" = ' +
        bytesCounter.count(databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length)) +
        ' bytes), the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' + bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
        ' bytes), the entity id ("' + entityId + '" = ' + bytesCounter.count(entityId) + ' bytes) and/or the entity type ("' +
        entityType + '" = ' + bytesCounter.count(entityType) + ' bytes) to make the namespace fit in the available bytes',
        {
          operationType: sthConfig.OPERATION_TYPE.DB_LOG
        }
      );
      return null;
    } else {
      return sthConfig.COLLECTION_PREFIX + collectionName4Events;
    }
  }

  /**
   * Returns the available hash size in bytes to be used as part of the collection names
   *  based on the database name, database name prefix and collection name prefix
   * @param databaseName The database name
   * @return {number} The size of the hash in bytes
   */
  function getHashSizeInBytes(databaseName) {
    return MAX_NAMESPACE_SIZE_IN_BYTES - bytesCounter.count(databaseName) -
      bytesCounter.count(sthConfig.COLLECTION_PREFIX) - bytesCounter.count('.aggr') - 1;
  }

  /**
   * Returns the size of the namespace (for the collection where the aggregated data is stored) in bytes for certain
   *  database name and the collection name where the raw data is stored
   * @param datebaseName The database name
   * @param collectionName4Events The name of the collection where the raw data is stored
   * @return {Number} The size in bytes of the namespace (for the collection where the aggregated data is stored)
   *  in bytes
   */
  function getNamespaceSizeInBytes(datebaseName, collectionName4Events) {
    return bytesCounter.count(datebaseName) + bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
      bytesCounter.count(collectionName4Events) + bytesCounter.count('.aggr');
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
  function getCollectionName4Aggregated(databaseName, service, servicePath, entityId, entityType,
                                        attrName) {
    var collectionName4Events = getCollectionName4Events(
      databaseName, service, servicePath, entityId, entityType, attrName);
    if (collectionName4Events) {
      return collectionName4Events + '.aggr';
    } else {
      return null;
    }
  }

  /**
   * Returns a reference to a collection of the database asynchronously
   * @param {object} params Params (service, service path, entity, attribute or collection) for which the collection
   *  should be returned
   * @param {boolean} isAggregated Flag indicating if the aggregated collection is desired. If false, the raw data
   *  collection is the one required
   * @param {boolean} shouldCreate Flag indicating if the collection should be created
   *  if it does not exist
   * @param {boolean} shouldStoreHash Flag indicating if the collection hash should be stored in case the collection
   *  is created
   * @param {boolean} shouldTruncate Flag indicating if the collection should be truncated according to the requested data
   *  management policies (time or data collection truncation)
   * @param {Function} callback Callback function to be called with the results
   */
  function getCollection(params, isAggregated, shouldCreate, shouldStoreHash, shouldTruncate, callback) {
    var databaseName = getDatabase(params.service);

    shouldStoreHash = sthConfig.SHOULD_HASH && shouldStoreHash;

    var collectionName;
    if (params.collection) {
      collectionName = params.collection;
    } else {
      collectionName = isAggregated ?
        getCollectionName4Aggregated(databaseName, params.service, params.servicePath, params.entityId,
          params.entityType, params.attrName) :
        getCollectionName4Events(databaseName, params.service, params.servicePath, params.entityId, params.entityType,
          params.attrName);
    }

    if (!collectionName) {
      var error = boom.badRequest('The collection name could not be generated');
      return process.nextTick(callback.bind(null, error));
    }

    var connection;
    if (DATABASE_MODEL === DATABASE_MODELS.UNIQUE_DATABASE) {
      connection = db;
    } else {
      // Switch to the right database if multiple databases
      connection = db.db(databaseName);
    }

    // Get the connection and notify it via the callback.
    sthLogger.debug('Getting access to the collection \'' + collectionName + '\' in database \'' + databaseName + '\'', {
      operationType: sthConfig.OPERATION_TYPE.DB_LOG
    });

    var setTTLPolicy = function(collection) {
      // Set the TTL policy if required
      if (parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS) > 0) {
        if (!isAggregated) {
          if (parseInt(sthConfig.TRUNCATION_SIZE) == 0) {
            collection.ensureIndex(
              {
                'recvTime': 1
              },
              {
                expireAfterSeconds: parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS)
              }, function (err) {
                if (err) {
                  sthLogger.error(
                    'Error when creating the index for TTL for collection \'' +
                    collectionName + '\': ' + err,
                    {
                      operationType: sthConfig.OPERATION_TYPE.DB_LOG
                    }
                  );
                }
              }
            );
          }
        } else {
          collection.ensureIndex(
            {
              '_id.origin': 1
            },
            {
              expireAfterSeconds: parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS)
            }, function(err) {
              if (err) {
                sthLogger.error(
                  'Error when creating the index for TTL for collection \'' +
                  collectionName + '\': ' + err,
                  {
                    operationType: sthConfig.OPERATION_TYPE.DB_LOG
                  }
                );
              }
            }
          );
        }
      }
    };

    var createCollectionCB = function (err, collection) {
      if (!err && shouldStoreHash) {
        storeCollectionHash(params, isAggregated, collectionName, function(hashErr) {
          if (hashErr) {
            // There was an error when storing the collection hash
            // Do nothing
            sthLogger.warn('Error when storing the hash generated as part of the collection name into the database', {
              operationType: sthConfig.OPERATION_TYPE.DB_LOG
            });
          }
          if (shouldTruncate) {
            setTTLPolicy(collection);
          }
          return callback(hashErr, collection);
        });
      } else if (err && err.message === 'collection already exists') {
        // We have observed that although leaving the strict option to the default value, sometimes
        //  we get a 'collection already exists' error when executing connection.db#createCollection()
        connection.collection(collectionName, {strict: true},
          function (err, collection) {
            return callback(err, collection);
          }
        );
      } else {
        if (shouldTruncate) {
          setTTLPolicy(collection);
        }
        return callback(err, collection);
      }
    };

    connection.collection(collectionName, {strict: true},
      function (err, collection) {
        if (err &&
          (err.message === 'Collection ' + collectionName + ' does not exist. Currently in strict mode.') &&
            shouldCreate) {
          if (shouldTruncate && !isAggregated) {
            // Set the size removal policy if required
            if (parseInt(sthConfig.TRUNCATION_SIZE) > 0) {
              var collectionCreationOptions = {
                capped: true,
                size: parseInt(sthConfig.TRUNCATION_SIZE),
                max: parseInt(sthConfig.TRUNCATION_MAX) || null
              };
              return connection.createCollection(collectionName,
                collectionCreationOptions,
                createCollectionCB
              );
            }
          }
          connection.createCollection(collectionName,
            createCollectionCB
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
    switch (COLLECTION_MODEL) {
      case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        findCondition = {
          'entityId': entityId,
          'entityType': entityType,
          'attrName': attrName
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
        findCondition = {
          'attrName': attrName
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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

    var cursor;

    if (lastN) {
      cursor = collection.find(
        findCondition,
        {
          _id: 0,
          attrType: 1,
          attrValue: 1,
          recvTime: 1
        }
      ).sort({'recvTime': -1}).limit(lastN).toArray(function(err, results) {
        if (!err) {
          results.reverse();
        }
        return process.nextTick(callback.bind(null, err, results));
      });
    } else {
      cursor = collection.find(
        findCondition,
        {
          _id: 0,
          attrType: 1,
          attrValue: 1,
          recvTime: 1
        }
      ).sort({'recvTime': 1}).skip(hOffset).limit(hLimit).toArray(callback);
    }
  }

  /**
   * Filters out the results based on the resolution and the optional from and to dates. For certain resolution, the
   *  from and to dates are considered and applied until the unit of time indicated by the resolution.
   * @param results The array of results
   * @param resolution The resolution
   * @param from The starting date
   * @param to The ending date
   * @param aggregatedFunction The aggregation function
   * @param shouldFilter Flag indicating if null results should be filtered
   */
  function filterResults(results, resolution, from, to, aggregatedFunction, shouldFilter) {
    if (results.length) {
      var points;
      if (from &&
        results[0]._id.origin.getTime() === sthHelper.getOrigin(from, resolution).getTime()) {
        points = results[0].points;
        var minOffset;
        switch (resolution) {
          case sthConfig.RESOLUTION.SECOND:
            minOffset = from.getUTCSeconds();
            break;
          case sthConfig.RESOLUTION.MINUTE:
            minOffset = from.getUTCMinutes();
            break;
          case sthConfig.RESOLUTION.HOUR:
            minOffset = from.getUTCHours();
            break;
          case sthConfig.RESOLUTION.DAY:
            minOffset = from.getUTCDate();
            break;
          case sthConfig.RESOLUTION.MONTH:
            minOffset = from.getUTCMonth();
            break;
        }
        for (var i = 0; i < points.length; i++) {
          if (points[i]) {
            if (points[i].offset < minOffset) {
              if (points[i].samples) {
                if (shouldFilter) {
                  points.splice(i, 1);
                  i--;
                } else {
                  points[i].samples = 0;
                  if (aggregatedFunction === 'occur') {
                    points[i].occur = {};
                  } else if (aggregatedFunction === 'min') {
                    points[i].min = Number.POSITIVE_INFINITY
                  } else if (aggregatedFunction === 'max') {
                    points[i].max = Number.NEGATIVE_INFINITY;
                  } else {
                    points[i][aggregatedFunction] = 0;
                  }
                }
              }
            } else {
              break;
            }
          }
        }
        if (!points.length) {
          results.splice(0, 1);
        }
      }
      if (results.length && to &&
        results[results.length - 1]._id.origin.getTime() === sthHelper.getOrigin(to, resolution).getTime()) {
        points = results[results.length - 1].points;
        var maxOffset;
        switch (resolution) {
          case sthConfig.RESOLUTION.SECOND:
            maxOffset = to.getUTCSeconds();
            break;
          case sthConfig.RESOLUTION.MINUTE:
            maxOffset = to.getUTCMinutes();
            break;
          case sthConfig.RESOLUTION.HOUR:
            maxOffset = to.getUTCHours();
            break;
          case sthConfig.RESOLUTION.DAY:
            maxOffset = to.getUTCDate();
            break;
          case sthConfig.RESOLUTION.MONTH:
            maxOffset = to.getUTCMonth();
            break;
        }
        for (var i = points.length - 1; i >= 0; i--) {
          if (points[i]) {
            if (points[i].offset > maxOffset) {
              if (points[i].samples) {
                if (shouldFilter) {
                  points.splice(i, 1);
                } else {
                  points[i].samples = 0;
                  if (aggregatedFunction === 'occur') {
                    points[i].occur = {};
                  } else if (aggregatedFunction === 'min') {
                    points[i].min = Number.POSITIVE_INFINITY
                  } else if (aggregatedFunction === 'max') {
                    points[i].max = Number.NEGATIVE_INFINITY;
                  } else {
                    points[i][aggregatedFunction] = 0;
                  }
                }
              }
            } else {
              break;
            }
          }
        }
        if (!points.length) {
          results.splice(results.length - 1, 1);
        }
      }
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
      switch (COLLECTION_MODEL) {
        case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          matchCondition = {
            '_id.entityId': entityId,
            '_id.entityType': entityType,
            '_id.attrName': attrName,
            '_id.resolution': resolution
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
          matchCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          matchCondition = {
            '_id.resolution': resolution
          };
          break;
      }
      if (originFilter) {
        matchCondition['_id.origin'] = originFilter;
      }

      var groupId;
      switch (COLLECTION_MODEL) {
        case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          groupId = {
            entityId: '$_id.entityId',
            entityType: '$_id.entityType',
            attrName: '$_id.attrName',
            origin: '$_id.origin',
            resolution: '$_id.resolution'
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
          groupId = {
            attrName: '$_id.attrName',
            origin: '$_id.origin',
            resolution: '$_id.resolution'
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          groupId = {
            origin: '$_id.origin',
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
        },
        {
          $sort: {
            '_id.origin': 1
        }
    }
      ], function (err, resultsArr) {
        filterResults(resultsArr, resolution, from, to, aggregatedFunction, shouldFilter);
        process.nextTick(callback.bind(null, err, resultsArr));
      });
    } else {
      // Get the aggregated data from the database
      // Return the data in ascending order based on the origin
      var findCondition;
      switch (COLLECTION_MODEL) {
        case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
          findCondition = {
            '_id.entityId': entityId,
            '_id.entityType': entityType,
            '_id.attrName': attrName,
            '_id.resolution': resolution
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
          findCondition = {
            '_id.attrName': attrName,
            '_id.resolution': resolution
          };
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          findCondition = {
            '_id.resolution': resolution
          };
          break;
      }
      if (originFilter) {
        findCondition['_id.origin'] = originFilter;
      }

      collection.find(
        findCondition,
        fieldFilter
      ).sort({'_id.origin': 1}).toArray(
        function (err, resultsArr) {
          filterResults(resultsArr, resolution, from, to, aggregatedFunction, shouldFilter);
          process.nextTick(callback.bind(null, err, resultsArr));
        }
      );
    }
  }

  /**
   * Returns the condition to be used in the MongoDB update operation for aggregated data
   * @param {string} entityId The entity id
   * @param {string} entityType The entity type
   * @param {string} attrName The attribute name
   * @param {string} resolution The resolution
   * @param {Date} recvTime The date (or recvTime) of the notification (attribute value change)
   * @returns {Object} The update condition
   */
  function getAggregateUpdateCondition(
    entityId, entityType, attrName, resolution, recvTime) {
    var offset = sthHelper.getOffset(resolution, recvTime);

    var aggregateUpdateCondition;
    switch (COLLECTION_MODEL) {
      case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        aggregateUpdateCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
          '_id.resolution': resolution,
          'points.offset': offset
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
        aggregateUpdateCondition = {
          '_id.attrName': attrName,
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
          '_id.resolution': resolution,
          'points.offset': offset
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        aggregateUpdateCondition = {
          '_id.origin': sthHelper.getOrigin(recvTime, resolution),
          '_id.resolution': resolution,
          'points.offset': offset
        };
        break;
    }
    return aggregateUpdateCondition;
  }

  /**
   * Returns the data to prepopulate the aggregated data collection with
   * @param {string} attrType The attribute type
   * @param {string} attrValue The attribute value
   * @param {string} resolution The resolution
   */
  function getAggregatePrepopulatedData(attrType, attrValue, resolution) {
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

    if (!isNaN(attrValue)) {
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
    } else {
      for (var i = offsetOrigin; i < totalValues; i++) {
        var entry = {
          offset: i,
          samples: 0,
          occur: {
          }
        };
        points.push(entry);
      }
    }

    return points;
  }

  /**
   * Returns the update to be used in the MongoDB update operation for aggregated data
   * @param {string} attrType The type of the attribute to aggregate
   * @param {string} attrValue The value of the attribute to aggregate
   * @param {string} resolution The resolution
   * @returns {Object} The update operation
   */
  function getAggregateUpdate4Insert(attrType, attrValue, resolution) {
    return {
      '$setOnInsert': {
        attrType: attrType,
        points: getAggregatePrepopulatedData(attrType, attrValue, resolution)
      }
    };
  }

  /**
   * Returns the update to be used in the MongoDB update operation for aggregated data
   * @param {number} attrType The type of the attribute to aggregate
   * @param {number} attrValue The value of the attribute to aggregate
   * @param {string} resolution The resolution
   * @param {date} recvTime The data reception time
   * @returns {Object} The update operation
   */
  function getAggregateUpdate4Update(attrType, attrValue, resolution, recvTime) {
    var aggregateUpdate4Update,
        attrValueAsNumber,
        escapedAttrValue;
    if (!isNaN(attrValue)) {
      attrValueAsNumber = parseFloat(attrValue);
      aggregateUpdate4Update = {
        '$set': {
          'attrType': attrType
        },
        '$inc': {
          'points.$.samples': 1,
          'points.$.sum': attrValueAsNumber,
          'points.$.sum2': Math.pow(attrValueAsNumber, 2)
        },
        '$min': {
          'points.$.min': attrValueAsNumber
        },
        '$max': {
          'points.$.max': attrValueAsNumber
        }
      };
    } else {
      var offset = sthHelper.getOffset(resolution, recvTime);
      aggregateUpdate4Update = {
        '$set': {
          'attrType': attrType
        },
        '$inc': {
          'points.$.samples': 1
        }
      };
      escapedAttrValue = attrValue.replace(/\$/g,'\uFF04').
        replace(/\./g, '\uFF0E');
      aggregateUpdate4Update['$inc']['points.' +
        (offset - (resolution === 'day' || resolution === 'month' || resolution === 'year' ? 1 : 0)) +
        '.occur.' + escapedAttrValue] = 1;
    }
    return aggregateUpdate4Update;
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
    //  origin and resolution.
    collection.update(
      getAggregateUpdateCondition(
        entityId, entityType, attrName, resolution, recvTime),
      getAggregateUpdate4Insert(attrType, attrValue, resolution),
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
          getAggregateUpdate4Update(attrType, attrValue, resolution, recvTime),
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
      if (++counter === sthConfig.AGGREGATION.length) {
        callback(err);
      }
    }

    sthConfig.AGGREGATION.forEach(function(entry) {
      storeAggregatedData4Resolution(
        collection, entityId, entityType, attrName, attrType, attrValue,
        entry, recvTime, onCompletion);
    });
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
    switch (COLLECTION_MODEL) {
      case COLLECTION_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        theEvent = {
          recvTime: recvTime,
          entityId: entityId,
          entityType: entityType,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
        theEvent = {
          recvTime: recvTime,
          attrName: attrName,
          attrType: attrType,
          attrValue: attrValue
        };
        break;
      case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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
    }, false, true, false, false, function(err, collection) {
      if (err) {
        return callback(err);
      }

      var entry = {
        _id: hash,
        dataModel: COLLECTION_MODEL,
        isAggregated: isAggregated,
        service: params.service,
        servicePath: params.servicePath
      };
      switch (COLLECTION_MODEL) {
        case COLLECTION_MODELS.COLLECTIONS_PER_ENTITY:
          entry.entityId = params.entityId;
          entry.entityType = params.entityType;
          break;
        case COLLECTION_MODELS.COLLECTIONS_PER_ATTRIBUTE:
          entry.entityId = params.entityId;
          entry.entityType = params.entityType;
          entry.attrName = params.attrName;
          break;
      }
      // Check if there is already an entry for the provided hash (hash collision)
      collection.findOne(
        {
          _id: hash
        },
        function(err, doc) {
          if (!doc) {
            // If no hash collision or if error when checking for a collision,
            //  try to insert an entry in the collection name hashes to params mapping collection
            collection.insert(
              entry,
              {
                writeConcern: {
                  w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN) : sthConfig.WRITE_CONCERN
                }
              },
              function(err) {
                if (err) {
                  sthLogger.warn('Collection name hash collision for new entry (' +
                    JSON.stringify(entry) + ')',
                    {
                      operationType: sthConfig.OPERATION_TYPE.DB_LOG
                    }
                  );
                }
                if (callback) {
                  return callback(err);
                }
              }
            );
          } else if (doc) {
            sthLogger.warn('Collection name hash collision for new entry (' +
              JSON.stringify(entry) + ')',
              {
                operationType: sthConfig.OPERATION_TYPE.DB_LOG
              }
            );
            if (callback) {
              return callback(new Error('Collection name hash collision'));
            }
          }
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
        return mongoClient;
      },
      get connectionURL() {
        return connectionURL;
      },
      get connection() {
        return db;
      },
      COLLECTION_MODELS: COLLECTION_MODELS,
      COLLECTION_MODEL: COLLECTION_MODEL,
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
