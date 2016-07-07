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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var ROOT_PATH = require('app-root-path').toString();
var sthLogger = require('logops');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration.js');
var sthUtils = require(ROOT_PATH + '/lib/utils/sthUtils.js');
var mongoClient = require('mongodb').MongoClient;
var boom = require('boom');
var crypto = require('crypto');
var bytesCounter = require('bytes-counter');
var jsoncsv = require('json-csv');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var async = require('async');
var _ = require('lodash');

var db, connectionURL;

/**
 * The maximumum namespace size in bytes according to MongoDB documentation.
 * @type {number} Maximum namespace size in bytes
 */
var MAX_NAMESPACE_SIZE_IN_BYTES = 120;
/**
 * The maximumum index namespace size in bytes according to MongoDB documentation.
 * @type {number} Maximum namespace size in bytes
 */
var MAX_INDEX_NAMESPACE_SIZE_IN_BYTES = 127;
var MIN_HASH_SIZE_IN_BYTES = 20;

/**
 * Returns the options to use for the CSV file generation
 * @param attrName The attribute name
 * @return {{fields: *[], fieldSeparator: string}} The options to use
 */
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
    (params.replicaSet ? '?replicaSet=' + params.replicaSet : '');

  sthLogger.info(
    sthConfig.LOGGING_CONTEXT.DB_CONN_OPEN,
    'Establishing connection to the database at %s',
    connectionURL
  );
  mongoClient.connect(connectionURL,
    {
      server: {
        poolSize: params.poolSize
      }
    },
    function (err, theDB) {
      if (!err) {
        sthLogger.info(
          sthConfig.LOGGING_CONTEXT.DB_CONN_OPEN,
          'Connection successfully established to the database at %s',
          connectionURL
        );
      }
      db = theDB;
      return process.nextTick(callback.bind(null, err, theDB));
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
    db.close(function (err) {
      if (err) {
        sthLogger.error(
          sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
          'Error when closing the connection to the database: ' + err);
      } else {
        sthLogger.info(
          sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
          'Connection to MongoDb succesfully closed');
        db = null;
      }
      return process.nextTick(callback.bind(null, err));
    });
  } else {
    sthLogger.info(
      sthConfig.LOGGING_CONTEXT.DB_CONN_CLOSE,
      'No connection to the database available');
    return process.nextTick(callback);
  }
}

/**
 * Returns the database name based on the service
 * @param {string} service The service
 * @return {string} The database name
 */
function getDatabaseName(service) {
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
  var compoundIndexBytes,
      maxIndexNamespaceSizeInBytes,
      maxNamespaceSizeInBytes;
  switch(sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      compoundIndexBytes = bytesCounter.count('.$recvTime_1_attrType_1_attrValue_1');
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      compoundIndexBytes = bytesCounter.count('.$recvTime_1_attrName_1_attrType_1_attrValue_1');
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      compoundIndexBytes = bytesCounter.count('.$recvTime_1_entityId_1_entityType_1_attrName_1_attrType_1_attrValue_1');
      break;
  }
  maxIndexNamespaceSizeInBytes = MAX_INDEX_NAMESPACE_SIZE_IN_BYTES - bytesCounter.count(databaseName) -
    bytesCounter.count('.') - bytesCounter.count(sthConfig.COLLECTION_PREFIX) - compoundIndexBytes;
  maxNamespaceSizeInBytes = MAX_NAMESPACE_SIZE_IN_BYTES - bytesCounter.count(databaseName) - bytesCounter.count('.') -
    bytesCounter.count(sthConfig.COLLECTION_PREFIX) - bytesCounter.count('.aggr');
  return Math.min(maxIndexNamespaceSizeInBytes, maxNamespaceSizeInBytes);
}

/**
 * Returns the name of the collection which will store the raw events
 * @param  {object}  params   Params object including the following properties:
 *                              - service: The service
 *                              - servicePath: The service path
 *                              - entityId: The entity id
 *                              - entityType: The entity type
 *                              - attrName: The attribute name
 * @returns {string}          The raw data collection name
 */
function getCollectionName4Events(params) {
  var collectionName4Events;
  var databaseName = getDatabaseName(params.service),
      servicePath = params.servicePath,
      entityId = params.entityId,
      entityType = params.entityType,
      attrName = params.attrName;

  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      collectionName4Events = servicePath;
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      collectionName4Events = servicePath + '_' + entityId + (entityType ? '_' + entityType : '');
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      collectionName4Events = servicePath + '_' + entityId + (entityType ? '_' + entityType : '') +
        '_' + attrName;
      break;
  }

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
* Returns the name of the collection which will store the aggregated events
* @param  {object}  params   Params object including the following properties:
*                              - service: The service
*                              - servicePath: The service path
*                              - entityId: The entity id
*                              - entityType: The entity type
*                              - attrName: The attribute name
* @returns {string}          The aggregated data collection name
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
 * Sets the unique index for the raw data collections
 * @param {object} collection The raw data collection
 */
function setRawDataUniqueIndex(collection) {
  var uniqueCompoundIndex;
  switch(sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      uniqueCompoundIndex = {
        'recvTime': 1,
        'entityId': 1,
        'entityType': 1,
        'attrName': 1,
        'attrType': 1,
        'attrValue': 1
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      uniqueCompoundIndex = {
        'recvTime': 1,
        'attrName': 1,
        'attrType': 1,
        'attrValue': 1
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      uniqueCompoundIndex = {
        'recvTime': 1,
        'attrType': 1,
        'attrValue': 1
      };
      break;
  }
  collection.ensureIndex(
    uniqueCompoundIndex,
    { unique: true },
    function (err) {
      if (err) {
        sthLogger.error(
          sthConfig.LOGGING_CONTEXT.DB_LOG,
          'Error when creating the unique compound index for collection \'' +
          collection.s.name + '\': ' + err
        );
      }
    }
  );
}

/**
 * Returns true is the collection name corresponds to an aggregated data collection. False otherwise.
 * @param collectionName The collection name
 * @return {boolean} True is the collection name corresponds to an aggregated data collection. False otherwise.
 */
function isAggregated(collectionName) {
  if (collectionName.lastIndexOf('.aggr') === -1 ||
    collectionName.lastIndexOf('.aggr') !== collectionName.length - '.aggr'.length) {
    return false;
  } else {
    return true;
  }
}

/**
 * Sets the time to live policy on a collection
 * @param {object} collection The collection
 */
function setTTLPolicy(collection) {
  // Set the TTL policy if required
  if (sthConfig.TRUNCATION_EXPIRE_AFTER_SECONDS > 0) {
    if (!isAggregated(collection)) {
      if (sthConfig.TRUNCATION_SIZE === 0) {
        collection.ensureIndex(
          {
            'recvTime': 1
          },
          {
            expireAfterSeconds: sthConfig.TRUNCATION_EXPIRE_AFTER_SECONDS
          }, function (err) {
            if (err) {
              sthLogger.error(
                sthConfig.LOGGING_CONTEXT.DB_LOG,
                'Error when creating the index for TTL for collection \'' +
                collection.s.name + '\': ' + err
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
          expireAfterSeconds: sthConfig.TRUNCATION_EXPIRE_AFTER_SECONDS
        }, function (err) {
          if (err) {
            sthLogger.error(
              sthConfig.LOGGING_CONTEXT.DB_LOG,
              'Error when creating the index for TTL for collection \'' +
              collection.s.name + '\': ' + err
            );
          }
        }
      );
    }
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
 * Returns asynchronously a reference to a collection of the database
 * @param  {object}   params   Params object including the following properties:
 *                               - service: The service
 *                               - servicePath: The service path
 *                               - entityId: The entity id
 *                               - entityType: The entity type
 *                               - attrName: The attribute name
 * @param  {object}   options  Options object including the following properties:
 *                               - isAggregated: Flag indicating if the aggregated collection is desired
 *                               - shouldCreate: Flag indicating if the collection should be created if it does not
 *                                 exist
 *                               - shouldStoreHash: Flag indicating if the collection name hash should be stored
 *                               - shouldTruncate: Flag indicating if the collection should be trucate in time or size
 * @param  {Function} callback The callback
 */
function getCollection(params, options, callback) {
  var isAggregated = options.isAggregated,
    shouldCreate = options.shouldCreate,
    shouldStoreHash = options.shouldStoreHash,
    shouldTruncate = options.shouldTruncate;

  var databaseName = getDatabaseName(params.service);

  shouldStoreHash = sthConfig.SHOULD_HASH && shouldStoreHash;

  var collectionName;
  if (params.collection) {
    collectionName = params.collection;
  } else {
    collectionName = isAggregated ?
      getCollectionName4Aggregated(
        {
          service: params.service,
          servicePath: params.servicePath,
          entityId: params.entityId,
          entityType: params.entityType,
          attrName: params.attrName
        }
      ) :
      getCollectionName4Events(
        {
          service: params.service,
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

  function createCollectionCB(err, collection) {
    if (err) {
      if (err.message === 'collection already exists') {
        // We have observed that although leaving the strict option to the default value, sometimes
        //  we get a 'collection already exists' error when executing connection.db#createCollection()
        connection.collection(collectionName, {strict: true},
          function (err, collection) {
            return callback(err, collection);
          }
        );
      } else {
        return callback(err, collection);
      }
    } else if (shouldStoreHash){
      storeCollectionHash(params, isAggregated, collectionName, function (hashErr) {
        if (hashErr) {
          // There was an error when storing the collection hash
          // Do nothing
          sthLogger.warn(
            sthConfig.LOGGING_CONTEXT.DB_LOG,
            'Error when storing the hash generated as part of the collection name into the database'
          );
        }
        if (!isAggregated) {
          setRawDataUniqueIndex(collection);
        }
        if (shouldTruncate) {
          setTTLPolicy(collection);
        }
        return callback(hashErr, collection);
      });
    } else if (collection &&
      (collection.s.name !== sthConfig.COLLECTION_PREFIX + 'collection_names') && !isAggregated) {
      setRawDataUniqueIndex(collection);
      if (shouldTruncate) {
        setTTLPolicy(collection);
      }
      return callback(err, collection);
    } else {
      return callback(err, collection);
    }
  }

  connection.collection(collectionName, {strict: true},
    function (err, collection) {
      if (err &&
        (err.message === 'Collection ' + collectionName + ' does not exist. Currently in strict mode.') &&
        shouldCreate) {
        if (shouldTruncate && !isAggregated) {
          // Set the size removal policy if required
          if (sthConfig.TRUNCATION_SIZE > 0) {
            var collectionCreationOptions = {
              capped: true,
              size: sthConfig.TRUNCATION_SIZE,
              max: sthConfig.TRUNCATION_MAX || null
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
        dataModel: sthConfig.DATA_MODEL,
        isAggregated: isAggregated,
        service: params.service,
        servicePath: params.servicePath
      };
      switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
          entry.entityId = params.entityId;
          entry.entityType = params.entityType;
          break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
          entry.entityId = params.entityId;
          entry.entityType = params.entityType;
          entry.attrName = params.attrName;
          entry.attrType = params.attrType;
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
  var tempDir = ROOT_PATH + path.sep + sthConfig.TEMPORAL_DIR;
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
    callback.bind(null, null,
      ROOT_PATH + path.sep + sthConfig.TEMPORAL_DIR + path.sep + fileName));
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
  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      findCondition = {
        'entityId': entityId,
        'entityType': entityType,
        'attrName': attrName
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      findCondition = {
        'attrName': attrName
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
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
    if (aggregatedFunction === 'occur') {
      points[i].occur = {};
    } else if (aggregatedFunction === 'min') {
      points[i].min = Number.POSITIVE_INFINITY;
    } else if (aggregatedFunction === 'max') {
      points[i].max = Number.NEGATIVE_INFINITY;
    } else {
      points[i][aggregatedFunction] = 0;
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
    if (aggregatedFunction === 'occur') {
      points[i].occur = {};
    } else if (aggregatedFunction === 'min') {
      points[i].min = Number.POSITIVE_INFINITY;
    } else if (aggregatedFunction === 'max') {
      points[i].max = Number.NEGATIVE_INFINITY;
    } else {
      points[i][aggregatedFunction] = 0;
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
    results[0]._id.origin.getTime() === sthUtils.getOrigin(from, resolution).getTime()) {
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
    results[results.length - 1]._id.origin.getTime() === sthUtils.getOrigin(to, resolution).getTime()) {
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
    'points.samples': 1
  };
  fieldFilter['points.' + aggregatedFunction] = 1;

  var originFilter;
  if (from && to) {
    originFilter = {
      $lte: sthUtils.getOrigin(to, resolution),
      $gte: sthUtils.getOrigin(from, resolution)
    };
  } else if (from) {
    originFilter = {
      $gte: sthUtils.getOrigin(from, resolution)
    };
  } else if (to) {
    originFilter = {
      $lte: sthUtils.getOrigin(to, resolution)
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
      case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
        matchCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
        matchCondition = {
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
        matchCondition = {
          '_id.resolution': resolution
        };
        break;
    }
    if (originFilter) {
      matchCondition['_id.origin'] = originFilter;
    }

    var groupId;
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
        groupId = {
          entityId: '$_id.entityId',
          entityType: '$_id.entityType',
          attrName: '$_id.attrName',
          origin: '$_id.origin',
          resolution: '$_id.resolution'
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
        groupId = {
          attrName: '$_id.attrName',
          origin: '$_id.origin',
          resolution: '$_id.resolution'
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
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
    switch (sthConfig.DATA_MODEL) {
      case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
        findCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType,
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
        findCondition = {
          '_id.attrName': attrName,
          '_id.resolution': resolution
        };
        break;
      case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
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

  var offset = sthUtils.getOffset(resolution, timestamp);

  var aggregateUpdateCondition;
  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      aggregateUpdateCondition = {
        '_id.entityId': entityId,
        '_id.entityType': entityType,
        '_id.attrName': attrName,
        '_id.origin': sthUtils.getOrigin(timestamp, resolution),
        '_id.resolution': resolution,
        'points.offset': offset
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      aggregateUpdateCondition = {
        '_id.attrName': attrName,
        '_id.origin': sthUtils.getOrigin(timestamp, resolution),
        '_id.resolution': resolution,
        'points.offset': offset
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      aggregateUpdateCondition = {
        '_id.origin': sthUtils.getOrigin(timestamp, resolution),
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

  if (sthUtils.getAggregationType(attrValue) === sthConfig.AGGREGATIONS.NUMERIC) {
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
    for (var j = offsetOrigin; j < totalValues; j++) {
      var entry = {
        offset: j,
        samples: 0,
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
  if (sthUtils.getAggregationType(attrValue) === sthConfig.AGGREGATIONS.NUMERIC) {
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
    var offset = sthUtils.getOffset(resolution, recvTime);
    aggregateUpdate4Update = {
      '$set': {
        'attrType': attrType
      },
      '$inc': {
        'points.$.samples': 1
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
 * Returns the update to be used in the MongoDB update operation for the removal of aggregated data
 * @param {object} data Object including the following properties:
 *  - {string} attrType The type of the attribute to aggregate
 *  - {string} attrValue The value of the attribute to aggregate
 *  - {object} notificationInfo Information about the notification
 *  - {string} resolution The resolution
 *  - {date} recvTime The data reception time
 * @returns {Object} The update operation
 */
function getAggregateUpdate4Removal(data) {
  var attrType = data.attrType,
      attrValue = data.attrValue,
      notificationInfo = data.notificationInfo,
      resolution = data.resolution,
      timestamp = data.timestamp;
  var aggregateUpdate4Removal,
    escapedAttrValue = parseFloat(notificationInfo.updates.attrValue);
  if (sthUtils.getAggregationType(notificationInfo.updates.attrValue) === sthConfig.AGGREGATIONS.NUMERIC) {
    aggregateUpdate4Removal = {
      '$inc': {
        'points.$.samples': -1,
        'points.$.sum': -escapedAttrValue,
        'points.$.sum2': -Math.pow(escapedAttrValue, 2)
      },
      '$set': {
        'attrType': attrType,
        'points.$.min': (notificationInfo.newMinValues && notificationInfo.newMinValues[resolution]) ?
          Math.min(parseFloat(notificationInfo.newMinValues[resolution]), parseFloat(attrValue)) :
          parseFloat(attrValue),
        'points.$.max': (notificationInfo.newMaxValues && notificationInfo.newMaxValues[resolution]) ?
          Math.max(parseFloat(notificationInfo.newMaxValues[resolution]), parseFloat(attrValue)) :
          parseFloat(attrValue)
      }
    };
  } else {
    var offset = sthUtils.getOffset(resolution, timestamp);
    aggregateUpdate4Removal = {
      '$set': {
        'attrType': attrType
      },
      '$inc': {
        'points.$.samples': -1
      }
    };
    escapedAttrValue = notificationInfo.updates.attrValue.replace(/\$/g, '\uFF04').replace(/\./g, '\uFF0E');
    aggregateUpdate4Removal.$inc['points.' +
      (offset - (resolution === 'day' || resolution === 'month' || resolution === 'year' ? 1 : 0)) +
      '.occur.' + escapedAttrValue] = -1;
  }
  return aggregateUpdate4Removal;
}

/**
 * Removes previously aggregated data based on the data included in the received notification
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored
 *  - {string} entityId The entity id
 *  - {string} entityType: The entity type
 *  - {string} attrName: The attribute name
 *  - {string} attrType: The attribute type
 *  - {string} attrValue: The attribute value
 *  - {string} resolution: The resolution
 *  - {date} timestamp: The attribute value timestamp
 *  - {object} notificationInfo: Info about the notification
 * @param {Function} callback Function to call once the operation completes
 */
function removePreviouslyAggregatedData(data, callback) {
  // Undo the previously aggregated data if any
  if (data.notificationInfo.updates) {
    data.collection.update(
      getAggregateUpdateCondition(
        {
          entityId: data.entityId,
          entityType: data.entityType,
          attrName: data.attrName,
          resolution: data.resolution,
          timestamp: data.timestamp
        }
      ),
      getAggregateUpdate4Removal({
        attrType: data.attrType,
        attrValue: data.attrValue,
        notificationInfo: data.notificationInfo,
        resolution: data.resolution,
        timestamp: data.timestamp
      }),
      {
        writeConcern: {
          w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
        }
      },
      function (err) {
        if (callback) {
          process.nextTick(callback.bind(null, err));
        }
      }
    );
  } else {
    return process.nextTick(callback);
  }
}

/**
 * Updates the aggregated data based on the included in the received notification
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored
 *  - {string} entityId The entity id
 *  - {string} entityType: The entity type
 *  - {string} attrName: The attribute name
 *  - {string} attrType: The attribute type
 *  - {string} attrValue: The attribute value
 *  - {string} resolution: The resolution
 *  - {date} timestamp: The attribute value timestamp
 *  - {object} notificationInfo: Info about the notification
 * @param {Function} callback Function to call once the operation completes
 */
function updateAggregatedData(data, callback) {
  data.collection.update(
    getAggregateUpdateCondition(
      {
        entityId: data.entityId,
        entityType: data.entityType,
        attrName: data.attrName,
        resolution: data.resolution,
        timestamp: data.timestamp
      }
    ),
    getAggregateUpdate4Update(data.attrType, data.attrValue, data.resolution, data.timestamp),
    {
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
      }
    },
    function (err) {
      if (err && callback) {
        return process.nextTick(callback.bind(null, err));
      }
      removePreviouslyAggregatedData(data, callback);
    }
  );
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
 *  - {object} notificationInfo: Info about the notification
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
        return process.nextTick(callback.bind(null, err));
      } else {
        updateAggregatedData(data, callback);
      }
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
    attribute = data.attribute,
    notificationInfo = data.notificationInfo;


  function onCompletion(err) {
    error = error || err;
    if (++counter === sthConfig.AGGREGATION_BY.length) {
      callback(error);
    }
  }

  var timestamp = sthUtils.getAttributeTimestamp(attribute, recvTime);

  sthConfig.AGGREGATION_BY.forEach(function (entry) {
    storeAggregatedData4Resolution(
      {
        collection: collection,
        entityId: entityId,
        entityType: entityType,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value,
        resolution: entry,
        timestamp: timestamp,
        notificationInfo: notificationInfo
      },
      onCompletion
    );
  });
}

/**
 * Updates already registered raw data
 * @param collection The collection where the raw data is stored
 * @param oldRawData Old raw data to update
 * @param newRawData The new raw data received
 * @param callback The callback to notify once the processing completes
 */
function updateRawData(collection, oldRawData, newRawData, callback) {
  collection.update(
    oldRawData,
    newRawData,
    {
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
      }
    },
    function (err) {
      if (callback) {
        process.nextTick(callback.bind(null, err));
      }
    }
  );
}

/**
 * Insert new raw data in the database
 * @param collection The collection where the raw data is stored
 * @param newRawData The new raw data received
 * @param callback The callback to notify once the processing completes
 */
function insertRawData(collection, newRawData, callback) {
  collection.insert(
    newRawData,
    {
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
      }
    },
    function (err) {
      if (callback) {
        process.nextTick(callback.bind(null, err));
      }
    }
  );
}

/**
 * Stores the raw data for a new event (attribute value)
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored in
 *  - {date} recvTime The date the event arrived
 *  - {string} entityId The entity id associated to updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 *  - {object} notificationInfo Information about the notification including the following properties:
 *  - {object} updates The database entry the notification updates, if any
 * @param {Function} callback Function to call once the operation completes
 */
function storeRawData(data, callback) {
  var collection = data.collection,
      recvTime = data.recvTime,
      entityId = data.entityId,
      entityType = data.entityType,
      attribute = data.attribute,
      notificationInfo = data.notificationInfo;

  var timestamp = sthUtils.getAttributeTimestamp(attribute, recvTime);

  var newRawData;
  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      newRawData = {
        recvTime: timestamp,
        entityId: entityId,
        entityType: entityType,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      newRawData = {
        recvTime: timestamp,
        attrName: attribute.name,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      newRawData = {
        recvTime: timestamp,
        attrType: attribute.type,
        attrValue: attribute.value
      };
      break;
  }

  if (notificationInfo && notificationInfo.updates) {
    // The raw data to store is a raw data update
    updateRawData(collection, notificationInfo.updates, newRawData, callback);
  } else {
    insertRawData(collection, newRawData, callback);
  }
}

/**
 * Returns the find() condition to use to get the new minimum and maximum values after some raw data update
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {string} entityId The entity id associated to updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 *  - {Date} timestamp The timestamp associated to the updated raw data
 * @param {string} The resolution for which the find() condition should be returned
 * @return {object} The find() condition to use to get the new minimum and maximum values after some raw data update
 */
function getNewMinMaxCondition(data, resolution) {
  var entityId = data.entityId,
      entityType = data.entityType,
      attrName = data.attribute.name,
      timestamp = data.timestamp;

  var findCondition;
  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      findCondition = {
        entityId: entityId,
        entityType: entityType,
        attrName: attrName,
        recvTime: {
          $gte: sthUtils.getOriginStart(timestamp, resolution),
          $lte: sthUtils.getOriginEnd(timestamp, resolution),
          $ne: timestamp
        }
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      findCondition = {
        attrName: attrName,
        recvTime: {
          $gte: sthUtils.getOriginStart(timestamp, resolution),
          $lte: sthUtils.getOriginEnd(timestamp, resolution),
          $ne: timestamp
        }
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      findCondition = {
        recvTime: {
          $ne: timestamp,
          $gte: sthUtils.getOriginStart(timestamp, resolution),
          $lte: sthUtils.getOriginEnd(timestamp, resolution)
        }
      };
      break;
  }
  return findCondition;
}

/**
 * Asynchronously returns the new maximum values for the resolutions of interest after some raw data update
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {string} entityId The entity id associated to the updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 *  - {Date} timestamp The timestamp associated to the updated raw data
 * @param callback The callback to notify in case of error or once the new maximum value has been calculated
 */
function getNewMaxValues(data, callback) {
  function getNewMaxValue(data, resolution, callback) {
    data.collection.find(
      getNewMinMaxCondition(data, resolution)
    ).sort(
      {
        attrValue: -1
      }
    ).toArray(
      function (err, restArray) {
        if (callback) {
          return process.nextTick(
            callback.bind(null, err, (restArray && restArray.length) ? restArray[0].attrValue : null));
        }
      }
    );
  }
  var getNewMaxValue4Resolutions = {};
  for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
    getNewMaxValue4Resolutions[sthConfig.AGGREGATION_BY[i]] =
      getNewMaxValue.bind(null, data, sthConfig.AGGREGATION_BY[i]);
  }
  async.parallel(
    getNewMaxValue4Resolutions,
    function (err, result) {
      if (callback) {
        return process.nextTick(callback.bind(null, err, result));
      }
    }
  );
}

/**
 * Asynchronously returns the new minimum values for the resolutions of interest after some raw data update
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {string} entityId The entity id associated to the updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 *  - {Date} timestamp The timestamp associated to the updated raw data
 * @param callback The callback to notify in case of error or once the new maximum value has been calculated
 */
function getNewMinValues(data, callback) {
  function getNewMinValue(data, resolution, callback) {
    data.collection.find(
      getNewMinMaxCondition(data, resolution)
    ).sort(
      {
        attrValue: -1
      }
    ).toArray(
      function (err, restArray) {
        if (callback) {
          return process.nextTick(
            callback.bind(null, err, (restArray && restArray.length) ? restArray[0].attrValue : null));
        }
      }
    );
  }
  var getNewMinValue4Resolutions = {};
  for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
    getNewMinValue4Resolutions[sthConfig.AGGREGATION_BY[i]] =
      getNewMinValue.bind(null, data, sthConfig.AGGREGATION_BY[i]);
  }
  async.parallel(
    getNewMinValue4Resolutions,
    function (err, result) {
      if (callback) {
        return process.nextTick(callback.bind(null, err, result));
      }
    }
  );
}

/**
 * Generates the notification info from the data received in the received notification and the result of checking
 *  if the data has already been registered
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored in
 *  - {date} recvTime The date the event arrived
 *  - {string} entityId The entity id associated to the updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 * @param {object} searchResult The result of searching for the received raw data in the database
 * @param {Function} callback Function to call once the operation completes
 */
function generateNotificationInfo(data, searchResult, callback) {
  if (searchResult) {
    if (_.isEqual(searchResult.attrValue, data.attribute.value)) {
      // The notification is already registered
      return process.nextTick(callback.bind(null, null, {exists: searchResult}));
    } else {
      // The notification is an already existent data update
      if (sthUtils.getAggregationType(searchResult.attrValue) === sthConfig.AGGREGATIONS.NUMERIC) {
        getNewMaxValues(data, function (err, newMaxValues) {
          if (err && callback) {
            return process.nextTick(callback.bind(null, err, {updates: searchResult}));
          }
          if (newMaxValues) {
            getNewMinValues(data, function (err, newMinValues) {
              if (err && callback) {
                return process.nextTick(callback.bind(null, err, {updates: searchResult}));
              }
              return process.nextTick(
                callback.bind(
                  null, err, {updates: searchResult, newMinValues: newMinValues, newMaxValues: newMaxValues}));
            });
          } else {
            return process.nextTick(callback.bind(null, err, {updates: searchResult}));
          }
        });
      } else {
        return process.nextTick(callback.bind(null, null, {updates: searchResult}));
      }
    }
  } else {
    // The notification is an new data insertion
    return process.nextTick(callback.bind(null, null, {inserts: true}));
  }
}

/**
 * Returns information about the notification such as if the notification aims to insert new data,
 *  update already existent data or if it corresponds to already registered data
 * @param {object} data The data to be stored. It is an object including the following properties:
 *  - {object} collection: The collection where the data should be stored in
 *  - {date} recvTime The date the event arrived
 *  - {string} entityId The entity id associated to the updated attribute
 *  - {string} entityType The entity type associated to the updated attribute
 *  - {object} attribute The updated attribute
 * @param {Function} callback Function to call once the operation completes
 */
function getNotificationInfo(data, callback) {
  var collection = data.collection,
    recvTime = data.recvTime,
    entityId = data.entityId,
    entityType = data.entityType,
    attribute = data.attribute;

  var timestamp = sthUtils.getAttributeTimestamp(attribute, recvTime);
  data.timestamp = timestamp;

  var findCondition;
  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      findCondition = {
        recvTime: timestamp,
        entityId: entityId,
        entityType: entityType,
        attrName: attribute.name,
        attrType: attribute.type
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      findCondition = {
        recvTime: timestamp,
        attrName: attribute.name,
        attrType: attribute.type
      };
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      findCondition = {
        recvTime: timestamp,
        attrType: attribute.type
      };
      break;
  }

  collection.findOne(
    findCondition,
    function (err, result) {
      if (err && callback) {
        return process.nextTick(callback.bind(null, err));
      }
      generateNotificationInfo(data, result, callback);
    }
  );
}

/**
 * Drops a collection
 * @param {string} collectionName The name of the collection to drop
 * @param {string} service The service associated to the collection to drop
 * @param {function} callback The callback to call with error or the result of the operation
 */
function dropCollection(collectionName, service, callback) {
  db.db(getDatabaseName(service)).dropCollection(collectionName, callback);
}

/**
 * Drops a hashed collection in case the information provided in the data is correct
 * @param {object} hashedCollectionData It is an object including the following properties:
 *  - {object} hashMappingResult The result of searching for the collection in the hash mapping collection
 *  - {string} collectionName The name of the collection
 *  - {object} hashCollection The collection which holds the mapping between hashes and service, service path,
 *      entity and attribute data
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @param callback The callback to call with error or the result of the operation
 */
function dropHashedCollectionIfComplies(hashedCollectionData, data, options, callback) {
  var hashMappingResult = hashedCollectionData.hashMappingResult,
      collectionName = hashedCollectionData.collectionName,
      hashCollection = hashedCollectionData.hashCollection,
      service = data.service,
      servicePath = data.servicePath,
      entityId = data.entityId,
      entityType = data.entityType,
      attrName = data.attrName,
      isAggregated = options.isAggregated;

  if (hashMappingResult && hashMappingResult.isAggregated === isAggregated &&
    hashMappingResult.service === service && hashMappingResult.servicePath === servicePath &&
    (entityId ? hashMappingResult.entityId === entityId : true) &&
    (entityType ? hashMappingResult.entityType === entityType : true) &&
    (attrName ? hashMappingResult.attrName === attrName : true)) {
    db.db(getDatabaseName(service)).dropCollection(
      collectionName,
      function(err) {
        if (err) {
          return process.nextTick(callback.bind(null, err));
        }
        hashCollection.remove(
          {
            _id: collectionName
          },
          {
            writeConcern: {
              w: !isNaN(sthConfig.WRITE_CONCERN) ?
                parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
            }
          },
          callback
        );
      }
    );
  } else {
    process.nextTick(callback);
  }
}

/**
 * Drops a hashed collection in case the information provided in the data is correct
 * @param {string} collectionName The hashed name of the collection to drop
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @param callback The callback to call with error or the result of the operation
 */
function dropHashedCollection(collectionName, data, options, callback) {
  var service = data.service;

  getCollection(
    {
      service: service,
      collection: sthConfig.COLLECTION_PREFIX + 'collection_names'
    },
    {
      isAggregated: false,
      shouldCreate: false,
      shouldStoreHash: false,
      shouldTruncate: false
    },
    function (err, hashCollection) {
      if (err) {
        return process.nextTick(callback.bind(null, err));
      }
      hashCollection.findOne(
        {
          _id: collectionName
        },
        function(err, result) {
          if (err) {
            return process.nextTick(callback.bind(null, err));
          }
          dropHashedCollectionIfComplies(
            {
              hashMappingResult: result,
              collectionName: collectionName,
              hashCollection: hashCollection
            },
            data,
            options,
            callback
          );
        }
      );
    }
  );
}

/**
 * Returns the find condition to apply for data removal
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @return {object} The find condition to apply for data removal
 */
function getFindCondition4DataRemoval(data, options) {
  var entityId = data.entityId,
      entityType = data.entityType,
      attrName = data.attrName,
      isAggregated = options.isAggregated,
      findCondition;

  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      if (isAggregated) {
        findCondition = {
          '_id.entityId': entityId,
          '_id.entityType': entityType
        };
        if (attrName) {
          findCondition['_id.attrName'] = attrName;
        }
      } else {
        findCondition = {
          entityId: entityId,
          entityType: entityType
        };
        if (attrName) {
          findCondition.attrName = attrName;
        }
      }
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      if (isAggregated) {
        findCondition = {
          '_id.attrName': attrName
        };
      } else {
        findCondition = {
          attrName: attrName
        };
      }
      break;
  }
  return findCondition;
}

/**
 * Removes data from a collection according to the provided data and options
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @param callback The callback to call with possible errors and the result of the operation
 */
function removeDataFromCollection(data, options, callback) {
  var service = data.service,
      servicePath = data.servicePath,
      entityId = data.entityId,
      entityType = data.entityType,
      isAggregated = options.isAggregated;

  getCollection(
    {
      service: service,
      servicePath: servicePath,
      entityId: entityId,
      entityType: entityType
    },
    {
      isAggregated: isAggregated,
      shouldCreate: false,
      shouldStoreHash: false,
      shouldTruncate: false
    },
    function (err, collection) {
      if (err) {
        if (callback) {
          return process.nextTick(callback.bind(null, err));
        }
      } else {
        collection.remove(
          getFindCondition4DataRemoval(data, options),
          {
            writeConcern: {
              w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
            }
          },
          callback
        );
      }
    }
  );
}

/**
 * Drops collections from the passed ones if applicable according to the passed data and options
 * @param collections
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @param callback The callback to call with possible errors and the result of the operation
 */
function dropCollectionsFromList(collections, data, options, callback) {
  var service = data.service,
      servicePath = data.servicePath,
      entityId = data.entityId,
      entityType = data.entityType,
      attrName = data.attrName,
      isAggregated = options.isAggregated,
      collectionNameOptions = {
        service: service,
        servicePath: servicePath,
        entityId: entityId,
        entityType: entityType,
        attrName: attrName
      };

  var collectionName = isAggregated ?
    getCollectionName4Aggregated(collectionNameOptions) : getCollectionName4Events(collectionNameOptions);

  var dropCollectionFunctions = [];
  collections.forEach(function (collection) {
    if (sthConfig.SHOULD_HASH) {
      dropCollectionFunctions.push(async.apply(dropHashedCollection, collection.collectionName, data, options));
    } else if (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH ||
      (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY && entityId) ||
      (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY && attrName)) {
      if (collection.collectionName === collectionName) {
        dropCollectionFunctions.push(async.apply(dropCollection, collection.collectionName, service));
      }
    } else if (isAggregated) {
      if (collection.collectionName.indexOf('.aggr') >= 0 &&
        collection.collectionName.indexOf(collectionName.slice(0, collectionName.indexOf('undefined'))) >= 0) {
        dropCollectionFunctions.push(async.apply(dropCollection, collection.collectionName, service));
      }
    } else {
      if (collection.collectionName.indexOf('.aggr') < 0 &&
        collection.collectionName.indexOf(collectionName.slice(0, collectionName.indexOf('undefined'))) >= 0) {
        dropCollectionFunctions.push(async.apply(dropCollection, collection.collectionName, service));
      }
    }
  });

  async.parallel(
    dropCollectionFunctions,
    callback
  );
}

/**
 * Removes data dropping the appropriate collections depending on the passed data and options
 * @param {object} data It is an object including the following properties:
 *  - {boolean} aggregated Flag indicating if the collection to drop refers to a aggregated data one or
 *      not (to a raw data one)
 *  - {string} service The service associated to the collection to drop
 *  - {string} servicePath The service path to the collection to drop
 *  - {string} entityId The entity id to the collection to drop
 *  - {string} entityType The entity type to the collection to drop
 *  - {string} attrName The attribute name to the collection to drop
 * @param {object} options It is an object including the following properties:
 *  - {boolean} isAggregated Flag indicating if the operation refers to aggregated data. Raw data otherwise
 * @param callback The callback to call with possible errors and the result of the operation
 */
function removeDataDroppingCollections(data, options, callback) {
  var service = data.service,
      databaseName = getDatabaseName(service),
      database = db.db(databaseName);

  database.collections(function (err, collections) {
    if (err) {
      if (callback) {
        return process.nextTick(callback.bind(null, err));
      }
    } else {
      dropCollectionsFromList(collections, data, options, callback);
    }
  });
}

/**
 * Removes the raw data associated to the attributes specified in the provided data
 * @param {object} data It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} entityId The entity id
 *  - {string} entityType The entity type
 *  - {string} attrName The attribute name. In case no attribute name is provided, all the attributes of the
 *      provided entity are removed
 * @param callback The callback to call with error or the result of the operation
 */
function removeRawData(data, callback) {
  if ((sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH &&
    (data.entityId || data.attrName)) ||
    (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY && data.attrName)) {
    removeDataFromCollection(data, {isAggregated: false}, callback);
  } else {
    removeDataDroppingCollections(data, {isAggregated: false}, callback);
  }
}

/**
 * Removes the aggregated data associated to the attributes specified in the provided data
 * @param {object} data It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} entityId The entity id
 *  - {string} entityType The entity type
 *  - {string} attrName The attribute name. In case no attribute name is provided, all the attributes of the
 *      provided entity are removed
 * @param callback The callback to call with error or the result of the operation
 */
function removeAggregatedData(data, callback) {
  if ((sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH &&
    (data.entityId || data.attrName)) ||
    (sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY && data.attrName)) {
    removeDataFromCollection(data, {isAggregated: true}, callback);
  } else {
    removeDataDroppingCollections(data, {isAggregated: true}, callback);
  }
}

/**
 * Removes the attributes specified in the provided data
 * @param {object} data It is an object including the following properties:
 *  - {string} service The service
 *  - {string} servicePath The service path
 *  - {string} entityId The entity id
 *  - {string} entityType The entity type
 *  - {string} attrName The attribute name. In case no attribute name is provided, all the attributes of the
 *    provided entity are removed
 * @param callback The callback to call with error or the result of the operation
 */
function removeData(data, callback) {
  var dataRemovalFunctions = [];
  if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH) {
    dataRemovalFunctions.push(
      async.apply(removeRawData, data),
      async.apply(removeAggregatedData, data)
    );
  } else if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_RAW) {
    dataRemovalFunctions.push(
      async.apply(removeRawData, data)
    );
  } else if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_AGGREGATED) {
    dataRemovalFunctions.push(
      async.apply(removeAggregatedData, data)
    );
  }
  async.parallel(
    dataRemovalFunctions,
    callback
  );
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
  connect: connect,
  closeConnection: closeConnection,
  getDatabaseName: getDatabaseName,
  getCollectionName4Events: getCollectionName4Events,
  getCollectionName4Aggregated: getCollectionName4Aggregated,
  getHashSizeInBytes: getHashSizeInBytes,
  generateHash: generateHash,
  storeCollectionHash: storeCollectionHash,
  getCollection: getCollection,
  getRawData: getRawData,
  getAggregatedData: getAggregatedData,
  getAggregateUpdateCondition: getAggregateUpdateCondition,
  getAggregatePrepopulatedData: getAggregatePrepopulatedData,
  storeAggregatedData: storeAggregatedData,
  storeAggregatedData4Resolution: storeAggregatedData4Resolution,
  storeRawData: storeRawData,
  getNotificationInfo: getNotificationInfo,
  removeData: removeData,
  isAggregated: isAggregated
};
