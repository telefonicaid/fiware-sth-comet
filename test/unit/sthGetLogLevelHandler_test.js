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

const ROOT_PATH = require('app-root-path');
const sth = require(ROOT_PATH + '/lib/sth');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthDatabaseNaming = require(ROOT_PATH + '/lib/database/model/sthDatabaseNaming');
const sthTestConfig = require(ROOT_PATH + '/test/unit/sthTestConfiguration');
const sthTestHelper = require(ROOT_PATH + '/test/unit/sthTestUtils.js');
const hapi = require('@hapi/hapi');
const expect = require('expect.js');
const request = require('request');

describe('sthGetLogLevelHandler tests', function() {
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

    describe('database clean up', function() {
        it('should drop the event raw data collection if it exists', sthTestHelper.dropRawEventCollectionTest);

        it('should drop the aggregated data collection if it exists', sthTestHelper.dropAggregatedDataCollectionTest);
    });

    describe('server start', function() {
        it('should start gracefully', function(done) {
            sth.sthServer.startServer(sthConfig.STH_HOST, sthConfig.STH_PORT, function(err, server) {
                expect(err).to.equal(null);
                expect(server).to.not.equal(null);
                done();
            });
        });
    });

    describe('GET /admin/log', function() {
        it('should respond with the logging level', function(done) {
            request(
                {
                    uri: sthTestHelper.getURL(sthTestConfig.API_OPERATION.ADMIN.GET_LOG_LEVEL),
                    method: 'GET',
                    json: true
                },
                function(err, response, body) {
                    expect(err).to.equal(null);
                    expect(body.level).to.equal(sthConfig.LOGOPS_LEVEL);
                    done();
                }
            );
        });
    });
});
