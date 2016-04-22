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

var config = {};

// STH server configuration
//--------------------------
config.server = {
  // The host where the STH server will be started.
  // Default value: "localhost".
  host: 'localhost',
  // The port where the STH server will be listening.
  // Default value: "8666".
  port: '8666',
  // The service to be used if not sent by the Orion Context Broker in the notifications.
  // Default value: "testservice".
  defaultService: 'testservice',
  // The service path to be used if not sent by the Orion Context Broker in the notifications.
  // Default value: "/testservicepath".
  defaultServicePath: '/testservicepath',
  // A flag indicating if the empty results should be removed from the response.
  // Default value: "true".
  filterOutEmpty: 'true',
  // Array of resolutions the STH component should aggregate values for.
  // Valid resolution values are: 'month', 'day', 'hour', 'minute' and 'second'
  aggregationBy: ['day', 'hour', 'minute'],
  // Directory where temporary files will be stored, such as the ones generated when CSV files are requested.
  // Default value: "temp".
  temporalDir: 'temp'
};

// Database configuration
//------------------------
config.database = {
  // The STH component supports 3 alternative models when storing the raw and aggregated data
  // into the database: 1) one collection per attribute, 2) one collection per entity and
  // 3) one collection per service path. The possible values are: "collection-per-attribute",
  // "collection-per-entity" and "collection-per-service-path" respectively. Default value:
  // "collection-per-entity".
  dataModel: 'collection-per-entity',
  // The username to use for the database connection. Default value: "".
  user: '',
  // The password to use for the database connection. Default value: "".
  password: '',
  // The URI to use for the database connection. It supports replica set URIs. This does not
  // include the "mongo://" protocol part. Default value: "localhost:27017"
  URI: 'localhost:27017',
  // The name of the replica set to connect to, if any. Default value: "".
  replicaSet: '',
  // The prefix to be added to the service for the creation of the databases. Default value: "sth".
  prefix: 'sth_',
  // The prefix to be added to the collections in the databases. More information below.
  //  Default value: "sth_".
  collectionPrefix: 'sth_',
  // The default MongoDB pool size of database connections. Optional. Default value: "5".
  poolSize: '5',
  // The write concern (see http://docs.mongodb.org/manual/core/write-concern/) to apply when
  // writing data to the MongoDB database. Default value: "1".
  writeConcern: '1',
  // Flag indicating if the raw and/or aggregated data should be persisted. Valid values are:
  // "only-raw", "only-aggregated" and "both". Default value: "both".
  shouldStore: 'both',
  // Flag indicating if the raw and/or aggregated data collection names should include a hash portion.
  // This is mostly due to MongoDB's limitation regarding the number of bytes a namespace may have
  // (currently limited to 120 bytes). In case of hashing, information about the final collection name
  // and its correspondence to each concrete service path, entity and (if applicable) attribute
  // is stored in a collection named `COLLECTION_PREFIX + "collection_names"`. Default value: "false".
  shouldHash: 'false',
  truncation: {
    // Data from the raw and aggregated data collections will be removed if older than the value specified in seconds.
    // Set the value to 0 or remove the property entry not to apply this time-based truncation policy.
    // Default value: "0".
    expireAfterSeconds: '0',
    // The oldest raw data (according to insertion time) will be removed if the size of the raw data collection
    // gets bigger than the value specified in bytes. In case of raw data the reference time is the one stored in the
    // 'recvTime' property whereas in the case of the aggregated data the reference of time is the one stored in the
    // '_id.origin' property. Set the value to 0 or remove the property entry not to apply this truncation policy.
    // Default value: "0".
    // The "size" configuration parameter is mandatory in case size collection truncation is desired as required by
    // MongoDB.
    // Notice that this configuration parameter does not affect the aggregated data collections since MongoDB does not
    // currently support updating documents in capped collections which increase the size of the documents.
    // Notice also that in case of the raw data, the size-based truncation policy takes precedence over the TTL one.
    // More concretely, if "size" is set, the value of "exporeAfterSeconds" is ignored for the raw data collections
    // since currently MongoDB does not support TTL in capped collections.
    size: '0',
    // The oldest raw data (according to insertion time) will be removed if the number of documents in the raw data
    // collections goes beyond the specified value. Set the value to 0 or remove the property entry not to apply this
    // truncation policy. Default value: "0".
    // Notice that this configuration parameter does not affect the aggregated data collections since MongoDB does not
    // currently support updating documents in capped collections which increase the size of the documents.
    max: '0'
  },
  // Attribute values to one or more blank spaces should be ignored and not processed either as raw data or for
  // the aggregated computations. Default value: "true".
  ignoreBlankSpaces: 'true'
};

// Logging configuration
//------------------------
config.logging = {
  // The logging level of the messages. Messages with a level equal or superior to this will be logged.
  // Accepted values are: "debug", "info", "warn" and "error". Default value: "info".
  level: 'info',
  // The logging format:
  // - "json": writes logs as JSON.
  // - "dev": for development. Used as the 'de-facto' value when the NODE_ENV variable is set to 'development'.
  // - "pipe": writes logs separating the fields with pipes.
  format: 'pipe',
  // The time in seconds between proof of life logging messages informing that the server is up and running normally.
  // Default value: "60"
  proofOfLifeInterval: '60'
};

module.exports = config;
