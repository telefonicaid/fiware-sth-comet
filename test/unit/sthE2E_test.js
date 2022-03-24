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
const sthTestUtils = require(ROOT_PATH + '/test/unit/sthTestUtils.js');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
const expect = require('expect.js');
const request = require('request');
const sth = require(ROOT_PATH + '/lib/sth');

const DATABASE_NAME = sthDatabaseNaming.getDatabaseName(sthConfig.DEFAULT_SERVICE);
const DATABASE_CONNECTION_PARAMS = {
    authentication: sthConfig.DB_AUTHENTICATION,
    dbURI: sthConfig.DB_URI,
    replicaSet: sthConfig.REPLICA_SET,
    database: DATABASE_NAME,
    poolSize: sthConfig.POOL_SIZE
};

describe('return 500 test', function() {
    this.timeout(5000);
    describe('database connection', function() {
        let contextResponseNumericWithFixedTimeInstantV1;

        before(function(done) {
            sthDatabase.connect(
                DATABASE_CONNECTION_PARAMS,
                function(err) {
                    if (err) {
                        return done(err);
                    }
                    // It is needed to start the server for e2e test using HTTP endpoint. Otherwise, this step is not needed
                    sth.sthServer.startServer(sthConfig.STH_HOST, sthConfig.STH_PORT, function() {
                        sthDatabase.closeConnection(function(err) {
                            if (err) {
                                return done(err);
                            }
                            contextResponseNumericWithFixedTimeInstantV1 = require('./contextResponses/V1contextResponseNumericWithFixedTimeInstant');
                            done();
                        });
                    });
                }
            );
        });

        after(function(done) {
            sth.sthServer.stopServer(function() {
                done();
            });
        });

        it('should return 500 when GET http request V1 (e2e)', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(
                        sthTestConfig.API_OPERATION.READ,
                        {
                            lastN: 0,
                            dateFrom:
                                contextResponseNumericWithFixedTimeInstantV1.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value,
                            dateTo:
                                contextResponseNumericWithFixedTimeInstantV1.contextResponses[0].contextElement
                                    .attributes[0].metadatas[0].value
                        },
                        contextResponseNumericWithFixedTimeInstantV1.contextResponses[0].contextElement.attributes[0]
                            .name
                    ),
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response) {
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(500);
                    expect(JSON.parse(response.body).statusCode).to.equal(500);
                    expect(JSON.parse(response.body).error).to.equal('Internal Server Error');
                    expect(JSON.parse(response.body).message).to.equal('MongoDB is not connected');
                    done(err);
                }
            );
        });

        it('should return 500 when DELETE http request V1 (e2e)', function(done) {
            request(
                {
                    uri: sthTestUtils.getURL(sthTestConfig.API_OPERATION.DELETE, {
                        entityType: 'T',
                        entityId: 'E',
                        attrName: 'A'
                    }),
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response) {
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(500);
                    expect(JSON.parse(response.body).statusCode).to.equal(500);
                    expect(JSON.parse(response.body).error).to.equal('Internal Server Error');
                    expect(JSON.parse(response.body).message).to.equal('MongoDB is not connected');
                    done(err);
                }
            );
        });

        it('should return 500 when GET http request V2 (e2e)', function(done) {
            let url = sthTestUtils.getURL(
                sthTestConfig.API_OPERATION.READ_V2,
                {
                    hLimit: 3,
                    hOffset: 0,
                    dateFrom: '2022-03-24T00:00:00.000Z',
                    dateTo: '2022-03-31T00:00:00.000Z'
                },
                'A'
            );
            request(
                {
                    uri: url,
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Fiware-Service': sthConfig.DEFAULT_SERVICE,
                        'Fiware-ServicePath': sthConfig.DEFAULT_SERVICE_PATH
                    }
                },
                function(err, response) {
                    expect(err).to.equal(null);
                    expect(response.statusCode).to.equal(500);
                    expect(JSON.parse(response.body).error).to.equal('InternalServer Error');
                    expect(JSON.parse(response.body).description).to.equal('MongoDB is not connected');
                    done(err);
                }
            );
        });
    });
});
