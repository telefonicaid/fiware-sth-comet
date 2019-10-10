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

'use strict';

var ROOT_PATH = require('app-root-path');
var uuid = require('uuid');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');

/**
 * Returns the platform correlator if included in a request
 * @param {object} request The HTTP request
 * @return {string} The correlator, if any
 */
function getCorrelator(request) {
    return request && request.headers[sthConfig.HEADER.CORRELATOR];
}

/**
 * Adds the Fiware-Correlator header into the response object
 * @param {object} request  The request
 * @param {object} response The response
 */
function addFiwareCorrelator(request, response) {
    if (response && response.header) {
        // CSV response has no response.header
        response.header(sthConfig.HEADER.CORRELATOR, getCorrelator(request) || request.sth.context.trans);
    }
}

/**
 * Adds the Fiware-Total-Count header into the response object
 * @param {object} totalCount  The totalCount
 * @param {object} response The response
 */
function addFiwareTotalCount(totalCount, response) {
    if (response && response.header) {
        // CSV response has no response.header
        response.header(sthConfig.HEADER.FIWARE_TOTAL_COUNT, totalCount);
    }
}

/**
 * Generates the transaction identifier to be used for logging
 * @return {string} The generated transaction
 */
function createTransaction() {
    return uuid.v4();
}

/**
 * Returns the operation type for a concrete request to be used for logging
 * @param {object} request The request
 * @return {string} The operation type
 */
function getOperationType(request) {
    if (!request) {
        return sthConfig.OPERATION_TYPE.SERVER_LOG;
    } else {
        return sthConfig.OPERATION_TYPE_PREFIX + request.method.toUpperCase();
    }
}

/**
 * Returns the object to return in case no aggregated data exists for
 *  certain criteria
 * @returns {Array} An empty array
 */
function getEmptyResponse() {
    return [];
}

/**
 * Transforms a response payload into a NGSI formatted response
 *  payload
 * @param ngsiVersion NGSI version to use. Anything different from 2 (included undefined) means v1
 * @param entityId The id of the requested entity's data
 * @param entityType The type of the requested entity's data
 * @param attrName The id of the requested attribute's data
 * @param payload The payload to transform
 * @return {Object} The payload using NGSI format
 */
function getNGSIPayload(ngsiVersion, entityId, entityType, attrName, payload) {
    var ngsiResponse;
    if (ngsiVersion === 2) {
        ngsiResponse = {
            // attr type is based in NGSIv2 specification "Partial Representations" section
            type: 'StructuredValue',
            value: payload
        };
    } else {
        ngsiResponse = {
            contextResponses: [
                {
                    contextElement: {
                        attributes: [
                            {
                                name: attrName,
                                values: payload
                            }
                        ],
                        id: entityId,
                        isPattern: false,
                        type: entityType
                    },
                    statusCode: {
                        code: '200',
                        reasonPhrase: 'OK'
                    }
                }
            ]
        };
    }
    return ngsiResponse;
}

/**
 * Returns the logging context associated to a request
 * @param {Object} request The request received
 * @return {Object} The context to be used for logging
 */
function getContext(request) {
    var transactionId = createTransaction();
    return {
        corr: getCorrelator(request) || transactionId,
        trans: transactionId,
        op: getOperationType(request),
        from: request.headers[sthConfig.HEADER.X_REAL_IP] || 'n/a',
        srv: request.headers[sthConfig.HEADER.FIWARE_SERVICE],
        subsrv: request.headers[sthConfig.HEADER.FIWARE_SERVICE_PATH],
        comp: 'STH'
    };
}

module.exports = {
    addFiwareCorrelator: addFiwareCorrelator,
    addFiwareTotalCount: addFiwareTotalCount,
    getContext: getContext,
    getCorrelator: getCorrelator,
    getEmptyResponse: getEmptyResponse,
    getNGSIPayload: getNGSIPayload
};
