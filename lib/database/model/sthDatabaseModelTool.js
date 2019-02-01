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

var ROOT_PATH = require('app-root-path');
var fs = require('fs');
var async = require('async');
var events = require('events');
var csvParser = require('csv-parser');
var sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
var sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
var sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
var STHWritableStream = require(ROOT_PATH + '/lib/database/model/sthDatabaseWritableStream');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthError = require(ROOT_PATH + '/lib/utils/sthError');

var DATABASE_CONNECTION_PARAMS = {
    authentication: sthConfig.DB_AUTHENTICATION,
    dbURI: sthConfig.DB_URI,
    replicaSet: sthConfig.REPLICA_SET,
    database: sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE),
    poolSize: sthConfig.POOL_SIZE
};

/**
 * Releases all the resources used by the application
 * @param  {Function} callback The callback
 */
function cleanResources(callback) {
    sthDatabase.closeConnection(callback);
}

/**
 * Returns all the databases managed by the MongoDB instance asynchronously
 * @param  {Object}   db       The database connection
 * @param  {Function} callback The callback
 */
function listDatabasesInfo(db, callback) {
    var adminDb = db.admin();
    adminDb.listDatabases(function(err, result) {
        process.nextTick(callback.bind(null, err, result.databases));
    });
}

/**
 * Filter to only consider the databases with the configured database prefix
 * @param  {Object}   options      The options object including the following properties:
 *                                   - database: The database to restrict the analysis to
 *                                   - collection: The collection to restrict the analysis to
 * @param  {Object}   databaseData The data about the database
 * @param  {Function} callback     The callback
 */
function databaseFilter(options, databaseData, callback) {
    if (options && options.database) {
        return process.nextTick(callback.bind(null, null, options.database === databaseData.name));
    } else {
        var decodedDatabaseName = databaseData.name;
        if (sthConfig.NAME_ENCODING) {
            decodedDatabaseName = sthDatabaseNameCodec.decodeDatabaseName(databaseData.name);
        }
        return process.nextTick(callback.bind(null, null, decodedDatabaseName.indexOf(sthConfig.DB_PREFIX) !== -1));
    }
}

/**
 * Filters the list of databases only to the related to the STH component
 * @param  {Object}   options  The options object including the following properties:
 *                               - database: The database to restrict the analysis to
 *                               - collection: The collection to restrict the analysis to
 * @param  {Array}   databases The database array returned by Node.js MongoDB Driver's listDatabases()
 * @param  {Function} callback The callback
 */
function filterDatabases(options, databases, callback) {
    async.filter(databases, async.apply(databaseFilter, options), callback);
}

/**
 * Returns the list of collections of a database asynchronously
 * @param  {Object}   database The database connection
 * @param  {Function} callback The callback
 */
function listCollections(database, callback) {
    database.collections(callback);
}

/**
 * Test to check if a collection includes documents with certain property
 * @param  {Object}   collection   The collection
 * @param  {String}   propertyName The property name
 * @param  {Function} callback     The callback
 */
function hasPropertyTest(collection, propertyName, callback) {
    var query = {};
    var excludes = propertyName.charAt(0) === '!';
    query[excludes ? propertyName.substr(1) : propertyName] = {
        $exists: true
    };
    collection.count(query, function(err, count) {
        process.nextTick(callback.bind(null, err, excludes ? count === 0 : count > 0));
    });
}

/**
 * Checks if the passed collection follows the collection per service path data model asynchronously
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function isCollectionPerServicePath(collection, callback) {
    if (sthDatabase.isAggregated(collection.s.name)) {
        async.every(['_id.attrName', '_id.entityId'], hasPropertyTest.bind(null, collection), callback);
    } else {
        async.every(['attrName', 'entityId'], hasPropertyTest.bind(null, collection), callback);
    }
}

/**
 * Checks if the passed collection follows the collection per entity data model asynchronously
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function isCollectionPerEntity(collection, callback) {
    if (sthDatabase.isAggregated(collection.s.name)) {
        async.every(['_id.attrName', '!_id.entityId'], hasPropertyTest.bind(null, collection), callback);
    } else {
        async.every(['attrName', '!entityId'], hasPropertyTest.bind(null, collection), callback);
    }
}

/**
 * Checks if the passed collection follows the collection per attribute data model asynchronously
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function isCollectionPerAttribute(collection, callback) {
    if (sthDatabase.isAggregated(collection.s.name)) {
        async.every(['!_id.attrName', '!_id.entityId'], hasPropertyTest.bind(null, collection), callback);
    } else {
        async.every(['!attrName', '!entityId'], hasPropertyTest.bind(null, collection), callback);
    }
}

/**
 * Tests the data model used in a collection
 * @param  {Object}   collection The collection
 * @param  {String}   dataModel  The data model
 * @param  {Function} callback   The callback
 */
function dataModelTest(collection, dataModel, callback) {
    switch (dataModel) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            isCollectionPerServicePath(collection, callback);
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            isCollectionPerEntity(collection, callback);
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            isCollectionPerAttribute(collection, callback);
            break;
    }
}

/**
 * Returns the data model used in the passed collection asynchronously
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function getDataModel(collection, callback) {
    async.detect(
        [
            sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH,
            sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY,
            sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE
        ],
        async.apply(dataModelTest, collection),
        callback
    );
}

/**
 * Filters collections to those having the same data model as the currently configured one
 * @param  {Object}   options    The options object including the following properties:
 *                                 - database: The database to restrict the analysis to
 *                                 - collection: The collection to restrict the analysis to
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function collectionFilter(options, collection, callback) {
    if (
        (options && options.collection && options.collection !== collection.s.name) ||
        collection.s.name.indexOf('system.') === 0
    ) {
        return process.nextTick(callback.bind(null, null, true));
    }

    collection.count(function(err, count) {
        if (err) {
            return process.nextTick(callback.bind(null, err));
        }
        if (count > 0) {
            if (sthDatabase.isAggregated(collection.s.name)) {
                switch (sthConfig.DATA_MODEL) {
                    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
                        async.every(['_id.entityId', '_id.attrName'], hasPropertyTest.bind(null, collection), callback);
                        break;
                    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
                        async.every(
                            ['!_id.entityId', '_id.attrName'],
                            hasPropertyTest.bind(null, collection),
                            callback
                        );
                        break;
                    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
                        async.every(
                            ['!_id.entityId', '!_id.attrName'],
                            hasPropertyTest.bind(null, collection),
                            callback
                        );
                        break;
                }
            } else {
                switch (sthConfig.DATA_MODEL) {
                    case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
                        async.every(['entityId', 'attrName'], hasPropertyTest.bind(null, collection), callback);
                        break;
                    case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
                        async.every(['!entityId', 'attrName'], hasPropertyTest.bind(null, collection), callback);
                        break;
                    case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
                        async.every(['!entityId', '!attrName'], hasPropertyTest.bind(null, collection), callback);
                        break;
                }
            }
        } else {
            return process.nextTick(callback.bind(null, null, true));
        }
    });
}

/**
 * Filters the collections to include only the ones created for a data mode distinct from the one the STH component
 *  is currently configured
 * @param  {Object}   options     The options object including the following properties:
 *                                  - database: The database to restrict the analysis to
 *                                  - collection: The collection to restrict the analysis to
 * @param  {Object}   collections The collections
 * @param  {Function} callback    The callback
 */
function filterCollections(options, collections, callback) {
    async.reject(collections, async.apply(collectionFilter, options), callback);
}

/**
 * Maps a collection to its name and data model
 * @param  {Object}   collection The collection
 * @param  {Function} callback   The callback
 */
function collectionMapper(collection, callback) {
    var mappedCollection = {};
    getDataModel(collection, function(err, result) {
        mappedCollection.collectionName = collection.s.name;
        mappedCollection.dataModel = result;
        process.nextTick(callback.bind(null, null, mappedCollection));
    });
}

/**
 * Generates the analysis report including the collections of each database which need migration
 * @param  {String}   databaseName          The database name
 * @param  {Array}   migratableCollections  The array of collections needing migration
 * @param  {Function} callback              The callback
 */
function generateReport(databaseName, migratableCollections, callback) {
    async.waterfall(
        [
            async.map.bind(null, migratableCollections, collectionMapper),
            function(mappedMigratableCollections, callback) {
                var report = {};
                report.databaseName = databaseName;
                report.collections2Migrate = mappedMigratableCollections;
                process.nextTick(callback.bind(null, null, report));
            }
        ],
        callback
    );
}

/**
 * Includes the current data model in the generated report
 * @param  {Object}   report   The data model analysis report
 * @param  {Function} callback The callback
 */
function includeCurrentDataModel(report, callback) {
    var finalReport = {};
    finalReport.currentDataModel = sthConfig.DATA_MODEL;
    finalReport.result = report;
    process.nextTick(callback.bind(null, null, finalReport));
}

/**
 * Analyses the passed database's collections data models
 * @param  {Object}   options      The options object including the following properties:
 *                                   - database: The database to restrict the analysis to
 *                                   - collection: The collection to restrict the analysis to
 * @param  {Object}   databaseData The data about the database
 * @param  {Function} callback     The callback
 */
function analyseDatabase(options, database, callback) {
    var db = sthDatabase.connection.db(database.name);
    async.waterfall(
        [
            async.apply(listCollections, db),
            async.apply(filterCollections, options),
            async.apply(generateReport, database.name)
        ],
        callback
    );
}

/**
 * Analyses a collection of databases' collections data models
 * @param  {Object}   options  The options object including the following properties:
 *                               - database: The database to restrict the analysis to
 *                               - collection: The collection to restrict the analysis to
 * @param  {Array}   databases The collection of databases to analyse
 * @param  {Function} callback The callback
 */
function analyseDatabases(options, databases, callback) {
    async.map(databases, async.apply(analyseDatabase, options), callback);
}

/**
 * Returns a connection to the database asynchronously
 * @param  {Object}   params   The database connection parameters
 * @param  {Function} callback The callback
 */
function getDatabaseConnection(params, callback) {
    if (sthDatabase.connection) {
        process.nextTick(callback.bind(null, null, sthDatabase.connection));
    } else {
        sthDatabase.connect(
            params,
            callback
        );
    }
}

/**
 * Returns the result of the analysis of the available databases' collections data models
 * @param  {Object}   options  The options object including the following properties:
 *                               - database: The database to restrict the analysis to
 *                               - collection: The collection to restrict the analysis to
 * @param  {Function} callback The callback
 */
function getDataModelAnalysis(options, callback) {
    if (typeof options === 'function' && !callback) {
        callback = options;
        options = undefined;
    }
    async.waterfall(
        [
            async.apply(getDatabaseConnection, DATABASE_CONNECTION_PARAMS),
            listDatabasesInfo,
            async.apply(filterDatabases, options),
            async.apply(analyseDatabases, options),
            includeCurrentDataModel
        ],
        callback
    );
}

/**
 * Checks if the passed collection exists in certain database asynchronously
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function collectionExists(databaseName, collectionName, callback) {
    var db = sthDatabase.connection.db(databaseName);
    db.listCollections({ name: collectionName }).toArray(function(err, items) {
        process.nextTick(callback.bind(null, err, !!items.length));
    });
}

/**
 * Returns asynchronously the data model of a collection from its name and the database it belongs to
 * @param  {String}   databaseName       The database name
 * @param  {String}   collectionName     The collection name
 * @param  {Object}   databaseConnection The database connection
 * @param  {Function} callback           The callback
 */
function getDataModelFromName(databaseName, collectionName, callback) {
    var db = sthDatabase.connection.db(databaseName);
    async.waterfall([async.apply(db.collection.bind(db), collectionName), getDataModel], callback);
}

/**
 * Returns the target collection name asynchronously
 * @param  {Object} originCollectionParams The origin collection params
 */
function getTargetCollectionName(originCollectionParams) {
    if (originCollectionParams.isAggregated) {
        return sthDatabaseNaming.getAggregatedCollectionName(originCollectionParams);
    } else {
        return sthDatabaseNaming.getRawCollectionName(originCollectionParams);
    }
}

/**
 * Inferes the data associated to a collection from its name, if possible
 * @param  {String}   databaseName         The database name
 * @param  {String}   originCollectionName The collectin name
 * @param  {Function} callback             The callback
 */
function infereTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, callback) {
    var isAggregated = sthDatabase.isAggregated(originCollectionName),
        decodedOriginCollectionName = sthConfig.NAME_ENCODING
            ? sthDatabaseNameCodec.decodeCollectionName(originCollectionName)
            : originCollectionName,
        cleanedOriginCollectionName = decodedOriginCollectionName.substring(
            sthConfig.COLLECTION_PREFIX.length,
            decodedOriginCollectionName.length - (isAggregated ? '.aggr'.length : 0)
        ),
        cleanedOriginCollectionNameSplit = cleanedOriginCollectionName.split(sthConfig.NAME_SEPARATOR),
        servicePath,
        originCollectionNameParams;
    switch (cleanedOriginCollectionNameSplit.length) {
        case 3:
        case 2:
            servicePath = cleanedOriginCollectionNameSplit[0];
            originCollectionNameParams = {
                databaseName: databaseName,
                service: sthDatabaseNaming.getService(databaseName),
                servicePath: servicePath,
                isAggregated: isAggregated
            };
            return process.nextTick(
                callback.bind(null, null, {
                    databaseName: databaseName,
                    service: sthDatabaseNaming.getService(databaseName),
                    servicePath: servicePath,
                    entityId: cleanedOriginCollectionNameSplit[1],
                    entityType: cleanedOriginCollectionNameSplit[2],
                    collectionName: getTargetCollectionName(originCollectionNameParams),
                    isAggregated: isAggregated
                })
            );
        default:
            return process.nextTick(
                callback.bind(null, new sthError.CollectionDataInferenceError(databaseName, originCollectionName))
            );
    }
}

/**
 * Returns asynchronously the target collection data for a collection-per-entity to collection-per-service-path
 *  migration
 * @param  {String}   databaseName         The database name
 * @param  {String}   originCollectionName The origin collection name
 * @param  {String}   dictionary           The file name where the dictionary of collection names to collection
 *                                           associated data is stored
 * @param  {Function} callback             The callback
 */
function getTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, dictionary, callback) {
    var collectionFound = false;
    if (dictionary) {
        try {
            var dictionaryStream = fs.createReadStream(dictionary);
            dictionaryStream.on('error', function() {
                return infereTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, callback);
            });
            dictionaryStream
                .pipe(
                    csvParser({
                        headers: [
                            'collectionName',
                            'servicePath',
                            'entityId',
                            'entityType',
                            'attributeName',
                            'attributeType'
                        ]
                    })
                )
                .on('data', function(data) {
                    if (data.collectionName === originCollectionName) {
                        collectionFound = true;
                        var originCollectionNameParams = {
                            databaseName: databaseName,
                            service: sthDatabaseNaming.getService(databaseName),
                            servicePath: data.servicePath,
                            isAggregated: sthDatabase.isAggregated(originCollectionName)
                        };
                        var targetCollectionName = getTargetCollectionName(originCollectionNameParams);
                        return process.nextTick(
                            callback.bind(null, null, {
                                databaseName: databaseName,
                                service: sthDatabaseNaming.getService(databaseName),
                                servicePath: data.servicePath,
                                entityId: data.entityId,
                                entityType: data.entityType,
                                collectionName: targetCollectionName,
                                isAggregated: sthDatabase.isAggregated(targetCollectionName)
                            })
                        );
                    }
                })
                .on('end', function() {
                    if (!collectionFound) {
                        infereTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, callback);
                    }
                });
        } catch (err) {
            infereTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, callback);
        }
    } else {
        infereTargetCollectionDataFromCpE2CpSP(databaseName, originCollectionName, callback);
    }
}

/**
 * Transforms a document from a collection-per-entity data model to a collection-per-service-path data model collection
 * @param  {Object} originCollection     The origin collection
 * @param  {Object} targetCollectionData The data about the target collection
 * @param  {Object} doc                  The document to transform
 */
function transformFromCpE2CpSP(originCollection, targetCollectionData, doc) {
    if (sthDatabase.isAggregated(originCollection.s.name)) {
        doc._id.entityId = targetCollectionData.entityId;
        doc._id.entityType = targetCollectionData.entityType;
    } else {
        doc.entityId = targetCollectionData.entityId;
        doc.entityType = targetCollectionData.entityType;
    }
    return doc;
}

/**
 * Pipes a collection-per-entity data model collection to a collection-per-service-path data model collection once
 *  the document count of the original collection is available
 * @param  {Object}   params      Object enclosing the following params taken by this function as input:
 *                                  - collectionMigrationProgress: EventEmitter to notify progress events
 *                                  - databaseName: The database name
 *                                  - originCollectionName: The origin collection name
 *                                  - targetCollectionData: The target collection data
 *                                  - originCollection: The origin collection
 * @param  {Object}   options     The migration options object including the following properties:
 *                                  - removeCollection: Boolean indicating if the origin collection should be
 *                                                        removed after the migration
 *                                  - updateCollection: Boolean indicating if the migration progress should
 *                                                        take place even if the target collection already
 *                                                        exists
 * @param  {Number}   originCount The origin collection count
 * @param  {Function} callback    The callback
 */
function doPipeFromCpE2CpSP(params, options, originCount, callback) {
    var sthWritableStream = new STHWritableStream(
        sthDatabase.connection,
        params.databaseName,
        params.targetCollectionData.collectionName,
        originCount
    );
    params.originCollection
        .find({})
        .stream({
            transform: transformFromCpE2CpSP.bind(null, params.originCollection, params.targetCollectionData)
        })
        .pipe(sthWritableStream)
        .on('progress', params.collectionMigrationProgress.emit.bind(params.collectionMigrationProgress, 'progress'))
        .on('finish', callback);
}

/**
 * Pipes a collection-per-entity data model collection to a collection-per-service-path data model collection
 * @param  {Object}   params           Object enclosing the following params taken by this function as input:
 *                                       - collectionMigrationProgress EventEmitter to notify progress events
 *                                       - databaseName The database name
 *                                       - originCollectionName: The origin collection name
 *                                       - targetCollectionData: The target collection data
 * @param  {Object}   options          The migration options object including the following properties:
 *                                       - removeCollection: Boolean indicating if the origin collection should be
 *                                                             removed after the migration
 *                                       - updateCollection: Boolean indicating if the migration progress should
 *                                                             take place even if the target collection already
 *                                                             exists
 * @param  {Object}   originCollection The origin collection
 * @param  {Function} callback         The callback
 */
function pipeFromCpE2CpSP(params, options, originCollection, callback) {
    params.originCollection = originCollection;
    async.waterfall(
        [originCollection.count.bind(originCollection), async.apply(doPipeFromCpE2CpSP, params, options)],
        callback
    );
}

/**
 * Migrates a collection from the collection-per-entity data model to the collection-per-service-path data model
 * @param  {Object}   params               Object enclosing the following params taken by this function as input:
 *                                           - collectionMigrationProgress: EventEmitter to notify progress events
 *                                           - databaseName: The database name
 *                                           - originCollectionName: The origin collection name
 * @param  {Object}   options              The migration options object including the following properties:
 *                                           - removeCollection: Boolean indicating if the origin collection should be
 *                                                                 removed after the migration
 *                                           - updateCollection: Boolean indicating if the migration progress should
 *                                                                 take place even if the target collection already
 *                                                                 exists
 * @param  {Object}   targetCollectionData The data about the target collection
 * @param  {Function} callback             The callback
 */
function doMigrateFromCpE2CpSP(params, options, targetCollectionData, callback) {
    var db = sthDatabase.connection.db(params.databaseName);
    var functions = [];
    params.targetCollectionData = targetCollectionData;
    functions.push(
        async.apply(db.collection.bind(db), params.originCollectionName),
        async.apply(pipeFromCpE2CpSP, params, options)
    );
    async.waterfall(functions, callback);
}

/**
 * Checks that the new collection data is valid
 * @param  {String}   databaseName         The database name
 * @param  {Object}   options              The migration options object including the following properties:
 *                                           - removeCollection: Boolean indicating if the origin collection should be
 *                                                                 removed after the migration
 *                                           - updateCollection: Boolean indicating if the migration progress
 *                                                                 should take place even if the target collection
 *                                                                 already exists
 * @param  {Object}   targetCollectionData The data about the target collection
 * @param  {Function} callback             The callback
 */
function targetCollectionDataCheck(databaseName, options, targetCollectionData, callback) {
    if (!options.updateCollection) {
        collectionExists(databaseName, targetCollectionData.collectionName, function(err, result) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            } else if (result) {
                process.nextTick(
                    callback.bind(
                        null,
                        new sthError.CollectionExistsError(databaseName, targetCollectionData.collectionName)
                    )
                );
            } else {
                return process.nextTick(callback.bind(null, null, targetCollectionData));
            }
        });
    } else {
        return process.nextTick(callback.bind(null, null, targetCollectionData));
    }
}

/**
 * Migrates a collection of certain database from the collection-per-entity data model to the
 *  collection-per-service data model
 * @param  {Object}   params   The migration paramaters including the following properties:
 *                               - collectionMigrationProgress: EventEmitter to notify progress events
 *                               - databaseName: The database name
 *                               - originCollectionName: The collection name
 * @param  {Object}   options  The migration options object including the following properties:
 *                               - dictionary:       A dictionary to resolve the collection name to the
 *                                                     associated data (service path, entity id, entity type,
 *                                                     attribute name and attribute type)
 *                               - removeCollection: Boolean indicating if the origin collection should be
 *                                                     removed after the migration
 *                               - updateCollection: Boolean indicating if the migration progress should take place
 *                                                     even if the target collection already exists
 * @param  {Function} callback The callback
 */
function migrateFromCpE2CpSP(params, options, callback) {
    async.waterfall(
        [
            async.apply(
                getTargetCollectionDataFromCpE2CpSP,
                params.databaseName,
                params.originCollectionName,
                options.dictionary
            ),
            async.apply(targetCollectionDataCheck, params.databaseName, options),
            async.apply(doMigrateFromCpE2CpSP, params, options)
        ],
        callback
    );
}

/**
 * Migrates a collection from its current data model to the currently configured one
 * @param  {Object}   params          The migration paramaters including the following properties:
 *                                      - collectionMigrationProgress: EventEmitter to notify progress events
 *                                      - databaseName: The database name
 *                                      - originCollectionName: The collection name
 * @param  {Object}   options         The migration options object including the following properties:
 *                                      - dictionary:       A dictionary to resolve the collection name to the
 *                                                            associated data (service path, entity id, entity type,
 *                                                            attribute name and attribute type)
 *                                      - removeCollection: Boolean indicating if the origin collection should be
 *                                                            removed after the migration
 *                                      - updateCollection: Boolean indicating if the migration progress should take
 *                                                            place even if the target collection already exists
 * @param  {String}   originDataModel The data model
 * @param  {Function} callback        The callback
 */
function migrate2DataModel(params, options, originDataModel, callback) {
    switch (originDataModel) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            switch (sthConfig.DATA_MODEL) {
                case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
                    migrateFromCpE2CpSP(params, options, callback);
                    break;
                default:
                    return process.nextTick(
                        callback.bind(
                            null,
                            new sthError.NotSupportedMigration(
                                params.databaseName,
                                params.originCollectionName,
                                originDataModel,
                                sthConfig.DATA_MODEL
                            )
                        )
                    );
            }
            break;
        default:
            return process.nextTick(
                callback.bind(
                    null,
                    new sthError.NotSupportedMigration(
                        params.databaseName,
                        params.originCollectionName,
                        originDataModel,
                        sthConfig.DATA_MODEL
                    )
                )
            );
    }
}

/**
 * Checks if a collection exists
 * @param  {String}   databaseName       The database name
 * @param  {String}   collectionName     The collection name
 * @param  {Object}   databaseConnection The connection to the database
 * @param  {Function} callback           The callback
 */
function originCollectionCheck(databaseName, collectionName, databaseConnection, callback) {
    var error;
    collectionExists(databaseName, collectionName, function(err, collectionExistsResult) {
        if (err) {
            return process.nextTick(callback.bind(null, err));
        }
        if (!collectionExistsResult) {
            error = new sthError.NotExistentCollectionError(databaseName, collectionName);
        }
        process.nextTick(callback.bind(null, error));
    });
}

/**
 * Drops a collection from a database
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param   {Object}  options        The migration options object including the following properties:
 *                                     - removeCollection: Boolean indicating if the origin collection should be removed
 *                                                           after the migration
 *                                     - updateCollection: Boolean indicating if the migration progress
 *                                                           should take place even if the target collection already
 *                                                           exists
 * @param  {Function} callback       The callback
 */
function dropCollection(databaseName, collectionName, options, callback) {
    if (options.removeCollection) {
        var db = sthDatabase.connection.db(databaseName);
        db.dropCollection(collectionName, callback);
    } else {
        process.nextTick(callback);
    }
}

/**
 * Migrates a collection from its current data model to the configured one
 * @param   {String}       databaseName   The database name
 * @param   {String}       collectionName The collection name
 * @param   {Object}       options        The migration options object including the following properties:
 *                                          - dictionary:       A dictionary to resolve the collection name to the
 *                                                                associated data (service path, entity id, entity type,
 *                                                                attribute name and attribute type)
 *                                          - removeCollection: Boolean indicating if the origin collection should be
 *                                                                removed after the migration
 *                                          - updateCollection: Boolean indicating if the migration progress
 *                                                                should take place even if the target collection
 *                                                                already exists
 * @param   {Function}     callback       The callback
 * @returns {EventEmitter}                An EventEmitter instance to notify the progress of the migration process
 */
function migrateCollection(databaseName, collectionName, options, callback) {
    var collectionMigrationProgress = new events.EventEmitter();

    if (typeof options === 'function') {
        callback = options;
        options = {
            removeCollection: false,
            updateCollection: false
        };
    }

    async.waterfall(
        [
            async.apply(getDatabaseConnection, DATABASE_CONNECTION_PARAMS),
            async.apply(originCollectionCheck, databaseName, collectionName),
            async.apply(getDataModelFromName, databaseName, collectionName),
            async.apply(
                migrate2DataModel,
                {
                    collectionMigrationProgress: collectionMigrationProgress,
                    databaseName: databaseName,
                    originCollectionName: collectionName
                },
                options
            ),
            async.apply(dropCollection, databaseName, collectionName, options)
        ],
        callback
    );
    return collectionMigrationProgress;
}

module.exports = {
    cleanResources: cleanResources,
    getDataModelAnalysis: getDataModelAnalysis,
    migrateCollection: migrateCollection
};
