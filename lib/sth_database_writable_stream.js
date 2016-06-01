/**
 * Created by gtv on 31/03/16.
 */

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

var stream = require('stream');
var async = require('async');
var _ = require('lodash');
var sthConfig = require('./sth_configuration');
var sthDatabase = require('./sth_database');

var STHWritableStream = function(databaseConnection, databaseName, collectionName, count) {
  stream.Writable.call(this, { objectMode: true });
  this.databaseConnection = databaseConnection;
  this.databaseName = databaseName;
  this.collectionName = collectionName;
  this.originalCount = count;
  this.count = 0;
};

STHWritableStream.prototype = Object.create(stream.Writable.prototype);

/**
 * Updates a raw data collection inserting or updating the passed doc
 * @param  {Object}   doc        The object to insert or update
 * @param  {Object}   collection The collection to insert or update the doc into
 * @param  {Function} callback   The callback
 */
function updateRawData(doc, collection, callback) {
  var self = this;
  var docId = _.cloneDeep(doc);
  delete docId._id;
  delete docId.attrValue;
  delete doc._id;
  collection.update(
    docId,
    doc,
    {
      upsert: true,
      writeConcern: {
        w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
      }
    },
    function (err) {
      if (err) {
        return process.nextTick(callback.bind(null, err));
      }
      self.emit('progress', { total: self.originalCount, count: ++self.count});
      process.nextTick(callback);
    }
  );
}

/**
 * Returns a MondoDB query from a document object id used in the aggregated data collections
 * @param  {Object} docId A document object id
 * @return {Object}       The MondoDB find() query
 */
function getQuery(docId) {
  var query = {};
  var properties = Object.keys(docId._id);
  properties.forEach(function(property) {
    query['_id.'+ property] = docId._id[property];
  });
  return query;
}

/**
 * Combines the data stored in the origin collection into the associated point of the target collection
 *  in case of textual aggregation
 * @param  {Object} originalPoint The point from the origin collection
 * @param  {Object} targetPoint   The point from the target collection where the data will be combined
 */
function mixTextualAggregation(originalPoint, targetPoint) {
  Object.keys(originalPoint.occur).forEach(function(originalTag) {
    targetPoint.occur[originalTag] = (targetPoint.occur[originalTag] || 0) + originalPoint.occur[originalTag];
  });
}

/**
 * Combines the data stored in the origin collection into the associated point of the target collection
 *  in case of numeric aggregation
 * @param  {Object} originalPoint The point from the origin collection
 * @param  {Object} targetPoint   The point from the target collection where the data will be combined
 */
function mixNumericAggregation(originalPoint, targetPoint) {
  targetPoint.sum += originalPoint.sum;
  targetPoint.sum2 += originalPoint.sum2;
  targetPoint.min = Math.min(originalPoint.min, targetPoint.min);
  targetPoint.max = Math.min(originalPoint.max, targetPoint.max);
}

/**
 * Updates an aggregated data collection
 * @param  {Object}   doc        The document to store in the collection
 * @param  {Object}   collection The collection where the document should be stored
 * @param  {Function} callback   The callback
 */
function updateAggregatedData(doc, collection, callback) {
  var self = this;
  collection.findOne(getQuery({ _id: doc._id}), function(err, doc2Update) {
    if (err) {
      return process.nextTick(callback.bind(null, err));
    }
    if (!doc2Update) {
      collection.insert(doc, function(){
        if (err) {
          return process.nextTick(callback.bind(null, err));
        }
        self.emit('progress', {total: self.originalCount, count: ++self.count});
        process.nextTick(callback);
      });
    } else {
      doc2Update.points.forEach(function(point, index) {
        doc.points[index].samples += point.samples;
        if (point.occur) {
          mixTextualAggregation(point, doc.points[index]);
        } else {
          mixNumericAggregation(point, doc.points[index]);
        }
      });
      delete doc._id;
      collection.update(
        { _id : doc2Update._id },
        doc,
        {
          upsert: false,
          writeConcern: {
            w: !isNaN(sthConfig.WRITE_CONCERN) ? parseInt(sthConfig.WRITE_CONCERN, 10) : sthConfig.WRITE_CONCERN
          }
        },
        function (err) {
          if (err) {
            return process.nextTick(callback.bind(null, err));
          }
          self.emit('progress', {total: self.originalCount, count: ++self.count});
          return process.nextTick(callback);
        }
      );
    }
  });
}

/**
 * Inserts a document into a collection
 * @param doc The document to insert
 * @param collection
 * @param callback
 */
function upsert(doc, collection, callback) {
  if (sthDatabase.isAggregated(this.collectionName)) {
    updateAggregatedData.call(this, doc, collection, callback);
  } else {
    updateRawData.call(this, doc, collection, callback);
  }
}

/**
 * Writable stream _write() function
 * @param doc The document to write
 * @param encoding The encoding
 * @param callback The callback
 * @private
 */
STHWritableStream.prototype._write = function(doc, encoding, callback) {
  this.db = this.databaseConnection.db(this.databaseName);
  async.waterfall(
    [
      async.apply(this.db.collection.bind(this.db), this.collectionName),
      async.apply(upsert.bind(this), doc)
    ],
    callback
  );
};

module.exports = STHWritableStream;
