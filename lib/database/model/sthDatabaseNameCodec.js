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
var _ = require('lodash');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');

/**
 * Encodes a name according to certain matching regular expression
 * @param  {String} originalName The original name
 * @param  {RegExp} matchRegExp  The matching regular expression
 * @return {String}              The encoded name
 */
function encode(originalName, matchRegExp) {
    var encodedName = originalName.replace(matchRegExp, function encoder(match, index, originalString) {
        if (match.length === 1) {
            // Forbidden character or uppercase letter match case
            return 'x' + _.padStart(originalString.charCodeAt(index).toString(16), 4, '0');
        } else {
            // x12ab or .system match case
            return 'x' + match;
        }
    });
    return encodedName;
}

/**
 * Decodes a name according to certain matching regular expression
 * @param  {String} encodedName The encoded name
 * @param  {RegExp} matchRegExp The matching regular expression
 * @return {String}             The decoded name
 */
function decode(encodedName, matchRegExp) {
    var decodedName = encodedName.replace(matchRegExp, function decoder(match) {
        if (match.length === 5) {
            // x12ab match case
            if (match === sthConfig.NAME_SEPARATOR) {
                // Do not decode, it is the name separator character
                return match;
            } else {
                // x12ab match case
                return String.fromCharCode(parseInt(match.substring(1), 16));
            }
        } else {
            // xx12ab or x.system match case
            return match.substring(1);
        }
    });
    return decodedName;
}

/**
 * Encodes a database name according to the restrictions imposed by MongoDB, this are:
 *   1. The forbidden characters which cannot be used in a database name are: /\.(blank space)"$(null character).
 *   2. Database names are case insensitive.
 * The encoding criteria is the following one:
 *   1. Encode the forbidden characters using an escaping character (x) and the numerical Unicode code for each
 *   character. For instance, the $ character will be encoded as x0024.
 *   2. User defined strings already using the above encoding must be escaped prepending another x, for instance:
 *   the text x002a will be encoded as xx002a.
 *   3. To avoid case sensitivity restrictions, uppercase characters (since they are supposed to be less common than
 *   lowercase ones) are also encoded (i.e., Service -> x0053ervice).
 *   4. The name separator character (xffff) is not decoded.
 * @param  {String} databaseName The database name
 * @return {String}              The encoded database name
 */
function encodeDatabaseName(databaseName) {
    var databaseNameRegExp = /[\/\\.\s"$\0A-Z]|x[0-9a-f]{4}/g;
    return encode(databaseName, databaseNameRegExp);
}

/**
 * Decodes a database name according to the restrictions imposed by MongoDB, these are:
 *   1. The forbidden characters which cannot be used in a database name are: /\.(blank space)"$(null character).
 *   2. Database names are case insensitive.
 * The encoding criteria is the following one:
 *   1. Encode the forbidden characters using an escaping character (x) and the numerical Unicode code for each
 *   character. For instance, the $ character will be encoded as x0024.
 *   2. User defined strings already using the above encoding must be escaped prepending another x, for instance:
 *   the text x002a will be encoded as xx002a.
 *   3. To avoid case sensitivity restrictions, uppercase characters (since they are supposed to be less common than
 *   lowercase ones) are also encoded (i.e., Service -> x0053ervice).
 *   4. The name separator character (xffff) is not decoded.
 * @param  {String} encodedDatabaseName The encoded database namespace
 * @return {String}                     The decoded database name
 */
function decodeDatabaseName(encodedDatabaseName) {
    var encodedDatabaseNameRE = /xx?[0-9a-f]{4}/g;
    return decode(encodedDatabaseName, encodedDatabaseNameRE);
}

/**
 * Encodes a collection name according to the restrictions imposed by MongoDB, this are:
 *   1. The forbidden characters which cannot be used in a collection name are: $(null character)(empty string),
 *   cannot start with "system.".
 *   2. Collection names are case sensitive.
 * The encoding criteria is the following one:
 *   1. Encode the forbidden characters using an escaping character (x) and the numerical Unicode code for each
 *   character. For instance, the $ character will be encoded as x0024.
 *   2. User defined strings already using the above encoding must be escaped prepending another x, for instance:
 *   the text x002a will be encoded as xx002a.
 *   3. Tools such as mongodump/restore and mongoexport/import do not support the '/' character in collections
 *   (https://jira.mongodb.org/browse/TOOLS-1163).
 *   4. The name separator character (xffff) is not decoded.
 * @param  {String} databaseName The database name
 * @return {String}              The encoded database name
 */
function encodeCollectionName(collectionName) {
    var collectionNameRegExp = /[$\0/]|^x?system.|x[0-9a-f]{4}/g;
    return encode(collectionName, collectionNameRegExp);
}

/**
 * Decodes a collection name according to the restrictions imposed by MongoDB, these are:
 *   1. The forbidden characters which cannot be used in a collection name are: $(null character)(empty string),
 *   cannot start with "system.".
 *   2. Collection names are case sensitive.
 * The encoding criteria is the following one:
 *   1. Encode the forbidden characters using an escaping character (x) and the numerical Unicode code for each
 *   character. For instance, the S character will be encoded as x0024.
 *   2. User defined strings already using the above encoding must be escaped prepending another x, for instance:
 *   the text x002a will be encoded as xx002a.
 *   3. Tools such as mongodump/restore and mongoexport/import do not support the '/' character in collections
 *   (https://jira.mongodb.org/browse/TOOLS-1163).
 *   4. The name separator character (xffff) is not decoded.
 * @param  {String} encodedDatabaseName The encoded database namespace
 * @return {String}                     The decoded database name
 */
function decodeCollectionName(encodedCollectionName) {
    var encodedCollectionNameRE = /xx?[0-9a-f]{4}|^xx?system./g;
    return decode(encodedCollectionName, encodedCollectionNameRE);
}

module.exports = {
    decodeDatabaseName: decodeDatabaseName,
    encodeDatabaseName: encodeDatabaseName,
    encodeCollectionName: encodeCollectionName,
    decodeCollectionName: decodeCollectionName,
};
