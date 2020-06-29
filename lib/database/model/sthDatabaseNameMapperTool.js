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

/* eslint-disable consistent-return */

const ROOT_PATH = require('app-root-path');
const async = require('async');
const sthLogger = require('logops');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
const sthDatabaseNameMapper = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapper');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const sthErrors = require(ROOT_PATH + '/lib/errors/sthErrors');

let analysisResult = {};

/**
 * Resets the analysis report
 */
function resetAnalysisResult(callback) {
    analysisResult = {};
    return process.nextTick(callback);
}

/**
 * Returns asynchronously the list of databases associated to a STH instance
 * @param  {Object}   connection The database associated to the STH instance
 * @param  {Function} callback   The callback accepting a possible error as its first param and the list of databases
 *                               as the second one
 */
function listDatabases(connection, callback) {
    const adminDB = connection.admin();
    adminDB.listDatabases(callback);
}

/**
 * Filters the databases associated to a STH instance
 * @param {Object}    options      An object including the following properties:
 *                                 - {Boolean} map        Flag indicating if the request is about a mapping
 *                                 process
 *                                 - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                 process
 *                                 - {String}  database   The database name to restrict the analysis to
 *                                 - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   databaseData The database data
 * @param  {Function} callback     The callback
 */
function databaseFilter(options, databaseData, callback) {
    callback(
        null,
        databaseData.name.indexOf(sthConfig.DB_PREFIX) === 0 &&
            (!options.database || (options.database && options.database === databaseData.name))
    );
}

/**
 * Filters the databases to only consider the ones associated to a STH instance
 * @param {Object}    options       An object including the following properties:
 *                                  - {Boolean} map        Flag indicating if the request is about a mapping
 *                                  process
 *                                  - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                  process
 *                                  - {String}  database   The database name to restrict the analysis to
 *                                  - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   databasesData Data about the databases to filter
 * @param  {Function} callback      The callback
 */
function filterDatabases(options, databasesData, callback) {
    async.filter(databasesData.databases, async.apply(databaseFilter, options), callback);
}

/**
 * Includes the associated database name to some collection database
 * @param {String}   databaseName   The database name
 * @param {Object}   collectionData The collection database
 * @param {Function} callback       The callback
 */
function addDatabaseName(databaseName, collectionData, callback) {
    collectionData.database = databaseName;
    return callback(null, collectionData);
}

/**
 * Lists the collections in certain databaseName
 * @param  {String}   databaseName The database name
 * @param  {Function} callback     The callback
 */
function listCollections(databaseName, callback) {
    sthDatabase.connection
        .db(databaseName)
        .listCollections()
        .toArray(function(err, collections) {
            if (collections) {
                async.map(collections, async.apply(addDatabaseName, databaseName), callback);
            }
        });
}

/**
 * Filters a collection from its database
 * @param {Object}    options        An object including the following properties:
 *                                   - {Boolean} map        Flag indicating if the request is about a mapping
 *                                   process
 *                                   - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                   process
 *                                   - {String}  database   The database name to restrict the analysis to
 *                                   - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   collectionData The collection database
 * @param  {Function} callback       The callback
 */
function collectionFilter(options, collectionData, callback) {
    return callback(
        null,
        collectionData.name.indexOf(sthConfig.COLLECTION_PREFIX) === 0 &&
            (!options.collection || (options.collection && options.collection === collectionData.name))
    );
}

/**
 * Filters the collections included in some collections database
 * @param {Object}    options         An object including the following properties:
 *                                    - {Boolean} map        Flag indicating if the request is about a mapping
 *                                    process
 *                                    - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                    process
 *                                    - {String}  database   The database name to restrict the analysis to
 *                                    - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   collectionsData The collections database
 * @param  {Function} callback        The callback
 */
function filterCollections(options, collectionsData, callback) {
    async.filter(collectionsData, async.apply(collectionFilter, options), callback);
}

/**
 * Analyses a collection from its associated data
 * @param {Object}    options        An object including the following properties:
 *                                   - {Boolean} map        Flag indicating if the request is about a mapping
 *                                   process
 *                                   - {Boolean} unmap     Flag indicating if the request is about an unmapping
 *                                   process
 *                                   - {String}  database   The database name to restrict the analysis to
 *                                   - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   collectionData The collection data
 * @param  {Function} callback       The callback
 */
function analyseCollection(options, collectionData, callback) {
    analysisResult[collectionData.database].collections = analysisResult[collectionData.database].collections || {};
    analysisResult[collectionData.database].collections[collectionData.name] = {
        name: options.map
            ? sthDatabaseNameMapper.mapCollectionName(
                  collectionData.database.substring(sthConfig.DB_PREFIX.length),
                  collectionData.name
              )
            : sthDatabaseNameMapper.unmapCollectionName(
                  collectionData.database.substring(sthConfig.DB_PREFIX.length),
                  collectionData.name
              )
    };
    process.nextTick(callback);
}

/**
 * Effectively analyses a group of collection from its associated data
 * @param {Object}    options         An object including the following properties:
 *                                    - {Boolean} map     Flag indicating if the request is about a mapping
 *                                    process
 *                                    - {Boolean} unmap     Flag indicating if the request is about an unmapping
 *                                    process
 *                                    - {String}  database   The database name to restrict the analysis to
 *                                    - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   collectionsData The collections database
 * @param  {Function} callback        The callback
 */
function doAnalyseCollections(options, collectionsData, callback) {
    async.each(collectionsData, async.apply(analyseCollection, options), callback);
}

/**
 * Analyses the collections in certain database
 * @param {Object}    options      An object including the following properties:
 *                                 - {Boolean} map     Flag indicating if the request is about a mapping
 *                                 process
 *                                 - {Boolean} unmap     Flag indicating if the request is about an unmapping
 *                                 process
 *                                 - {String}  database   The database name to restrict the analysis to
 *                                 - {String}  collection The collection name to restrict the analysis to
 * @param  {String}   databaseName The database name
 * @param  {Function} callback     The callback
 */
function analyseCollections(options, databaseName, callback) {
    async.seq(
        async.apply(listCollections, databaseName),
        async.apply(filterCollections, options),
        async.apply(doAnalyseCollections, options)
    )(callback);
}

/**
 * Analyses database data to generate the mapping/unmapping report for this database
 * @param {Object}    options      An object including the following properties:
 *                                 - {Boolean} map        Flag indicating if the request is about a mapping
 *                                 process
 *                                 - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                 process
 *                                 - {String}  database   The database name to restrict the analysis to
 *                                 - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   databaseData The database data
 * @param  {Function} callback     The callback
 */
function analyseDatabase(options, databaseData, callback) {
    analysisResult[databaseData.name] = {
        name: options.map
            ? sthDatabaseNameMapper.mapDatabaseName(databaseData.name)
            : sthDatabaseNameMapper.unmapDatabaseName(databaseData.name)
    };
    analyseCollections(options, databaseData.name, callback);
}

/**
 * Analyses a group of database data to generate a new mapping/unmapping report
 * @param {Object}    options       An object including the following properties:
 *                                  - {Boolean} map        Flag indicating if the request is about a mapping
 *                                  process
 *                                  - {Boolean} unmap     Flag indicating if the request is about an unmapping
 *                                  process
 *                                  - {String}  database   The database name to restrict the analysis to
 *                                  - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   databasesData The databases data
 * @param  {Function} callback      The callback
 */
function analyseDatabases(options, databasesData, callback) {
    async.each(databasesData, async.apply(analyseDatabase, options), callback);
}

/**
 * Removes from the mapping analysis information about collections and databases whose names do not change after the
 * mapping or unmapping
 * @param  {Function} callback The callback
 */
function cleanAnalysis(callback) {
    const databaseNames = Object.getOwnPropertyNames(analysisResult);
    databaseNames.forEach(function(databaseName) {
        if (analysisResult[databaseName].collections) {
            const collectionNames = Object.getOwnPropertyNames(analysisResult[databaseName].collections);
            collectionNames.forEach(function(collectionName) {
                if (collectionName === analysisResult[databaseName].collections[collectionName].name) {
                    delete analysisResult[databaseName].collections[collectionName];
                }
            });
            if (Object.keys(analysisResult[databaseName].collections).length === 0) {
                delete analysisResult[databaseName].collections;
                if (databaseName === analysisResult[databaseName].name) {
                    delete analysisResult[databaseName];
                }
            }
        } else if (databaseName === analysisResult[databaseName].name) {
            delete analysisResult[databaseName];
        }
    });
    process.nextTick(callback.bind(null, null, analysisResult));
}

/**
 * Shows the mapping report
 * @param {Object}   options  An object including the following properties:
 *                            - {Boolean} map        Flag indicating if the request is about a mapping process
 *                            - {Boolean} unmap      Flag indicating if the request is about an unmapping process
 *                            - {String}  database   The database name to restrict the analysis to
 *                            - {String}  collection The collection name to restrict the analysis to
 * @param {Function} callback A callback function accepting a possible error as the first parameter and the result
 *                            returned by the last function of the sequence
 */
function getMappingAnalysis(options, callback) {
    if (!options.map && !options.unmap) {
        return process.nextTick(
            callback.bind(
                null,
                new sthErrors.MandatoryOptionNotFound('Either the -m (--map) or the -u (--unmap) options are mandatory')
            )
        );
    }
    if (options.collection && !options.database) {
        return process.nextTick(
            callback.bind(
                null,
                new sthErrors.MandatoryOptionNotFound(
                    'The -b (--database) option is mandatory if the -c (--collection) option is set'
                )
            )
        );
    }
    async.seq(
        resetAnalysisResult,
        sthDatabase.connect.bind(null, {
            authentication: sthConfig.DB_AUTHENTICATION,
            dbURI: sthConfig.DB_URI,
            replicaSet: sthConfig.REPLICA_SET,
            database: sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE),
            poolSize: sthConfig.POOL_SIZE,
            authSource: sthConfig.DB_AUTH_SOURCE
        }),
        listDatabases,
        async.apply(filterDatabases, options),
        async.apply(analyseDatabases, options),
        cleanAnalysis
    )(callback);
}

/**
 * Maps or unmaps the name of certain collection in certain databaseName
 * @param {Object}    options        An object including the following properties:
 *                                   - {Boolean} map        Flag indicating if the request is about a mapping
 *                                   process
 *                                   - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                   process
 *                                   - {String}  database   The database name to restrict the analysis to
 *                                   - {String}  collection The collection name to restrict the analysis to
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function mapOrUnmapCollection(options, databaseName, collectionName, callback) {
    sthLogger.info(
        sthConfig.LOGGING_CONTEXT.DB_LOG,
        // prettier-ignore
        (options.map ? 'Mapping' : 'Unmapping') + " of collection '" + collectionName + "' of database '" +
            databaseName + "' started..."
    );

    sthDatabase.connection
        .db(databaseName)
        .renameCollection(
            collectionName,
            options.map
                ? sthDatabaseNameMapper.mapCollectionName(
                      databaseName.substring(sthConfig.DB_PREFIX.length),
                      collectionName
                  )
                : sthDatabaseNameMapper.unmapCollectionName(
                      databaseName.substring(sthConfig.DB_PREFIX.length),
                      collectionName
                  ),
            function(err) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                sthLogger.info(
                    sthConfig.LOGGING_CONTEXT.DB_LOG,
                    // prettier-ignore
                    (options.map ? 'Mapping' : 'Unmapping') + " of collection '" + collectionName + "' of database '" +
                        databaseName + "' successfully completed."
                );
                return process.nextTick(callback);
            }
        );
}

/**
 * Copies a database since this is the only way to rename it (the original database is removed afterwards)
 * @param {Object}    options      An object including the following properties:
 *                                 - {Boolean} map        Flag indicating if the request is about a mapping process
 *                                 - {Boolean} unmap      Flag indicating if the request is about an unmapping
 *                                 process
 *                                 - {String}  database   The database name to restrict the analysis to
 *                                 - {String}  collection The collection name to restrict the analysis to
 * @param  {String}   databaseName The database name
 * @param  {Function} callback     The callback
 */
function copyDatabase(options, databaseName, callback) {
    const adminDB = sthDatabase.connection.admin();
    const copyCommand = {
        copydb: 1,
        fromdb: databaseName,
        todb: options.map
            ? sthDatabaseNameMapper.mapDatabaseName(databaseName)
            : sthDatabaseNameMapper.unmapDatabaseName(databaseName)
    };
    adminDB.command(copyCommand, function onCopyDatabase(err) {
        if (err) {
            return process.nextTick(callback.bind(null, err));
        }
        sthDatabase.connection.db(databaseName).dropDatabase(function onDropDatabase(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            sthLogger.info(
                sthConfig.LOGGING_CONTEXT.DB_LOG,
                (options.map ? 'Mapping' : 'Unmapping') + " of database '" + databaseName + "' successfully completed."
            );
            process.nextTick(callback);
        });
    });
}

/**
 * Maps or unmaps the name of certain database and its collections
 * @param {Object}    options      An object including the following properties:
 *                                 - {Boolean} map        Flag indicating if the request is about a mapping process
 *                                 - {Boolean} unmap     Flag indicating if the request is about an unmapping
 *                                 process
 *                                 - {String}  database   The database name to restrict the analysis to
 *                                 - {String}  collection The collection name to restrict the analysis to
 * @param  {String}   databaseName The database name
 * @param  {Function} callback     The callback
 */
function mapOrUnmapDatabase(options, databaseName, callback) {
    sthLogger.info(
        sthConfig.LOGGING_CONTEXT.DB_LOG,
        (options.map ? 'Mapping' : 'Unmapping') + " of database '" + databaseName + "' started..."
    );

    let collectionNames;
    if (
        analysisResult[databaseName].collections &&
        Object.getOwnPropertyNames(analysisResult[databaseName].collections).length
    ) {
        collectionNames = Object.getOwnPropertyNames(analysisResult[databaseName].collections);
        async.eachSeries(
            collectionNames,
            async.apply(mapOrUnmapCollection, options, databaseName),
            function onMapOrUnmapCollection(err) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                if (databaseName !== analysisResult[databaseName].name) {
                    copyDatabase(options, databaseName, callback);
                } else {
                    sthLogger.info(
                        sthConfig.LOGGING_CONTEXT.DB_LOG,
                        // prettier-ignore
                        (options.map ? 'Mapping' : 'Unmapping') + " of database '" + databaseName +
                            ' successfully completed.'
                    );
                    process.nextTick(callback);
                }
            }
        );
    } else if (databaseName !== analysisResult[databaseName].name) {
        copyDatabase(options, databaseName, callback);
    } else {
        sthLogger.info(
            sthConfig.LOGGING_CONTEXT.DB_LOG,
            (options.map ? 'Mapping' : 'Unmapping') + " of database '" + databaseName + ' successfully completed.'
        );
        process.nextTick(callback);
    }
}

/**
 * Effectively maps or unmaps the name of the databases and collections included in certain mapping/unmapping
 * analysis
 * @param {Object}    options   An object including the following properties:
 *                              - {Boolean} map        Flag indicating if the request is about a mapping process
 *                              - {Boolean} unmap      Flag indicating if the request is about an unmapping process
 *                              - {String}  database   The database name to restrict the analysis to
 *                              - {String}  collection The collection name to restrict the analysis to
 * @param  {Object}   analysis The analysis
 * @param  {Function} callback The callback
 */
function doMapOrUnmap(options, analysis, callback) {
    const databaseNames = Object.getOwnPropertyNames(analysis);
    async.eachSeries(databaseNames, async.apply(mapOrUnmapDatabase, options), callback);
}

/**
 * Maps or unmaps the names of the databases and the collections included in certain mapping/unmapping analysis
 * @param {Object}   options  An object including the following properties:
 *                            - {Boolean} map        Flag indicating if the request is about a mapping process
 *                            - {Boolean} unmap      Flag indicating if the request is about an unmapping process
 *                            - {String}  database   The database name to restrict the analysis to
 *                            - {String}  collection The collection name to restrict the analysis to
 * @param  {Function} callback The callback
 */
function mapOrUnmap(options, callback) {
    if (!options.map && !options.unmap) {
        return process.nextTick(
            callback.bind(
                null,
                new sthErrors.MandatoryOptionNotFound('Either the -m (--map) or the -u (--unmap) options are mandatory')
            )
        );
    }
    if (options.collection && !options.database) {
        return process.nextTick(
            callback.bind(
                null,
                new sthErrors.MandatoryOptionNotFound(
                    'The -b (--database) option is mandatory if the -c (--collection) option is set'
                )
            )
        );
    }

    sthLogger.info(sthConfig.LOGGING_CONTEXT.DB_LOG, (options.map ? 'Mapping' : 'Unmapping') + ' process started...');

    async.seq(async.apply(getMappingAnalysis, options), async.apply(doMapOrUnmap, options))(callback);
}

module.exports = {
    getMappingAnalysis,
    mapOrUnmap
};
