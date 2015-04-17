/* globals module, process, require */

(function() {
  "use strict";

  var hapi = require('hapi');
  var joi = require('joi');
  var boom = require('boom');

  var server, sthDatabase, sthConfig, sthLogger, sthHelper;

  /**
   * Starts the server asynchronously
   * @param {string} host The host where the server will be running
   * @param {string} port The port where the server will be listening
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
        path: '/STH/v1/contextEntities/type/{entityType}/id/{entityId}/attributes/{attributeId}',
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

          // Compose the collection name for the required data
          var collectionName = sthDatabase.getCollectionName4Aggregated(
            request.headers['fiware-servicepath'],
            request.params.entityId,
            request.params.entityType,
            request.params.attributeId
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

                var range = sthHelper.getRange(request.query.aggrPeriod);
                sthLogger.trace(
                  'Responding with no points',
                  request.info.sth);
                response = reply(sthHelper.getEmptyResponse(request.query.aggrPeriod, range));
              } else {
                // The collection exists
                sthLogger.trace(
                  'The collection %s exists', collectionName, request.info.sth);

                sthDatabase.getAggregatedData(
                  request.headers['fiware-servicepath'],
                  request.params.entityId,
                  request.params.entityType,
                  request.params.attributeId,
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

                      var range = sthHelper.getRange(request.query.aggrPeriod);
                      sthLogger.trace(
                        'Responding with no points', request.info.sth);
                      response = reply(
                        sthHelper.getNGSIPayload(
                          request.params.entityId,
                          request.params.attributeId,
                          sthHelper.getEmptyResponse(request.query.aggrPeriod, range)
                        )
                      );
                    } else {
                      sthLogger.trace(
                        'Responding with %s docs', result.length, request.info.sth);
                      response = reply(
                        sthHelper.getNGSIPayload(
                          request.params.entityId,
                          request.params.attributeId,
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
              aggrMethod: joi.string().required().valid('max', 'min', 'sum', 'sum2'),
              aggrPeriod: joi.string().required().valid('month', 'day', 'hour', 'minute', 'second'),
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

          request.info.sth = {
            unicaCorrelator: unicaCorrelatorPassed || sthHelper.getUnicaCorrelator(request),
            transactionId: sthHelper.getTransactionId(),
            operationType: sthHelper.getOperationType(request)
          };

          if (request.payload && request.payload.contextResponses &&
            Array.isArray(request.payload.contextResponses)) {
            contextResponses = request.payload.contextResponses;
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

                  // Check if the collection exists
                  sthDatabase.getCollection(
                    databaseName,
                    collectionName4Events,
                    true,
                    function (err, collection) {
                      if (err) {
                        // There was an error when getting the collection
                        sthLogger.warn(
                          'Error when getting the collection %s', collectionName4Events,
                          request.info.sth);
                      } else {
                        // The collection exists
                        sthLogger.trace(
                          'The collection %s exists', collectionName4Events,
                          request.info.sth);

                        sthDatabase.storeRawData(
                          timestamp,
                          servicePath,
                          contextElement.id,
                          contextElement.type,
                          attribute.name,
                          attribute.type,
                          attribute.value,
                          function(err) {
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
                          }
                        );

                        sthDatabase.storeAggregatedData(
                          timestamp,
                          servicePath,
                          contextElement.id,
                          contextElement.type,
                          attribute.name,
                          attribute.type,
                          attribute.value,
                          function(err) {
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
                          }
                        );
                      }
                    }
                  );
                }
              }
            }
          }
          reply();
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
    server.start(function () {
      return callback(null, server);
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
    if (server) {
      server.stop(function () {
        // Server successfully stopped
        sthLogger.info('hapi server successfully stopped', {
          operationType: sthConfig.OPERATION_TYPE.SERVER_STOP
        });
        return callback();
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
