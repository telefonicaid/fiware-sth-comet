/* globals module, process */

(function() {
  "use strict";

  var ENV = process.env;

  module.exports = {
    SAMPLES: ENV.SAMPLES || 1,
    ENTITY_ID: ENV.ENTITY_ID || 'entityId',
    ATTRIBUTE_ID: ENV.ATTRIBUTE_ID || 'attributeId',
    TYPE: ENV.TYPE || 'quantity',
    START_DATE: ENV.START_DATE ? new Date(ENV.START_DATE) : new Date(new Date().getFullYear(), 0),
    END_DATE: ENV.END_DATE ? new Date(ENV.END_DATE) : new Date(),
    MIN_VALUE: ENV.MIN_VALUE || 0,
    MAX_VALUE: ENV.MAX_VALUE || 100,
    CLEAN: ENV.CLEAN !== 'false'
  };
})();
