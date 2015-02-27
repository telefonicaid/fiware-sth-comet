/* globals module, require */

(function() {
  "use strict";

  var winston = require('winston');

  module.exports = new winston.Logger({
    transports: [
      new winston.transports.Console({
        colorize: true
      }),
      new winston.transports.File({
        filename: './logs/sth_app.log'
      })
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: './logs/sth_app_exceptions.log'
      })
    ]
  });
})();
