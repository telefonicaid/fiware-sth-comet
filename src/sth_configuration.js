/* globals module, process */

(function() {
  "use strict";

  var ENV = process.env;

  var dbUsername = ENV.DB_USERNAME || '';
  var dbPassword = ENV.DB_PASSWORD || '';

  module.exports = {
    DB_NAME: ENV.DB_NAME || 'test',
    DB_USERNAME: dbUsername,
    DB_PASSWORD: dbPassword,
    DB_AUTHENTICATION: (dbUsername && dbPassword) ?
      (dbUsername + ':' + dbPassword) : '',
    DB_HOST: ENV.DB_HOST || 'localhost',
    DB_PORT: ENV.DB_PORT || '27017',
    HOST: ENV.HOST || 'localhost',
    PORT: ENV.PORT || 8666,
    RANGE: {
      YEAR: 'year',
      MONTH: 'month',
      WEEK: 'week',
      DAY: 'day',
      HOUR: 'hour',
      MINUTE: 'minute'
    },
    RESOLUTION: {
      MONTH: 'month',
      WEEK: 'week',
      DAY: 'day',
      HOUR: 'hour',
      MINUTE: 'minute',
      SECOND: 'second'
    }
  };
})();