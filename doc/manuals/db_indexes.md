# Recommended database indexes

STH uses one database per service (name pattern: `sth_<service>`) with two collections:

-   Raw data collection (name pattern: `sth_/<subserviceName>`)
-   Aggregated data collection (name pattern: `sth_/<subserviceName>.aggr`)

## Indexes in the raw data collection

It is recommended to create the following index in this collection:

```
{entityId: 1, entityType: 1, attrName: 1, recvTime: 1}
```

The performance difference can be dramatic for large sets of data. For instance, for a collection with around ~3000000
query execution time can drop from 3 seconds to 1 millisecond.

Since version 3.0.0 of cygnus an index named `cyg_raw_opt` is created in this way but depending on datamodel:

| datamodel         | keys                                                             |
| :---------------- | :--------------------------------------------------------------- |
| dm-by-servicepath | recvTime, entityId, entityType, attrName, attrType, attrValue    |
| dm-by-entity      | recvTime, attrName, attrType, attrValue                          |
| dm-by-attribute   | recvTime, attrType, attrValue                                    |

Note that datamodel others that the ones above are not allowed by Cygnus.

## Indexes in the aggregated data collection

It is recommended to create the following index in this collection:

```
{ "_id.entityId": 1, "_id.entityType": 1, "_id.attrName": 1, "_id.resolution": 1, "_id.origin": 1 }
```

The performance difference can be dramatic for large sets of data. For instance, for a collection with around ~6000000
query execution time can drop from 28 seconds to 20 millisecond.

Since version 3.0.0 of cygnus index named `cyg_agg_opt` is created in this way but depending on datamodel:

| datamodel          | keys                                               |
| :----------------- | :------------------------------------------------- |
| dm-by-servicepath  | entityId, entityType, attrName, resolution, origin |
| dm-by-entity       | attrName, resolution, origin                       |
| dm-by-attribute    | resolution, origin                                 |

Note that datamodel others that the ones above are not allowed by Cygnus.
