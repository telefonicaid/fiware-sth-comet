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
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
var sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
var sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
var expect = require('expect.js');

var DATABASE_NAME = sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE);
var COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};
var VERY_LONG_COLLECTION_NAME_PARAMS = {
  service: sthConfig.DEFAULT_SERVICE,
  servicePath: sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH +
    sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH + sthConfig.DEFAULT_SERVICE_PATH +
    sthConfig.DEFAULT_SERVICE_PATH,
  entityId: sthTestConfig.ENTITY_ID,
  entityType: sthTestConfig.ENTITY_TYPE,
  attrName: sthTestConfig.ATTRIBUTE_NAME,
  attrType: sthTestConfig.ATTRIBUTE_TYPE
};

/**
 * Expectations for the collection name generation
 * @param  {string} collectionNameParams The collection name params
 * @param  {string} collectionName       The collection name
 * @param  {string} dataType             The data type
 * @param  {string} dataModel            The data model
 */
function expectCollectionName(collectionNameParams, collectionName, dataType, dataModel) {
  var collectionName4Events, finalCollectionName;
  switch (dataModel) {
    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
      collectionName4Events =
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.servicePath) :
          collectionNameParams.servicePath) +
          sthConfig.NAME_SEPARATOR +
          (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.entityId) :
            collectionNameParams.entityId) +
          (collectionNameParams.entityType ?
            sthConfig.NAME_SEPARATOR +
              (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.entityType) :
                collectionNameParams.entityType) :
            '') +
          sthConfig.NAME_SEPARATOR +
          (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.attrName) :
            collectionNameParams.attrName);
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
      collectionName4Events =
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.servicePath) :
          collectionNameParams.servicePath) +
          sthConfig.NAME_SEPARATOR +
          (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.entityId) :
            collectionNameParams.entityId) +
          (collectionNameParams.entityType ?
            sthConfig.NAME_SEPARATOR +
              (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.entityType) :
                collectionNameParams.entityType) :
            '');
      break;
    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
      collectionName4Events = (sthConfig.NAME_ENCODING ?
        sthDatabaseNameCodec.encodeCollectionName(collectionNameParams.servicePath) :
        collectionNameParams.servicePath);
      break;
    default:
      throw new Error(dataModel + ' is not a valid data model value');
  }

  if (sthConfig.SHOULD_HASH) {
    finalCollectionName = (sthConfig.NAME_ENCODING ?
      sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX) :
      sthConfig.COLLECTION_PREFIX) +
      sthDatabaseNaming.generateHash(collectionName4Events, sthDatabaseNaming.getHashSizeInBytes(DATABASE_NAME)) +
      (dataType === sthTestConfig.DATA_TYPES.AGGREGATED ?
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName('.aggr') : '.aggr') : '');
  } else {
    finalCollectionName = (sthConfig.NAME_ENCODING ?
      sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX) :
      sthConfig.COLLECTION_PREFIX) +
      collectionName4Events +
      (dataType === sthTestConfig.DATA_TYPES.AGGREGATED ?
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName('.aggr') : '.aggr') : '');
  }
  expect(collectionName).to.equal(finalCollectionName);
}

/**
 * Battery of tests to check the collection name generation
 * @param  {Boolean} shouldHash Flag indicating if collection names should be hashed
 */
function collectionNameTests(shouldHash) {
  var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL,
      ORIGINAL_SHOULD_HASH = sthConfig.SHOULD_HASH,
      dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
      dataModels = Object.keys(sthConfig.DATA_MODELS);

  before(function() {
    sthConfig.SHOULD_HASH = shouldHash;
  });

  dataModels.forEach(function(dataModel) {
    describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
      before(function() {
        sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
      });

      dataTypes.forEach(function(dataType) {
        it('should compose the collection name for ' + sthTestConfig.DATA_TYPES[dataType] + ' data',
          function(done) {
            var collectionName = sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW ?
              sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) :
              sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS);
            expectCollectionName(
              COLLECTION_NAME_PARAMS, collectionName, sthTestConfig.DATA_TYPES[dataType],
              sthConfig.DATA_MODELS[dataModel]);
            done();
          }
        );

        it('should compose (or not) the collection name for ' +
          sthTestConfig.DATA_TYPES[dataType] + ' data if very long service path and hashing is enabled (or disabled)',
          function(done) {
            var collectionName = sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW ?
              sthDatabaseNaming.getRawCollectionName(VERY_LONG_COLLECTION_NAME_PARAMS) :
              sthDatabaseNaming.getAggregatedCollectionName(VERY_LONG_COLLECTION_NAME_PARAMS);
            if (sthConfig.SHOULD_HASH) {
              expectCollectionName(
                VERY_LONG_COLLECTION_NAME_PARAMS, collectionName, sthTestConfig.DATA_TYPES[dataType],
                sthConfig.DATA_MODELS[dataModel]);
            } else {
              expect(collectionName).to.be(null);
            }
            done();
          }
        );
      });

      after(function() {
        sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
      });
    });
  });

  after(function() {
    sthConfig.SHOULD_HASH = ORIGINAL_SHOULD_HASH;
  });
}

describe('sthDatabaseNaming tests', function() {
  describe('collection names', function() {
    describe('hashing enabled', collectionNameTests.bind(null, true));

    describe('hashing disabled', collectionNameTests.bind(null, false));
  });
});
