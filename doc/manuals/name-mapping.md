# Database and collection name mapping and unmapping

MongoDB imposes a set of restrictions regarding the characters which cannot be used as part of the databases and
collection names, as well as other limitations. These restrictions are detailed at the
[MongoDB Limits and Thresholds](https://docs.mongodb.com/manual/reference/limits/) section in the MongoDB documentation.

Since the names of the databases and the collections used by the STH component are composed from the concatenation of
the values assigned to the service, service path, entity id, entity type and attribute name (depending on the chosen
data model) and we do not want the potential users of the STH component to inherit the restrictions imposed by MongoDB
(as the database used by the STH component), a mapping mechanism is used before conforming the name of the databases and
collections if enabled.

The mapping mechanism is based on a mapping configuration file, a file containing a JSON following the next schema or
set of properties:

-   `serviceMappings`: Array of service mappings. Each element of the array is an object including the following
    properties:
    -   `originalService`: The original service name which should be mapped.
    -   `newService`: The final or new service name the original service should be mapped to.
    -   `servicePathMappings`: Array of service path mappings. Each element of the array is an object including the
        following properties:
        -   `originalServicePath`: The original service path which should be mapped.
        -   `newServicePath`: The final or new service path the original service path should be mapped to.
        -   `entityMappings`: Array of entity mappings. Each element of the array is an object including the following
            properties:
            -   `originalEntityId`: The original entity ID which should be mapped.
            -   `newEntityId`: The final or new entity ID the original entity ID should be mapped to.
            -   `originalEntityType`: The original entity type which should be mapped.
            -   `newEntityType`: The final or new entity type the entity type should be mapped to.
            -   `attributeMappings`: Array of attribute mappings. Each element of the array is an object including the
                following properties:
                -   `originalAttributeName`: The original attribute name which should be mapped.
                -   `newAttributeName`: The final or new entity name the original entity name should be mapped to.
                -   `originalAttributeType`: The original attribute type which should be mapped.
                -   `newAttributeType`: The final or new attribute type the original attribute type should be mapped to.

Next we include an example mapping configuration file:

```json
{
    "serviceMappings": [
        {
            "originalService": "testservice",
            "newService": "mappedtestservice",
            "servicePathMappings": [
                {
                    "originalServicePath": "/testservicepath",
                    "newServicePath": "/mappedtestservicepath",
                    "entityMappings": [
                        {
                            "originalEntityId": "entityId",
                            "newEntityId": "mappedEntityId",
                            "originalEntityType": "entityType",
                            "newEntityType": "mappedEntityType",
                            "attributeMappings": [
                                {
                                    "originalAttributeName": "attrName",
                                    "newAttributeName": "mappedAttrName",
                                    "originalAttributeType": "attrType",
                                    "newAttributeType": "mappedAttrType"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
```

To ease the migration process from databases and collections of previous versions of the STH component not using the
previous mapping mechanism, we provide a command-line tool called `sthDatabaseNameMapperTool`.

To run the name encoding/decoding tool, please execute the following command:

```bash
./bin/sthDatabaseNameMapperTool
```

which will present the command help information:

```text
Usage: sthDatabaseNameMapperTool [options]

  Options:

    -h, --help                         output usage information
    -V, --version                      output the version number
    -m, --map                          Shows a report regarding the result of the mapping process if applied to databases and collections of a specific STH instance (either the -m or -u options are mandatory)
    -u, --unmap                        Shows a report regarding the result of the unmapping process if applied to databases and collections of a specific STH instance (either the -e or -d options are mandatory)
    -f, --force                        Forces the mapping (-m) or unmapping (-u) process and consequently the databases will be renamed
    -b, --database <databaseName>      Limits the mapping or unmapping process to certain database
    -c, --collection <collectionName>  Limits the mapping or unmapping process to certain collection
```

You can use the `sthDatabaseNameMapperTool` command-line tool to analyse your STH component databases and to get reports
about the name mapping or unmapping results which the mapping or unmapping process would make on your databases and
collections.

Once you are fine with the analysis report and you are sure it is what you really want to do, set the `-f, --force`
option to apply the name mapping or unmapping process.

The `sthDatabaseNameMapperTool` command-line tool makes also possible to filter the analysis report and the application
of the mapping or unmapping by database names and by collection names.
