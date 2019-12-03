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
const expect = require('expect.js');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');
const sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const sthDatabaseNameCodecTool = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodecTool');
const sthErrors = require(ROOT_PATH + '/lib/errors/sthErrors');
const sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');

const DEFAULT_SERVICE = sthConfig.DEFAULT_SERVICE.replace(/s/g, 'S');
const DATABASE_NAME = sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE);
const DATABASE_CONNECTION_PARAMS = {
    authentication: sthConfig.DB_AUTHENTICATION,
    dbURI: sthConfig.DB_URI,
    replicaSet: sthConfig.REPLICA_SET,
    database: DATABASE_NAME,
    poolSize: sthConfig.POOL_SIZE
};
const COLLECTION_NAME_PARAMS = {
    service: DEFAULT_SERVICE,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
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
 * Creates a default raw and aggregated collections with no database
 * @param  {Function} callback The callback
 */
function createRawAndAggregatedCollections(callback) {
    async.series(
        [
            async.apply(sthDatabase.getCollection, COLLECTION_NAME_PARAMS, {
                shouldCreate: true
            }),
            async.apply(sthDatabase.getCollection, COLLECTION_NAME_PARAMS, {
                shouldCreate: true,
                isAggregated: true
            })
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
            sthDatabase.connection.db(sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME)).dropDatabase(callback);
        });
    });
}

/**
 * Test to check that either the -e, --encode or -d, --decode options are set
 * @param  {Function} function2Test The function to test
 * @param  {Function} callback      The callback
 */
function encodeDecodeMandatoryOptionsTest(function2Test, callback) {
    function2Test({}, function(err) {
        expect(err instanceof sthErrors.MandatoryOptionNotFound).to.be.ok();
        process.nextTick(callback);
    });
}

/**
 * Test to check that either the -e, --encode or -d, --decode options are set
 * @param  {Function} function2Test The function to test
 * @param  {Function} callback      The callback
 */
function collectionAndDatabaseMandatoryOptionsTest(function2Test, callback) {
    function2Test(
        {
            collection: sthConfig.COLLECTION_PREFIX + 'any_collection'
        },
        function(err) {
            expect(err instanceof sthErrors.MandatoryOptionNotFound).to.be.ok();
            process.nextTick(callback);
        }
    );
}

/**
 * Test to check that a collection has been detected as susceptible of being encoded or decoded
 * @param  {String}   encodingFlag   Flag indicating if the test is for the encoding or decoding process
 * @param  {String}   collectionName The collection name
 * @param  {Function} callback       The callback
 */
function shouldDetectCollectionTest(encodingFlag, databaseName, collectionName, callback) {
    sthDatabaseNameCodecTool.getEncodingAnalysis(
        {
            encode: !!encodingFlag,
            decode: !encodingFlag
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
 * Test to check that a collection should not be detected as susceptible of being encoded or decoded
 * @param  {String}   encodingFlag Flag indicating if the test is for the encoding or decoding process
 * @param  {Function} callback     The callback
 */
function shouldNotDetectCollectionTest(encodingFlag, databaseName, callback) {
    sthDatabaseNameCodecTool.getEncodingAnalysis(
        {
            encode: !!encodingFlag,
            decode: !encodingFlag,
            database: databaseName,
            collection: sthConfig.COLLECTION_PREFIX + 'inexistent_collection'
        },
        function(err, analysis) {
            if (err) {
                return process.nextTick(callback.bind(null, err));
            }
            expect(analysis[databaseName]).to.not.be(undefined);
            expect(analysis[databaseName].collections).to.be(undefined);
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
    const adminDB = sthDatabase.connection.admin();
    adminDB.listDatabases(function(err, databases) {
        let databaseFound = false;
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
 * Test to check a collection name encoding
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   encodingFlag   Flag indicating if the test is for the encoding or decoding process
 * @param  {Function} callback       The callback
 */
function shouldEncodeOrDecodeDatabaseTest(databaseName, encodingFlag, callback) {
    sthDatabaseNameCodecTool.encodeOrDecode(
        {
            encode: !!encodingFlag,
            decode: !encodingFlag,
            database: databaseName
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
                    encodingFlag
                        ? sthDatabaseNameCodec.encodeDatabaseName(databaseName)
                        : sthDatabaseNameCodec.decodeDatabaseName(databaseName),
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
 * Test to check a collection name encoding
 * @param  {String}   databaseName   The database name
 * @param  {String}   collectionName The collection name
 * @param  {String}   encodingFlag   Flag indicating if the test is for the encoding or decoding process
 * @param  {Function} callback       The callback
 */
function shouldEncodeOrDecodeCollectionTest(databaseName, collectionName, encodingFlag, callback) {
    sthDatabaseNameCodecTool.encodeOrDecode(
        {
            encode: !!encodingFlag,
            decode: !encodingFlag,
            database: databaseName,
            collection: collectionName
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
                    encodingFlag
                        ? sthDatabaseNameCodec.encodeDatabaseName(databaseName)
                        : sthDatabaseNameCodec.decodeDatabaseName(databaseName),
                    encodingFlag
                        ? sthDatabaseNameCodec.encodeCollectionName(collectionName)
                        : sthDatabaseNameCodec.decodeCollectionName(collectionName),
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

describe('sthDatabaseNameCodecTool tests', function() {
    this.timeout(5000);
    const ORIGINAL_NAME_ENCODING = sthConfig.NAME_ENCODING;
    const ORIGINAL_NAME_SEPARATOR = sthConfig.NAME_SEPARATOR;

    describe('getEncodingAnalysis tests', function() {
        describe('name encoding disabled', function() {
            sthConfig.NAME_ENCODING = false;
            sthConfig.NAME_SEPARATOR = '_';
            before(function(done) {
                sthConfig.NAME_ENCODING = false;
                sthConfig.NAME_SEPARATOR = '_';
                async.series([connectToDatabase, dropDatabases, createRawAndAggregatedCollections], done);
            });

            // prettier-ignore
            it('should raise an error if neither -e, --encode or -d, --decode options are set',
                encodeDecodeMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.getEncodingAnalysis)
            );

            // prettier-ignore
            it('should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.getEncodingAnalysis)
            );

            it("should detect database '" + DATABASE_NAME + "' as susceptible of being encoded", function(done) {
                sthDatabaseNameCodecTool.getEncodingAnalysis(
                    {
                        encode: true
                    },
                    function(err, analysis) {
                        if (err) {
                            return done(err);
                        }
                        expect(analysis[DATABASE_NAME].name).to.not.equal(DATABASE_NAME);
                        done();
                    }
                );
            });

            // prettier-ignore
            it("should not detect database '" + DATABASE_NAME + "' as susceptible of being encoded if filtered out",
                function(done) {
                    sthDatabaseNameCodecTool.getEncodingAnalysis(
                        {
                            encode: true,
                            database: sthConfig.DB_PREFIX + 'inexistent_database'
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

            // prettier-ignore
            it("should detect collection '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                "' of database '" + DATABASE_NAME + "' as susceptible of being encoded",
                shouldDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            // prettier-ignore
            it("should not detect collection '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) +
                "' of database '" + DATABASE_NAME + "' as susceptible of being encoded if filtered out",
                shouldNotDetectCollectionTest.bind(null, true, DATABASE_NAME)
            );

            // prettier-ignore
            it("should detect collection '" + sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) +
                "' of database '" + DATABASE_NAME + "' as susceptible of being encoded",
                shouldDetectCollectionTest.bind(
                    null,
                    true,
                    DATABASE_NAME,
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            // prettier-ignore
            it("should not detect collection '" + 
                sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) + "' of database '" + 
                DATABASE_NAME + "' as susceptible of being encoded if filtered out",
                shouldNotDetectCollectionTest.bind(null, true, DATABASE_NAME)
            );

            after(function() {
                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
                sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
            });
            sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
            sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
        });

        describe('name encoding enabled', function() {
            sthConfig.NAME_ENCODING = true;
            sthConfig.NAME_SEPARATOR = 'xffff';
            before(function(done) {
                sthConfig.NAME_ENCODING = true;
                sthConfig.NAME_SEPARATOR = 'xffff';
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            // prettier-ignore
            it('should raise an error if neither -e, --encode or -d, --decode options are set',
                encodeDecodeMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.getEncodingAnalysis)
            );

            // prettier-ignore
            it('should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.getEncodingAnalysis)
            );

            // prettier-ignore
            it("should detect collection '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) + 
                "' of database '" + sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) + "' as susceptible of " + 
                'being decoded',
                shouldDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            // prettier-ignore
            it("should not detect collection '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) + 
                "' of database '" + sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) + 
                "' as susceptible of being decoded if filtered out",
                shouldNotDetectCollectionTest.bind(null, false, sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE))
            );

            // prettier-ignore
            it("should detect collection '" + sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) + 
                "' of database '" + sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) + 
                "' as susceptible of being decoded",
                shouldDetectCollectionTest.bind(
                    null,
                    false,
                    sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE),
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                )
            );

            // prettier-ignore
            it("should not detect collection '" + 
                sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) + "' of database '" +
                sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE) + 
                "' as susceptible of being decoded if filtered out",
                shouldNotDetectCollectionTest.bind(null, false, sthDatabaseNaming.getDatabaseName(DEFAULT_SERVICE))
            );

            after(function() {
                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
                sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
            });
            sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
            sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
        });
    });

    describe('encodeOrDecode tests', function() {
        describe('name encoding disabled', function() {
            sthConfig.NAME_ENCODING = false;
            sthConfig.NAME_SEPARATOR = '_';
            before(function(done) {
                sthConfig.NAME_ENCODING = false;
                sthConfig.NAME_SEPARATOR = '_';
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            // prettier-ignore
            it('should raise an error if neither -e, --encode or -d, --decode options are set',
                encodeDecodeMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.encodeOrDecode)
            );

            // prettier-ignore
            it('should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.encodeOrDecode)
            );

            // prettier-ignore
            it("should encode the database '" + DATABASE_NAME + "' as '" + 
                sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "'",
                shouldEncodeOrDecodeDatabaseTest.bind(null, DATABASE_NAME, true)
            );

            // prettier-ignore
            it("should encode the collection '" + 
                sthDatabaseNameCodec.decodeCollectionName(
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                ) + "' as '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) + 
                "' and the database '" + DATABASE_NAME + "' as '" + 
                sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "'",
                shouldEncodeOrDecodeCollectionTest.bind(
                    null,
                    DATABASE_NAME,
                    sthDatabaseNameCodec.decodeCollectionName(
                        sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                    ),
                    true
                )
            );

            // prettier-ignore
            it("should encode the collection '" + sthDatabaseNameCodec.decodeCollectionName(
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                ) + "' as '" + sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) + 
                "' and the database '" + DATABASE_NAME + "' as '" + 
                sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "'",
                shouldEncodeOrDecodeCollectionTest.bind(
                    null,
                    DATABASE_NAME,
                    sthDatabaseNameCodec.decodeCollectionName(
                        sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                    ),
                    true
                )
            );

            after(function() {
                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
                sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
            });
            sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
            sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
        });

        describe('name encoding enabled', function() {
            sthConfig.NAME_ENCODING = true;
            sthConfig.NAME_SEPARATOR = 'xffff';
            before(function(done) {
                sthConfig.NAME_ENCODING = true;
                sthConfig.NAME_SEPARATOR = 'xffff';
                async.series([dropDatabases, createRawAndAggregatedCollections], done);
            });

            // prettier-ignore
            it('should raise an error if neither -e, --encode or -d, --decode options are set',
                encodeDecodeMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.encodeOrDecode)
            );

            // prettier-ignore
            it('should raise an error if the -b, --database is not set when the -c, --collection is set',
                collectionAndDatabaseMandatoryOptionsTest.bind(null, sthDatabaseNameCodecTool.encodeOrDecode)
            );

            // prettier-ignore
            it("should decode the database '" + sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "' as '" +
             DATABASE_NAME + "'",
                shouldEncodeOrDecodeDatabaseTest.bind(
                    null,
                    sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME),
                    false
                )
            );

            // prettier-ignore
            it("should decode the collection '" + sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS) + 
                "' as '" + sthDatabaseNameCodec.decodeCollectionName(
                        sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS)
                    ) + "' and the database '" + sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "' as '" + 
                DATABASE_NAME + "'",
                shouldEncodeOrDecodeCollectionTest.bind(
                    null,
                    sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME),
                    sthDatabaseNaming.getRawCollectionName(COLLECTION_NAME_PARAMS),
                    false
                )
            );

            // prettier-ignore
            it("should decode the collection '" + 
                sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS) + "' as '" + 
                sthDatabaseNameCodec.decodeCollectionName(
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS)
                ) + "' and the database '" + sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME) + "' as '" + 
                DATABASE_NAME + "'",
                shouldEncodeOrDecodeCollectionTest.bind(
                    null,
                    sthDatabaseNameCodec.encodeDatabaseName(DATABASE_NAME),
                    sthDatabaseNaming.getAggregatedCollectionName(COLLECTION_NAME_PARAMS),
                    false
                )
            );

            after(function(done) {
                sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
                sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
                dropDatabases(done);
            });
            sthConfig.NAME_ENCODING = ORIGINAL_NAME_ENCODING;
            sthConfig.NAME_SEPARATOR = ORIGINAL_NAME_SEPARATOR;
        });
    });
});
