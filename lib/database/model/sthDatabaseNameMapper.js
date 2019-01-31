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
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');

/**
 * Maps a service name to a new service name according to the database name mapping configuration file
 * @param  {String} service The original service name
 * @return {String}         The new service name or null if no mapping is available
 */
function mapService(service) {
    if (
        sthConfig.NAME_MAPPING &&
        sthConfig.NAME_MAPPING.serviceMappings &&
        Array.isArray(sthConfig.NAME_MAPPING.serviceMappings)
    ) {
        for (var ii = 0; ii < sthConfig.NAME_MAPPING.serviceMappings.length; ii++) {
            if (sthConfig.NAME_MAPPING.serviceMappings[ii].originalService === service) {
                return sthConfig.NAME_MAPPING.serviceMappings[ii].newService;
            }
        }
    }
    return null;
}

/**
 * Unmaps a service name to its original service name according to the database name mapping configuration file
 * @param  {String} service The new service name
 * @return {String}         The original service name or null if no mapping is available
 */
function unmapService(service) {
    if (
        sthConfig.NAME_MAPPING &&
        sthConfig.NAME_MAPPING.serviceMappings &&
        Array.isArray(sthConfig.NAME_MAPPING.serviceMappings)
    ) {
        for (var ii = 0; ii < sthConfig.NAME_MAPPING.serviceMappings.length; ii++) {
            if (sthConfig.NAME_MAPPING.serviceMappings[ii].newService === service) {
                return sthConfig.NAME_MAPPING.serviceMappings[ii].originalService;
            }
        }
    }
    return null;
}

/**
 * Returns the serviceMappings index for a service mapping
 * @param  {String} service The original service name
 * @return {Number}         The array index associated to the concrete service mapping or -1 if no mapping is available
 */
function getserviceMappingsIndexFromOriginal(service) {
    if (
        sthConfig.NAME_MAPPING &&
        sthConfig.NAME_MAPPING.serviceMappings &&
        Array.isArray(sthConfig.NAME_MAPPING.serviceMappings)
    ) {
        for (var ii = 0; ii < sthConfig.NAME_MAPPING.serviceMappings.length; ii++) {
            if (sthConfig.NAME_MAPPING.serviceMappings[ii].originalService === service) {
                return ii;
            }
        }
    }
    return -1;
}

/**
 * Returns the serviceMappings index for a service mapping
 * @param  {String} service The new service name
 * @return {Number}         The array index associated to the concrete service mapping or -1 if no mapping is available
 */
function getserviceMappingsIndexFromNew(service) {
    if (
        sthConfig.NAME_MAPPING &&
        sthConfig.NAME_MAPPING.serviceMappings &&
        Array.isArray(sthConfig.NAME_MAPPING.serviceMappings)
    ) {
        for (var ii = 0; ii < sthConfig.NAME_MAPPING.serviceMappings.length; ii++) {
            if (sthConfig.NAME_MAPPING.serviceMappings[ii].newService === service) {
                return ii;
            }
        }
    }
    return -1;
}

/**
 * Maps a service path name to a new service path name according to the database name mapping configuration file
 * @param  {String} service     The original service
 * @param  {String} servicePath The original service path
 * @return {String}             The new service path or null if no mapping is available
 */
function mapServicePath(service, servicePath) {
    var serviceMappingsIndex = getserviceMappingsIndexFromOriginal(service),
        servicePathMappings;
    if (serviceMappingsIndex >= 0) {
        servicePathMappings = sthConfig.NAME_MAPPING.serviceMappings[serviceMappingsIndex].servicePathMappings;
        if (servicePathMappings && Array.isArray(servicePathMappings)) {
            for (var ii = 0; ii < servicePathMappings.length; ii++) {
                if (servicePathMappings[ii].originalServicePath === servicePath) {
                    return servicePathMappings[ii].newServicePath;
                }
            }
        }
    }
    return null;
}

/**
 * Unmaps a service path name to the original service path name according to the database name mapping configuration
 * file
 * @param  {String} service     The new service
 * @param  {String} servicePath The new service path
 * @return {String}             The original service path or null if no mapping is available
 */
function unmapServicePath(service, servicePath) {
    var serviceMappingsIndex = getserviceMappingsIndexFromNew(service),
        servicePathMappings;
    if (serviceMappingsIndex >= 0) {
        servicePathMappings = sthConfig.NAME_MAPPING.serviceMappings[serviceMappingsIndex].servicePathMappings;
        if (servicePathMappings && Array.isArray(servicePathMappings)) {
            for (var ii = 0; ii < servicePathMappings.length; ii++) {
                if (servicePathMappings[ii].newServicePath === servicePath) {
                    return servicePathMappings[ii].originalServicePath;
                }
            }
        }
    }
    return null;
}

/**
 * Returns the pair composed by the serviceMappings and servicePathMappings indexes for a service path mapping
 * @param  {String} service     The original service
 * @param  {String} servicePath The original service path
 * @return {Array}              An array including the serviceMappings and the servicePathMappings indexes or null if no
 *                              service path mapping is available
 */
function getServicePathMappingIndexesFromOriginal(service, servicePath) {
    var serviceMappingsIndex = getserviceMappingsIndexFromOriginal(service),
        servicePathMappings;
    if (serviceMappingsIndex >= 0) {
        servicePathMappings = sthConfig.NAME_MAPPING.serviceMappings[serviceMappingsIndex].servicePathMappings;
        if (servicePathMappings && Array.isArray(servicePathMappings)) {
            for (var ii = 0; ii < servicePathMappings.length; ii++) {
                if (servicePathMappings[ii].originalServicePath === servicePath) {
                    return [serviceMappingsIndex, ii];
                }
            }
        }
    }
    return null;
}

/**
 * Returns the pair composed by the serviceMappings and servicePathMappings indexes for a service path mapping
 * @param  {String} service     The new service
 * @param  {String} servicePath The new service path
 * @return {Array}              An array including the serviceMappings and the servicePathMappings indexes or null if no
 *                              service path mapping is available
 */
function getServicePathMappingIndexesFromNew(service, servicePath) {
    var serviceMappingsIndex = getserviceMappingsIndexFromNew(service),
        servicePathMappings;
    if (serviceMappingsIndex >= 0) {
        servicePathMappings = sthConfig.NAME_MAPPING.serviceMappings[serviceMappingsIndex].servicePathMappings;
        if (servicePathMappings && Array.isArray(servicePathMappings)) {
            for (var ii = 0; ii < servicePathMappings.length; ii++) {
                if (servicePathMappings[ii].newServicePath === servicePath) {
                    return [serviceMappingsIndex, ii];
                }
            }
        }
    }
    return null;
}

/**
 * Maps an entity name to a new entity name according to the database name mapping configuration file
 * @param  {String} service     The original service name
 * @param  {String} servicePath The original service path
 * @param  {String} entityId    The original entity name
 * @return {String}             The new entity name or null if no mapping is available
 */
function mapEntityName(service, servicePath, entityId) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromOriginal(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].originalEntityId === entityId) {
                    return entityMappings[ii].newEntityId;
                }
            }
        }
    }
    return null;
}

/**
 * Unmaps an entity name to its original entity name according to the database name mapping configuration file
 * @param  {String} service     The new service name
 * @param  {String} servicePath The new service path
 * @param  {String} entityId    The new entity name
 * @return {String}             The original entity name or null if no mapping is available
 */
function unmapEntityName(service, servicePath, entityId) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromNew(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].newEntityId === entityId) {
                    return entityMappings[ii].originalEntityId;
                }
            }
        }
    }
    return null;
}

/**
 * Maps an entity type to a new entity type according to the database name mapping configuration file
 * @param  {String} service     The original service name
 * @param  {String} servicePath The original service path
 * @param  {String} entityType  The original entity type
 * @return {String}             The new entity type or null if no mapping is available
 */
function mapEntityType(service, servicePath, entityType) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromOriginal(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].originalEntityType === entityType) {
                    return entityMappings[ii].newEntityType;
                }
            }
        }
    }
    return null;
}

/**
 * Unmaps an entity type to the original entity type according to the database name mapping configuration file
 * @param  {String} service     The new service name
 * @param  {String} servicePath The new service path
 * @param  {String} entityType  The new entity type
 * @return {String}             The original entity type or null if no mapping is available
 */
function unmapEntityType(service, servicePath, entityType) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromNew(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].newEntityType === entityType) {
                    return entityMappings[ii].originalEntityType;
                }
            }
        }
    }
    return null;
}

/**
 * Returns the triple composed by the serviceMappings, servicePathMappings and entityMappings indexes for an
 * entity mapping
 * @param  {String} service     The original service
 * @param  {String} servicePath The original service path
 * @param  {String} entityId    The original entity name
 * @return {Array}              An array including the serviceMappings, the servicePathMappings and the entityMappings
 *                              indexes or null if no entity mapping is available
 */
function getEntityMappingIndexesFromOriginal(service, servicePath, entityId) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromOriginal(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].originalEntityId === entityId) {
                    return [servicePathMappingsIndexes[0], servicePathMappingsIndexes[1], ii];
                }
            }
        }
    }
    return null;
}

/**
 * Returns the triple composed by the serviceMappings, servicePathMappings and entityMappings indexes for an
 * entity mapping
 * @param  {String} service     The new service
 * @param  {String} servicePath The new service path
 * @param  {String} entityId    The new entity name
 * @return {Array}              An array including the serviceMappings, the servicePathMappings and the entityMappings
 *                              indexes or null if no entity mapping is available
 */
function getEntityMappingIndexesFromNew(service, servicePath, entityId) {
    var servicePathMappingsIndexes = getServicePathMappingIndexesFromNew(service, servicePath),
        entityMappings;
    if (servicePathMappingsIndexes) {
        entityMappings =
            sthConfig.NAME_MAPPING.serviceMappings[servicePathMappingsIndexes[0]].servicePathMappings[
                servicePathMappingsIndexes[1]
            ].entityMappings;
        if (entityMappings && Array.isArray(entityMappings)) {
            for (var ii = 0; ii < entityMappings.length; ii++) {
                if (entityMappings[ii].newEntityId === entityId) {
                    return [servicePathMappingsIndexes[0], servicePathMappingsIndexes[1], ii];
                }
            }
        }
    }
    return null;
}

/**
 * Maps an attribute name to a new attribute name according to the database name mapping configuration file
 * @param  {String} service        The original service name
 * @param  {String} servicePath    The original service path
 * @param  {String} entityId       The original entity name
 * @param  {String} attributeName  The original attribute name
 * @return {String}                The new attribute name or null if no mapping is available
 */
function mapAttributeName(service, servicePath, entityId, attributeName) {
    var entityMappingsIndexes = getEntityMappingIndexesFromOriginal(service, servicePath, entityId),
        attributeMappings;
    if (entityMappingsIndexes) {
        attributeMappings =
            sthConfig.NAME_MAPPING.serviceMappings[entityMappingsIndexes[0]].servicePathMappings[
                entityMappingsIndexes[1]
            ].entityMappings[entityMappingsIndexes[2]].attributeMappings;
        if (attributeMappings && Array.isArray(attributeMappings)) {
            for (var ii = 0; ii < attributeMappings.length; ii++) {
                if (attributeMappings[ii].originalAttributeName === attributeName) {
                    return attributeMappings[ii].newAttributeName;
                }
            }
        }
    }
    return null;
}

/**
 * Unmaps an attribute name to the original attribute name according to the database name mapping configuration file
 * @param  {String} service        The new service name
 * @param  {String} servicePath    The new service path
 * @param  {String} entityId       The new entity name
 * @param  {String} attributeName  The new attribute name
 * @return {String}                The original attribute name or null if no mapping is available
 */
function unmapAttributeName(service, servicePath, entityId, attributeName) {
    var entityMappingsIndexes = getEntityMappingIndexesFromNew(service, servicePath, entityId),
        attributeMappings;
    if (entityMappingsIndexes) {
        attributeMappings =
            sthConfig.NAME_MAPPING.serviceMappings[entityMappingsIndexes[0]].servicePathMappings[
                entityMappingsIndexes[1]
            ].entityMappings[entityMappingsIndexes[2]].attributeMappings;
        if (attributeMappings && Array.isArray(attributeMappings)) {
            for (var ii = 0; ii < attributeMappings.length; ii++) {
                if (attributeMappings[ii].newAttributeName === attributeName) {
                    return attributeMappings[ii].originalAttributeName;
                }
            }
        }
    }
    return null;
}

/**
 * Maps an attribute type to a new attribute name according to the database name mapping configuration file
 * @param  {String} service        The original service name
 * @param  {String} servicePath    The original service path
 * @param  {String} entityId       The original entity name
 * @param  {String} attributeType  The original attribute type
 * @return {String}                The new attribute type or null if no mapping is available
 */
function mapAttributeType(service, servicePath, entityId, attributeType) {
    var entityMappingsIndexes = getEntityMappingIndexesFromOriginal(service, servicePath, entityId),
        attributeMappings;
    if (entityMappingsIndexes) {
        attributeMappings =
            sthConfig.NAME_MAPPING.serviceMappings[entityMappingsIndexes[0]].servicePathMappings[
                entityMappingsIndexes[1]
            ].entityMappings[entityMappingsIndexes[2]].attributeMappings;
        if (attributeMappings && Array.isArray(attributeMappings)) {
            for (var ii = 0; ii < attributeMappings.length; ii++) {
                if (attributeMappings[ii].originalAttributeType === attributeType) {
                    return attributeMappings[ii].newAttributeType;
                }
            }
        }
    }
    return null;
}

/**
 * Unmaps an attribute type to the original attribute name according to the database name mapping configuration file
 * @param  {String} service        The new service name
 * @param  {String} servicePath    The new service path
 * @param  {String} entityId       The new entity name
 * @param  {String} attributeType  The new attribute type
 * @return {String}                The original attribute type or null if no mapping is available
 */
function unmapAttributeType(service, servicePath, entityId, attributeType) {
    var entityMappingsIndexes = getEntityMappingIndexesFromNew(service, servicePath, entityId),
        attributeMappings;
    if (entityMappingsIndexes) {
        attributeMappings =
            sthConfig.NAME_MAPPING.serviceMappings[entityMappingsIndexes[0]].servicePathMappings[
                entityMappingsIndexes[1]
            ].entityMappings[entityMappingsIndexes[2]].attributeMappings;
        if (attributeMappings && Array.isArray(attributeMappings)) {
            for (var ii = 0; ii < attributeMappings.length; ii++) {
                if (attributeMappings[ii].newAttributeType === attributeType) {
                    return attributeMappings[ii].originalAttributeType;
                }
            }
        }
    }
    return null;
}

/**
 * Maps a database name using the database name mapping configuration file
 * @param  {String} databaseName The database to map
 * @return {String}              The mapped database name
 */
function mapDatabaseName(databaseName) {
    var originalService = databaseName.substring(sthConfig.DB_PREFIX.length);
    var newService = mapService(originalService);
    if (newService) {
        return sthConfig.DB_PREFIX + newService;
    } else {
        return databaseName;
    }
}

/**
 * Unmaps a database name using the database name mapping configuration file
 * @param  {String} databaseName The database to unmap
 * @return {String}              The unmapped database name
 */
function unmapDatabaseName(databaseName) {
    var newService = databaseName.substring(sthConfig.DB_PREFIX.length);
    var originalService = unmapService(newService);
    if (originalService) {
        return sthConfig.DB_PREFIX + originalService;
    } else {
        return databaseName;
    }
}

/**
 * Returns true is the collection name corresponds to an aggregated data collection. False otherwise.
 * @param collectionName The collection name
 * @return {boolean} True if the collection name corresponds to an aggregated data collection, false otherwise.
 */
function isAggregated(collectionName) {
    if (
        collectionName.lastIndexOf('.aggr') === -1 ||
        collectionName.lastIndexOf('.aggr') !== collectionName.length - '.aggr'.length
    ) {
        return false;
    } else {
        return true;
    }
}

/**
 * Maps a collection name using the database name mapping configuration file
 * @param  {String} service        The service
 * @param  {String} collectionName The collection name
 * @return {String}                The new collection name
 */
function mapCollectionName(service, collectionName) {
    var auxCollectionName,
        originalServicePath,
        newServicePath,
        originalEntityId,
        newEntityId,
        originalEntityType,
        newEntityType,
        originalAttributeName,
        newAttributeName;
    switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            originalServicePath = collectionName.substring(
                sthConfig.COLLECTION_PREFIX.length,
                isAggregated(collectionName) ? collectionName.length - '.aggr'.length : collectionName.length
            );
            newServicePath = mapServicePath(service, originalServicePath);
            if (newServicePath) {
                return sthConfig.COLLECTION_PREFIX + newServicePath + (isAggregated(collectionName) ? '.aggr' : '');
            } else {
                return collectionName;
            }
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            auxCollectionName = collectionName.substring(sthConfig.COLLECTION_PREFIX.length);
            originalServicePath = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            newServicePath = mapServicePath(service, originalServicePath);
            auxCollectionName = auxCollectionName.substring(
                originalServicePath.length + sthConfig.NAME_SEPARATOR.length
            );
            if (auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR) === -1) {
                originalEntityId = isAggregated(collectionName)
                    ? auxCollectionName.substring(0, auxCollectionName.length - '.aggr'.length)
                    : auxCollectionName;
                newEntityId = mapEntityName(service, originalServicePath, originalEntityId);
            } else {
                originalEntityId = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
                newEntityId = mapEntityName(service, originalServicePath, originalEntityId);
                originalEntityType = auxCollectionName.substring(
                    originalEntityId.length + sthConfig.NAME_SEPARATOR.length,
                    isAggregated(collectionName) ? auxCollectionName.length - '.aggr'.length : auxCollectionName.length
                );
                newEntityType = mapEntityType(service, originalServicePath, originalEntityType);
            }
            return (
                sthConfig.COLLECTION_PREFIX +
                (newServicePath || originalServicePath) +
                sthConfig.NAME_SEPARATOR +
                (newEntityId || originalEntityId) +
                (originalEntityType ? sthConfig.NAME_SEPARATOR + (newEntityType || originalEntityType) : '') +
                (isAggregated(collectionName) ? '.aggr' : '')
            );
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            auxCollectionName = collectionName.substring(sthConfig.COLLECTION_PREFIX.length);
            originalServicePath = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            newServicePath = mapServicePath(service, originalServicePath);
            auxCollectionName = auxCollectionName.substring(
                originalServicePath.length + sthConfig.NAME_SEPARATOR.length
            );
            originalEntityId = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            newEntityId = mapEntityName(service, originalServicePath, originalEntityId);
            auxCollectionName = auxCollectionName.substring(originalEntityId.length + sthConfig.NAME_SEPARATOR.length);
            if (auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR) === -1) {
                originalAttributeName = isAggregated(collectionName)
                    ? auxCollectionName.substring(0, auxCollectionName.length - '.aggr'.length)
                    : auxCollectionName;
                newAttributeName = mapAttributeName(
                    service,
                    originalServicePath,
                    originalEntityId,
                    originalAttributeName
                );
            } else {
                originalEntityType = auxCollectionName.substring(
                    0,
                    auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR)
                );
                newEntityType = mapEntityType(service, originalServicePath, originalEntityType);
                originalAttributeName = auxCollectionName.substring(
                    originalEntityType.length + sthConfig.NAME_SEPARATOR.length,
                    isAggregated(collectionName) ? auxCollectionName.length - '.aggr'.length : auxCollectionName.length
                );
                newAttributeName = mapAttributeName(
                    service,
                    originalServicePath,
                    originalEntityId,
                    originalAttributeName
                );
            }
            return (
                sthConfig.COLLECTION_PREFIX +
                (newServicePath || originalServicePath) +
                sthConfig.NAME_SEPARATOR +
                (newEntityId || originalEntityId) +
                (originalEntityType ? sthConfig.NAME_SEPARATOR + (newEntityType || originalEntityType) : '') +
                sthConfig.NAME_SEPARATOR +
                (newAttributeName || originalAttributeName) +
                (isAggregated(collectionName) ? '.aggr' : '')
            );
    }
}

/**
 * Unmaps a collection name using the database name mapping configuration file
 * @param  {String} service        The mapped service
 * @param  {String} collectionName The collection name
 * @return {String}                The unmapped collection name
 */
function unmapCollectionName(service, collectionName) {
    var auxCollectionName,
        originalServicePath,
        newServicePath,
        originalEntityId,
        newEntityId,
        originalEntityType,
        newEntityType,
        originalAttributeName,
        newAttributeName;
    switch (sthConfig.DATA_MODEL) {
        case sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH:
            newServicePath = collectionName.substring(
                sthConfig.COLLECTION_PREFIX.length,
                isAggregated(collectionName) ? collectionName.length - '.aggr'.length : collectionName.length
            );
            originalServicePath = unmapServicePath(service, newServicePath);
            if (originalServicePath) {
                return (
                    sthConfig.COLLECTION_PREFIX + originalServicePath + (isAggregated(collectionName) ? '.aggr' : '')
                );
            } else {
                return collectionName;
            }
            break;
        case sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY:
            auxCollectionName = collectionName.substring(sthConfig.COLLECTION_PREFIX.length);
            newServicePath = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            originalServicePath = unmapServicePath(service, newServicePath);
            auxCollectionName = auxCollectionName.substring(newServicePath.length + sthConfig.NAME_SEPARATOR.length);
            if (auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR) === -1) {
                newEntityId = isAggregated(collectionName)
                    ? auxCollectionName.substring(0, auxCollectionName.length - '.aggr'.length)
                    : auxCollectionName;
                originalEntityId = unmapEntityName(service, newServicePath, newEntityId);
            } else {
                newEntityId = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
                originalEntityId = unmapEntityName(service, newServicePath, newEntityId);
                newEntityType = auxCollectionName.substring(
                    newEntityId.length + sthConfig.NAME_SEPARATOR.length,
                    isAggregated(collectionName) ? auxCollectionName.length - '.aggr'.length : auxCollectionName.length
                );
                originalEntityType = unmapEntityType(service, newServicePath, newEntityType);
            }
            return (
                sthConfig.COLLECTION_PREFIX +
                (originalServicePath || newServicePath) +
                sthConfig.NAME_SEPARATOR +
                (originalEntityId || newEntityId) +
                (newEntityType ? sthConfig.NAME_SEPARATOR + (originalEntityType || newEntityType) : '') +
                (isAggregated(collectionName) ? '.aggr' : '')
            );
        case sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE:
            auxCollectionName = collectionName.substring(sthConfig.COLLECTION_PREFIX.length);
            newServicePath = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            originalServicePath = unmapServicePath(service, newServicePath);
            auxCollectionName = auxCollectionName.substring(newServicePath.length + sthConfig.NAME_SEPARATOR.length);
            newEntityId = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
            originalEntityId = unmapEntityName(service, newServicePath, newEntityId);
            auxCollectionName = auxCollectionName.substring(newEntityId.length + sthConfig.NAME_SEPARATOR.length);
            if (auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR) === -1) {
                newAttributeName = isAggregated(collectionName)
                    ? auxCollectionName.substring(0, auxCollectionName.length - '.aggr'.length)
                    : auxCollectionName;
                originalAttributeName = unmapAttributeName(service, newServicePath, newEntityId, newAttributeName);
            } else {
                newEntityType = auxCollectionName.substring(0, auxCollectionName.indexOf(sthConfig.NAME_SEPARATOR));
                originalEntityType = unmapEntityType(service, newServicePath, newEntityType);
                newAttributeName = auxCollectionName.substring(
                    newEntityType.length + sthConfig.NAME_SEPARATOR.length,
                    isAggregated(collectionName) ? auxCollectionName.length - '.aggr'.length : auxCollectionName.length
                );
                originalAttributeName = unmapAttributeName(service, newServicePath, newEntityId, newAttributeName);
            }
            return (
                sthConfig.COLLECTION_PREFIX +
                (originalServicePath || newServicePath) +
                sthConfig.NAME_SEPARATOR +
                (originalEntityId || newEntityId) +
                (newEntityType ? sthConfig.NAME_SEPARATOR + (originalEntityType || newEntityType) : '') +
                sthConfig.NAME_SEPARATOR +
                (originalAttributeName || newAttributeName) +
                (isAggregated(collectionName) ? '.aggr' : '')
            );
    }
}

module.exports = {
    mapService: mapService,
    unmapService: unmapService,
    mapServicePath: mapServicePath,
    unmapServicePath: unmapServicePath,
    mapEntityName: mapEntityName,
    unmapEntityName: unmapEntityName,
    mapEntityType: mapEntityType,
    unmapEntityType: unmapEntityType,
    mapAttributeName: mapAttributeName,
    unmapAttributeName: unmapAttributeName,
    mapAttributeType: mapAttributeType,
    unmapAttributeType: unmapAttributeType,
    mapDatabaseName: mapDatabaseName,
    unmapDatabaseName: unmapDatabaseName,
    mapCollectionName: mapCollectionName,
    unmapCollectionName: unmapCollectionName,
};
