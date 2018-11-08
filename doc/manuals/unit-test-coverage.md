# Unit tests coverage

The STH component source code includes a set of tests to validate the correct functioning of the whole set of capabilities exposed by the component. This set includes:

- Tests to check the connection to the database
- Tests to check the correct starting of the STH component
- Tests to check the STH component correctly deals with all the possible requests it may receive (including invalid URL paths (routes) as well as all the combinations of possible query parameters)
- Tests to check the correct aggregate time series information querying after inserting random events (attribute values) into the database
- Tests to check the correct aggregate time series information generation when receiving (simulated) notifications by a (fake) Orion Content Broker

## Preconditions
A running instance of a MongoDB database.

## Running the tests
In order to execute the test suite you can execute:
```
npm test
```

This will execute the functional tests and the syntax checking as well.

The test suite accepts the following parameters as environment variables which can be used to personalise them:

- `SAMPLES`: The number of random events which will be generated and inserted into the database. Optional. Default value: "5".
- `EVENT_NOTIFICATION_CONTEXT_ELEMENTS`: The number of context elements included in the simulated notifications sent to the STH component. Optional. Default value: 3.
- `ENTITY_ID`: The id of the entity for which the random event will be generated. Optional. Default value: "entityId".
- `ENTITY_TYPE`: The type of the entity for which the random event will be generated. Optional. Default value: "entityType".
- `ATTRIBUTE_NAME`: The id of the attribute for which the random event will be generated. Optional. Default value: "attrName"
- `ATTRIBUTE_TYPE`: The type of the attribute for which the random event will be generated. Optional. Default value: "attrType".
- `START_DATE`: The date from which the random events will be generated. Optional. Default value: the beginning of the previous year to avoid collisions with the testing of the Orion Context Broker notifications which use the current time. For example if in 2015, the start date is set to "2015-01-01T00:00:00", UTC time. Be very careful if setting the start date, since these collisions may arise.
- `END_DATE`: The date before which the random events will be generated. Optional. Default value: the end of the previous year to avoid collisions with the testing of the Orion Context Broker notifications which use the current time. For example if in 2015, the end date is set to "2014-12-31T23:59:59", UTC time. Be very careful if setting the start date,
since these collisions may arise.
- `MIN_VALUE`: The minimum value associated to the random events. Optional. Default value: "0".
- `MAX_VALUE`: The maximum value associated to the random events. Optional. Default value: "100".
- `CLEAN`: A flag indicating if the generated collections should be removed after the tests. Optional. Default value: "true".

For example, to run the tests using 100 samples, certain start and end data without cleaning up the database after running
the tests, use:

```bash
SAMPLES=100 START_DATE=2014-02-14T00:00:00 END_DATE=2014-02-14T23:59:59 CLEAN=false npm test
```

In case of executing the tests with the `CLEAN` option set to false, the contents of the database can be inspected using the MongoDB
(```mongo```) shell.
