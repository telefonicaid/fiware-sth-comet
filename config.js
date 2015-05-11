var path = require('path');

var config = {};

// STH server configuration
//--------------------------
config.server = {
  // The host where the STH server will be started. Default value: "localhost".
  host: 'localhost',
  // The port where the STH server will be listening. Default value: "8666".
  port: '8666',
  // A flag indicating if the empty results should be removed from the response.
  //  Default value: "true".
  filterOutEmpty: 'true'
};

// Database configuration
//------------------------
config.database = {
  // The service to be used if not sent by the Orion Context Broker in the notifications.
  //  Default value: "orion".
  defaultService: 'orion',
  // The service path to be used if not sent by the Orion Context Broker in the notifications.
  //  Default value: "/".
  defaultServicePath: '/',
  // The username to use for the database connection. Default value: "".
  user: '',
  // The password to use for the database connection. Default value: "".
  password: '',
  // The URI to use for the database connection. It supports replica set URIs. This does not
  //  include the "mongo://" protocol part. Default value: "localhost:27017"
  URI: 'localhost:27017',
  // The name of the replica set to connect to, if any. Default value: "".
  replicaSet: '',
  // The prefix to be added to the service for the creation of the databases. Default value: "sth".
  prefix: 'sth',
  // The prefix to be added to the collections in the databases. More information below.
  //  Default value: "sth".
  collectionPrefix: 'sth',
  // The default MongoDB pool size of database connections. Optional. Default value: "5".
  poolSize: '5',
  // The write concern (see http://docs.mongodb.org/manual/core/write-concern/) to apply when
  //  writing data to the MongoDB database. Default value: "1".
  writeConcern: '1',
  // Flag indicating if the raw and/or aggregated data should be persisted. Valid values are:
  //  "only-raw", "only-aggregated" and "both". Default value: "both".
  shouldStore: 'both',
  // The data model to use. Currently 3 possible values are supported: collection-per-service-path
  //  (which creates a MongoDB collection per service patch to store the data), collection-per-entity
  //  (which creates a MongoDB collection per service path and entity to store the data) and
  //  collection-per-attribute (which creates a collection per service path, entity and attribute
  //  to store the data). Default value: "collection-per-entity".
  dataModel: 'collection-per-entity'
};

// Logging configuration
//------------------------
config.logging = {
  // The logging level of the messages. Messages with a level equal or superior to this will be logged.
  //  Default value: "info".
  level: 'info',
  // A flag indicating if the logs should be sent to the console. Default value: "true".
  toConsole: 'true',
  // A flag indicating if the logs should be sent to a file. Default value: "true".
  toFile: 'true',
  // Maximum size in bytes of the log files. If the maximum size is reached, a new log file is
  //  created incrementing a counter used as the suffix for the log file name. Default value: "0" (no
  //  size limit).
  maxFileSize: '0',
  // The path to a directory where the log file will be searched for or created if it does not exist.
  //  Default value: "./log".
  directoryPath: '.' + path.sep + 'log',
  // The name of the file where the logs will be stored. Default value: "sth_app.log".
  fileName: 'sth_app.log',
  // The time in seconds between proof of life logging messages informing that the server is up and running normally.
  proofOfLifeInterval: '60'
};

module.exports = config;
