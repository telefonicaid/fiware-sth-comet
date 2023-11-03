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
const sthGetDataHandlerV1 = require(ROOT_PATH + '/lib/server/handlers/sthGetDataHandler');

/**
 * Handler for requests of historical raw and aggregated data for V2
 * @param {Object}   request The request
 * @param {Function} reply   The reply() function of the hapi server
 */
function getDataHandler(request, reply) {
    // FIXME: note the approach is to implement NGSIv2 handler as a wrapper of NGSIv1 handler. It should be
    // the opossite way arround (as NGSIv1 is the obsolete one). To be reversed in the future. Or maybe wait
    // until NGSIv1 gets removed from the code and refactor the handler properly in that moment

    /**
     * This is a wrapper of the hapi reply function, to deal with error format adaptation to NGSIv2
     *
     * @param {Object} payload to sent (as expected by reply hapi function)
     * @return {Object} a response object (as returned by the reply hapi function)
     */
    function replyHandler(payload) {
        if (payload.isBoom) {
            return reply
                .response({
                    error: payload.output.payload.error.replace(/ /, ''),
                    description: payload.output.payload.message
                })
                .code(payload.output.payload.statusCode);
        }
        return reply.response(payload);
    }

    request.params.entityType = request.query.type;
    request.params.version = 2;

    sthGetDataHandlerV1(request, replyHandler);
}

module.exports = getDataHandler;
