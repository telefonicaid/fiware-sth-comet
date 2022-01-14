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
const sthLogger = require('logops');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');
const sthDatabase = require(ROOT_PATH + '/lib/database/sthDatabase');

/**
 * Returns a textual description of the received request and the data included in it
 * @param  {Object} request The received request
 * @return {String}         The description of the received request including the data included in it
 */
function getRequestDescription(request) {
    // prettier-ignore
    return ('service (' + request.headers[sthConfig.HEADER.FIWARE_SERVICE] + '), service path (' +
        request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH] + ')' +
        (request.params.entityId ? ', entity id (' + request.params.entityId + ')' : '') +
        (request.params.entityType ? ', entity type (' + request.params.entityType + ')' : '') +
        (request.params.attrName ? ', attribute name (' + request.params.attrName + ')' : ''));
}

/**
 * Handler in case a removal request is received
 * @param {Object}   request The received request
 * @param {Function} reply   The hapi() function provided by the hapi server
 */
function removeDataHandler(request, reply) {
    let response;

    request.sth = request.sth || {};
    request.sth.context = sthServerUtils.getContext(request);

    sthLogger.debug(request.sth.context, request.method.toUpperCase() + ' ' + request.url.path);

    sthDatabase.removeData(
        {
            service: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
            servicePath: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
            entityId: request.params && request.params.entityId,
            entityType: request.params && request.params.entityType,
            attrName: request.params && request.params.attrName
        },
        function(err) {
            if (err) {
                if(err.name === 'MongoNetworkError' && err.message.includes('failed to connect to server')){
                    sthLogger.error(request.sth.context,'Database is not connected');
                    response =  reply(err);
                } else if (err.name === 'MongoError' && err.message.includes('does not exist. Currently in strict mode')) {
                    // There is no associated data for the provided service, service path and entity
                    sthLogger.debug(
                        request.sth.context,
                        'No data associated to the provided ' + getRequestDescription(request) + ' available'
                    );
                    // Reply with no error
                    response = reply();
                    response.code(204);
                } else {
                    sthLogger.warn(request.sth.context, 'Error when removing the data associated to an entity: ' + err);
                    // Reply with error
                    response = reply(err);
                }
            } else {
                sthLogger.debug(
                    request.sth.context,
                    'Data associated to the provided ' + getRequestDescription(request) + ' successfully removed'
                );
                response = reply();
                response.code(204);
            }
            sthServerUtils.addFiwareCorrelator(request, response);
        }
    );
}

module.exports = removeDataHandler;
