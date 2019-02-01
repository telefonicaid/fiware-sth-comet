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
var sthDatabaseNameMapper = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapper');
var sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
var sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
var expect = require('expect.js');

var INVALID_SERVICE = sthConfig.DEFAULT_SERVICE.replace(/s/g, 'S');
var VERY_LONG_SERVICE =
    INVALID_SERVICE + INVALID_SERVICE + INVALID_SERVICE + INVALID_SERVICE + INVALID_SERVICE + INVALID_SERVICE;
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
    servicePath:
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH +
        sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME,
    attrType: sthTestConfig.ATTRIBUTE_TYPE
};

/**
 * Expectations for the database name generation
 * @param  {string} service      The service
 * @param  {string} databaseName The database name
 */
function expectDatabaseName(service, databaseName) {
    var newService, finalDatabaseName;
    if (sthConfig.NAME_MAPPING) {
        newService = sthDatabaseNameMapper.mapService(service);
    }
    if (sthConfig.NAME_ENCODING) {
        newService = sthDatabaseNameCodec.encodeDatabaseName(newService || service);
    }
    newService = newService || service;

    finalDatabaseName =
        (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeDatabaseName(sthConfig.DB_PREFIX) : sthConfig.DB_PREFIX) +
        newService;

    expect(finalDatabaseName).to.equal(databaseName);
}

/**
 * Expectations for the collection name generation
 * @param  {string} collectionNameParams The collection name params
 * @param  {string} collectionName       The collection name
 * @param  {string} dataType             The data type
 * @param  {string} dataModel            The data model
 */
function expectCollectionName(collectionNameParams, collectionName, dataType, dataModel) {
    var collectionName4Events, finalCollectionName;
    var newServicePath, newEntityId, newEntityType, newAttrName;
    if (sthConfig.NAME_MAPPING) {
        newServicePath = sthDatabaseNameMapper.mapServicePath(
            collectionNameParams.service,
            collectionNameParams.servicePath
        );
        newEntityId = sthDatabaseNameMapper.mapEntityName(
            collectionNameParams.service,
            collectionNameParams.servicePath,
            collectionNameParams.entityId
        );
        newEntityType = sthDatabaseNameMapper.mapEntityType(
            collectionNameParams.service,
            collectionNameParams.servicePath,
            collectionNameParams.entityType
        );
        newAttrName = sthDatabaseNameMapper.mapAttributeName(
            collectionNameParams.service,
            collectionNameParams.servicePath,
            collectionNameParams.entityId,
            collectionNameParams.attrName
        );
    }
    if (sthConfig.NAME_ENCODING) {
        newServicePath = sthDatabaseNameCodec.encodeCollectionName(newServicePath || collectionNameParams.servicePath);
        newEntityId = sthDatabaseNameCodec.encodeCollectionName(newEntityId || collectionNameParams.entityId);
        newEntityType = sthDatabaseNameCodec.encodeCollectionName(newEntityType || collectionNameParams.entityType);
        newAttrName = sthDatabaseNameCodec.encodeCollectionName(newAttrName || collectionNameParams.attrName);
    }
    newServicePath = newServicePath || collectionNameParams.servicePath;
    newEntityId = newEntityId || collectionNameParams.entityId;
    newEntityType = newEntityType || collectionNameParams.entityType;
    newAttrName = newAttrName || collectionNameParams.attrName;

    switch (dataModel) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            collectionName4Events =
                newServicePath +
                sthConfig.NAME_SEPARATOR +
                newEntityId +
                (newEntityType ? sthConfig.NAME_SEPARATOR + newEntityType : '') +
                sthConfig.NAME_SEPARATOR +
                newAttrName;
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            collectionName4Events =
                newServicePath +
                sthConfig.NAME_SEPARATOR +
                newEntityId +
                (newEntityType ? sthConfig.NAME_SEPARATOR + newEntityType : '');
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            collectionName4Events = newServicePath;
            break;
        default:
            throw new Error(dataModel + ' is not a valid data model value');
    }

    finalCollectionName =
        (sthConfig.NAME_ENCODING
            ? sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX)
            : sthConfig.COLLECTION_PREFIX) +
        collectionName4Events +
        (dataType === sthTestConfig.DATA_TYPES.AGGREGATED
            ? sthConfig.NAME_ENCODING
                ? sthDatabaseNameCodec.encodeCollectionName('.aggr')
                : '.aggr'
            : '');

    expect(finalCollectionName).to.equal(collectionName);
}

/**
 * Battery of tests to check the database name generation
 */
function databaseNameTests() {
    var ORIGINAL_NAME_MAPPING = sthConfig.NAME_MAPPING,
        ORIGINAL_NAME_ENCODING = sthConfig.NAME_ENCODING;

    ['name mapping and encoding', 'name mapping', 'name encoding', 'no mapping or encoding'].forEach(function(
        mechanism
    ) {
        describe(mechanism, function() {
            before(function() {
                switch (mechanism) {
                    case 'name mapping and encoding':
                        sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
                        sthConfig.NAME_ENCODING = true;
                        break;
                    case 'name mapping':
                        sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
                        sthConfig.NAME_ENCODING = false;
                        break;
                    case 'name encoding':
                        sthConfig.NAME_MAPPING = undefined;
                        sthConfig.NAME_ENCODING = true;
                        break;
                    case 'no mapping or encoding':
                        sthConfig.NAME_MAPPING = undefined;
                        sthConfig.NAME_ENCODING = false;
                        break;
                }
            });

            it('should compose the database name', function(done) {
                var databaseName = sthDatabaseNaming.getDatabaseName(INVALID_SERVICE);
                expectDatabaseName(INVALID_SERVICE, databaseName);
                done();
            });

            it('should not compose the database name for a very long service', function(done) {
                var databaseName = sthDatabaseNaming.getDatabaseName(VERY_LONG_SERVICE);
                expect(databaseName).to.be(null);
                done();
            });

            after(function() {
                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
            });
        });
    });
}

/**
 * Battery of tests to check the collection name generation
 */
function collectionNameTests() {
    var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL,
        ORIGINAL_NAME_MAPPING = sthConfig.NAME_MAPPING,
        ORIGINAL_NAME_ENCODING = sthConfig.NAME_ENCODING,
        dataTypes = Object.keys(sthTestConfig.DATA_TYPES),
        dataModels = Object.keys(sthConfig.DATA_MODELS);

    dataModels.forEach(function(dataModel) {
        describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
            before(function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
            });

            dataTypes.forEach(function(dataType) {
                ['name mapping and encoding', 'name mapping', 'name encoding', 'no mapping or encoding'].forEach(
                    function(mechanism) {
                        describe(mechanism, function() {
                            before(function() {
                                switch (mechanism) {
                                    case 'name mapping and encoding':
                                        sthConfig.NAME_MAPPING = require(ROOT_PATH +
                                            '/test/unit/nameMappings/name-mapping.json');
                                        sthConfig.NAME_ENCODING = true;
                                        break;
                                    case 'name mapping':
                                        sthConfig.NAME_MAPPING = require(ROOT_PATH +
                                            '/test/unit/nameMappings/name-mapping.json');
                                        sthConfig.NAME_ENCODING = false;
                                        break;
                                    case 'name encoding':
                                        sthConfig.NAME_MAPPING = undefined;
                                        sthConfig.NAME_ENCODING = true;
                                        break;
                                    case 'no mapping or encoding':
                                        sthConfig.NAME_MAPPING = undefined;
                                        sthConfig.NAME_ENCODING = false;
                                        break;
                                }
                            });

                            it(
                                'should compose the collection name for ' +
                                    sthTestConfig.DATA_TYPES[dataType] +
                                    ' data',
                                function(done) {
                                    var collectionName =
                                        sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW
                                            ? sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                                            : sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS);
                                    expectCollectionName(
                                        COLLECTION_NAME_PARAMS,
                                        collectionName,
                                        sthTestConfig.DATA_TYPES[dataType],
                                        sthConfig.DATA_MODELS[dataModel]
                                    );
                                    done();
                                }
                            );

                            it(
                                'should not compose the collection name for ' +
                                    sthTestConfig.DATA_TYPES[dataType] +
                                    ' data if very long service path',
                                function(done) {
                                    var collectionName =
                                        sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW
                                            ? sthDatabaseNaming.getRawCollectionName(VERY_LONG_COLLECTION_NAME_PARAMS)
                                            : sthDatabaseNaming.getAggregatedCollectionName(
                                                  VERY_LONG_COLLECTION_NAME_PARAMS
                                              );
                                    expect(collectionName).to.be(null);
                                    done();
                                }
                            );

                            after(function() {
                                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
                                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
                            });
                        });
                    }
                );
            });

            after(function() {
                sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            });
        });
    });
}

describe('sthDatabaseNaming tests', function() {
    describe('database names', databaseNameTests);

    describe('collection names', collectionNameTests);
});
