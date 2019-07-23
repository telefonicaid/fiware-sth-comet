# <a id="section0"></a> Additional resources

This directory includes a set of scripts which may make the developer's life much easier. Currently, it includes the
following scripts:

-   `drop_database_mongo.sh`: Shell script which drops all the databases of certain MongoDB instance whose names start
    with the provided prefix. To run it just execute: `sh drop_database_mongo.sh database_prefix`, and all the databases
    of the local running MongoDB instance will be dropped.
-   `performanceTestCheck.js`: Mongo shell script which checks the result of a notification performance test run against
    certain STH instance. For further information about the performance tests, please visit the
    [Performance tests](../test/performance/README.md) section of the repository. To run the helper function, just start
    the MongoDB shell (`mongo`), load the script (`load('performanceTestCheck.js')`) and execute:
    `assertEntriesPerCollection(expectedEntriesPerCollection)`. Obviously, the `entriesPerCollection` number will depend
    on the parameters passed to the performance test run.
-   `sth_db_fixer.py`: Script to prune the raw samples collection. It allows to reduce the number of samples associated
    to each entity-attribute to the most recent N ones, deleting the rest. It also allow to set expiration limit. In
    addition, it can create indexes recommended [according documentation](../doc/manuals/db_indexes.md). Run
    `prune_collection.py -u` for usage options. It requires Pymongo 3.0.3 (newer version may work but I didn't tested).
-   `sth_db_fixer_all_dbs.sh`: sample script that shows how to run `sth_db_fixer.py` in all dbs and collections.

[Top](#section0)
