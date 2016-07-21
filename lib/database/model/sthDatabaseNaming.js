/*
 * Copyright 2016 Telefónica Investigación y Desarrollo, S.A.U
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

var ROOT_PATH = require('app-root-path');
var sthLogger = require('logops');
var bytesCounter = require('bytes-counter');
var crypto = require('crypto');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');

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
 * Returns the (encoded, if configured this way) database name associated to a service
 * @param  {string} service The service
 * @return {string}         The (encoded, if configured this way) database name
 */
function getDatabaseName(service) {
  if (sthConfig.NAME_ENCODING === true) {
    return sthDatabaseNameCodec.encodeDatabaseName(sthConfig.DB_PREFIX + service);
  }
  return sthConfig.DB_PREFIX + service;
}

/**
 * Returns the service associated to a (encoded, if configured this way) database name
 * @param  {string} databaseName The (encoded, if configured this way) database name
 * @return {string}              The associated service
 */
function getService(databaseName) {
  var decodedDatabaseName = (sthConfig.NAME_ENCODING ?
    sthDatabaseNameCodec.decodeDatabaseName(databaseName) :
    databaseName);

  return decodedDatabaseName.substring(sthConfig.DB_PREFIX.length);
}

/**
 * Returns the available hash size in bytes to be used as part of the collection names
 *  based on the database name, database name prefix and collection name prefix
 * @param  {String} databaseName The database name
 * @return {Number}              The size of the hash in bytes
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
 * Returns the size of the namespace (for the collection where the aggregated data is stored) in bytes for certain
 *  database name and the collection name where the raw data is stored
 * @param  {String} datebaseName          The database name
 * @param  {String} rawCollectionName The name of the collection where the raw data is stored
 * @return {Number} The size in bytes of the namespace (for the collection where the aggregated data is stored)
 *  in bytes
 */
function getNamespaceSizeInBytes(datebaseName, rawCollectionName) {
  return bytesCounter.count(datebaseName) + bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
    bytesCounter.count(rawCollectionName) + bytesCounter.count('.aggr');
}

/**
 * Generates a hash based on an input and a maximum number of bytes
 * @param {String} input The input to generate the hash from
 * @param {Number} limit The maximum number of bytes of the hash
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
 * Returns the name of the collection which will store the raw events
 * @param  {Object}  params   Params object including the following properties:
 *                              - service: The service
 *                              - servicePath: The service path
 *                              - entityId: The entity id
 *                              - entityType: The entity type
 *                              - attrName: The attribute name
 * @returns {String}          The raw data collection name
 */
function getRawCollectionName(params) {
  var collectionName4Events;
  var databaseName = getDatabaseName(params.service),
      servicePath = params.servicePath,
      entityId = params.entityId,
      entityType = params.entityType,
      attrName = params.attrName;

  switch (sthConfig.DATA_MODEL) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      collectionName4Events = (sthConfig.NAME_ENCODING ?
        sthDatabaseNameCodec.encodeCollectionName(servicePath) :
        servicePath);
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      collectionName4Events =
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(servicePath) : servicePath) +
          sthConfig.NAME_SEPARATOR +
          (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(entityId) : entityId) +
          (entityType ?
            sthConfig.NAME_SEPARATOR +
              (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(entityType) : entityType) :
            '');
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
    collectionName4Events =
      (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(servicePath) : servicePath) +
        sthConfig.NAME_SEPARATOR +
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(entityId) : entityId) +
        (entityType ?
          sthConfig.NAME_SEPARATOR +
            (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(entityType) : entityType) :
          '') +
        sthConfig.NAME_SEPARATOR +
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(attrName) : attrName);
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
        'the (encoded) service ("' + sthDatabaseNameCodec.encodeDatabaseName(getService(databaseName)) + '" = ' +
        bytesCounter.count(sthDatabaseNameCodec.encodeDatabaseName(getService(databaseName))) +
        ' bytes) and/or the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' +
        bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
        ' bytes) to save more bytes for the hash'
      );
      return null;
    }
    return (sthConfig.NAME_ENCODING ?
      sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX) :
      sthConfig.COLLECTION_PREFIX) +
      generateHash(collectionName4Events, limit);
  } else if (getNamespaceSizeInBytes(databaseName, collectionName4Events) > MAX_NAMESPACE_SIZE_IN_BYTES) {
    sthLogger.warn(
      sthConfig.LOGGING_CONTEXT.DB_LOG,
      'The size in bytes of the namespace for storing the aggregated data ("' + databaseName + '" plus "' +
      sthConfig.COLLECTION_PREFIX + collectionName4Events + '.aggr", ' +
      getNamespaceSizeInBytes(databaseName, collectionName4Events) +
      ' bytes)' + ' is bigger than ' + MAX_NAMESPACE_SIZE_IN_BYTES + ' bytes, ' +
      'please reduce the size of the DB_PREFIX ("' + sthConfig.DB_PREFIX + '" = ' +
      bytesCounter.count(sthConfig.DB_PREFIX) + ' bytes), ' +
      'the (encoded) service ("' + sthDatabaseNameCodec.encodeDatabaseName(getService(databaseName)) + '" = ' +
      bytesCounter.count(sthDatabaseNameCodec.encodeDatabaseName(getService(databaseName))) +
      ' bytes), the COLLECTION_PREFIX ("' + sthConfig.COLLECTION_PREFIX + '" = ' +
      bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
      ' bytes), the entity id ("' + entityId + '" = ' + bytesCounter.count(entityId) +
      ' bytes) and/or the entity type ("' +
      entityType + '" = ' + bytesCounter.count(entityType) + ' bytes) to make the namespace fit in the available ' +
      'bytes'
    );
    return null;
  } else {
    return (sthConfig.NAME_ENCODING ?
      sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX) + collectionName4Events :
      sthConfig.COLLECTION_PREFIX + collectionName4Events);
  }
}

/**
* Returns the name of the collection which will store the aggregated data
* @param  {Object}  params   Params object including the following properties:
*                              - service: The service
*                              - servicePath: The service path
*                              - entityId: The entity id
*                              - entityType: The entity type
*                              - attrName: The attribute name
* @returns {String}          The aggregated data collection name
 */
function getAggregatedCollectionName(params) {
  var collectionName4Events = getRawCollectionName(params);
  if (collectionName4Events) {
    return collectionName4Events +
      (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName('.aggr') : '.aggr');
  } else {
    return null;
  }
}

module.exports = {
  getDatabaseName: getDatabaseName,
  getService: getService,
  generateHash: generateHash,
  getHashSizeInBytes: getHashSizeInBytes,
  getRawCollectionName: getRawCollectionName,
  getAggregatedCollectionName: getAggregatedCollectionName
};
