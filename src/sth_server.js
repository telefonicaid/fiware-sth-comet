/* globals module, process, require */

(function() {
  "use strict";

  var hapi = require('hapi');
  var joi = require('joi');

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
        path: '/STH/v1/contextEntities/type/{type}/id/{entityId}/attributes/{attributeId}',
        handler: function (request, reply) {
          var response,
              unicaCorrelatorPassed = request.headers[sthConfig.UNICA_CORRELATOR_HEADER];

          request.info.sth = {
            unicaCorrelator: unicaCorrelatorPassed || sthHelper.getUnicaCorrelator(request),
            transactionId: sthHelper.getTransactionId(),
            operationType: sthHelper.getOperationType(request)
            };

          sthLogger.trace(request.method.toUpperCase() + ' ' + request.url.path, request.info.sth);

          // Compose the collection name for the required data
          var collectionName = sthDatabase.getCollectionName4Aggregated(
            request.params.entityId, request.params.attributeId);

          // Check if the collection exists
          sthDatabase.getCollection(
            collectionName,
            function (err, collection) {
              if (err) {
                // The collection does not exist, reply with en empty response
                sthLogger.warn(
                  'The collection %s does not exist', collectionName, request.info.sth);

                var range = sthHelper.getRange(request.query.aggrPeriod);
                sthLogger.trace('Responding with no points', request.info.sth);
                response = reply(sthHelper.getEmptyResponse(request.query.aggrPeriod, range));
              } else {
                // The collection exists
                sthLogger.trace('The collection %s exists', collectionName, request.info.sth);

                sthDatabase.getAggregatedData(collectionName, request.query.aggrMethod,
                  request.query.aggrPeriod, request.query.dateFrom, request.query.dateTo,
                  sthConfig.FILTER_OUT_EMPTY,
                  function (err, result) {
                    if (err) {
                      // Error when getting the aggregated data
                      sthLogger.error(
                        'Error when getting data from %s', collectionName, request.info.sth);
                      sthLogger.trace('Responding with 500 - Internal Error', request.info.sth);
                      response = reply(err);
                    } else if (!result || !result.length) {
                      // No aggregated data available for the request
                      sthLogger.trace(
                        'No aggregated data available for the request: ' + request.url.path, request.info.sth);

                      var range = sthHelper.getRange(request.query.aggrPeriod);
                      sthLogger.trace('Responding with no points', request.info.sth);
                      response = reply(
                        sthHelper.getNGSIPayload(
                          request.params.entityId,
                          request.params.attributeId,
                          sthHelper.getEmptyResponse(request.query.aggrPeriod, range)
                        )
                      );
                    } else {
                      sthLogger.trace('Responding with %s docs', result.length, request.info.sth);
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
            query: {
              aggrMethod: joi.any().required().valid('max', 'min', 'sum', 'sum2'),
              aggrPeriod: joi.any().required().valid('month', 'day', 'hour', 'minute', 'second'),
              dateFrom: joi.date().optional(),
              dateTo: joi.date().optional()
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
