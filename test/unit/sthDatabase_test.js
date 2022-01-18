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

/* eslint-disable consistent-return */

const ROOT_PATH = require('app-root-path');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
const sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthUtils = require(ROOT_PATH + '/lib/utils/sthUtils');
const sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
const expect = require('expect.js');
const _ = require('lodash');

const DATABASE_NAME = sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE);
const DATABASE_CONNECTION_PARAMS = {
    authentication: sthConfig.DB_AUTHENTICATION,
    dbURI: sthConfig.DB_URI,
    replicaSet: sthConfig.REPLICA_SET,
    database: DATABASE_NAME,
    poolSize: sthConfig.POOL_SIZE
};
const COLLECTION_NAME_PARAMS = {
    service: sthConfig.DEFAULT_SERVICE,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME,
    attrType: sthTestConfig.ATTRIBUTE_TYPE
};
const NUMERIC_COLLECTION_NAME_PARAMS = {
    service: sthConfig.DEFAULT_SERVICE,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME + sthConfig.AGGREGATIONS.NUMERIC,
    attrType: sthTestConfig.ATTRIBUTE_TYPE
};
const TEXTUAL_COLLECTION_NAME_PARAMS = {
    service: sthConfig.DEFAULT_SERVICE,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME + sthConfig.AGGREGATIONS.TEXTUAL,
    attrType: sthTestConfig.ATTRIBUTE_TYPE
};
const VERY_LONG_COLLECTION_NAME_PARAMS = {
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
const DATE = new Date(Date.UTC(1970, 1, 3, 4, 5, 6, 777));
const DELAY = 100;
const LIMIT = 10;
const PAGINATION = 0;
const ATTRIBUTE = {
    VALUE: {
        NUMERIC: 666
    }
};
const STORE_DATA_PARAMS = {
    recvTime: DATE,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attribute: {
        name: sthTestConfig.ATTRIBUTE_NAME,
        type: sthTestConfig.ATTRIBUTE_TYPE
    }
};
const RETRIEVAL_DATA_PARAMS = {
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME
};

/**
 * Connects to the database and returns the database connection asynchronously
 * @param  {Function} callback The callblack
 */
function connectToDatabase(callback) {
    if (sthDatabase.connection) {
        return process.nextTick(callback.bind(null, null, sthDatabase.connection));
    }
    sthDatabase.connect(
        DATABASE_CONNECTION_PARAMS,
        callback
    );
}

/**
 * Drops a database collection for the provided data type and model asynchronously
 * @param  {object}   collectionNameParams The collection name params
 * @param  {string}   dataType             The data type
 * @param  {string}   dataModel            The data model
 * @param  {Function} callback             The callback
 */
function dropCollection(collectionNameParams, dataType, dataModel, callback) {
    sthConfig.DATA_MODEL = dataModel;
    const collectionName =
        dataType === sthTestConfig.DATA_TYPES.RAW
            ? sthDatabaseNaming.getRawCollectionName(collectionNameParams)
            : sthDatabaseNaming.getAggregatedCollectionName(collectionNameParams);

    if (collectionName) {
        sthDatabase.connection.dropCollection(collectionName, function(err) {
            if (err && err.code === 26 && err.name === 'MongoError' && err.message === 'ns not found') {
                // The collection does not exist
                return process.nextTick(callback);
            }
            return process.nextTick(callback.bind(null, err));
        });
    } else {
        return process.nextTick(callback);
    }
}

/**
 * Set of tests to drop the test collections from the database
 */
function cleanDatabaseTests() {
    const dataModelsKeys = Object.keys(sthConfig.DATA_MODELS);
    const dataTypeKeys = Object.keys(sthTestConfig.DATA_TYPES);

    describe('database clean up', function() {
        dataModelsKeys.forEach(function(dataModel) {
            dataTypeKeys.forEach(function(dataType) {
                //prettier-ignore
                it('should drop the ' + sthConfig.DATA_MODELS[dataModel] + ' ' + sthTestConfig.DATA_TYPES[dataType] + 
                    ' data collection if it exists',
                    dropCollection.bind(
                        null,
                        COLLECTION_NAME_PARAMS,
                        sthTestConfig.DATA_TYPES[dataType],
                        sthConfig.DATA_MODELS[dataModel]
                    )
                );

                //prettier-ignore
                it('should drop the numeric ' + sthConfig.DATA_MODELS[dataModel] + ' ' + 
                    sthTestConfig.DATA_TYPES[dataType] + ' data collection if it exists',
                    dropCollection.bind(
                        null,
                        NUMERIC_COLLECTION_NAME_PARAMS,
                        sthTestConfig.DATA_TYPES[dataType],
                        sthConfig.DATA_MODELS[dataModel]
                    )
                );

                //prettier-ignore
                it('should drop the textual ' + sthConfig.DATA_MODELS[dataModel] + ' ' + 
                    sthTestConfig.DATA_TYPES[dataType] + ' data collection if it exists',
                    dropCollection.bind(
                        null,
                        TEXTUAL_COLLECTION_NAME_PARAMS,
                        sthTestConfig.DATA_TYPES[dataType],
                        sthConfig.DATA_MODELS[dataModel]
                    )
                );

                //prettier-ignore
                it('should drop the very long service path ' + sthConfig.DATA_MODELS[dataModel] + ' ' + 
                    sthTestConfig.DATA_TYPES[dataType] + ' data collection if it exists',
                    dropCollection.bind(
                        null,
                        VERY_LONG_COLLECTION_NAME_PARAMS,
                        sthTestConfig.DATA_TYPES[dataType],
                        sthConfig.DATA_MODELS[dataModel]
                    )
                );
            });
        });
    });
}

/**
 * Battery of tests to check that the access to the collections works as expected
 */
function collectionAccessTests() {
    const ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    const dataTypes = Object.keys(sthTestConfig.DATA_TYPES);
    const dataModels = Object.keys(sthConfig.DATA_MODELS);

    cleanDatabaseTests();

    dataModels.forEach(function(dataModel) {
        describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
            before(function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
            });

            dataTypes.forEach(function(dataType) {
                //prettier-ignore
                it('should notify as error a non-existent ' + sthTestConfig.DATA_TYPES[dataType] + 
                    ' data collection if it should not be created',
                    function(done) {
                        sthDatabase.getCollection(
                            COLLECTION_NAME_PARAMS,
                            {
                                shouldCreate: false,
                                isAggregated:
                                    sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                                shouldTruncate: false
                            },
                            function(err, collection) {
                                expect(err).to.not.be(null);
                                expect(err.name).to.equal('MongoError');
                                expect(err.message.indexOf('does not exist. Currently in strict mode.')).to.be.above(0);
                                expect(collection).to.be(null);
                                done();
                            }
                        );
                    }
                );

                //prettier-ignore
                it('should create a ' + sthTestConfig.DATA_TYPES[dataType] + 
                    ' data collection if non-existent and requested',
                    function(done) {
                        sthDatabase.getCollection(
                            COLLECTION_NAME_PARAMS,
                            {
                                shouldCreate: true,
                                isAggregated:
                                    sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                                shouldTruncate: false
                            },
                            function(err, collection) {
                                expect(err).to.be(null);
                                expect(collection).to.be.ok();
                                return done();
                            }
                        );
                    }
                );
            });

            after(function() {
                sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            });
        });
    });
}

/**
 * Tests to check that the access to the collections works as expected after reconnect with DB
 */
function collectionAccessReconnectTests() {
    const ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    const dataTypes = Object.keys(sthTestConfig.DATA_TYPES);
    const dataModels = Object.keys(sthConfig.DATA_MODELS);

    dataModels.forEach(function(dataModel) {
        describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
            before(function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
            });

            dataTypes.forEach(function(dataType) {
                //prettier-ignore
                it('should notify as error a non-existent ' + sthTestConfig.DATA_TYPES[dataType] + 
                    ' data collection if it should not be created',
                    function(done) {
                        sthDatabase.getCollection(
                            COLLECTION_NAME_PARAMS,
                            {
                                shouldCreate: true,
                                isAggregated:
                                    sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                                shouldTruncate: false
                            },
                            function(err) {
                                expect(err).to.have.status(500);
                                expect(err).to.include('DataBase is not connected');
                                return done();
                            }
                        );
                    }
                );
            });

            after(function() {
                sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            });
        });
    });
}

/**
 * Returns the aggregated entry or point for certain offset
 * @param {Array} points The array of points
 * @param {Number} offset The offset
 */
function getAggregatedEntry4Offset(points, offset) {
    for (let index = 0; index < points.length; index++) {
        if (points[index].offset === offset) {
            return points[index];
        }
    }
}

/**
 * Returns the query to be used in the data stored Expectations
 * @param  {string} dataType        The data type
 * @param  {string} aggregation The aggregation type
 * @return {object}                 The query object
 */
function getQuery4ExpectDataStored(dataType, aggregation) {
    if (
        sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH ||
        sthConfig.DATA_MODEL === sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY
    ) {
        if (dataType === sthTestConfig.DATA_TYPES.RAW) {
            return { attrName: STORE_DATA_PARAMS.attribute.name + aggregation };
        }
        return { '_id.attrName': STORE_DATA_PARAMS.attribute.name + aggregation };
    }
    return {};
}

/**
 * No retrieval results expectations
 * @param  {object} params     Parameter object including the following properties:
 *                               - {object} collection         The collection, if any
 *                               - {string} aggregation        The aggregation type
 *                               - {string} dataType           The data type
 *                               - {string} limit              The number of results limit
 *                               - {string} resolution         The resolution, if any
 *                               - {string} aggregatedFunction The resolution, if any
 * @param  {number} count      The number of stored data entries
 * @param  {Array}  result     The result array
 * @param  {Function} callback The callback
 */
function expectResult(params, count, result, callback) {
    if (!Array.isArray(result)) {
        expect(typeof result).to.be('string');
        return callback();
    }
    if (count === 0) {
        expect(result.length).to.be(0);
        return callback();
    }
    if (params.dataType === sthTestConfig.DATA_TYPES.RAW) {
        expect(result.length).to.equal(params.limit ? Math.min(params.limit, count) : count);
        for (let i = 0; i < count; i++) {
            switch (sthConfig.DATA_MODEL) {
                case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
                    if (params.collection) {
                        expect(result[i].entityId).to.equal(STORE_DATA_PARAMS.entityId);
                        expect(result[i].entityType).to.equal(STORE_DATA_PARAMS.entityType);
                    }
                /* falls through */
                case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
                    if (params.collection) {
                        expect(result[i].attrName).to.equal(STORE_DATA_PARAMS.attribute.name + params.aggregation);
                    }
                    expect(result[i].attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
                /* falls through */
                case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
                    expect(result[i].recvTime.getTime()).to.equal(DATE.getTime() + i * DELAY);
                    expect(result[i].attrValue).to.equal(
                        params.aggregation === sthConfig.AGGREGATIONS.NUMERIC
                            ? ATTRIBUTE.VALUE.NUMERIC
                            : sthConfig.DATA_MODEL
                    );
                    break;
                default:
                    return callback(new Error('Invalid data model: ' + sthConfig.DATA_MODEL));
            }
        }
        return callback();
    }
    let point;
    expect(result.length).to.equal(!params.resolution ? sthConfig.AGGREGATION_BY.length : 1);
    for (let j = 0; j < result.length; j++) {
        switch (sthConfig.DATA_MODEL) {
            case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
                expect(result[j]._id.entityId).to.equal(STORE_DATA_PARAMS.entityId);
                expect(result[j]._id.entityType).to.equal(STORE_DATA_PARAMS.entityType);
            /* falls through */
            case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
                expect(result[j]._id.attrName).to.equal(STORE_DATA_PARAMS.attribute.name + params.aggregation);
                if (params.collection) {
                    expect(result[j].attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
                    // The previous line should be substituted by the next one when this bug is solved:
                    // expect(result[i]._id.attrType).to.equal(STORE_DATA_PARAMS.attribute.type);
                }
            /* falls through */
            case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
                expect(result[j]._id.origin.getTime()).to.equal(
                    sthUtils.getOrigin(STORE_DATA_PARAMS.recvTime, result[j]._id.resolution).getTime()
                );
                point = getAggregatedEntry4Offset(
                    result[j].points,
                    sthUtils.getOffset(result[j]._id.resolution, STORE_DATA_PARAMS.recvTime)
                );
                expect(point.samples).to.equal(count);
                switch (params.aggregatedFunction) {
                    case 'sum':
                        expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC * count);
                        break;
                    case 'sum2':
                        expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2) * count);
                        break;
                    case 'min':
                        expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                        break;
                    case 'max':
                        expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                        break;
                    case 'occur':
                        expect(point.occur[sthConfig.DATA_MODEL]).to.equal(count);
                        break;
                    default:
                        if (params.aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
                            expect(point.sum).to.equal(ATTRIBUTE.VALUE.NUMERIC * count);
                            expect(point.sum2).to.equal(Math.pow(ATTRIBUTE.VALUE.NUMERIC, 2) * count);
                            expect(point.min).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                            expect(point.max).to.equal(ATTRIBUTE.VALUE.NUMERIC);
                        } else {
                            expect(point.occur[sthConfig.DATA_MODEL]).to.equal(count);
                        }
                }
                break;
            default:
                return callback(new Error('Invalid data model: ' + sthConfig.DATA_MODEL));
        }
    }
    return callback();
}

/**
 * Expectations for the data storage
 * @param {object}   params   Params object including the following properties:
 *                               - {object} collection  The collection
 *                               - {string} dataType    The data type
 *                               - {string} aggregation The aggregation type
 * @param {number}   count    The number of stored entries
 * @param {Function} callback The callback
 */
function expectDataStored(params, count, callback) {
    params.collection
        .find(getQuery4ExpectDataStored(params.dataType, params.aggregation))
        .toArray(function(err, result) {
            if (err) {
                return callback(err);
            }
            expectResult(params, count, result, callback);
        });
}

/**
 * Composes and returns the params used for data storage
 * @param  {object} collection  The collection where data will be stored
 * @param  {string} aggregation The aggregation type
 */
function getDataStoreParams(collection, aggregation) {
    const dataStoreParams = _.cloneDeep(STORE_DATA_PARAMS);
    dataStoreParams.collection = collection;
    dataStoreParams.attribute.name += aggregation;
    dataStoreParams.attribute.value =
        aggregation === sthConfig.AGGREGATIONS.NUMERIC ? ATTRIBUTE.VALUE.NUMERIC : sthConfig.DATA_MODEL;
    return dataStoreParams;
}

/**
 * Expectations regarding the existence of some raw data
 * @param  {object} notificationInfoParams The notification info params
 * @param  {object} notificationInfo       The notification info
 * @param  {string} dataModel              The data model
 */
function expectExistsNotificationInfo(notificationInfoParams, notificationInfo, dataModel) {
    switch (dataModel) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            expect(notificationInfo.exists).to.have.property('entityId', notificationInfoParams.entityId);
            expect(notificationInfo.exists).to.have.property('entityType', notificationInfoParams.entityType);
        /* falls through */
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            expect(notificationInfo.exists).to.have.property('attrName', notificationInfoParams.attribute.name);
        /* falls through */
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            expect(notificationInfo.exists).to.have.property('_id');
            expect(notificationInfo.exists.recvTime.getTime()).to.equal(DATE.getTime());
            expect(notificationInfo.exists).to.have.property('attrType', notificationInfoParams.attribute.type);
            expect(notificationInfo.exists).to.have.property('attrValue', notificationInfoParams.attribute.value);
    }
}

/**
 * Expectations regarding the update of some raw data
 * @param  {object} notificationInfoParams The notification info params
 * @param  {object} notificationInfo       The notification info
 * @param  {string} dataModel              The data model
 * @param  {string} aggregation            The aggregation type
 */
function expectUpdatesNotificationInfo(notificationInfoParams, notificationInfo, dataModel, aggregation) {
    switch (dataModel) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            expect(notificationInfo.updates).to.have.property('entityId', notificationInfoParams.entityId);
            expect(notificationInfo.updates).to.have.property('entityType', notificationInfoParams.entityType);
        /* falls through */
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            expect(notificationInfo.updates).to.have.property('attrName', notificationInfoParams.attribute.name);
        /* falls through */
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            expect(notificationInfo.updates).to.have.property('_id');
            expect(notificationInfo.updates.recvTime.getTime()).to.equal(DATE.getTime());
            expect(notificationInfo.updates).to.have.property('attrType', notificationInfoParams.attribute.type);
            expect(notificationInfo.updates).to.have.property('attrValue', notificationInfoParams.attribute.value);
    }
    if (aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
        sthConfig.AGGREGATION_BY.forEach(function(aggregationBy) {
            expect(notificationInfo.newMinValues[aggregationBy]).to.equal(notificationInfoParams.attribute.value);
        });
    }
}

/**
 * The should store tests
 * @param  {string}   aggregation The aggregation type
 * @param  {string}   dataType    The data type
 * @param  {number}   position    The timing position in which the data is being inserted
 * @param  {Function} done        The done() function
 */
function shouldStoreTest(aggregation, dataType, position, done) {
    sthDatabase.getCollection(
        aggregation === sthConfig.AGGREGATIONS.NUMERIC
            ? NUMERIC_COLLECTION_NAME_PARAMS
            : TEXTUAL_COLLECTION_NAME_PARAMS,
        {
            shouldCreate: true,
            isAggregated: dataType === sthTestConfig.DATA_TYPES.AGGREGATED,
            shouldTruncate: false
        },
        function(err, collection) {
            if (err) {
                return done(err);
            }
            const storeDataParams = getDataStoreParams(collection, aggregation);
            storeDataParams.recvTime = new Date(DATE.getTime() + (position - 1) * DELAY);
            storeDataParams.notificationInfo = { inserts: true };
            if (dataType === sthTestConfig.DATA_TYPES.RAW) {
                sthDatabase.storeRawData(storeDataParams, function(err) {
                    if (err) {
                        return done(err);
                    }
                    expectDataStored(
                        {
                            collection,
                            dataType,
                            aggregation
                        },
                        position,
                        done
                    );
                });
            } else {
                sthDatabase.storeAggregatedData(storeDataParams, function(err) {
                    if (err) {
                        return done(err);
                    }
                    expectDataStored(
                        {
                            collection,
                            dataType,
                            aggregation
                        },
                        position,
                        done
                    );
                });
            }
        }
    );
}

/**
 * Battery of tests to check that the storage of raw and aggregated data works as expected
 */
function storageTests() {
    let ORIGINAL_DATA_MODEL;
    const dataTypes = Object.keys(sthTestConfig.DATA_TYPES);
    const dataModels = Object.keys(sthConfig.DATA_MODELS);
    const aggregations = Object.keys(sthConfig.AGGREGATIONS);
    let collection;

    before(function() {
        ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    });

    cleanDatabaseTests();

    dataModels.forEach(function(dataModel) {
        describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
            before(function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
            });

            aggregations.forEach(function(aggregation) {
                describe(sthConfig.AGGREGATIONS[aggregation], function() {
                    dataTypes.forEach(function(dataType) {
                        describe(sthTestConfig.DATA_TYPES[dataType] + ' data', function() {
                            before(function(done) {
                                sthDatabase.getCollection(
                                    sthConfig.AGGREGATIONS[aggregation] === sthConfig.AGGREGATIONS.NUMERIC
                                        ? NUMERIC_COLLECTION_NAME_PARAMS
                                        : TEXTUAL_COLLECTION_NAME_PARAMS,
                                    {
                                        shouldCreate: true,
                                        isAggregated:
                                            sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.AGGREGATED,
                                        shouldTruncate: false
                                    },
                                    function(err, theCollection) {
                                        if (err) {
                                            return done(err);
                                        }
                                        collection = theCollection;
                                        done();
                                    }
                                );
                            });

                            if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                                it(
                                    'should detect a new ' +
                                        sthConfig.AGGREGATIONS[aggregation] +
                                        ' attribute value notification is susceptible of being inserted',
                                    function(done) {
                                        const notificationInfoParams = getDataStoreParams(
                                            collection,
                                            sthConfig.AGGREGATIONS[aggregation]
                                        );
                                        sthDatabase.getNotificationInfo(notificationInfoParams, function(err, result) {
                                            if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                                                expect(err).to.be(null);
                                                expect(result).to.eql({ inserts: true });
                                            }
                                            done();
                                        });
                                    }
                                );
                            }
                            //prettier-ignore
                            it('should store ' + sthConfig.AGGREGATIONS[aggregation] + ' ' + 
                                sthTestConfig.DATA_TYPES[dataType] + ' data',
                                shouldStoreTest.bind(
                                    null,
                                    sthConfig.AGGREGATIONS[aggregation],
                                    sthTestConfig.DATA_TYPES[dataType],
                                    1
                                )
                            );

                            if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                                //prettier-ignore
                                it('should detect an already inserted ' +  sthConfig.AGGREGATIONS[aggregation] +
                                    ' attribute value notification already exists',
                                    function(done) {
                                        const notificationInfoParams = getDataStoreParams(
                                            collection,
                                            sthConfig.AGGREGATIONS[aggregation]
                                        );
                                        sthDatabase.getNotificationInfo(notificationInfoParams, function(err, result) {
                                            expect(err).to.be(null);
                                            expectExistsNotificationInfo(
                                                notificationInfoParams,
                                                result,
                                                sthConfig.DATA_MODELS[dataModel]
                                            );
                                            done();
                                        });
                                    }
                                );
                            }

                            //prettier-ignore
                            it('should store a second entry of ' + sthConfig.AGGREGATIONS[aggregation] + ' ' + 
                                sthTestConfig.DATA_TYPES[dataType] + ' data with a ' + DELAY + ' ms delay',
                                shouldStoreTest.bind(
                                    null,
                                    sthConfig.AGGREGATIONS[aggregation],
                                    sthTestConfig.DATA_TYPES[dataType],
                                    2
                                )
                            );

                            if (sthTestConfig.DATA_TYPES[dataType] === sthTestConfig.DATA_TYPES.RAW) {
                                //prettier-ignore
                                it('should detect as updatable an updated ' + sthConfig.AGGREGATIONS[aggregation] + 
                                    ' attribute value',
                                    function(done) {
                                        const notificationInfoParams = getDataStoreParams(
                                            collection,
                                            sthConfig.AGGREGATIONS[aggregation]
                                        );
                                        const updatedNotificationInfoParams = getDataStoreParams(
                                            collection,
                                            sthConfig.AGGREGATIONS[aggregation]
                                        );
                                        updatedNotificationInfoParams.attribute.value +=
                                            sthConfig.AGGREGATIONS[aggregation] === sthConfig.AGGREGATIONS.NUMERIC
                                                ? ATTRIBUTE.VALUE.NUMERIC
                                                : sthConfig.DATA_MODELS[dataModel];
                                        sthDatabase.getNotificationInfo(updatedNotificationInfoParams, function(
                                            err,
                                            result
                                        ) {
                                            expect(err).to.be(null);
                                            expectUpdatesNotificationInfo(
                                                notificationInfoParams,
                                                result,
                                                sthConfig.DATA_MODELS[dataModel],
                                                sthConfig.AGGREGATIONS[aggregation]
                                            );
                                            done();
                                        });
                                    }
                                );
                            }
                        });
                    });
                });
            });

            after(function() {
                sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            });
        });
    });
}

/**
 * Composes and returns the params used for data retrieval
 * @param  {object} collection  The collection where data will be stored
 * @param  {string} aggregation The aggregation type
 */
function getDataRetrievalParams(collection, aggregation) {
    const dataRetrievalParams = _.cloneDeep(RETRIEVAL_DATA_PARAMS);
    dataRetrievalParams.collection = collection;
    dataRetrievalParams.attrName += aggregation;
    return dataRetrievalParams;
}

/**
 * Retrieval test
 * @param  {object}   params       Parameter object including the following properties:
 *                                   - {string} aggregation The aggregation type
 *                                   - {string} dataType    The data type
 * @param  {object}   options      Option object including the following properties:
 * @param  {number}   count        The number of stored data entries
 * @param  {Function} done         The done() function
 */
function retrievalTest(params, options, count, done) {
    sthDatabase.getCollection(
        params.aggregation === sthConfig.AGGREGATIONS.NUMERIC
            ? NUMERIC_COLLECTION_NAME_PARAMS
            : TEXTUAL_COLLECTION_NAME_PARAMS,
        {
            shouldCreate: true,
            isAggregated: params.dataType === sthTestConfig.DATA_TYPES.AGGREGATED,
            shouldTruncate: false
        },
        function(err, collection) {
            if (err) {
                return done(err);
            }
            const retrievalDataParams = getDataRetrievalParams(collection, params.aggregation);
            if (params.dataType === sthTestConfig.DATA_TYPES.RAW) {
                if (options) {
                    retrievalDataParams.lastN = options.lastN;
                    retrievalDataParams.hLimit = options.hLimit;
                    retrievalDataParams.hOffset = options.hOffset;
                    retrievalDataParams.from = options.dateFrom;
                    retrievalDataParams.to = options.dateTo;
                    retrievalDataParams.filetype = options.filetype;
                    params.limit = options.lastN || options.hLimit;
                }
                sthDatabase.getRawData(retrievalDataParams, function(err, results) {
                    if (err) {
                        return done(err);
                    }
                    expectResult(params, count, results, done);
                });
            } else {
                if (options) {
                    retrievalDataParams.aggregatedFunction = options.aggrMethod;
                    retrievalDataParams.resolution = options.aggrPeriod;
                    retrievalDataParams.from = options.dateFrom;
                    retrievalDataParams.to = options.dateTo;
                    params.aggregatedFunction = options.aggrMethod;
                    params.resolution = options.aggrPeriod;
                }
                sthDatabase.getAggregatedData(retrievalDataParams, function(err, results) {
                    if (err) {
                        return done(err);
                    }
                    expectResult(params, count, results, done);
                });
            }
        }
    );
}

/**
 * The set of should retrieve tests
 * @param  {number} count       The number of stored data entries
 * @param  {string} aggregation The aggregation type
 * @param  {string} dataType    The data type
 */
function shouldRetrieveTests(count, aggregation, dataType) {
    if (dataType === sthTestConfig.DATA_TYPES.RAW) {
        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with no params if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                null,
                count
            )
        );

        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with lastN if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    lastN: LIMIT
                },
                count
            )
        );

        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with hLimit and hOffset if ' + 
            count + ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    hLimit: LIMIT,
                    hOffset: PAGINATION
                },
                count
            )
        );

        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with dateFrom if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    dateFrom: DATE
                },
                count
            )
        );

        //prettier-ignore
        it('should retrieve ' + 0 + ' ' + aggregation + ' ' + dataType + ' data with dateFrom is beyond if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    dateFrom: new Date(DATE.getTime() + 1000 * 60 * 60)
                },
                0
            )
        );

        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with dateTo if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    dateTo: new Date()
                },
                count
            )
        );

        //prettier-ignore
        it('should retrieve ' + 0 + ' ' + aggregation + ' ' + dataType + ' data with dateTo if previous if ' + 
            count + ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    dateTo: new Date(DATE.getTime() - 1000 * 60 * 60)
                },
                0
            )
        );

        //prettier-ignore
        it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data with csv if ' + count + 
            ' data is inserted',
            retrievalTest.bind(
                null,
                {
                    aggregation,
                    dataType
                },
                {
                    filetype: 'csv'
                },
                count
            )
        );
    } else {
        sthConfig.AGGREGATION_BY.forEach(function(aggregationBy) {
            if (aggregation === sthConfig.AGGREGATIONS.NUMERIC) {
                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of sum if ' + count + ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'sum',
                            aggrPeriod: aggregationBy
                        },
                        count
                    )
                );

                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of sum with dataFrom set if ' + count + 
                    ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'sum',
                            aggrPeriod: aggregationBy,
                            dateFrom: DATE
                        },
                        count
                    )
                );

                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of sum with dataTo set if ' + count + 
                    ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'sum',
                            aggrPeriod: aggregationBy,
                            dateTo: new Date()
                        },
                        count
                    )
                );

                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of sum2 if ' + count + ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'sum2',
                            aggrPeriod: aggregationBy
                        },
                        count
                    )
                );

                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of min if ' + count + ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'min',
                            aggrPeriod: aggregationBy
                        },
                        count
                    )
                );

                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of max if ' + count + ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'max',
                            aggrPeriod: aggregationBy
                        },
                        count
                    )
                );
            } else {
                //prettier-ignore
                it('should retrieve ' + count + ' ' + aggregation + ' ' + dataType + ' data for a resolution of ' + 
                    aggregationBy + ' and an aggregation method of occur if ' + count + ' data is inserted',
                    retrievalTest.bind(
                        null,
                        {
                            aggregation,
                            dataType
                        },
                        {
                            aggrMethod: 'occur',
                            aggrPeriod: aggregationBy
                        },
                        count
                    )
                );
            }
        });
    }
}

/**
 * Battery of tests to check that the retrieval of raw and aggregated data works as expected
 */
function retrievalTests() {
    let ORIGINAL_DATA_MODEL;
    const dataTypes = Object.keys(sthTestConfig.DATA_TYPES);
    const dataModels = Object.keys(sthConfig.DATA_MODELS);
    const aggregations = Object.keys(sthConfig.AGGREGATIONS);

    before(function() {
        ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
    });

    cleanDatabaseTests();

    dataModels.forEach(function(dataModel) {
        describe(sthConfig.DATA_MODELS[dataModel] + ' data model', function() {
            before(function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS[dataModel];
            });

            aggregations.forEach(function(aggregation) {
                describe(sthConfig.AGGREGATIONS[aggregation], function() {
                    dataTypes.forEach(function(dataType) {
                        describe(sthTestConfig.DATA_TYPES[dataType] + ' data', function() {
                            shouldRetrieveTests(
                                0,
                                sthConfig.AGGREGATIONS[aggregation],
                                sthTestConfig.DATA_TYPES[dataType]
                            );

                            for (let i = 1; i <= 5; i++) {
                                //prettier-ignore
                                it('should store ' + (i === 1 ? i : 'another (' + i + ')') + ' ' +  
                                    sthConfig.AGGREGATIONS[aggregation] + ' ' +  sthTestConfig.DATA_TYPES[dataType] + 
                                    ' data with ' + (i - 1) * DELAY +  'ms delay',
                                    shouldStoreTest.bind(
                                        null,
                                        sthConfig.AGGREGATIONS[aggregation],
                                        sthTestConfig.DATA_TYPES[dataType],
                                        i
                                    )
                                );

                                shouldRetrieveTests(
                                    i,
                                    sthConfig.AGGREGATIONS[aggregation],
                                    sthTestConfig.DATA_TYPES[dataType]
                                );
                            }
                        });
                    });
                });
            });

            after(function() {
                sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            });
        });
    });
}

describe('sthDatabase tests', function() {
    this.timeout(5000);
    describe('database connection', function() {
        it('should connect to the database', function(done) {
            sthDatabase.connect(
                DATABASE_CONNECTION_PARAMS,
                function(err, connection) {
                    expect(err).to.be(null);
                    expect(connection).to.equal(sthDatabase.connection);
                    done();
                }
            );
        });

        it('should disconnect from the database', function(done) {
            sthDatabase.closeConnection(function(err) {
                expect(err).to.be(null);
                expect(sthDatabase.connection).to.be(null);
                done();
            });
        });

        it('should notify as error the aim to connect to the database at an unavailable host', function(done) {
            const INVALID_DATABASE_CONNECTION_PARAMS = _.clone(DATABASE_CONNECTION_PARAMS);
            INVALID_DATABASE_CONNECTION_PARAMS.dbURI = 'unavailable_localhost:27017';
            sthDatabase.connect(
                INVALID_DATABASE_CONNECTION_PARAMS,
                function(err, connection) {
                    /* eslint-disable-next-line no-unused-expressions */
                    expect(err).to.exist;
                    expect(err.name).to.equal('MongoNetworkError');
                    expect(
                        err.message.indexOf(
                            'failed to connect to server [' + INVALID_DATABASE_CONNECTION_PARAMS.dbURI + ']'
                        )
                    ).to.equal(0);
                    expect(connection).to.equal(null);
                    done();
                }
            );
        });

        it('should notify as error the aim to connect to the database at an unavailable port', function(done) {
            const INVALID_DATABASE_CONNECTION_PARAMS = _.clone(DATABASE_CONNECTION_PARAMS);
            INVALID_DATABASE_CONNECTION_PARAMS.dbURI = 'localhost:12345';
            sthDatabase.connect(
                INVALID_DATABASE_CONNECTION_PARAMS,
                function(err, connection) {
                    /* eslint-disable-next-line no-unused-expressions */
                    expect(err).to.exist;
                    expect(err.name).to.equal('MongoNetworkError');
                    expect(
                        err.message.indexOf(
                            'failed to connect to server [' + INVALID_DATABASE_CONNECTION_PARAMS.dbURI + ']'
                        )
                    ).to.equal(0);
                    expect(connection).to.equal(null);
                    done();
                }
            );
        });
    });

    describe('helper functions', function() {
        it('should return the database name for a service', function() {
            const databaseName = sthConfig.DB_PREFIX + sthConfig.DEFAULT_SERVICE;
            expect(sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE)).to.equal(
                sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeDatabaseName(databaseName) : databaseName
            );
        });

        describe('collection access', function() {
            before(function(done) {
                connectToDatabase(done);
            });

            describe('access', collectionAccessTests);
        });
        
        describe('collection access reconnect', function() {
            before(function(done) {
                sthDatabase.closeConnection(done);
            });

            describe('access', collectionAccessReconnectTests);
        });
    });

    describe('storage and retrieval', function() {
        before(function(done) {
            connectToDatabase(done);
        });

        describe('storage', storageTests);

        describe('retrieval', retrievalTests);

        describe('final clean up', cleanDatabaseTests);
    });
});
