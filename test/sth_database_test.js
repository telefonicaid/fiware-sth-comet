/* global before, console, describe, it, require  */

(function() {
  "use strict";

  var sthTestConfiguration = require('./sth_app_test_configuration');
  var sthConfiguration = require('../src/sth_configuration');
  var sthLogger = require('../src/sth_logger');
  var sthHelper = require('../src/sth_helper')(sthConfiguration, sthLogger);
  var sthDatabase = require('../src/sth_database.js')(sthConfiguration);
  var sthTestHelper = require('./sth_app_test_helper.js')
  (sthTestConfiguration, sthConfiguration, sthDatabase, sthHelper);
  var expect = require('expect.js');

  console.log('*** Running the database tests with the following environment variables:');
  console.log('***   - SAMPLES: %s', sthTestConfiguration.SAMPLES);
  console.log('***   - ENTITY_ID: %s', sthTestConfiguration.ENTITY_ID);
  console.log('***   - ATTRIBUTE_ID: %s', sthTestConfiguration.ATTRIBUTE_ID);
  console.log('***   - TYPE: %s', sthTestConfiguration.TYPE);
  console.log('***   - START_DATE: %s', sthTestConfiguration.START_DATE);
  console.log('***   - END_DATE: %s', sthTestConfiguration.END_DATE);
  console.log('***   - MIN_VALUE: %s', sthTestConfiguration.MIN_VALUE);
  console.log('***   - MAX_VALUE: %s', sthTestConfiguration.MAX_VALUE);
  console.log('***   - DB_USERNAME: %s', sthConfiguration.DB_USERNAME);
  console.log('***   - DB_PASSWORD: %s', sthConfiguration.DB_PASSWORD);
  console.log('***   - DB_HOST: %s', sthConfiguration.DB_HOST);
  console.log('***   - DB_PORT: %s', sthConfiguration.DB_PORT);
  console.log('***   - CLEAN: %s ', sthTestConfiguration.CLEAN);

  var collectionName4Events = sthDatabase.getCollectionName4Events(
    sthTestConfiguration.ENTITY_ID, sthTestConfiguration.ATTRIBUTE_ID);
  var collectionName4Aggregated = sthDatabase.getCollectionName4Aggregated(
    sthTestConfiguration.ENTITY_ID, sthTestConfiguration.ATTRIBUTE_ID);

  describe('Database operation', function () {
    it('should establish a connection to the database', function (done) {
      sthDatabase.connect(sthConfiguration.DB_AUTHENTICATION, sthConfiguration.DB_HOST,
        sthConfiguration.DB_PORT, sthConfiguration.DB_NAME, function (err) {
          done(err);
        });
    });

    it('should generate the collection name for the aggregated data', function () {
      expect(collectionName4Aggregated).to.equal(
        'sth.' + sthTestConfiguration.ENTITY_ID + '.' +
        sthTestConfiguration.ATTRIBUTE_ID + '.aggregated');
    });

    it('should drop the collection if it exists', function (done) {
      sthDatabase.driver.connection.db.dropCollection(collectionName4Aggregated, function (err) {
        if (err && err.message === 'ns not found') {
          err = null;
        }
        return done(err);
      });
    });

    it('should check if the collection for the aggregated data exists', function (done) {
      sthDatabase.getCollection(collectionName4Aggregated, function (err, collection) {
        if (err && !collection) {
          // The collection does not exist
          done();
        }
      });
    });

    it('should create the collection for the single events', function (done) {
      sthDatabase.driver.connection.db.createCollection(collectionName4Events, function (err) {
        done(err);
      });
    });

    it('should create the collection for the aggregated data', function (done) {
      sthDatabase.driver.connection.db.createCollection(collectionName4Aggregated, function (err) {
        done(err);
      });
    });

    describe('should add aggregated data', function () {
      var randomDate,
          anEvent;

      function addEvent(done) {
        var theEvent = new sthDatabase.getEventModel(collectionName4Events)(anEvent);
        theEvent.save(
          function (err) {
            return done(err);
          }
        );
      }

      function prePopulateAggregated(resolution, done) {
        var origin;
        switch(resolution) {
          case sthConfiguration.RESOLUTION.SECOND:
            origin = sthHelper.getOrigin(randomDate, sthConfiguration.RESOLUTION.SECOND);
            break;
          case sthConfiguration.RESOLUTION.MINUTE:
            origin = sthHelper.getOrigin(randomDate, sthConfiguration.RESOLUTION.MINUTE);
            break;
          case sthConfiguration.RESOLUTION.HOUR:
            origin = sthHelper.getOrigin(randomDate, sthConfiguration.RESOLUTION.HOUR);
            break;
          case sthConfiguration.RESOLUTION.DAY:
            origin = sthHelper.getOrigin(randomDate, sthConfiguration.RESOLUTION.DAY);
            break;
          case sthConfiguration.RESOLUTION.MONTH:
            origin = sthHelper.getOrigin(randomDate, sthConfiguration.RESOLUTION.MONTH);
            break;
        }

        // Check if the document for the aggregated data associated to the event already exists
        sthDatabase.getAggregatedModel(collectionName4Aggregated).findOne({
          resolution: resolution,
          range: sthHelper.getRange(resolution),
          origin: origin
        }, function (err, result) {
          if (err) {
            done(err);
          }

          if (!result) {
            // The document for this aggregated data has not been created
            // Create and pre-populate it
            sthTestHelper.prePopulateAggregated(
              anEvent, resolution, done);
          } else {
            return done();
          }
        });
      }

      function addAggregatedData(resolution, done) {
        sthDatabase.getAggregatedModel(collectionName4Aggregated).update(
          sthTestHelper.getAggregateUpdateCondition(anEvent, resolution),
          sthTestHelper.getAggregateUpdate(anEvent),
          function (err) {
            return done(err);
          }
        );
      }

      function eachNewEventFunc() {
        before(function () {
          randomDate = sthTestHelper.randomDate(
            sthTestConfiguration.START_DATE, sthTestConfiguration.END_DATE);
          anEvent = sthTestHelper.createEvent(randomDate);
          console.log('New event: %s', JSON.stringify(anEvent));
        });

        it('should store the single event', addEvent);

        it('should pre-populate the aggregated collection (resolution: second, range: minute)',
          prePopulateAggregated.bind(null, sthConfiguration.RESOLUTION.SECOND)
        );

        it('should store aggregated data (resolution: second, range: minute)',
          addAggregatedData.bind(null, sthConfiguration.RESOLUTION.SECOND));

        it('should pre-populate the aggregated collection (resolution: minute, range: hour)',
          prePopulateAggregated.bind(null, sthConfiguration.RESOLUTION.MINUTE)
        );

        it('should store aggregated data (resolution: minute, range: hour)',
          addAggregatedData.bind(null, sthConfiguration.RESOLUTION.MINUTE));

        it('should pre-populate the aggregated collection (resolution: hour, range: day)',
          prePopulateAggregated.bind(null, sthConfiguration.RESOLUTION.HOUR)
        );

        it('should store aggregated data (resolution: hour, range: day)',
          addAggregatedData.bind(null, sthConfiguration.RESOLUTION.HOUR));

        it('should pre-populate the aggregated collection (resolution: day, range: month)',
          prePopulateAggregated.bind(null, sthConfiguration.RESOLUTION.DAY)
        );

        it('should store aggregated data (resolution: day, range: month)',
          addAggregatedData.bind(null, sthConfiguration.RESOLUTION.DAY));

        it('should pre-populate the aggregated collection (resolution: month, range: year)',
          prePopulateAggregated.bind(null, sthConfiguration.RESOLUTION.MONTH)
        );

        it('should store aggregated data (resolution: month, range: year)',
          addAggregatedData.bind(null, sthConfiguration.RESOLUTION.MONTH));
      }

      for (var i = 0; i < sthTestConfiguration.SAMPLES; i++) {
        describe('for each new event', eachNewEventFunc);
      }
    });

    describe('should clean the data if requested', function () {
      if (sthTestConfiguration.CLEAN) {
        it('should drop the collection created for the events', function (done) {
          sthDatabase.getCollection(collectionName4Events, function (err, collection) {
            collection.drop(function (err) {
              done(err);
            });
          });
        });

        it('should drop the collection created for the aggregated data', function (done) {
          sthDatabase.getCollection(collectionName4Aggregated, function (err, collection) {
            collection.drop(function (err) {
              done(err);
            });
          });
        });
      }
    });
  });
})();
