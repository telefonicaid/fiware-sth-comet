/* globals module, process, require */

(function() {
  "use strict";

  var hapi = require('hapi');
  var joi = require('joi');
  var boom = require('boom');

  var server, sthDatabase, sthConfig, sthLogger, sthHelper;

  var attendedRequests = 0;

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
        sthLogger.warn('event=' + JSON.stringify(event), {
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
          sthLogger.error(
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

    /**
     * Attends raw data requests
     * @param request The request
     * @param reply Hapi's reply function
     * @param unicaCorrelatorPassed The Unica-Correlator header value
     */
    function getRawData(request, reply, unicaCorrelatorPassed) {
      var response;

      sthDatabase.getCollection(
        {
          service: request.headers['fiware-service'],
          servicePath: request.headers['fiware-servicepath'],
          entityId: request.params.entityId,
          entityType: request.params.entityType,
          attrName: request.params.attrName
        },
        false,
        false,
        false,
        false,
        function (err, collection) {
          if (err) {
            // The collection does not exist, reply with en empty response
            sthLogger.warn(
              'Error when getting the collection (the collection may not exist)', request.info.sth);

            sthLogger.debug(
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
            sthLogger.debug(
              'The collection exists', request.info.sth);

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
                    'Error when getting data from collection', request.info.sth);
                  sthLogger.debug(
                    'Responding with 500 - Internal Error', request.info.sth);
                  response = reply(err);
                } else if (!result || !result.length) {
                  // No aggregated data available for the request
                  sthLogger.debug(
                    'No aggregated data available for the request: ' + request.url.path,
                    request.info.sth);

                  sthLogger.debug(
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
                  sthLogger.debug(
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
    }

    /**
     * Attends aggregated data requests
     * @param request The request
     * @param reply Hapi's reply function
     * @param unicaCorrelatorPassed The Unica-Correlator header value
     */
    function getAggregatedData(request, reply, unicaCorrelatorPassed) {
      var response;

      sthDatabase.getCollection(
        {
          service: request.headers['fiware-service'],
          servicePath: request.headers['fiware-servicepath'],
          entityId: request.params.entityId,
          entityType: request.params.entityType,
          attrName: request.params.attrName
        },
        true,
        false,
        false,
        false,
        function (err, collection) {
          if (err) {
            // The collection does not exist, reply with en empty response
            sthLogger.warn(
              'Error when getting the collection (the collection may not exist)', request.info.sth);

            sthLogger.debug(
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
            sthLogger.debug(
              'The collection exists', request.info.sth);

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
                    'Error when getting data from collection', request.info.sth);
                  sthLogger.debug(
                    'Responding with 500 - Internal Error', request.info.sth);
                  response = reply(err);
                } else if (!result || !result.length) {
                  // No aggregated data available for the request
                  sthLogger.debug(
                    'No aggregated data available for the request: ' + request.url.path,
                    request.info.sth);

                  sthLogger.debug(
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
                  sthLogger.debug(
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
    }

    /**
     * Stores raw data into the database
     * @param service The service of the attribute
     * @param servicePath The service path of the attribute
     * @param contextElement The context element
     * @param attribute The attribute
     * @param recvTime The timestamp of the notification when it reached the server
     * @param counterObj A helper counter object. This is needed since Javascript implements calls-by-sharing
     *  (see http://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) and the counter is shared between
     *  rawAggregatedData() and storeAggregatedData() functions to let them synchronize
     * @param totalTasks The total number of writings to make
     * @param reply The Hapi server's reply function
     */
    function storeRawData(service, servicePath, contextElement, attribute, recvTime, counterObj, totalTasks, request, reply) {
      // Get the collection
      sthDatabase.getCollection(
        {
          service: service,
          servicePath: servicePath,
          entityId: contextElement.id,
          entityType: contextElement.type,
          attrName: attribute.name
        },
        false,
        true,
        true,
        true,
        function(err, collection) {
          if (err) {
            // There was an error when getting the collection
            sthLogger.error(
              'Error when getting the collection',
              request.info.sth);
            if (++counterObj.counter === totalTasks) {
              return reply(err);
            }
          } else {
            // The collection exists
            sthLogger.debug(
              'The collection exists',
              request.info.sth);

            if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_RAW ||
              sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH) {
              sthDatabase.storeRawData(
                collection,
                recvTime,
                servicePath,
                contextElement.id,
                contextElement.type,
                attribute.name,
                attribute.type,
                attribute.value,
                function (err) {
                  if (err) {
                    sthLogger.error(
                      'Error when storing the raw data associated to a notification event',
                      request.info.sth
                    );
                  } else {
                    sthLogger.debug(
                      'Raw data associated to a notification event successfully stored',
                      request.info.sth
                    );
                  }
                  if (++counterObj.counter === totalTasks) {
                    reply(err);
                  }
                }
              );
            }
          }
        }
      );
    }

    /**
     * Stores aggregated data into the database
     * @param service The service of the attribute
     * @param servicePath The service path of the attribute
     * @param contextElement The context element
     * @param attribute The attribute
     * @param recvTime The timestamp of the notification when it reached the server
     * @param counterObj A helper counter object. This is needed since Javascript implements calls-by-sharing
     *  (see http://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) and the counter is shared between
     *  rawAggregatedData() and storeAggregatedData() functions to let them synchronize
     * @param totalTasks The total number of writings to make
     * @param reply The Hapi server's reply function
     */
    function storeAggregatedData(service, servicePath, contextElement, attribute, recvTime, counterObj, totalTasks, request, reply) {
      // Get the collection
      sthDatabase.getCollection(
        {
          service: service,
          servicePath: servicePath,
          entityId: contextElement.id,
          entityType: contextElement.type,
          attrName: attribute.name
        },
        true,
        true,
        true,
        true,
        function(err, collection) {
          if (err) {
            // There was an error when getting the collection
            sthLogger.error(
              'Error when getting the collection',
              request.info.sth);
            if (++counterObj.counter === totalTasks) {
              return reply(err);
            }
          } else {
            // The collection exists
            sthLogger.debug(
              'The collection exists',
              request.info.sth);

            if (sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.ONLY_AGGREGATED ||
              sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH) {
              sthDatabase.storeAggregatedData(
                collection,
                recvTime,
                servicePath,
                contextElement.id,
                contextElement.type,
                attribute.name,
                attribute.type,
                attribute.value,
                function (err) {
                  if (err) {
                    sthLogger.error(
                      'Error when storing the aggregated data associated to a notification event',
                      request.info.sth
                    );
                  } else {
                    sthLogger.debug(
                      'Aggregated data associated to a notification event successfully stored',
                      request.info.sth
                    );
                  }
                  if (++counterObj.counter === totalTasks) {
                    reply(err);
                  }
                }
              );
            }
          }
        }
      );
    }

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

          sthLogger.debug(
            request.method.toUpperCase() + ' ' + request.url.path,
            request.info.sth);

          // Compose the collection name for the required data
          var databaseName = sthDatabase.getDatabase(
            request.headers['fiware-service']);

          if ((request.query.lastN || request.query.lastN === 0)  ||
            ((request.query.hLimit || request.query.hLimit === 0) &&
            (request.query.hOffset || request.query.hOffset === 0))) {
            // Raw data is requested
            getRawData(request, reply, unicaCorrelatorPassed);
          } else if (request.query.aggrMethod && request.query.aggrPeriod) {
            // Aggregated data is requested
            getAggregatedData(request, reply, unicaCorrelatorPassed);
          } else {
            var message = 'A combination of the following query params is required: lastN, hLimit and hOffset ' +
              ', or aggrMethod and aggrPeriod';
            sthLogger.warn(
              request.method.toUpperCase() + ' ' + request.url.path +
              ', error=' + message,
              {
                operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
              }
            );
            var error = boom.badRequest(message);
            error.output.payload.validation = {
              source: 'query',
              keys: ['lastN', 'hLimit', 'hOffset', 'aggrMethod', 'aggrPeriod']
            };
            return reply(error);
          }
        },
        config: {
          validate: {
            headers: function(value, options, next) {
              var error, message;

              attendedRequests++;

              if (!value['fiware-service']) {
                message = 'error=child "fiware-service" fails because [fiware-service is required]';
                sthLogger.warn(
                  message,
                  {
                    operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
                  }
                );
                error = boom.badRequest(message);
                error.output.payload.validation = {source: 'headers', keys: ['fiware-service']};
                next(error);
              } else if (!value['fiware-servicepath']) {
                message = 'child "fiware-servicepath" fails because [fiware-servicepath is required]';
                sthLogger.warn(
                  message,
                  {
                    operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
                  }
                );
                error = boom.badRequest(message);
                error.output.payload.validation = {source: 'headers', keys: ['fiware-servicepath']};
                next(error);
              }
              next();
            },
            query: {
              lastN: joi.number().integer().greater(-1).optional(),
              hLimit: joi.number().integer().greater(-1).optional(),
              hOffset: joi.number().integer().greater(-1).optional(),
              aggrMethod: joi.string().valid('max', 'min', 'sum', 'sum2', 'occur').optional(),
              aggrPeriod: joi.string().required().valid('month', 'day', 'hour', 'minute', 'second').optional(),
              dateFrom: joi.date().optional(),
              dateTo: joi.date().optional()
            }
          }
        }
      },
      {
        method: 'GET',
        path: '/version',
        handler: function(request, reply) {
          var message = sthHelper.getVersion();
          return reply(message);
        }
      },
      {
        method: 'POST',
        path: '/notify',
        handler: function(request, reply) {
          var recvTime = new Date(),
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
                  if (!attributes[l2].value ||
                    (isNaN(attributes[l2].value) && typeof(attributes[l2].value) !== 'string')) {
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

            // An object is needed since Javascript implements calls-by-sharing
            //  (see http://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) and the counter is shared between
            //  rawAggregatedData() and storeAggregatedData() functions to let them synchronize
            var counterObj = {
              counter: 0
            };
            var totalAttributes = getTotalAttributes(contextResponses);

            var totalTasks = sthConfig.SHOULD_STORE === sthConfig.DATA_TO_STORE.BOTH ?
                  (2 * totalAttributes) : (1 * totalAttributes);

            if (totalAttributes > 0) {
              for (var i = 0; i < contextResponses.length; i++) {
                if (contextResponses[i].contextElement &&
                  contextResponses[i].contextElement.attributes &&
                  Array.isArray(contextResponses[i].contextElement.attributes)) {
                  contextElement = contextResponses[i].contextElement;
                  attributes = contextElement.attributes;
                  for (var j = 0; j < attributes.length; j++) {
                    if (!attributes[j].value ||
                      (isNaN(attributes[j].value) && typeof(attributes[j].value) !== 'string')) {
                      // The attribute value is not a number and consequently not able to be aggregated.
                      sthLogger.warn('Attribute value not aggregatable', {
                        operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
                      });
                      continue;
                    }

                    attribute = attributes[j];

                    var service = request.headers['fiware-service'];

                    var servicePath = request.headers['fiware-servicepath'];

                    // Store the raw data into the database
                    storeRawData(service, servicePath, contextElement, attribute, recvTime, counterObj, totalTasks, request, reply);

                    // Store the aggregated data into the database
                    storeAggregatedData(service, servicePath, contextElement, attribute, recvTime, counterObj, totalTasks, request, reply);
                  }
                }
              }
            } else {
              var message = 'At least one attribute with an aggregatable value should be included in the notification';
              sthLogger.warn(
                request.method.toUpperCase() + ' ' + request.url.path +
                ', error=' + message,
                {
                  operationType: sthConfig.OPERATION_TYPE.SERVER_LOG
                }
              );
              var error = boom.badRequest(message);
              error.output.payload.validation = {source: 'payload', keys: ['attributes']};
              return reply(error);
            }
          }
        },
        config: {
          validate: {
            headers: function(value, options, next) {
              attendedRequests++;

              if (!value['fiware-service']) {
                value['fiware-service'] = sthConfig.DEFAULT_SERVICE;
              }
              if (!value['fiware-servicepath']) {
                value['fiware-servicepath'] = sthConfig.DEFAULT_SERVICE_PATH;
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
    if (server && server.info && server.info.started) {
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

  /**
   * Returns the server KPIs
   * @return {{attendedRequests: number}}
   */
  function getKPIs() {
    return {
      attendedRequests: attendedRequests
    }
  }

  /**
   * Resets the server KPIs
   */
  function resetKPIs() {
    attendedRequests = 0;
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
      stopServer: stopServer,
      getKPIs: getKPIs,
      resetKPIs: resetKPIs
    };
  };
})();
