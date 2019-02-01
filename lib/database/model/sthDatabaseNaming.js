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
var sthLogger = require('logops');
var bytesCounter = require('bytes-counter');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
var sthDatabaseNameMapper = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapper');

/**
 * The maximumum database name size in bytes according to MongoDB documentation.
 * @type {number} Maximum database name size in bytes
 */
var MAX_DATABASE_NAME_SIZE_IN_BYTES = 64;

/**
 * The maximumum namespace size in bytes according to MongoDB documentation.
 * @type {number} Maximum namespace size in bytes
 */
var MAX_NAMESPACE_SIZE_IN_BYTES = 120;

/**
 * Returns the size of the namespace (for the collection where the aggregated data is stored) in bytes for certain
 *  database name and the collection name where the raw data is stored
 * @param  {String} datebaseName      The database name
 * @param  {String} rawCollectionName The name of the collection where the raw data is stored
 * @return {Number} The size in bytes of the namespace (for the collection where the aggregated data is stored)
 *  in bytes
 */
function getNamespaceSizeInBytes(datebaseName, rawCollectionName) {
    return (
        bytesCounter.count(datebaseName) +
        (rawCollectionName
            ? bytesCounter.count(sthConfig.COLLECTION_PREFIX) +
              bytesCounter.count(rawCollectionName) +
              bytesCounter.count('.aggr')
            : 0)
    );
}

/**
 * Returns the (encoded, if configured this way) database name associated to a service
 * @param  {string} service The service
 * @return {string}         The (encoded, if configured this way) database name
 */
function getDatabaseName(service) {
    var databaseName, newService;
    if (sthConfig.NAME_MAPPING) {
        newService = sthDatabaseNameMapper.mapService(service);
    }
    if (sthConfig.NAME_ENCODING) {
        databaseName = sthDatabaseNameCodec.encodeDatabaseName(sthConfig.DB_PREFIX + (newService || service));
    } else {
        databaseName = sthConfig.DB_PREFIX + (newService || service);
    }
    if (getNamespaceSizeInBytes(databaseName) > MAX_DATABASE_NAME_SIZE_IN_BYTES) {
        sthLogger.warn(
            sthConfig.LOGGING_CONTEXT.DB_LOG,
            'The size in bytes of the database ("' +
                databaseName +
                '", ' +
                getNamespaceSizeInBytes(databaseName) +
                ' bytes)' +
                ' is bigger than ' +
                MAX_DATABASE_NAME_SIZE_IN_BYTES +
                ' bytes'
        );
        return null;
    } else {
        return databaseName;
    }
}

/**
 * Returns the service associated to a (encoded, if configured this way) database name
 * @param  {string} databaseName The (encoded, if configured this way) database name
 * @return {string}              The associated service
 */
function getService(databaseName) {
    var newService, originalService;
    if (sthConfig.NAME_MAPPING) {
        if (sthConfig.NAME_ENCODING) {
            newService = sthDatabaseNameCodec.decodeDatabaseName(databaseName).substring(sthConfig.DB_PREFIX.length);
        } else {
            newService = databaseName.substring(sthConfig.DB_PREFIX.length);
        }
        originalService = sthDatabaseNameMapper.unmapService(newService);
        if (originalService) {
            return originalService;
        }
    }
    if (sthConfig.NAME_ENCODING) {
        var decodedDatabaseName = sthDatabaseNameCodec.decodeDatabaseName(databaseName);
        return decodedDatabaseName.substring(sthConfig.DB_PREFIX.length);
    }
    return databaseName.substring(sthConfig.DB_PREFIX.length);
}

/**
 * Returns the name of the collection which will store the raw events
 * @param  {Object}  params   Params object including the following properties:
 *                              - service: The service
 *                              - servicePath: The service path
 *                              - entityId: The entity id
 *                              - entityType: The entity type
 *                              - attrName: The attribute name
 * @returns {String}          The raw data collection name
 */
function getRawCollectionName(params) {
    var collectionName4Events;
    var databaseName = getDatabaseName(params.service),
        servicePath = params.servicePath,
        entityId = params.entityId,
        entityType = params.entityType,
        attrName = params.attrName;
    var newServicePath, newEntityId, newEntityType, newAttrName;

    if (sthConfig.NAME_MAPPING && servicePath) {
        newServicePath = sthDatabaseNameMapper.mapServicePath(params.service, servicePath);
        if (newServicePath && sthConfig.NAME_ENCODING) {
            newServicePath = sthDatabaseNameCodec.encodeCollectionName(newServicePath);
        }
    }
    if (!newServicePath && sthConfig.NAME_ENCODING && servicePath) {
        newServicePath = sthDatabaseNameCodec.encodeCollectionName(servicePath);
    }
    if (!newServicePath) {
        newServicePath = servicePath;
    }

    if (sthConfig.NAME_MAPPING && servicePath && entityId) {
        newEntityId = sthDatabaseNameMapper.mapEntityName(params.service, servicePath, entityId);
        if (newEntityId && sthConfig.NAME_ENCODING) {
            newEntityId = sthDatabaseNameCodec.encodeCollectionName(newEntityId);
        }
    }
    if (!newEntityId && sthConfig.NAME_ENCODING && entityId) {
        newEntityId = sthDatabaseNameCodec.encodeCollectionName(entityId);
    }
    if (!newEntityId) {
        newEntityId = entityId;
    }

    if (sthConfig.NAME_MAPPING && servicePath && entityType) {
        newEntityType = sthDatabaseNameMapper.mapEntityType(params.service, servicePath, entityType);
        if (newEntityType && sthConfig.NAME_ENCODING) {
            newEntityType = sthDatabaseNameCodec.encodeCollectionName(newEntityType);
        }
    }
    if (!newEntityType && sthConfig.NAME_ENCODING && entityType) {
        newEntityType = sthDatabaseNameCodec.encodeCollectionName(entityType);
    }
    if (!newEntityType) {
        newEntityType = entityType;
    }

    if (sthConfig.NAME_MAPPING && servicePath && entityId && attrName) {
        newAttrName = sthDatabaseNameMapper.mapAttributeName(params.service, servicePath, entityId, attrName);
        if (newAttrName && sthConfig.NAME_ENCODING) {
            newAttrName = sthDatabaseNameCodec.encodeCollectionName(newAttrName);
        }
    }
    if (!newAttrName && sthConfig.NAME_ENCODING && attrName) {
        newAttrName = sthDatabaseNameCodec.encodeCollectionName(attrName);
    }
    if (!newAttrName) {
        newAttrName = attrName;
    }

    switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            collectionName4Events = newServicePath;
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            collectionName4Events =
                newServicePath +
                sthConfig.NAME_SEPARATOR +
                newEntityId +
                (newEntityType ? sthConfig.NAME_SEPARATOR + newEntityType : '');
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            collectionName4Events =
                newServicePath +
                sthConfig.NAME_SEPARATOR +
                newEntityId +
                (newEntityType ? sthConfig.NAME_SEPARATOR + newEntityType : '') +
                sthConfig.NAME_SEPARATOR +
                newAttrName;
            break;
    }

    if (getNamespaceSizeInBytes(databaseName, collectionName4Events) > MAX_NAMESPACE_SIZE_IN_BYTES) {
        sthLogger.warn(
            sthConfig.LOGGING_CONTEXT.DB_LOG,
            'The size in bytes of the namespace for storing the aggregated data ("' +
                databaseName +
                '" plus "' +
                sthConfig.COLLECTION_PREFIX +
                collectionName4Events +
                '.aggr", ' +
                getNamespaceSizeInBytes(databaseName, collectionName4Events) +
                ' bytes)' +
                ' is bigger than ' +
                MAX_NAMESPACE_SIZE_IN_BYTES +
                ' bytes'
        );
        return null;
    } else {
        if (sthConfig.NAME_ENCODING) {
            return sthDatabaseNameCodec.encodeCollectionName(sthConfig.COLLECTION_PREFIX) + collectionName4Events;
        }
        return sthConfig.COLLECTION_PREFIX + collectionName4Events;
    }
}

/**
 * Returns the name of the collection which will store the aggregated data
 * @param  {Object}  params   Params object including the following properties:
 *                              - service: The service
 *                              - servicePath: The service path
 *                              - entityId: The entity id
 *                              - entityType: The entity type
 *                              - attrName: The attribute name
 * @returns {String}          The aggregated data collection name
 */
function getAggregatedCollectionName(params) {
    var collectionName4Events = getRawCollectionName(params);
    if (collectionName4Events) {
        return (
            collectionName4Events +
            (sthConfig.NAME_ENCODING ? sthDatabaseNameCodec.encodeCollectionName('.aggr') : '.aggr')
        );
    } else {
        return null;
    }
}

module.exports = {
    getDatabaseName: getDatabaseName,
    getService: getService,
    getRawCollectionName: getRawCollectionName,
    getAggregatedCollectionName: getAggregatedCollectionName
};
