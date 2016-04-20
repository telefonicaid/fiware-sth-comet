/* global console, describe, it, require  */

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

var sthTestConfig = require('./sth_test_configuration');
var sthConfig = require('../../lib/sth_configuration');
var sthDatabase = require('../../lib/sth_database');
var sthTestHelper = require('./sth_test_helper');

console.log('*** Running the database tests with the following environment variables:');
console.log('\n***** STH app environment variables:');
console.log(sthConfig);
console.log('\n***** Unit tests environment variables:');
console.log(sthTestConfig);

var databaseName = sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE);
var collectionName4Events = sthDatabase.getCollectionName4Events(
  {
    databaseName: databaseName,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME
  }
);
var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
  {
    databaseName: databaseName,
    servicePath: sthConfig.DEFAULT_SERVICE_PATH,
    entityId: sthTestConfig.ENTITY_ID,
    entityType: sthTestConfig.ENTITY_TYPE,
    attrName: sthTestConfig.ATTRIBUTE_NAME
  }
);

describe('database operation', function () {
  it('should establish a connection to the database', function (done) {
    sthDatabase.connect(
      {
        authentication: sthConfig.DB_AUTHENTICATION,
        dbURI: sthConfig.DB_URI,
        replicaSet: sthConfig.REPLICA_SET,
        database: sthDatabase.getDatabaseName(sthConfig.DEFAULT_SERVICE),
        poolSize: sthConfig.POOL_SIZE
      },
      function (err) {
        done(err);
      }
    );
  });

  it('should drop the event raw data collection if it exists',
    sthTestHelper.dropRawEventCollectionTest);

  it('should drop the aggregated data collection if it exists',
    sthTestHelper.dropAggregatedDataCollectionTest);

  it('should check if the collection for the aggregated data exists', function (done) {
    sthDatabase.getCollection(
      {
        service: sthConfig.DEFAULT_SERVICE,
        servicePath: sthConfig.DEFAULT_SERVICE_PATH,
        entityId: sthTestConfig.ENTITY_ID,
        entityType: sthTestConfig.ENTITY_TYPE,
        attrName: sthTestConfig.ATTRIBUTE_NAME
      },
      {
        isAggregated: true,
        shouldCreate: false,
        shouldStoreHash: false,
        shouldTruncate: false
      },
      function (err, collection) {
        if (err && !collection) {
          // The collection does not exist
          done();
        }
      }
    );
  });

  it('should create the collection for the single events', function (done) {
    sthDatabase.connection.createCollection(collectionName4Events, function (err) {
      done(err);
    });
  });

  it('should create the collection for the aggregated data', function (done) {
    sthDatabase.connection.createCollection(collectionName4Aggregated, function (err) {
      done(err);
    });
  });

  describe('should store individual raw events and aggregated data', function () {
    for (var i = 0; i < sthTestConfig.SAMPLES; i++) {
      describe('for each new event', sthTestHelper.eachEventTestSuite);
    }
  });

  describe('should clean the data if requested', sthTestHelper.cleanDatabaseSuite);
});
