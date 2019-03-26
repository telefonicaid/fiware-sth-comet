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

var ROOT_PATH = require('app-root-path');
var sth = require(ROOT_PATH + '/lib/sth');
var sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthTestUtils = require(ROOT_PATH + '/test/unit/sthTestUtils.js');
var sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
var hapi = require('hapi');
var request = require('request');
var expect = require('expect.js');

console.log('*** Running the server tests with the following environment variables:');
console.log('\n***** STH app environment variables:');
console.log(sthConfig);
console.log('\n***** Unit tests environment variables:');
console.log(sthTestConfig);

describe('sth tests', function() {
    describe('database connection', function() {
        it('should be a database available', function(done) {
            sth.sthDatabase.connect(
                {
                    authentication: sthConfig.DB_AUTHENTICATION,
                    dbURI: sthConfig.DB_URI,
                    replicaSet: sthConfig.REPLICA_SET,
                    database: sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE),
                    poolSize: sthConfig.POOL_SIZE
                },
                function(err) {
                    done(err);
                }
            );
        });
    });

    describe('database clean up', sthTestUtils.cleanDatabaseSuite);

    describe('server start', function() {
        it('should start gracefully', function(done) {
            sth.sthServer.startServer(sthConfig.STH_HOST, sthConfig.STH_PORT, function(err, server) {
                expect(err).to.equal(null);
                expect(server).to.be.a(hapi.Server);
                done();
            });
        });
    });

    describe('invalid routes', function() {
        it('should respond with 404 - Not Found if invalid HTTP method', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.READ),
                    method: 'PUT'
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(404);
                    expect(bodyJSON.statusCode).to.equal(404);
                    expect(bodyJSON.error).to.equal('Not Found');
                    done();
                }
            );
        });

        it('should respond with 404 - Not Found if invalid path', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.READ, {
                        invalidPath: true
                    }),
                    method: 'GET'
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(404);
                    expect(bodyJSON.statusCode).to.equal(404);
                    expect(bodyJSON.error).to.equal('Not Found');
                    done();
                }
            );
        });

        it('should respond with 400 - Bad Request if missing Fiware-Service header', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.READ),
                    method: 'GET'
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(400);
                    expect(bodyJSON.statusCode).to.equal(400);
                    expect(bodyJSON.error).to.equal('Bad Request');
                    done();
                }
            );
        });

        it('should respond with 400 - Bad Request if missing Fiware-ServicePath header', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.READ),
                    method: 'GET',
                    headers: {
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(400);
                    expect(bodyJSON.statusCode).to.equal(400);
                    expect(bodyJSON.error).to.equal('Bad Request');
                    done();
                }
            );
        });

        it(
            'should respond with 400 - Bad Request if missing lastN, hLimit and hOffset or aggrMethod and aggrPeriod ' +
                'query params',
            function(done) {
                request(
                    {
                        uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.READ),
                        method: 'GET',
                        headers: {
                            'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                            'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                        }
                    },
                    function(err, response, body) {
                        var bodyJSON = JSON.parse(body);
                        expect(err).to.equal(null);
                        expect(response.statusCode).to.equal(400);
                        expect(bodyJSON.statusCode).to.equal(400);
                        expect(bodyJSON.error).to.equal('Bad Request');
                        expect(bodyJSON.validation.source).to.equal('query');
                        expect(bodyJSON.validation.keys).to.be.an(Array);
                        expect(bodyJSON.validation.keys.indexOf('lastN')).to.not.equal(-1);
                        expect(bodyJSON.validation.keys.indexOf('hLimit')).to.not.equal(-1);
                        expect(bodyJSON.validation.keys.indexOf('hOffset')).to.not.equal(-1);
                        expect(bodyJSON.validation.keys.indexOf('aggrMethod')).to.not.equal(-1);
                        expect(bodyJSON.validation.keys.indexOf('aggrPeriod')).to.not.equal(-1);
                        done();
                    }
                );
            }
        );

        it('should respond with 200 - OK if lastN query param', sthTestUtils.status200Test.bind(null, { lastN: 1 }));

        it(
            'should respond with 200 - OK if lastN and count query params',
            sthTestUtils.status200Test.bind(null, { lastN: 1, count: true })
        );

        it(
            'should respond with 200 - OK if hLimit and hOffset query params',
            sthTestUtils.status200Test.bind(null, {
                hLimit: 1,
                hOffset: 1
            })
        );

        it(
            'should respond with 200 - OK if aggrMethod and aggrPeriod query params',
            sthTestUtils.status200Test.bind(null, {
                aggrMethod: 'min',
                aggrPeriod: 'second'
            })
        );
    });

    function eachEventTestSuiteContainer(attrName, attrType, includeTimeInstantMetadata) {
        describe(
            'for each new event with attribute of type ' + attrType,
            sthTestUtils.eachEventTestSuite.bind(null, attrName, attrType, includeTimeInstantMetadata)
        );
    }

    for (var i = 0; i < sthTestConfig.SAMPLES; i++) {
        describe('data storage', eachEventTestSuiteContainer.bind(null, 'attribute-float', 'float', i % 2));

        describe(
            'raw data retrieval',
            sthTestUtils.rawDataRetrievalSuite.bind(null, { lastN: i + 1 }, 'attribute-float', 'float', true)
        );

        describe(
            'raw data retrieval',
            sthTestUtils.rawDataRetrievalSuite.bind(null, { hLimit: 1, hOffset: i }, 'attribute-float', 'float', true)
        );

        describe(
            'raw data retrieval',
            // FIXME: As discussed @fgalan and @AlvaroVega F2F, it would be great to have a unit test that checks not
            // only existence of fiware-total-count header, but also that is actually working. I mean, for instance,
            // having 4 items in the raw collection, set count=true in the request and check not only that
            // fiware-total-count is in the response, but also that its value is 4.
            //
            // However, it is not clear if the cost of developing such unit test would be high, given the current "style"
            // in the unit tests in this componente. This FIXME is a remark about this future improvement.
            sthTestUtils.rawDataRetrievalSuite.bind(
                null,
                { hLimit: 1, hOffset: i, count: true },
                'attribute-float',
                'float',
                false
            )
        );

        describe(
            'aggregated data retrieval',
            sthTestUtils.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'min')
        );

        describe(
            'aggregated data retrieval',
            sthTestUtils.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'max')
        );

        describe(
            'aggregated data retrieval',
            sthTestUtils.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'sum')
        );

        describe(
            'aggregated data retrieval',
            sthTestUtils.aggregatedDataRetrievalSuite.bind(null, 'attribute-float', 'float', 'sum2')
        );
    }

    for (var j = 0; j < sthTestConfig.SAMPLES; j++) {
        describe('data storage', eachEventTestSuiteContainer.bind(null, 'attribute-string', 'string', j % 2));

        describe(
            'raw data retrieval',
            sthTestUtils.rawDataRetrievalSuite.bind(null, { lastN: j + 1 }, 'attribute-string', 'string', true)
        );

        describe(
            'raw data retrieval',
            sthTestUtils.rawDataRetrievalSuite.bind(null, { hLimit: 1, hOffset: j }, 'attribute-string', 'string', true)
        );

        describe(
            'aggregated data retrieval',
            sthTestUtils.aggregatedDataRetrievalSuite.bind(null, 'attribute-string', 'string', 'occur')
        );
    }

    describe(
        'notification of numeric data without TimeInstant metadata by the Orion Context Broker of',
        sthTestUtils.eventNotificationSuite.bind(null, 'attribute-float-1', 'float', false)
    );

    describe(
        'notification of textual data without TimeInstant metadata by the Orion Context Broker of',
        sthTestUtils.eventNotificationSuite.bind(null, 'attribute-string-1', 'string', false)
    );

    describe(
        'notification of numeric data with TimeInstant metadata by the Orion Context Broker of',
        sthTestUtils.eventNotificationSuite.bind(null, 'attribute-float-2', 'float', true)
    );

    describe(
        'notification of numeric data with TimeInstant metadata by the Orion Context Broker of',
        sthTestUtils.eventNotificationSuite.bind(null, 'attribute-string-2', 'string', true)
    );

    describe('notification of already existent numeric data should register it only once', function() {
        var contextResponseNumericWithFixedTimeInstant;

        before(function() {
            contextResponseNumericWithFixedTimeInstant = require('./contextResponses/contextResponseNumericWithFixedTimeInstant');
        });

        it('should store the raw and aggregated data for the first time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseNumericWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should try to store the raw and aggregated data for second time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseNumericWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should only retrieve the raw data as stored once', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.equal(
                        contextResponseNumericWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                            .value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
            it(
                'should have only accumulated the sum aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the sum2 aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the max aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the min aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        }
    });

    describe('notification of already existent textual data should register it only once', function() {
        var contextResponseTextualWithFixedTimeInstant;

        before(function() {
            contextResponseTextualWithFixedTimeInstant = require('./contextResponses/contextResponseTextualWithFixedTimeInstant');
        });

        it('should store the raw and aggregated data for the first time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseTextualWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should try to store the raw and aggregated data for second time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseTextualWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should only retrieve the raw data as stored once', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.equal(
                        contextResponseTextualWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0]
                            .value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
            it(
                'should have only accumulated the aggregated data once',
                sthTestUtils.textualAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseTextualWithFixedTimeInstant',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        }
    });

    describe('notification of an update to already existent numeric data should update the original value', function() {
        var contextResponseNumericWithFixedTimeInstantUpdate;

        before(function() {
            contextResponseNumericWithFixedTimeInstantUpdate = require('./contextResponses/contextResponseNumericWithFixedTimeInstantUpdate');
        });

        it('should store the raw and aggregated data for the first time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should update the already existent data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should retrieve the updated raw data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                            .attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.equal(
                        contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                            .attributes[0].value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
            it(
                'should have only accumulated the sum updated aggregated data',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstantUpdate',
                    'sum',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the sum2 aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstantUpdate',
                    'sum2',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the max aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstantUpdate',
                    'max',
                    sthConfig.AGGREGATION_BY[i]
                )
            );

            it(
                'should have only accumulated the min aggregated data once',
                sthTestUtils.numericAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseNumericWithFixedTimeInstantUpdate',
                    'min',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        }
    });

    describe('notification of already existent textual data should update the original value', function() {
        var contextResponseTextualWithFixedTimeInstantUpdate;

        before(function() {
            contextResponseTextualWithFixedTimeInstantUpdate = require('./contextResponses/contextResponseTextualWithFixedTimeInstantUpdate');
        });

        it('should store the raw and aggregated data for the first time', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseTextualWithFixedTimeInstantUpdate.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should update the stored raw and aggregated data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseTextualWithFixedTimeInstantUpdate.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should retrieve the updated raw data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                            .attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.equal(
                        contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement
                            .attributes[0].value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var i = 0; i < sthConfig.AGGREGATION_BY.length; i++) {
            it(
                'should retrieve the updated aggregated data',
                sthTestUtils.textualAggregatedDataUpdatedTest.bind(
                    null,
                    'contextResponseTextualWithFixedTimeInstantUpdate',
                    sthConfig.AGGREGATION_BY[i]
                )
            );
        }
    });

    describe('notification of an array attribute value should register it only as raw data', function() {
        var contextResponseArrayWithFixedTimeInstant;

        before(function() {
            contextResponseArrayWithFixedTimeInstant = require('./contextResponses/contextResponseArrayWithFixedTimeInstant');
        });

        it('should store the raw data but not the aggregated data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseArrayWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should retrieve the raw data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseArrayWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseArrayWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseArrayWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.eql(
                        contextResponseArrayWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var j = 0; j < sthConfig.AGGREGATION_BY.length; j++) {
            it(
                'should not retrieve the non-registered aggregated data if sum is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseArrayWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if sum2 is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseArrayWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if max is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseArrayWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if min is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseArrayWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if occur is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseArrayWithFixedTimeInstant',
                    'occur',
                    sthConfig.AGGREGATION_BY[j]
                )
            );
        }
    });

    describe('notification of an object attribute value should register it only as raw data', function() {
        var contextResponseObjectWithFixedTimeInstant;

        before(function() {
            contextResponseObjectWithFixedTimeInstant = require('./contextResponses/contextResponseObjectWithFixedTimeInstant');
        });

        it('should store the raw data but not the aggregated data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.NOTIFY),
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    },
                    json: true,
                    body: {
                        subscriptionId: '1234567890ABCDF123456789',
                        originator: 'orion.contextBroker.instance',
                        contextResponses: contextResponseObjectWithFixedTimeInstant.contextResponses
                    }
                },
                function(err, response, body) {
                    expect(body).to.be(undefined);
                    done(err);
                }
            );
        });

        it('should retrieve the raw data', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseObjectWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseObjectWithFixedTimeInstant.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseObjectWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values.length).to.equal(1);
                    expect(bodyJSON.contextResponses[0].contextElement.attributes[0].values[0].attrValue).to.eql(
                        contextResponseObjectWithFixedTimeInstant.contextResponses[0].contextElement.attributes[0].value
                    );
                    expect(bodyJSON.contextResponses[0].statusCode.code).to.equal('200');
                    expect(bodyJSON.contextResponses[0].statusCode.reasonPhrase).to.equal('OK');
                    done(err);
                }
            );
        });

        for (var j = 0; j < sthConfig.AGGREGATION_BY.length; j++) {
            it(
                'should not retrieve the non-registered aggregated data if sum is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseObjectWithFixedTimeInstant',
                    'sum',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if sum2 is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseObjectWithFixedTimeInstant',
                    'sum2',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if max is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseObjectWithFixedTimeInstant',
                    'max',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if min is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseObjectWithFixedTimeInstant',
                    'min',
                    sthConfig.AGGREGATION_BY[j]
                )
            );

            it(
                'should not retrieve the non-registered aggregated data if occur is requested',
                sthTestUtils.aggregatedDataNonExistentTest.bind(
                    null,
                    'contextResponseObjectWithFixedTimeInstant',
                    'occur',
                    sthConfig.AGGREGATION_BY[j]
                )
            );
        }
    });

    var contextResponseNumericWithFixedTimeInstantUpdate = require('./contextResponses/contextResponseNumericWithFixedTimeInstantUpdate');
    var contextResponseTextualWithFixedTimeInstantUpdate = require('./contextResponses/contextResponseTextualWithFixedTimeInstantUpdate');

    describe('Data removal', function() {
        describe(
            'Removal of concrete attributes of entities including numeric data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.NUMERIC, {
                entityId: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.id,
                entityType: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.type,
                attrName:
                    contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.attributes[0]
                        .name
            })
        );

        describe(
            'Removal of concrete entities including numeric data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.NUMERIC, {
                entityId: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.id,
                entityType: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.type
            })
        );

        describe(
            'Removal of all the entities for certain service and service path including numeric data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.NUMERIC)
        );

        describe(
            'Removal of concrete attributes of entities including textual data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.TEXTUAL, {
                entityId: contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement.id,
                entityType: contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement.type,
                attrName:
                    contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement.attributes[0]
                        .name
            })
        );

        describe(
            'Removal of concrete entities including textual data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.TEXTUAL, {
                entityId: contextResponseNumericWithFixedTimeInstantUpdate.contextResponses[0].contextElement.id,
                entityType: contextResponseTextualWithFixedTimeInstantUpdate.contextResponses[0].contextElement.type
            })
        );

        describe(
            'Removal of all the entities for certain service and service path including textual data',
            sthTestUtils.dataRemovalSuite.bind(null, sthConfig.AGGREGATIONS.TEXTUAL)
        );
    });

    describe('PUT /admin/log', function() {
        it('should accept FATAL as a valid logging level', sthTestUtils.validLogLevelChangeTest.bind(null, 'FATAL'));

        it('should accept ERROR as a valid logging level', sthTestUtils.validLogLevelChangeTest.bind(null, 'ERROR'));

        it(
            'should accept WARNING as a valid logging level',
            sthTestUtils.validLogLevelChangeTest.bind(null, 'WARNING')
        );

        it('should accept INFO as a valid logging level', sthTestUtils.validLogLevelChangeTest.bind(null, 'INFO'));

        it('should accept DEBUG as a valid logging level', sthTestUtils.validLogLevelChangeTest.bind(null, 'DEBUG'));

        it('should ignore case sensitivity in the logging levels', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.ADMIN.SET_LOG_LEVEL, {
                        level: 'deBug'
                    }),
                    method: 'PUT'
                },
                function(err, response) {
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(200);
                    done();
                }
            );
        });
    });

    describe('GET /version', function() {
        it('should provide version information', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.VERSION),
                    method: 'GET'
                },
                function(err, response, body) {
                    var bodyJSON = JSON.parse(body);
                    expect(err).to.equal(null);
                    expect(bodyJSON.version).not.to.be(undefined);
                    done();
                }
            );
        });
    });

    describe('should clean the data if requested', sthTestUtils.cleanDatabaseSuite);

    describe('server stop', function() {
        it('should stop gracefully', function(done) {
            sth.exitGracefully(null, done);
        });
    });
});
