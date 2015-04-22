/* globals module, process */

(function() {
  "use strict";

  var ENV = process.env;

  module.exports = {
    DB_NAME: ENV.DB_NAME || 'test',
    SAMPLES: ENV.SAMPLES || 5,
    ENTITY_ID: ENV.ENTITY_ID || 'entityId',
    ENTITY_TYPE: ENV.ENTITY_TYPE || 'entityType',
    ATTRIBUTE_NAME: ENV.ATTRIBUTE_NAME || 'attrName',
    ATTRIBUTE_TYPE: ENV.ATTRIBUTE_TYPE || 'attrType',
    // If not set, the start date for the generation of random events is set
    //  by default to the beginning of the previous year to avoid collisions
    //  with the testing of the Orion Context Broker notifications
    START_DATE: ENV.START_DATE ? new Date(ENV.START_DATE) :
      new Date(new Date().getFullYear() - 1, 0),
    // If not set, the start date for the generation of random events is set
    //  by default to the end of the previous year to avoid collisions
    //  with the testing of the Orion Context Broker notifications
    END_DATE: ENV.END_DATE ? new Date(ENV.END_DATE) :
      new Date(new Date(new Date().getFullYear(), 0) - 1),
    MIN_VALUE: ENV.MIN_VALUE || 0,
    MAX_VALUE: ENV.MAX_VALUE || 100,
    CLEAN: ENV.CLEAN !== 'false',
    API_OPERATION : {
      READ: 'read',
      NOTIFY: 'notify'
    }
  };
})();
