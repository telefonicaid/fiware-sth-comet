/* globals module, process, require */

(function() {
  "use strict";

  var hapi = require('hapi');
  var joi = require('joi');

  var server, sthDatabase, sthConfig, sthLogger, sthHelper;

  function startServer(host, port, aSTHDatabase, callback) {
    sthDatabase = aSTHDatabase;

    server = new hapi.Server();

    server.connection({
      host: host,
      port: port
    });

    server.route([
      {
        method: 'GET',
        path: '/STH/v1/contextEntities/type/{type}/id/{entityId}/attributes/{attributeId}',
        handler: function (request, reply) {
          // Compose the collection name for the required data
          var collectionName = sthDatabase.getCollectionName4Aggregated(
            request.params.entityId, request.params.attributeId);

          // Check if the collection exists
          sthDatabase.getCollection(
            collectionName,
            function (err, collection) {
              if (err) {
                // The collection does not exist, reply with en empty response
                sthLogger.info('The collection %s does not exist', collectionName);

                var range = sthHelper.getRange(request.query.aggrPeriod);
                return reply(sthHelper.getEmptyResponse(request.query.aggrPeriod, range));
              }

              // The collection exists
              sthLogger.info('The collection %s exists', collectionName);

              sthDatabase.getAggregatedData(collectionName, request.query.aggrMethod,
                request.query.aggrPeriod, request.query.dateFrom, request.query.dateTo,
                function (err, result) {
                  if (err) {
                    // Error when getting the aggregated data
                    sthLogger.error('Error when getting data from %s', collectionName);
                    reply(err);
                  } else if (!result || !result.length) {
                    // No aggregated data available for the request
                    sthLogger.info('No aggregated data available for the request: ' + request.path);
                    sthLogger.info('Query parameters:');
                    sthLogger.info(request.query);

                    var range = sthHelper.getRange(request.query.aggrPeriod);
                    return reply(sthHelper.getEmptyResponse(request.query.aggrPeriod, range));
                  } else {
                    return reply(result);
                  }
                }
              );
            }
          );
        },
        config: {
          validate: {
            query: {
              aggrMethod: joi.any().required().valid('max', 'min', 'sum', 'sum2'),
              aggrPeriod: joi.any().valid('month', 'day', 'hour', 'minute', 'second'),
              dateFrom: joi.date().optional(),
              dateTo: joi.date().optional()
            }
          }
        }
      }
    ]);

    // Logging configuration for the server
    // TODO: Use the logging format used in FIWARE
    var options = {
      opsInterval: 1000,
      reporters: [
        {
          reporter: require('good-file'),
          args: [
            {
              path: './logs',
              prefix: 'server-error'
            },
            {
              error: '*'
            }
          ]
        },
        {
          reporter: require('good-file'),
          args: [
            {
              path: './logs',
              prefix: 'server-ops'
            },
            {
              ops: '*'
            }
          ]
        },
        {
          reporter: require('good-file'),
          args: [
            {
              path: './logs',
              prefix: 'server-response'
            },
            {
              response: '*'
            }
          ]
        }
      ]
    };

    // Register the plugins (logging configuration) in the server
    server.register({
      register: require('good'),
      options: options
    }, function (err) {
      if (err) {
        return callback(err);
      } else {
        server.start(function () {
          return callback(null, server);
        });
      }
    });
  }

  module.exports = function (aSthConfig, aSthLogger, aSthHelper) {
    sthConfig = aSthConfig;
    sthLogger = aSthLogger;
    sthHelper = aSthHelper;
    return {
      get server() {
        return server;
      },
      startServer: startServer
    };
  };
})();