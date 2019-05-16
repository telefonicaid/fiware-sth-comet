# Recommended database indexes

STH uses one database per service (name pattern: `sth_<service>`) with two collections:

-   Raw data collection (name pattern: `sth_/<subserviceName>`)
-   Aggregated data collection (name pattern: `sth_/<subserviceName>.aggr`)

## Indexes in the raw data collection

It is recommended to create the following index in this collection:

```
{entityId: 1, entityType: 1, attrName: 1, recvTime: -1}
```

The performance difference can be dramatic for large sets of data. For instance, for a collection with around ~3000000
query execution time can drop from 3 seconds to 1 millisecond.

## Indexes in the aggregated data collection

It is recommended to create the following index in this collection:

```
{ "_id.entityId": 1, "_id.entityType": 1, "_id.attrName": 1, "_id.resolution": 1, "_id.origin": 1 }
```

The performance difference can be dramatic for large sets of data. For instance, for a collection with around ~6000000
query execution time can drop from 28 seconds to 20 millisecond.
