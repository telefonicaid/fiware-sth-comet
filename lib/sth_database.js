/* globals module, process, require */

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

var sthLogger = require('logops');
var sthConfig = require('./sth_configuration');
var sthHelper = require('./sth_helper.js');

var mongoClient = require('mongodb').MongoClient;
var boom = require('boom');
var crypto = require('crypto');
var bytesCounter = require('bytes-counter');
var jsoncsv = require('json-csv');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var db, connectionURL;

/**
 * The maximumum namespace size in bytes has to be decreased to 113 bytes
 *  (from the original 120 bytes) to be able to ensure the TTL index on aggregated
 *  data collection if requested by the user in the corresponding configuration option.
 * @type {number} Maximum namespace size in bytes
 */
var MAX_NAMESPACE_SIZE_IN_BYTES = 113;
var MIN_HASH_SIZE_IN_BYTES = 20;

var DATA_MODELS = {
  COLLECTIONS_PER_SERVICE_PATH: 'collection-per-service-path',
  COLLECTIONS_PER_ENTITY: 'collection-per-entity',
  COLLECTIONS_PER_ATTRIBUTE: 'collection-per-attribute'
};
var DATA_MODEL = DATA_MODELS.COLLECTIONS_PER_ENTITY;

function getJSONCSVOptions(attrName) {
  var jsonCSVOptions = {
    fields: [
      {
        name: 'attrName',
        label: 'attrName'
      },
      {
        name: 'attrType',
        label: 'attrType'
      },
      {
        name: 'attrValue',
        label: 'attrValue'
      },
      {
        name: 'recvTime',
        label: 'recvTime'
      }
    ],
    fieldSeparator: ','
  };
  jsonCSVOptions.fields[0].filter = function () {
    return attrName;
  };
  return jsonCSVOptions;
}

/**
 * Connects to a (MongoDB) database endpoint asynchronously
 * @param {object} params It is an object including the following properties:
 *  - {string} authentication The authentication schema to use for the connection
 *  - {string} dbURI The database URI
 *  - {string} replicaSet The replica set name, if any
 *  - {string} database The name of the database to connect to
 *  - {Number} poolSize The size of the pool of connections to the database
 * @param {Function} callback A callback to inform about the result of the operation
 */
function connect(params, callback) {
  connectionURL = 'mongodb://' + params.authentication + '@' + params.dbURI + '/' + params.database +
    (params.replicaSet ? '/?replicaSet=' + params.replicaSet : '');

  mongoClient.connect(connectionURL,
    {
      server: {
        poolSize: params.poolSize
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
  sthLogger.info(
    sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
    'Closing the connection to the database...'
  );
  if (db) {
    db.close(function () {
      // Connection to database closed
      sthLogger.info(
        sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
        'Connection to MongoDb succesfully closed'
      );
      return process.nextTick(callback);
    });
  } else {
    sthLogger.info(
      sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
      'No connection to the database available'
    );
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
 * Return the name of the collection which will store the raw events
 * @param {object} params It is an object including the following properties:
 *  - {string} databaseName The database name
 *  - {string} servicePath The service path of the entity the event is related to
 *  - {string} entityId The entity id related to the event
 *  - {string} entityType The type of entity related to the event
 *  - {string} attrName The attribute id related to the event
 * @returns {string} The collection name
 */
function getCollectionName4Events(params) {
  var collectionName4Events;
  var databaseName = params.databaseName,
      servicePath = params.servicePath,
      entityId = params.entityId,
      entityType = params.entityType,
      attrName = params.attrName;

  switch (DATA_MODEL) {
    case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
      collectionName4Events = servicePath;
      break;
    case DATA_MODELS.COLLECTIONS_PER_ENTITY:
      collectionName4Events = servicePath + '_' + entityId + (entityType ? '_' + entityType : '');
      break;
    case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
      collectionName4Events = servicePath + '_' + entityId + (entityType ? '_' + entityType : '') +
        '_' + attrName;
      break;
  }
  collectionName4Events = collectionName4Events.toLowerCase();
  if (sthConfig.SHOULD_HASH) {
    var limit = getHashSizeInBytes(databaseName);
    if (limit < MIN_HASH_SIZE_IN_BYTES) {
      sthLogger.warn(
        sthConfig.LOGGING_CONTEXT.DB_LOG,
        'The available bytes for the hashes to be used as part of the collection names are not enough (' +
          'currently ' + limit + ' and at least ' + MIN_HASH_SIZE_IN_BYTES + ' bytes are needed), ' +
          'please reduce the size of the DB_PREFIX ("' + sthConfig.DB_PREFIX + '" = ' +
          bytesCounter.count(sthConfig.DB_PREFIX) + ' bytes), ' +
          'the service ("' + databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length) + '" = ' +
          bytesCounter.count(databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length)) +
          ' bytes) and/or the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' +
          bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
          ' bytes) to save more bytes for the hash'
      );
      return null;
    }
    return sthConfig.COLLECTION_PREFIX + generateHash(collectionName4Events, limit);
  } else if (getNamespaceSizeInBytes(databaseName, collectionName4Events) > MAX_NAMESPACE_SIZE_IN_BYTES) {
    sthLogger.warn(
      sthConfig.LOGGING_CONTEXT.DB_LOG,
      'The size in bytes of the namespace for storing the aggregated data ("' + databaseName + '" plus "' +
        sthConfig.COLLECTION_PREFIX + collectionName4Events + '.aggr", ' +
        getNamespaceSizeInBytes(databaseName, collectionName4Events) +
        ' bytes)' + ' is bigger than ' + MAX_NAMESPACE_SIZE_IN_BYTES + ' bytes, ' +
        'please reduce the size of the DB_PREFIX ("' + sthConfig.DB_PREFIX + '" = ' +
        bytesCounter.count(sthConfig.DB_PREFIX) + ' bytes), ' +
        'the service ("' + databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length) + '" = ' +
        bytesCounter.count(databaseName.substring(sthConfig.DB_PREFIX.length, databaseName.length)) +
        ' bytes), the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' +
        bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
        ' bytes), the entity id ("' + entityId + '" = ' + bytesCounter.count(entityId) +
        ' bytes) and/or the entity type ("' +
        entityType + '" = ' + bytesCounter.count(entityType) + ' bytes) to make the namespace fit in the available ' +
        'bytes'
    );
    return null;
  } else {
    return sthConfig.COLLECTION_PREFIX + collectionName4Events;
  }
}

/**
 * Return the name of the collection which will store the aggregated data
 * @param {object} params It is an object including the following properties:
 *  - {string} databaseName The database name
 *  - {string} servicePath The service path of the entity the event is related to
 *  - {string} entityId The entity id related to the event
 *  - {string} entityType The type of entity related to the event
 *  - {string} attrName The attribute id related to the event
 * @returns {string} The collection name
 */
function getCollectionName4Aggregated(params) {
  var collectionName4Events = getCollectionName4Events(params);
  if (collectionName4Events) {
    return collectionName4Events + '.aggr';
  } else {
    return null;
  }
}

/**
 * To avoid needing to set the 'jslint latedef: true' option to true for the whole file, we declare the
 *  storeCollectionHash function before its definition and before the getCollection() function definition since
 *  both functions call each other, although no infinite call loop is ever made. The 'shouldStoreHash' option assures
 *  this circular infinite loop is ever run.
 */
var storeCollectionHash;

/**
 * Returns a reference to a collection of the database asynchronously
 * @param {object} params Params (service, service path, entity, attribute or collection) for which the collection
 *  should be returned
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated: Flag indicating if the aggregated collection is desired. If false, the raw data
 *  collection is the one required
 *  - {boolean} shouldCreate: Flag indicating if the collection should be created
 *  if it does not exist
 *  - {boolean} shouldStoreHash: Flag indicating if the collection hash should be stored in case the collection
 *  is created
 *  - {boolean} shouldTruncate: Flag indicating if the collection should be truncated according to the requested data
 *  management policies (time or data collection truncation)
 * @param {Function} callback Callback function to be called with the results
 */
function getCollection(params, options, callback) {
  var isAggregated = options.isAggregated,
    shouldCreate = options.shouldCreate,
    shouldStoreHash = options.shouldStoreHash,
    shouldTruncate = options.shouldTruncate;

  var databaseName = getDatabase(params.service);

  shouldStoreHash = sthConfig.SHOULD_HASH && shouldStoreHash;

  var collectionName;
  if (params.collection) {
    collectionName = params.collection;
  } else {
    collectionName = isAggregated ?
      getCollectionName4Aggregated(
        {
          databaseName: databaseName,
          servicePath: params.servicePath,
          entityId: params.entityId,
          entityType: params.entityType,
          attrName: params.attrName
        }
      ) :
      getCollectionName4Events(
        {
          databaseName: databaseName,
          servicePath: params.servicePath,
          entityId: params.entityId,
          entityType: params.entityType,
          attrName: params.attrName
        }
      );
  }

  if (!collectionName) {
    var error = boom.badRequest('The collection name could not be generated');
    return process.nextTick(callback.bind(null, error));
  }

  // Switch to the right database
  var connection = db.db(databaseName);

  // Get the connection and notify it via the callback.
  sthLogger.debug(
    sthConfig.LOGGING_CONTEXT.DB_LOG,
    'Getting access to the collection \'' + collectionName + '\' in database \'' + databaseName + '\''
  );

  var setTTLPolicy = function (collection) {
    // Set the TTL policy if required
    if (parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS, 10) > 0) {
      if (!isAggregated) {
        if (parseInt(sthConfig.TRUNCATION_SIZE, 10) === 0) {
          collection.ensureIndex(
            {
              'recvTime': 1
            },
            {
              expireAfterSeconds: parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS, 10)
            }, function (err) {
              if (err) {
                sthLogger.error(
                  sthConfig.LOGGING_CONTEXT.DB_LOG,
                  'Error when creating the index for TTL for collection \'' +
                    collectionName + '\': ' + err
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
            expireAfterSeconds: parseInt(sthConfig.TRUNCATION_EXPIREAFTERSECONDS, 10)
          }, function (err) {
            if (err) {
              sthLogger.error(
                sthConfig.LOGGING_CONTEXT.DB_LOG,
                'Error when creating the index for TTL for collection \'' +
                collectionName + '\': ' + err
              );
            }
          }
        );
      }
    }
  };

  var createCollectionCB = function (err, collection) {
    if (!err && shouldStoreHash) {
      storeCollectionHash(params, isAggregated, collectionName, function (hashErr) {
        if (hashErr) {
          // There was an error when storing the collection hash
          // Do nothing
          sthLogger.warn(
            sthConfig.LOGGING_CONTEXT.DB_LOG,
            'Error when storing the hash generated as part of the collection name into the database'
          );
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
          if (parseInt(sthConfig.TRUNCATION_SIZE, 10) > 0) {
            var collectionCreationOptions = {
              capped: true,
              size: parseInt(sthConfig.TRUNCATION_SIZE, 10),
              max: parseInt(sthConfig.TRUNCATION_MAX, 10) || null
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
 * Stores the collection name (hash) in the database
 * @param {object} params It is an object including the following properties: service, service path, entity,
 *  attribute or collection
 * @param hash The generated hash used as part of the collection names
 * @param callback A callback function
 */
storeCollectionHash = function storeCollectionHash(params, isAggregated, hash, callback) {
  getCollection(
    {
      service: params.service,
      collection: sthConfig.COLLECTION_PREFIX + 'collection_names'
    },
    {
      isAggregated: false,
      shouldCreate: true,
      shouldStoreHash: false,
      shouldTruncate: false
    },
    function (err, collection) {
      if (err) {
        return callback(err);
      }

      var entry = {
        _id: hash,
        dataModel: DATA_MODEL,
        isAggregated: isAggregated,
        service: params.service,
        servicePath: params.servicePath
      };
      switch (DATA_MODEL) {
        case DATA_MODELS.COLLECTIONS_PER_ENTITY:
          entry.entityId = params.entityId;
          entry.entityType = params.entityType;
          break;
        case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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
        function (err, doc) {
          if (!doc) {
            // If no hash collision or if error when checking for a collision,
            //  try to insert an entry in the collection name hashes to params mapping collection
            collection.insert(
              entry,
              {
                writeConcern: {
                  w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
                }
              },
              function (err) {
                if (err) {
                  sthLogger.warn(
                    sthConfig.LOGGING_CONTEXT.DB_LOG,
                    'Collection name hash collision for new entry (' +
                      JSON.stringify(entry) + ')'
                  );
                }
                if (callback) {
                  return callback(err);
                }
              }
            );
          } else if (doc) {
            sthLogger.warn(
              sthConfig.LOGGING_CONTEXT.DB_LOG,
              'Collection name hash collision for new entry (' +
                JSON.stringify(entry) + ')'
            );
            if (callback) {
              return callback(new Error('Collection name hash collision'));
            }
          }
        }
      );
    }
  );
};

/**
 * Saves the contents of a readable stream into a file in the local file system
 * @param {string} attrName The name of the attribute the stream contents refers to
 * @param {object} stream The stream
 * @param {string} fileName The file name where the stream contents should be stored
 * @param {function} callback THe callback
 */
function save2File(attrName, stream, fileName, callback) {
  var tempDir = __dirname + path.sep + '..' + path.sep + sthConfig.TEMPORAL_DIR;
  if (!fs.existsSync(tempDir) ||
    (fs.existsSync(tempDir) && !fs.statSync(tempDir).isDirectory())) {
    mkdirp.sync(tempDir);
  }

  var outputFile = fs.createWriteStream(tempDir + path.sep + fileName, {encoding: 'utf8'});
  stream.pipe(jsoncsv.csv(getJSONCSVOptions(attrName))).pipe(outputFile).on('finish', callback);
}

/**
 * Generates a CSV file from a stream containing raw data associated to certain attribute
 * @param {string} attrName The attribute name
 * @param {object} stream The stream
 * @param {function} callback The callback
 */
function generateCSV(attrName, stream, callback) {
  var fileName = attrName + '-' + Date.now() + '.csv';
  save2File(attrName, stream, fileName,
    callback.bind(null, null, __dirname + path.sep + '..' + path.sep + sthConfig.TEMPORAL_DIR + path.sep + fileName));
}

/**
 * Returns the required raw data from the database asynchronously
 * @param {object} data The data for which return the raw data. It is an object including the following properties:
 *  - {object} collection: The collection from where the data should be extracted
 *  - {string} entityId: The entity id related to the event
 *  - {string} entityType: The type of entity related to the event
 *  - {string} attrName: The attribute id related to the event
 *  - {number} lastN: Only return the last n matching entries
 *  - {number} hLimit: Maximum number of results to retrieve when paginating
 *  - {number} hOffset: Offset to apply when paginating
 *  - {date} from: The date from which retrieve the aggregated data
 *  - {date} to: The date to which retrieve the aggregated data
 *  - {string} filetype: The file type to return the data in
 * @param {Function} callback Callback to inform about any possible error or results
 */
function getRawData(data, callback) {
  var collection = data.collection,
      entityId = data.entityId,
      entityType = data.entityType,
      attrName = data.attrName,
      lastN = data.lastN,
      hLimit = data.hLimit,
      hOffset = data.hOffset,
      from = data.from,
      to = data.to,
      filetype = data.filetype;

  var findCondition;
  switch (DATA_MODEL) {
    case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
      findCondition = {
        'entityId': entityId,
        'entityType': entityType,
        'attrName': attrName
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ENTITY:
      findCondition = {
        'attrName': attrName
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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
  if (lastN || lastN === 0) {
    cursor = collection.find(
      findCondition,
      {
        _id: 0,
        attrType: 1,
        attrValue: 1,
        recvTime: 1
      }
    ).sort({'recvTime': -1}).limit(lastN);
    if (filetype === 'csv') {
      generateCSV(attrName, cursor.stream(), callback);
    } else {
      cursor.toArray(function (err, results) {
        if (!err) {
          results.reverse();
        }
        return process.nextTick(callback.bind(null, err, results));
      });
    }
  } else if (hOffset || hLimit) {
    cursor = collection.find(
      findCondition,
      {
        _id: 0,
        attrType: 1,
        attrValue: 1,
        recvTime: 1
      }
    ).sort({'recvTime': 1}).skip(hOffset || 0).limit(hLimit || 0);
    if (filetype === 'cvs') {
      generateCSV(attrName, cursor.stream(), callback);
    } else {
      cursor.toArray(callback);
    }
  } else {
    cursor = collection.find(
      findCondition,
      {
        _id: 0,
        attrType: 1,
        attrValue: 1,
        recvTime: 1
      }
    );
    if (filetype === 'csv') {
      generateCSV(attrName, cursor.stream(), callback);
    } else {
      cursor.toArray(callback);
    }
  }
}

/**
 * Filters out a concrete point from the beginning of the results array
 * @param points The points array
 * @param i The point index to filter out
 * @param aggregatedFunction The aggregated function
 * @param shouldFilter A flag indicating if results have been filtered out
 */
function filterPointFromBeginning(points, i, aggregatedFunction, shouldFilter) {
  if (shouldFilter) {
    points.splice(i, 1);
    i--;
  } else {
    points[i].samples = 0;
    points[i].numSamples = 0;
    points[i].txtSamples = 0;
    if (aggregatedFunction === 'occur') {
      points[i].occur = {};
    } else if (aggregatedFunction === 'sum') {
      points[i].sum = Number.MIN_VALUE;
    } else if (aggregatedFunction === 'sum2') {
      points[i].sum2 = Number.MIN_VALUE;
    } else if (aggregatedFunction === 'min') {
      points[i].min = Number.POSITIVE_INFINITY;
    } else if (aggregatedFunction === 'max') {
      points[i].max = Number.NEGATIVE_INFINITY;
    }
  }
  return i;
}

/**
 * Filters out points from the beginning of the results array
 * @param results The results array from which the points should be removed
 * @param minOffset The minimum offset which should be included in the results
 * @param aggregatedFunction The aggregation function
 * @param shouldFilter A flag indicating if the results should be filtered
 */
function filterResultsFromBeginning(results, minOffset, aggregatedFunction, shouldFilter) {
  var points = results[0].points;
  for (var i = 0; i < points.length; i++) {
    if (points[i]) {
      if (points[i].offset < minOffset) {
        if (points[i].samples) {
          i = filterPointFromBeginning(points, i, aggregatedFunction, shouldFilter);
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

/**
 * Filters out a concrete point from the end of the results array
 * @param points The points array
 * @param i The point index to filter out
 * @param aggregatedFunction The aggregated function
 * @param shouldFilter A flag indicating if results have been filtered out
 */
function filterPointFromEnd(points, i, aggregatedFunction, shouldFilter) {
  if (shouldFilter) {
    points.splice(i, 1);
  } else {
    points[i].samples = 0;
    points[i].numSamples = 0;
    points[i].txtSamples = 0;
    if (aggregatedFunction === 'occur') {
      points[i].occur = {};
    } else if (aggregatedFunction === 'sum') {
      points[i].sum = Number.MIN_VALUE;
    } else if (aggregatedFunction === 'sum2') {
      points[i].sum2 = Number.MIN_VALUE;
    } else if (aggregatedFunction === 'min') {
      points[i].min = Number.POSITIVE_INFINITY;
    } else if (aggregatedFunction === 'max') {
      points[i].max = Number.NEGATIVE_INFINITY;
    }
  }
}

/**
 * Filters out points from the end of the results array
 * @param results The results array from which the points should be removed
 * @param maxOffset The maximum offset which should be included in the results
 * @param aggregatedFunction The aggregation function
 * @param shouldFilter A flag indicating if the results should be filtered
 */
function filterResultsFromEnd(results, maxOffset, aggregatedFunction, shouldFilter) {
  var points = results[results.length - 1].points;
  for (var i = points.length - 1; i >= 0; i--) {
    if (points[i]) {
      if (points[i].offset > maxOffset) {
        if (points[i].samples) {
          filterPointFromEnd(points, i, aggregatedFunction, shouldFilter);
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

/**
 * Filters out false positive values and fixes the effects of possible multi-type aggregation from results
 * @param results The results array
 * @param aggregatedFunction The aggregation method
 * @param shouldFilter A flag indicating if the results should be filtered
 */
function fixResults(results, aggregatedFunction, shouldFilter) {
  for (var i = results.length - 1; i >= 0; i--) {
    var points = results[i].points;
    for (var j = points.length - 1; j >= 0; j--) {
      if (points[j][aggregatedFunction] === undefined ||
          shouldFilter && (points[j][aggregatedFunction] === Number.MIN_VALUE ||
            points[j][aggregatedFunction] === Number.POSITIVE_INFINITY ||
            points[j][aggregatedFunction] === Number.NEGATIVE_INFINITY)) {
        points.splice(j, 1);
      } else if (points[j].numSamples &&
        sthHelper.getAggregationType(aggregatedFunction) === sthConfig.AGGREGATION.TYPES.NUMERIC) {
        points[j].samples = points[j].numSamples;
        delete points[j].numSamples;
        delete points[j].txtSamples;
      } else if (points[j].txtSamples &&
        sthHelper.getAggregationType(aggregatedFunction) === sthConfig.AGGREGATION.TYPES.TEXTUAL) {
        points[j].samples = points[j].txtSamples;
        delete points[j].numSamples;
        delete points[j].txtSamples;
      }
    }
    if (!points.length) {
      results.splice(i, 1);
    }
  }
}

/**
 * Filters out the results based on the resolution and the optional from and to dates. For certain resolution, the
 *  from and to dates are considered and applied until the unit of time indicated by the resolution.
 * @param results The array of results
 * @param options Additional data to be considered in the filtering. It is an object including the following properties:
 *  - resolution: The resolution
 *  - from: The starting date
 *  - to: The ending date
 *  - aggregatedFunction: The aggregation function
 *  - shouldFilter: Flag indicating if null results should be filtered
 */
function filterResults(results, options) {
  var resolution = options.resolution,
      from = options.from,
      to = options.to,
      aggregatedFunction = options.aggregatedFunction,
      shouldFilter = options.shouldFilter;

  if (!results.length) {
    return;
  }

  if (from &&
    results[0]._id.origin.getTime() === sthHelper.getOrigin(from, resolution).getTime()) {
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
    filterResultsFromBeginning(results, minOffset, aggregatedFunction, shouldFilter);
  }
  if (results.length && to &&
    results[results.length - 1]._id.origin.getTime() === sthHelper.getOrigin(to, resolution).getTime()) {
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
    filterResultsFromEnd(results, maxOffset, aggregatedFunction, shouldFilter);
  }
  fixResults(results, aggregatedFunction, shouldFilter);
}

/**
 * Returns the required aggregated data from the database asynchronously
 * @param {object} data The data to get the aggregated data. It is an object including the following properties:
 *  - {object} collection: The collection from where the data should be extracted
 *  - {string} entityId: The entity id related to the event
 *  - {string} entityType: The type of entity related to the event
 *  - {string} attrName: The attribute id related to the event
 *  - {string} aggregatedFunction: The aggregated function or method to retrieve
 *  - {string} resolution: The resolution of the data to use
 *  - {date} from: The date from which retrieve the aggregated data
 *  - {date} to: The date to which retrieve the aggregated data
 *  - {boolean} shouldFilter: If true, the null results are filter out
 * @param {Function} callback Callback to inform about any possible error or results
 */
function getAggregatedData(data, callback) {
  var collection = data.collection,
    entityId = data.entityId,
    entityType = data.entityType,
    attrName = data.attrName,
    aggregatedFunction = data.aggregatedFunction,
    resolution = data.resolution,
    from = data.from,
    to = data.to,
    shouldFilter = data.shouldFilter;

  var fieldFilter = {
    'points.offset': 1,
    'points.samples': 1,
    'points.numSamples': 1,
    'points.txtSamples': 1
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
      samples: '$points.samples',
      numSamples: '$points.numSamples',
      txtSamples: '$points.txtSamples'
    };
    pushAccumulator[aggregatedFunction] = '$points.' + aggregatedFunction;

    var matchCondition;
    switch (DATA_MODEL) {
      case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        matchCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ENTITY:
        matchCondition = {
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
        matchCondition = {
          '_id.resolution': resolution
        };
        break;
    }
    if (originFilter) {
      matchCondition['_id.origin'] = originFilter;
    }

    var groupId;
    switch (DATA_MODEL) {
      case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        groupId = {
          entityId: '$_id.entityId',
          entityType: '$_id.entityType',
          attrName: '$_id.attrName',
          origin: '$_id.origin',
          resolution: '$_id.resolution'
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ENTITY:
        groupId = {
          attrName: '$_id.attrName',
          origin: '$_id.origin',
          resolution: '$_id.resolution'
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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
      filterResults(
        resultsArr,
        {
          resolution: resolution,
          from: from,
          to: to,
          aggregatedFunction: aggregatedFunction,
          shouldFilter: shouldFilter
        }
      );
      process.nextTick(callback.bind(null, err, resultsArr));
    });
  } else {
    // Get the aggregated data from the database
    // Return the data in ascending order based on the origin
    var findCondition;
    switch (DATA_MODEL) {
      case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
        findCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ENTITY:
        findCondition = {
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
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
        filterResults(
          resultsArr,
          {
            resolution: resolution,
            from: from,
            to: to,
            aggregatedFunction: aggregatedFunction,
            shouldFilter: shouldFilter
          }
        );
        process.nextTick(callback.bind(null, err, resultsArr));
      }
    );
  }
}

/**
 * Returns the condition to be used in the MongoDB update operation for aggregated data
 * @param {object} data The data from which the update condition should be generated. It is an object including the
 *  following properties:
 *    - {string} entityId: The entity id
 *    - {string} entityType: The entity type
 *    - {string} attrName: The attribute name
 *    - {string} resolution The resolution
 *    - {date} recvTime The date (or recvTime) of the notification (attribute value change)
 * @returns {Object} The update condition
 */
function getAggregateUpdateCondition(data) {
  var entityId = data.entityId,
    entityType = data.entityType,
    attrName = data.attrName,
    resolution = data.resolution,
    timestamp = data.timestamp;

  var offset = sthHelper.getOffset(resolution, timestamp);

  var aggregateUpdateCondition;
  switch (DATA_MODEL) {
    case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
      aggregateUpdateCondition = {
        '_id.entityId': entityId,
        '_id.entityType': entityType,
        '_id.attrName': attrName,
        '_id.origin': sthHelper.getOrigin(timestamp, resolution),
        '_id.resolution': resolution,
        'points.offset': offset
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ENTITY:
      aggregateUpdateCondition = {
        '_id.attrName': attrName,
        '_id.origin': sthHelper.getOrigin(timestamp, resolution),
        '_id.resolution': resolution,
        'points.offset': offset
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
      aggregateUpdateCondition = {
        '_id.origin': sthHelper.getOrigin(timestamp, resolution),
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

  // isNaN(' ') is false so an additional check is needed to deal with attributes values to one or more blank spaces
  if (!isNaN(attrValue) && !(typeof(attrValue) === 'string' && attrValue.trim() === '')) {
    for (var i = offsetOrigin; i < totalValues; i++) {
      points.push({
        offset: i,
        samples: 0,
        numSamples: 0,
        txtSamples: 0,
        sum: Number.MIN_VALUE,
        sum2: Number.MIN_VALUE,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY
      });
    }
  } else {
    for (var j = offsetOrigin; j < totalValues; j++) {
      var entry = {
        offset: j,
        samples: 0,
        numSamples: 0,
        txtSamples: 0,
        occur: {}
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
  // isNaN(' ') is false so an additional check is needed to deal with attributes values to one or more blank spaces
  if (!isNaN(attrValue) && !(typeof(attrValue) === 'string' && attrValue.trim() === '')) {
    attrValueAsNumber = parseFloat(attrValue);
    aggregateUpdate4Update = {
      '$set': {
        'attrType': attrType
      },
      '$inc': {
        'points.$.samples': 1,
        'points.$.numSamples': 1,
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
        'points.$.samples': 1,
        'points.$.txtSamples': 1
      }
    };
    escapedAttrValue = attrValue.replace(/\$/g, '\uFF04').replace(/\./g, '\uFF0E');
    aggregateUpdate4Update.$inc['points.' +
    (offset - (resolution === 'day' || resolution === 'month' || resolution === 'year' ? 1 : 0)) +
    '.occur.' + escapedAttrValue] = 1;
  }
  return aggregateUpdate4Update;
}

/**
 * Stores the aggregated data for a new event (attribute value)
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored
 *  - {string} entityId The entity id
 *  - {string} entityType: The entity type
 *  - {string} attrName: The attribute name
 *  - {string} attrType: The attribute type
 *  - {string} attrValue: The attribute value
 *  - {string} resolution: The resolution
 *  - {date} timestamp: The attribute value timestamp
 * @param {Function} callback Function to call once the operation completes
 */
function storeAggregatedData4Resolution(data, callback) {
  var collection = data.collection,
    entityId = data.entityId,
    entityType = data.entityType,
    attrName = data.attrName,
    attrType = data.attrType,
    attrValue = data.attrValue,
    resolution = data.resolution,
    timestamp = data.timestamp;

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
   {
   upsert: true,
   writeConcern: {
   w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
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
      {
        entityId: entityId,
        entityType: entityType,
        attrName: attrName,
        resolution: resolution,
        timestamp: timestamp
      }
    ),
    getAggregateUpdate4Insert(attrType, attrValue, resolution),
    {
      upsert: true,
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
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
          {
            entityId: entityId,
            entityType: entityType,
            attrName: attrName,
            resolution: resolution,
            timestamp: timestamp
          }
        ),
        getAggregateUpdate4Update(attrType, attrValue, resolution, timestamp),
        {
          writeConcern: {
            w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
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
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored in
 *  - {date} recvTime The date the event arrived
 *  - {string} entityId The entity id associated to updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 * @param {Function} callback Function to call once the operation completes
 */
function storeAggregatedData(data, callback) {
  var counter = 0,
    error;

  var collection = data.collection,
    recvTime = data.recvTime,
    entityId = data.entityId,
    entityType = data.entityType,
    attribute = data.attribute;


  function onCompletion(err) {
    error = err;
    if (++counter === sthConfig.AGGREGATED_BY.length) {
      callback(err);
    }
  }

  var timestamp = sthHelper.getAttributeTimestamp(attribute, recvTime);

  sthConfig.AGGREGATED_BY.forEach(function (entry) {
    storeAggregatedData4Resolution(
      {
        collection: collection,
        entityId: entityId,
        entityType: entityType,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value,
        resolution: entry,
        timestamp: timestamp
      },
      onCompletion
    );
  });
}

/**
 * Stores the raw data for a new event (attribute value)
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored in
 *  - {date} recvTime The date the event arrived
 *  - {string} entityId The entity id associated to updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 * @param {Function} callback Function to call once the operation completes
 */
function storeRawData(data, callback) {
  var collection = data.collection,
    recvTime = data.recvTime,
    entityId = data.entityId,
    entityType = data.entityType,
    attribute = data.attribute;

  var timestamp = sthHelper.getAttributeTimestamp(attribute, recvTime);

  var theEvent;
  switch (DATA_MODEL) {
    case DATA_MODELS.COLLECTIONS_PER_SERVICE_PATH:
      theEvent = {
        recvTime: timestamp,
        entityId: entityId,
        entityType: entityType,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ENTITY:
      theEvent = {
        recvTime: timestamp,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
    case DATA_MODELS.COLLECTIONS_PER_ATTRIBUTE:
      theEvent = {
        recvTime: timestamp,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
  }
  collection.insert(
    theEvent,
    {
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
      }
    },
    function (err) {
      if (callback) {
        callback(err);
      }
    });
}

module.exports = {
  get driver() {
    return mongoClient;
  },
  get connectionURL() {
    return connectionURL;
  },
  get connection() {
    return db;
  },
  DATA_MODELS: DATA_MODELS,
  DATA_MODEL: DATA_MODEL,
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
