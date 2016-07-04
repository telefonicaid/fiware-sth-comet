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
var sthServerUtils = require(ROOT_PATH + '/lib/server/utils/sthServerUtils');

/**
 * The handler in case of a not expected route
 * @param  {Object}   request The request
 * @param  {Function} reply   The hapi() function provided by the hapi server
 */
function notFoundHandler(request, reply) {
  var response;

  request.sth = request.sth || {};
  request.sth.context = sthServerUtils.getContext(request);

  sthLogger.warn(
    request.sth.context,
    '404 - Not Found route for the request: ' + request.method.toUpperCase() + ' ' + request.url.path
  );
  response = reply({'statusCode': 404, 'error': 'Not Found'}).code(404);
  sthServerUtils.addFiwareCorrelator(request, response);
}

module.exports = notFoundHandler;
