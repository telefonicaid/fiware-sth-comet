# Migrating historical raw and aggregated time series context information

The STH component supports 3 alternative data models when storing the historical raw and aggregated time series context information into the database:

1. One collection per service path.
2. One collection per entity.
3. One collection per attribute.

As their names reflect, each one of the supported data models stores the raw and aggregated time series context information into one collection per service path, entity or attribute respectively.

The default data model is the collection per entity one, but sometimes to get the best performance out of the MongoDB database where the raw and aggregated time series context information is stored, alternative data models are needed. This is the reason why we
introduced the data model migration tools.

To set the desired data model to be used, please take a look at [Running the STH server](#section5) below.

To run the data migration tool, please execute the following command:
```bash
./bin/sthDatabaseModel
```

which will present the command help information:

```
Usage: sthDatabaseModel [options]

  Options:

    -h, --help                         output usage information
    -V, --version                      output the version number
    -a, --analysis                     prints the results of the data model analysis including the databases and collections which need to be migrated to the currently configured data model (mandatory if not -m or --migrate)
    -m, --migrate                      migrates to the currently configured data model all the databases and collections which has been created using a distinct data model (mandatory if not -a or --analysis)
    -v, --verbose [documents]          shows migration progress information if the number of documents to migrate in the collection is bigger or equal to the optional value passed (1 if no value passed)
    -r, --remove-collection            the original data model collection will be removed to avoid conflict if migrating back to that data model in the future
    -u, --update-collection            the migration will take place even if the target collections already exist combining the data of the original and target collections (use this option with special care since the migration operation is not idempotent for the aggregated data collections)
    -f, --full                         the migration will continue with the pending collections in case a previous collection throws an error and cannot be migrated (it is recommended to be used with the -r option to avoid subsequent  migrations of the same aggregated data collections)
    -d, --database <databaseName>      only this database will be taken into consideration for the analysis and/or migration process
    -c, --collection <collectionName>  only this collection will be taken info consideration, a database is mandatory if a collection is set
    -x, --dictionary <dictionary>      the path to a file including a dictionary to resolve the names of the collections to be migrated to their associated data (i.e., service path, entity id, entity type, attribute name and attribute type) (it is expected as a CSV file with lines including the following info: <collection-name>,<service-path>,<entity-id>,<entity-type>,<attribute-name>,<attribute-type>, some of which may not apply and can be left as blank)
```

Special care should be taken when requesting a data model migration since the migration of aggregated time series context information is not an idempotent operation if the target data model collections already exist. In this case, the already existent data stored in these collections is combined with the one stored in the original data model collections pending migration. Based on this fact, we suggest the next procedure when considering a data model migration:

1. Check the current configured data model used by the STH component based on the options detailed in [Running the STH server](#section5) below. Typically it will be the default collection per entity data model.
2. Get a data model analysis report about the databases and collections which need to be migrated to the new desired data model (set in the `DATA_MODEL` environment variable) running the following command:
    ```
    LOGOPS_FORMAT=dev DATA_MODEL=collection-per-service-path ./bin/sthDatabaseModel -a
    ```
3. Request the desired data model migration (set in the `DATA_MODEL` environment variable) without forcing the update of the target data model collections running the following command:
    ```
    LOGOPS_FORMAT=dev DATA_MODEL=collection-per-service-path ./bin/sthDatabaseModel -a -m
    ```
    If any of the target collections already exist, the data model migration will stop and it will not be made for the first already existent target data model collection, either for any subsequent collection. If none of the target collections already exist, the data model migration will successfully complete.
    1. If the data model migration completed successfully, remove the original data model collections already migrated to avoid problems if in the future you decide to go back to the original data model. Information about the successfully migrated collections is provided in the logs. Setting the `-r` option when running the command mentioned in point 3 will make this removal automatically for you. The data model migration has successfully finished.
    2. If the data model migration did not complete successfully because any of the target data model collections already exist:
        1. Remove the original data model collections which were successfully migrated, if any, so they are not migrated again in the future (details about the successfully migrated collections is provided in the logs). The `-r` option will make this removal automatically for you when running the command mentioned in point 3.
        2. You have to decide if the target data model collection causing the conflict contains valuable data. If they does, just keep it. If it does not, just remove it.
        3. If you decided to keep the target data model collection causing the conflict since it contains valuable data, force its data model migration using the following command:
            ```
            LOGOPS_FORMAT=dev DATA_MODEL=collection-per-service-path ./bin/sthDatabaseModel -a -m -d <database_name> -c <original_data_model_collection_to_be_migrated> -u
            ```
            The original data model collection will be combined with the already existent data stored in the target data model collection.
        4. Remove the `<original_data_model_collection_to_be_migrated>` collection whose migration you just forced so it is not migrated again in the future or use the `-r` to let the migration tool make this removal for you.
4. Get back and repeat from point 3.

Currently the only data model migration supported is the default collection per entity data model to the collection per service path data model.
