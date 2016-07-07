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

'use strict';

var CollectionDataInferenceError = function (databaseName, collectionName) {
  Error.call(this);
  this.code = 'COLLECTION_NAME_INFERENCE_ERROR';
  this.name = 'CollectionNameInferenceError';
  this.message = 'The target collection name for collection ' + collectionName + ' of database ' + databaseName +
    ' could not be uniquely inferred';
};
CollectionDataInferenceError.prototype = Object.create(Error.prototype);

var CollectionExistsError = function(databaseName, collectionName) {
  Error.call(this);
  this.code = 'COLLECTION_EXISTS_ERROR';
  this.name = 'CollectionExistsError';
  this.message = 'The collection ' + collectionName + ' exists in the database ' + databaseName;
};
CollectionExistsError.prototype = Object.create(Error.prototype);

var NotExistentCollectionError = function(databaseName, collectionName) {
  Error.call(this);
  this.code = 'COLLECTION_EXISTS_ERROR';
  this.name = 'CollectionExistsError';
  this.message = 'The collection ' + collectionName + ' does not exist in the database ' + databaseName;
};
NotExistentCollectionError.prototype = Object.create(Error.prototype);

var NotSupportedMigration = function (databaseName, collectionName, originalDataModel, targetDataModel) {
  Error.call(this);
  this.code = 'NOT_SUPPORTED_MIGRATION';
  this.name = 'NotSupportedMigration';
  this.message = 'The collection ' + collectionName + ' of database ' + databaseName +
    ' with data model ' + originalDataModel + ' cannot be migrated to the ' + targetDataModel + ' data model';
};
NotSupportedMigration.prototype = Object.create(Error.prototype);

module.exports = {
  CollectionExistsError: CollectionExistsError,
  CollectionDataInferenceError: CollectionDataInferenceError,
  NotExistentCollectionError: NotExistentCollectionError,
  NotSupportedMigration: NotSupportedMigration
};
