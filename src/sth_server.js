/* globals module, process, require */

(function() {
  "use strict";

  var hapi = require('hapi');
  var joi = require('joi');
  var boom = require('boom');

  var server, sthDatabase, sthConfig, sthLogger, sthHelper;

  /**
   * Starts the server asynchronously
   * @param {string} host The STH server host
   * @param {string} port The STH server port
   * @param {string} aSTHDatabase The database to be used by the server
   * @param {Function} callback Callback function to notify the result
   *  of the operation
   */
  function startServer(host, port, aSTHDatabase, callback) {
    sthDatabase = aSTHDatabase;

    server = new hapi.Server();

    server.on('log', function(event, tags) {
      if (tags.load) {
        sthLogger.fatal('event=' + event, {
          operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
        });
      }
    });

    server.on('request-internal', function (request, event, tags) {
      if (tags.error) {
        if (tags.auth || tags.handler || tags.state || tags.payload || tags.validation) {
          sthLogger.warn(
            request.method.toUpperCase() + ' ' + request.url.path +
            ', event=' + JSON.stringify(event), {
              operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
            }
          );
        } else {
          sthLogger.fatal(
            request.method.toUpperCase() + ' ' + request.url.path +
            ', event=' + JSON.stringify(event), {
              operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
            }
          );
        }
      }
    });

    server.connection({
      host: host,
      port: port
    });

    server.route([
      {
        method: 'GET',
        path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attrName}',
        handler: function (request, reply) {
          var response,
              unicaCorrelatorPassed = request.headers[sthConfig.UNICA_CORRELATOR_HEADER];

          request.info.sth = {
            unicaCorrelator: unicaCorrelatorPassed || sthHelper.getUnicaCorrelator(request),
            transactionId: sthHelper.getTransactionId(),
            operationType: sthHelper.getOperationType(request)
            };

          sthLogger.trace(
            request.method.toUpperCase() + ' ' + request.url.path,
            request.info.sth);

          // Compose the collection name for the required data
          var databaseName = sthDatabase.getDatabase(
            request.headers['fiware-service']);

          if ((request.query.lastN || request.query.lastN === 0)  ||
            ((request.query.hLimit || request.query.hLimit === 0) &&
            (request.query.hOffset || request.query.hOffset === 0))) {
            // Raw data is requested

            // Compose the collection name for the required data
            var collectionName = sthDatabase.getCollectionName4Events(
              request.headers['fiware-servicepath'],
              request.params.entityId,
              request.params.entityType,
              request.params.attrName
            );

            // Check if the collection exists
            sthDatabase.getCollection(
              databaseName,
              collectionName,
              false,
              function (err, collection) {
                if (err) {
                  // The collection does not exist, reply with en empty response
                  sthLogger.warn(
                    'The collection %s does not exist', collectionName, request.info.sth);

                  sthLogger.trace(
                    'Responding with no points',
                    request.info.sth);
                  var emptyResponse =sthHelper.getEmptyResponse();
                  var ngsiPayload = sthHelper.getNGSIPayload(
                    request.params.entityId,
                    request.params.entityType,
                    request.params.attrName,
                    emptyResponse);
                  response = reply(ngsiPayload);
                } else {
                  // The collection exists
                  sthLogger.trace(
                    'The collection %s exists', collectionName, request.info.sth);

                  sthDatabase.getRawData(
                    collection,
                    request.params.entityId,
                    request.params.entityType,
                    request.params.attrName,
                    request.query.lastN,
                    request.query.hLimit,
                    request.query.hOffset,
                    request.query.dateFrom,
                    request.query.dateTo,
                    function (err, result) {
                      if (err) {
                        // Error when getting the aggregated data
                        sthLogger.error(
                          'Error when getting data from %s', collectionName, request.info.sth);
                        sthLogger.trace(
                          'Responding with 500 - Internal Error', request.info.sth);
                        response = reply(err);
                      } else if (!result || !result.length) {
                        // No aggregated data available for the request
                        sthLogger.trace(
                          'No aggregated data available for the request: ' + request.url.path,
                          request.info.sth);

                        sthLogger.trace(
                          'Responding with no points', request.info.sth);
                        response = reply(
                          sthHelper.getNGSIPayload(
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            sthHelper.getEmptyResponse()
                          )
                        );
                      } else {
                        sthLogger.trace(
                          'Responding with %s docs', result.length, request.info.sth);
                        response = reply(
                          sthHelper.getNGSIPayload(
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            result));
                      }
                      if (unicaCorrelatorPassed) {
                        response.header('Unica-Correlator', unicaCorrelatorPassed);
                      }
                    }
                  );
                }
              }
            );

          } else if (request.query.aggrMethod && request.query.aggrPeriod) {
            // Aggregated data is requested

            // Compose the collection name for the required data
            var collectionName = sthDatabase.getCollectionName4Aggregated(
              request.headers['fiware-servicepath'],
              request.params.entityId,
              request.params.entityType,
              request.params.attrName
            );

            // Check if the collection exists
            sthDatabase.getCollection(
              databaseName,
              collectionName,
              false,
              function (err, collection) {
                if (err) {
                  // The collection does not exist, reply with en empty response
                  sthLogger.warn(
                    'The collection %s does not exist', collectionName, request.info.sth);

                  sthLogger.trace(
                    'Responding with no points',
                    request.info.sth);
                  var emptyResponse =sthHelper.getEmptyResponse();
                  var ngsiPayload = sthHelper.getNGSIPayload(
                    request.params.entityId,
                    request.params.entityType,
                    request.params.attrName,
                    emptyResponse);
                  response = reply(ngsiPayload);
                } else {
                  // The collection exists
                  sthLogger.trace(
                    'The collection %s exists', collectionName, request.info.sth);

                  sthDatabase.getAggregatedData(
                    collection,
                    request.headers['fiware-servicepath'],
                    request.params.entityId,
                    request.params.entityType,
                    request.params.attrName,
                    request.query.aggrMethod,
                    request.query.aggrPeriod,
                    request.query.dateFrom,
                    request.query.dateTo,
                    sthConfig.FILTER_OUT_EMPTY,
                    function (err, result) {
                      if (err) {
                        // Error when getting the aggregated data
                        sthLogger.error(
                          'Error when getting data from %s', collectionName, request.info.sth);
                        sthLogger.trace(
                          'Responding with 500 - Internal Error', request.info.sth);
                        response = reply(err);
                      } else if (!result || !result.length) {
                        // No aggregated data available for the request
                        sthLogger.trace(
                          'No aggregated data available for the request: ' + request.url.path,
                          request.info.sth);

                        sthLogger.trace(
                          'Responding with no points', request.info.sth);
                        response = reply(
                          sthHelper.getNGSIPayload(
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            sthHelper.getEmptyResponse()
                          )
                        );
                      } else {
                        sthLogger.trace(
                          'Responding with %s docs', result.length, request.info.sth);
                        response = reply(
                          sthHelper.getNGSIPayload(
                            request.params.entityId,
                            request.params.entityType,
                            request.params.attrName,
                            result));
                      }
                      if (unicaCorrelatorPassed) {
                        response.header('Unica-Correlator', unicaCorrelatorPassed);
                      }
                    }
                  );
                }
              }
            );
          } else {
            var error = boom.badRequest('A combination of the following query params is required: lastN, hLimit and hOffset ' +
              ', or aggrMethod and aggrPeriod');
            error.output.payload.validation = { source: 'query', keys: ['lastN', 'hLimit', 'hOffset', 'aggrMethod', 'aggrPeriod'] };
            return reply(error);
          }
        },
        config: {
          validate: {
            headers: function(value, options, next) {
              var error;
              if (!value['fiware-service']) {
                error = boom.badRequest('child "fiware-service" fails because [fiware-service is required]');
                error.output.payload.validation = { source: 'headers', keys: ['fiware-service'] };
                next(error);

              } else if (!value['fiware-servicepath']) {
                error = boom.badRequest('child "fiware-servicepath" fails because [fiware-servicepath is required]');
                error.output.payload.validation = { source: 'headers', keys: ['fiware-servicepath'] };
                next(error);
              }
              next();
            },
            query: {
              lastN: joi.number().integer().greater(-1).optional(),
              hLimit: joi.number().integer().greater(-1).optional(),
              hOffset: joi.number().integer().greater(-1).optional(),
              aggrMethod: joi.string().valid('max', 'min', 'sum', 'sum2').optional(),
              aggrPeriod: joi.string().required().valid('month', 'day', 'hour', 'minute', 'second').optional(),
              dateFrom: joi.date().optional(),
              dateTo: joi.date().optional()
            }
          }
        }
      },
      {
        method: 'POST',
        path: '/notify',
        handler: function(request, reply) {
          var timestamp = new Date(),
              unicaCorrelatorPassed = request.headers[sthConfig.UNICA_CORRELATOR_HEADER],
              contextResponses,
              contextElement,
              attributes,
              attribute;

          function getTotalAttributes(contextResponses) {
            var totalAttributes = 0;
            for(var l1 = 0; l1 < contextResponses.length; l1++) {
              if (contextResponses[l1].contextElement &&
                contextResponses[l1].contextElement.attributes &&
                Array.isArray(contextResponses[l1].contextElement.attributes)) {
                contextElement = contextResponses[l1].contextElement;
                attributes = contextElement.attributes;
                for (var l2 = 0; l2 < attributes.length; l2++) {
                  if (isNaN(attributes[l2].value)) {
                    // The attribute value is not a number and consequently not able to be aggregated.
                    continue;
                  }
                  totalAttributes++;
                }
              }
            }
            return totalAttributes;
          }

          request.info.sth = {
            unicaCorrelator: unicaCorrelatorPassed || sthHelper.getUnicaCorrelator(request),
            transactionId: sthHelper.getTransactionId(),
            operationType: sthHelper.getOperationType(request)
          };

          if (request.payload && request.payload.contextResponses &&
            Array.isArray(request.payload.contextResponses)) {
            contextResponses = request.payload.contextResponses;
            // Calculate the number of attribute values notified.
            var counter = 0,
                totalAttributes = getTotalAttributes(contextResponses);

            var totalTasks = sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH ?
                  (2 * totalAttributes) : (1 * totalAttributes);

            for (var i = 0; i < contextResponses.length; i++) {
              if (contextResponses[i].contextElement &&
                contextResponses[i].contextElement.attributes &&
                Array.isArray(contextResponses[i].contextElement.attributes)) {
                contextElement = contextResponses[i].contextElement;
                attributes = contextElement.attributes;
                for (var j = 0; j < attributes.length; j++) {
                  if (isNaN(attributes[j].value)) {
                    // The attribute value is not a number and consequently not able to be aggregated.
                    sthLogger.fatal('Attribute value not aggregatable', {
                      operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
                    });
                    continue;
                  }

                  attribute = attributes[j];

                  // Compose the collection name for the required data
                  var databaseName = sthDatabase.getDatabase(
                    request.headers['fiware-service']);

                  var servicePath = request.headers['fiware-servicepath'];

                  // Compose the collection name for the raw events
                  var collectionName4Events = sthDatabase.getCollectionName4Events(
                    servicePath,
                    contextElement.id,
                    contextElement.type,
                    attribute.name
                  );

                  // Get the collection
                  sthDatabase.getCollection(
                    databaseName,
                    collectionName4Events,
                    true,
                    function(collectionName4Events, contextElement, attribute, err, collection) {
                      if (err) {
                        // There was an error when getting the collection
                        sthLogger.warn(
                          'Error when getting the collection %s', collectionName4Events,
                          request.info.sth);
                        return reply(err);
                      } else {
                        // The collection exists
                        sthLogger.trace(
                          'The collection %s exists', collectionName4Events,
                          request.info.sth);

                        if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_RAW ||
                          sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH) {
                          sthDatabase.storeRawData(
                            collection,
                            timestamp,
                            servicePath,
                            contextElement.id,
                            contextElement.type,
                            attribute.name,
                            attribute.type,
                            attribute.value,
                            function (err) {
                              if (err) {
                                sthLogger.fatal(
                                  'Error when storing the raw data associated to a notification event',
                                  request.info.sth
                                );
                              } else {
                                sthLogger.trace(
                                  'Raw data associated to a notification event successfully stored',
                                  request.info.sth
                                );
                              }
                              if (++counter === totalTasks) {
                                reply(err);
                              }
                            }
                          );
                        }
                      }
                    }.bind(null, collectionName4Events, contextElement, attribute)
                  );

                  // Compose the collection name for the aggregated data
                  var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
                    servicePath,
                    contextElement.id,
                    contextElement.type,
                    attribute.name
                  );

                  // Get the collection
                  sthDatabase.getCollection(
                    databaseName,
                    collectionName4Aggregated,
                    true,
                    function(collectionName4Events, contextElement, attribute, err, collection) {
                      if (err) {
                        // There was an error when getting the collection
                        sthLogger.warn(
                          'Error when getting the collection %s', collectionName4Events,
                          request.info.sth);
                        return reply(err);
                      } else {
                        // The collection exists
                        sthLogger.trace(
                          'The collection %s exists', collectionName4Events,
                          request.info.sth);

                        if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_AGGREGATED ||
                          sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH) {
                          sthDatabase.storeAggregatedData(
                            collection,
                            timestamp,
                            servicePath,
                            contextElement.id,
                            contextElement.type,
                            attribute.name,
                            attribute.type,
                            attribute.value,
                            function (err) {
                              if (err) {
                                sthLogger.fatal(
                                  'Error when storing the aggregated data associated to a notification event',
                                  request.info.sth
                                );
                              } else {
                                sthLogger.trace(
                                  'Aggregated data associated to a notification event successfully stored',
                                  request.info.sth
                                );
                              }
                              if (++counter === totalTasks) {
                                reply(err);
                              }
                            }
                          );
                        }
                      }
                    }.bind(null, collectionName4Events, contextElement, attribute)
                  );
                }
              }
            }
          }
        },
        config: {
          validate: {
            headers: function(value, options, next) {
              var error;
              if (!value['fiware-service']) {
                value['fiware-service'] = sthConfig.SERVICE;
              }
              if (!value['fiware-servicepath']) {
                value['fiware-servicepath'] = sthConfig.SERVICE_PATH;
              }
              next();
            }
          }
        }
      }
    ]);

    // Start the server
    server.start(function (err) {
      return callback(err, server);
    });
  }

  /**
   * Stops the server asynchronously
   * @param {Function} callback Callback function to notify the result
   *  of the operation
   */
  function stopServer(callback) {
    sthLogger.info('Stopping the STH server...', {
      operationType: sthConfig.OPERATION_TYPE.SERVER_STOP
    });
    if (server && server.info.started && server.info.listener) {
      server.stop(function (err) {
        // Server successfully stopped
        sthLogger.info('hapi server successfully stopped', {
          operationType: sthConfig.OPERATION_TYPE.SERVER_STOP
        });
        return callback(err);
      });
    } else {
      sthLogger.info('No hapi server running', {
        operationType: sthConfig.OPERATION_TYPE.SERVER_STOP
      });
      return process.nextTick(callback);
    }
  }

  module.exports = function (aSthConfig, aSthLogger, aSthHelper) {
    sthConfig = aSthConfig;
    sthLogger = aSthLogger;
    sthHelper = aSthHelper;
    return {
      get server() {
        return server;
      },
      startServer: startServer,
      stopServer: stopServer
    };
  };
})();
