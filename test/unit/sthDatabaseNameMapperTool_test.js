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
var async = require('async');
var expect = require('expect.js');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
var sthDatabaseNameMapper = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapper');
var sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
var sthDatabaseNameMapperTool = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapperTool');
var sthErrors = require(ROOT_PATH + '/lib/errors/sthErrors');
var sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');

var DEFAULT_SERVICE = sthConfig.DEFAULT_SERVICE;
var DATABASE_NAME = sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE);
var DATABASE_CONNECTION_PARAMS = {
    authentication: sthConfig.DB_AUTHENTICATION,
    dbURI: sthConfig.DB_URI,
    replicaSet: sthConfig.REPLICA_SET,
    database: DATABASE_NAME,
    poolSize: sthConfig.POOL_SIZE,
};
var COLLECTION_NAME_PARAMS = {
    service: DEFAULT_SERVICE,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME,
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
 * Creates a default raw and aggregated collections with no database
 * @param  {Function} callback The callback
 */
function createRawAndAggregatedCollections(callback) {
    async.series(
        [
            async.apply(sthDatabase.getCollection, COLLECTION_NAME_PARAMS, {
                shouldCreate: true,
            }),
            async.apply(sthDatabase.getCollection, COLLECTION_NAME_PARAMS, {
                shouldCreate: true,
                isAggregated: true,
            }),
        ],
        callback
    );
}

/**
 * Asynchronously checks if a collection exists in certain database
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function checkCollectionExists(databaseName, collectionName, callback) {
    sthDatabase.connection
        .db(databaseName)
        .listCollections({ name: collectionName })
        .toArray(function(err, collections) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            return process.nextTick(callback.bind(null, err, collections.length === 1));
        });
}

/**
 * Drops the databases created during the tests
 * @param  {Function} callback The callback
 */
function dropDatabases(callback) {
    sthDatabase.connection.db(DATABASE_NAME.toLowerCase()).dropDatabase(function(err) {
        if (err) {
            return process.nextTick(callback.bind(null, err));
        }
        sthDatabase.connection.db(DATABASE_NAME).dropDatabase(function(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            sthDatabase.connection.db(sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME)).dropDatabase(callback);
        });
    });
}

/**
 * Test to check that either the -m, --map or -u, --unmap options are set
 * @param  {Function} function2Test The function to test
 * @param  {Function} callback      The callback
 */
function mapUnmapMandatoryOptionsTest(function2Test, callback) {
    function2Test({}, function(err) {
        expect(err instanceof sthErrors.MandatoryOptionNotFound).to.be.ok();
        process.nextTick(callback);
    });
}

/**
 * Test to check that either the -m, --map or -u, --unmap options are set
 * @param  {Function} function2Test The function to test
 * @param  {Function} callback      The callback
 */
function collectionAndDatabaseMandatoryOptionsTest(function2Test, callback) {
    function2Test(
        {
            collection: sthConfig.COLLECTION_PREFIX + 'any_collection',
        },
        function(err) {
            expect(err instanceof sthErrors.MandatoryOptionNotFound).to.be.ok();
            process.nextTick(callback);
        }
    );
}

/**
 * Test to check that a collection has been detected as susceptible of being mapped or unmapped
 * @param  {String}   mappingFlag    Flag indicating if the test is for the mapping or unmapping process
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function shouldDetectCollectionTest(mappingFlag, databaseName, collectionName, callback) {
    sthDatabaseNameMapperTool.getMappingAnalysis(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
        },
        function(err, analysis) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            expect(analysis[databaseName]).to.not.be(undefined);
            expect(analysis[databaseName].collections).to.not.be(undefined);
            expect(analysis[databaseName].collections[collectionName].name).to.not.equal(collectionName);
            return process.nextTick(callback);
        }
    );
}

/**
 * Test to check that a collection should not be detected as susceptible of being mapped or unmapped
 * @param  {String}   mappingFlag  Flag indicating if the test is for the mapping or unmapping process
 * @param  {Function} callback     The callback
 */
function shouldNotDetectCollectionTest(mappingFlag, databaseName, collectionName, callback) {
    sthDatabaseNameMapperTool.getMappingAnalysis(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
            database: databaseName,
            collection: collectionName,
        },
        function(err, analysis) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            expect(
                !analysis[databaseName] ||
                    !analysis[databaseName].collections ||
                    !analysis[databaseName].collections[collectionName]
            ).to.be(true);
            return process.nextTick(callback);
        }
    );
}

/**
 * Asynchronously checks if a database exists
 * @param  {String}   databaseName The database to checks
 * @param  {Function} callback     The callback
 */
function checkDatabaseExists(databaseName, callback) {
    var adminDB = sthDatabase.connection.admin();
    adminDB.listDatabases(function(err, databases) {
        var databaseFound = false;
        databases.databases.forEach(function(database) {
            if (database.name === databaseName) {
                databaseFound = true;
                return process.nextTick(callback.bind(null, null, databaseFound));
            }
        });
        if (!databaseFound) {
            return process.nextTick(callback.bind(null, null, false));
        }
    });
}

/**
 * Test to check a collection name mapping
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   mappingFlag    Flag indicating if the test is for the mapping or unmapping process
 * @param  {Function} callback       The callback
 */
function shouldMapOrUnmapDatabaseTest(databaseName, mappingFlag, callback) {
    sthDatabaseNameMapperTool.mapOrUnmap(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
            database: databaseName,
        },
        function(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            checkDatabaseExists(databaseName, function(err, exists) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                expect(exists).to.be.equal(false);
                checkDatabaseExists(
                    mappingFlag
                        ? sthDatabaseNameMapper.mapDatabaseName(databaseName)
                        : sthDatabaseNameMapper.unmapDatabaseName(databaseName),
                    function(err, exists) {
                        if (err) {
                            return process.nextTick(callback.bind(null, err));
                        }
                        expect(exists).to.be.equal(true);
                        process.nextTick(callback);
                    }
                );
            });
        }
    );
}

/**
 * Test to check a collection name mapping is not made
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   mappingFlag    Flag indicating if the test is for the mapping or unmapping process
 * @param  {Function} callback       The callback
 */
function shouldNotMapOrUnmapDatabaseTest(databaseName, mappingFlag, callback) {
    sthDatabaseNameMapperTool.mapOrUnmap(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
            database: databaseName,
        },
        function(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            checkDatabaseExists(databaseName, function(err, exists) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                expect(exists).to.be.equal(true);
                process.nextTick(callback);
            });
        }
    );
}

/**
 * Test to check a collection name mapping
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   mappingFlag    Flag indicating if the test is for the mapping or unmapping process
 * @param  {Function} callback       The callback
 */
function shouldMapOrUnmapCollectionTest(databaseName, collectionName, mappingFlag, callback) {
    sthDatabaseNameMapperTool.mapOrUnmap(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
            database: databaseName,
            collection: collectionName,
        },
        function(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            checkCollectionExists(databaseName, collectionName, function(err, exists) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                expect(exists).to.be.equal(false);
                checkCollectionExists(
                    mappingFlag
                        ? sthDatabaseNameMapper.mapDatabaseName(databaseName)
                        : sthDatabaseNameMapper.unmapDatabaseName(databaseName),
                    mappingFlag
                        ? sthDatabaseNameMapper.mapCollectionName(
                              sthDatabaseNaming.getService(databaseName),
                              collectionName
                          )
                        : sthDatabaseNameMapper.unmapCollectionName(
                              sthDatabaseNameMapper.mapService(sthDatabaseNaming.getService(databaseName)),
                              collectionName
                          ),
                    function(err, exists) {
                        if (err) {
                            return process.nextTick(callback.bind(null, err));
                        }
                        expect(exists).to.be.equal(true);
                        process.nextTick(callback);
                    }
                );
            });
        }
    );
}

/**
 * Test to check a collection name mapping it not made
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   mappingFlag    Flag indicating if the test is for the mapping or unmapping process
 * @param  {Function} callback       The callback
 */
function shouldNotMapOrUnmapCollectionTest(databaseName, collectionName, mappingFlag, callback) {
    sthDatabaseNameMapperTool.mapOrUnmap(
        {
            map: !!mappingFlag,
            unmap: !mappingFlag,
            database: databaseName,
            collection: collectionName,
        },
        function(err) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            checkCollectionExists(databaseName, collectionName, function(err, exists) {
                if (err) {
                    return process.nextTick(callback.bind(null, err));
                }
                expect(exists).to.be.equal(true);
                process.nextTick(callback);
            });
        }
    );
}

describe('sthDatabaseNameMapperTool tests', function() {
    var ORIGINAL_NAME_MAPPING = sthConfig.NAME_MAPPING;

    describe('getMappingAnalysis tests', function() {
        describe('name mapping disabled', function() {
            sthConfig.NAME_MAPPING = undefined;
            before(function(done) {
                sthConfig.NAME_MAPPING = undefined;
                async.series([connectToDatabase, dropDatabases, createRawAndAggregatedCollections], done);
            });

            it(
                'should raise an error if neither -m, --map or -u, --unmap options are set',
                mapUnmapMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.getMappingAnalysis)
            );

            it(
                'should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.getMappingAnalysis)
            );

            it("should not detect database '" + DATABASE_NAME + "' as susceptible of being mapped", function(done) {
                sthDatabaseNameMapperTool.getMappingAnalysis(
                    {
                        map: true,
                    },
                    function(err, analysis) {
                        if (err) {
                            return done(err);
                        }
                        expect(analysis[DATABASE_NAME]).to.equal(undefined);
                        done();
                    }
                );
            });

            it(
                "should not detect database '" + DATABASE_NAME + "' as susceptible of being mapped if filtered out",
                function(done) {
                    sthDatabaseNameMapperTool.getMappingAnalysis(
                        {
                            map: true,
                            database: sthConfig.DB_PREFIX + 'inexistent_database',
                        },
                        function(err, analysis) {
                            if (err) {
                                return done(err);
                            }
                            expect(analysis[DATABASE_NAME]).to.be(undefined);
                            done();
                        }
                    );
                }
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    DATABASE_NAME +
                    "' as susceptible of being mapped",
                shouldNotDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    DATABASE_NAME +
                    "' as susceptible of being mapped if filtered out",
                shouldNotDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthConfig.COLLECTION_PREFIX + 'inexistent_collection'
                )
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    DATABASE_NAME +
                    "' as susceptible of being mapped",
                shouldNotDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    DATABASE_NAME +
                    "' as susceptible of being mapped if filtered out",
                shouldNotDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthConfig.COLLECTION_PREFIX + 'inexistent_collection'
                )
            );

            after(function() {
                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
            });
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });

        describe('name mapping enabled', function() {
            sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
            before(function(done) {
                sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            it(
                'should raise an error if neither -m, --map or -u, --unmap options are set',
                mapUnmapMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.getMappingAnalysis)
            );

            it(
                'should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.getMappingAnalysis)
            );

            it(
                "should detect database '" +
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME) +
                    "' as susceptible of being unmapped",
                function(done) {
                    sthDatabaseNameMapperTool.getMappingAnalysis(
                        {
                            map: false,
                            unmap: true,
                        },
                        function(err, analysis) {
                            if (err) {
                                return done(err);
                            }
                            expect(analysis[sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME)]).to.not.equal(
                                undefined
                            );
                            done();
                        }
                    );
                }
            );

            it(
                "should not detect database '" +
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME) +
                    "' as susceptible of being mapped if filtered out",
                function(done) {
                    sthDatabaseNameMapperTool.getMappingAnalysis(
                        {
                            map: false,
                            unmap: true,
                            database: sthConfig.DB_PREFIX + 'inexistent_database',
                        },
                        function(err, analysis) {
                            if (err) {
                                return done(err);
                            }
                            expect(analysis[sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME)]).to.be(undefined);
                            done();
                        }
                    );
                }
            );

            it(
                "should detect collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) +
                    "' as susceptible of " +
                    'being unmapped',
                shouldDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) +
                    "' as susceptible of being unmapped if filtered out",
                shouldNotDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthConfig.COLLECTION_PREFIX + 'inexistent_collection'
                )
            );

            it(
                "should detect collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) +
                    "' as susceptible of being unmapped",
                shouldDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            it(
                "should not detect collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    "' of database '" +
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) +
                    "' as susceptible of being unmapped if filtered out",
                shouldNotDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthConfig.COLLECTION_PREFIX + 'inexistent_collection'
                )
            );

            after(function() {
                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
            });
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });
    });

    describe('mapOrUnmap tests', function() {
        describe('name mapping disabled', function() {
            sthConfig.NAME_MAPPING = undefined;
            before(function(done) {
                sthConfig.NAME_MAPPING = undefined;
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            it(
                'should raise an error if neither -m, --map or -u, --unmap options are set',
                mapUnmapMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.mapOrUnmap)
            );

            it(
                'should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.mapOrUnmap)
            );

            it(
                "should not map the database '" + DATABASE_NAME,
                shouldNotMapOrUnmapDatabaseTest.bind(null, DATABASE_NAME, true)
            );

            it(
                "should not map the collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    " of database '" +
                    DATABASE_NAME +
                    "'",
                shouldNotMapOrUnmapCollectionTest.bind(
                    null,
                    DATABASE_NAME,
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS),
                    true
                )
            );

            it(
                "should not map the collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    " of database '" +
                    DATABASE_NAME +
                    "'",
                shouldNotMapOrUnmapCollectionTest.bind(
                    null,
                    DATABASE_NAME,
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS),
                    true
                )
            );

            after(function() {
                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
            });
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });

        describe('name mapping enabled', function() {
            sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
            before(function(done) {
                sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            it(
                'should raise an error if neither -m, --map or -u, --unmap options are set',
                mapUnmapMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.mapOrUnmap)
            );

            it(
                'should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameMapperTool.mapOrUnmap)
            );

            it(
                "should unmap the database '" +
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME) +
                    "' as '" +
                    DATABASE_NAME +
                    "'",
                shouldMapOrUnmapDatabaseTest.bind(null, sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME), false)
            );

            it(
                "should unmap the collection '" +
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                    "' as '" +
                    sthDatabaseNameMapper.unmapCollectionName(
                        sthDatabaseNameMapper.mapService(DEFAULT_SERVICE),
                        sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                    ) +
                    "' and the database '" +
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME) +
                    "' as '" +
                    DATABASE_NAME +
                    "'",
                shouldMapOrUnmapCollectionTest.bind(
                    null,
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME),
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS),
                    false
                )
            );

            it(
                "should unmap the collection '" +
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                    "' as '" +
                    sthDatabaseNameMapper.unmapCollectionName(
                        sthDatabaseNameMapper.mapService(DEFAULT_SERVICE),
                        sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                    ) +
                    "' and the database '" +
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME) +
                    "' as '" +
                    DATABASE_NAME +
                    "'",
                shouldMapOrUnmapCollectionTest.bind(
                    null,
                    sthDatabaseNameMapper.mapDatabaseName(DATABASE_NAME),
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS),
                    false
                )
            );

            after(function(done) {
                sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
                dropDatabases(done);
            });
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });
    });
});
