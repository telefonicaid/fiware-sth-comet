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

const ENV = process.env;

module.exports = {
    SAMPLES: ENV.SAMPLES || 1,
    EVENT_NOTIFICATION_CONTEXT_ELEMENTS: ENV.EVENT_NOTIFICATION_CONTEXT_ELEMENTS || 3,
    ENTITY_ID: ENV.ENTITY_ID || 'entityId',
    ENTITY_TYPE: ENV.ENTITY_TYPE || 'entityType',
    ATTRIBUTE_NAME: ENV.ATTRIBUTE_NAME || 'attrName',
    ATTRIBUTE_TYPE: ENV.ATTRIBUTE_TYPE || 'attrType',
    // If not set, the start date for the generation of random events is set
    //  by default to the beginning of the previous year to avoid collisions
    //  with the testing of the Orion Context Broker notifications
    START_DATE: ENV.START_DATE ? new Date(ENV.START_DATE) : new Date(new Date().getFullYear() - 1, 0),
    // If not set, the start date for the generation of random events is set
    //  by default to the end of the previous year to avoid collisions
    //  with the testing of the Orion Context Broker notifications
    END_DATE: ENV.END_DATE ? new Date(ENV.END_DATE) : new Date(new Date(new Date().getFullYear(), 0) - 1),
    MIN_VALUE: ENV.MIN_VALUE || 0,
    MAX_VALUE: ENV.MAX_VALUE || 100,
    CLEAN: ENV.CLEAN !== 'false',
    API_OPERATION: {
        READ: 'read',
        READ_V2: 'read_v2',
        NOTIFY: 'notify',
        ADMIN: {
            GET_LOG_LEVEL: 'getLogLevel',
            SET_LOG_LEVEL: 'setLogLevel'
        },
        VERSION: 'version',
        DELETE: 'delete'
    },
    DATA_TYPES: {
        RAW: 'raw',
        AGGREGATED: 'aggregated'
    }
};
