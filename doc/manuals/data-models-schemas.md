# Data models & Schemas

As mentioned in the [Architecture](./architecture.md) section, the STH leans on the [MongoDB](https://www.mongodb.com)
database to store the data.

The STH component stores raw and aggregated data about the evolution of the values the desired attributes took over
time.

The STH supports 3 main data models o modes of functioning for each one of which distinct schemas are used to store the
associated raw and aggregated data.

The first data model or functioning mode is the so called **"Collection per Service Path"**. As it name denotes, it is
characterized by the fact that a MongoDB collection is created for each service path for the raw data and another one
for the aggregated data associated to the entities and entities' attributes related to this specific service path.

In the case of the raw data collection, the documents it includes follows the schema exposed by the next raw data
document example:

```json
{
    "_id": "57f4d8657905c024630c41dc",
    "recvTime": "2016-10-05T10:39:33.291Z",
    "entityId": "Entity:001",
    "entityType": "Entity",
    "attrName": "attribute:numeric:001",
    "attrType": "Number",
    "attrValue": "333"
}
```

On the other hand and regarding the aggregated data, the documents the aggregated collections includes follow the schema
exposed by the next aggregated data document example (associated to the previous raw data entry) in the case of numeric
attribute values (notice the resolution in this concrete example is `day`):

```json
{
    "_id": {
        "attrName": "attribute:numeric:001",
        "attrType": "Number",
        "entityId": "Entity:001",
        "entityType": "Entity",
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "sum": 333,
            "sum2": 110889,
            "min": 333,
            "max": 333
        }
    ]
}
```

whereas for textual attribute values an example aggregated data document is the following one (including the occurrences
of each one of the textual values an attribute may have had over time):

```json
{
    "_id": {
        "attrName": "attribute:textual:001",
        "attrType": "Text",
        "entityId": "Entity:001",
        "entityType": "Entity",
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "occur": {
                "text1": 1,
                "text2": 4,
                "text3": 7
            }
        }
    ]
}
```

The second data model or functioning mode is the so called **"Collection per Entity"**. As it name denotes, it is
characterized by the fact that a MongoDB collection is created for entity for the raw data and another one for the
aggregated data associated to the entity's attributes.

In the case of the raw data collection, the documents it includes follows the schema exposed by the next raw data
document example:

```json
{
    "_id": "57f4d8657905c024630c41dc",
    "recvTime": "2016-10-05T10:39:33.291Z",
    "attrName": "attribute:numeric:001",
    "attrType": "Number",
    "attrValue": "333"
}
```

On the other hand and regarding the aggregated data, the documents the aggregated collections includes follow the schema
exposed by the next aggregated data document example (associated to the previous raw data entry) in the case of numeric
attribute values (notice the resolution in this concrete example is `day`):

```json
{
    "_id": {
        "attrName": "attribute:numeric:001",
        "attrType": "Number",
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "sum": 333,
            "sum2": 110889,
            "min": 333,
            "max": 333
        }
    ]
}
```

whereas for textual attribute values an example aggregated data document is the following one (including the occurrences
of each one of the textual values an attribute may have had over time):

```json
{
    "_id": {
        "attrName": "attribute:textual:001",
        "attrType": "Text",
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "occur": {
                "text1": 1,
                "text2": 4,
                "text3": 7
            }
        }
    ]
}
```

The third and final data model or functioning mode is the so called **"Collection per Attribute"**. As it name denotes,
it is characterized by the fact that a MongoDB collection is created for attribute for the raw data and another one for
the aggregated data associated to the attribute.

In the case of the raw data collection, the documents it includes follows the schema exposed by the next raw data
document example:

```json
{
    "_id": "57f4d8657905c024630c41dc",
    "recvTime": "2016-10-05T10:39:33.291Z",
    "attrType": "Number",
    "attrValue": "333"
}
```

On the other hand and regarding the aggregated data, the documents the aggregated collections includes follow the schema
exposed by the next aggregated data document example (associated to the previous raw data entry) in the case of numeric
attribute values (notice the resolution in this concrete example is `day`):

```json
{
    "_id": {
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "sum": 333,
            "sum2": 110889,
            "min": 333,
            "max": 333
        }
    ]
}
```

whereas for textual attribute values an example aggregated data document is the following one (including the occurrences
of each one of the textual values an attribute may have had over time):

```json
{
    "_id": {
        "origin": "2016-10-01T00:00:00Z",
        "resolution": "day"
    },
    "points": [
        {
            "offset": 5,
            "samples": 1,
            "occur": {
                "text1": 1,
                "text2": 4,
                "text3": 7
            }
        }
    ]
}
```

Take into consideration that the data model or functioning mode can be fine tuned via the environment variable
`DATA_MODEL` or the `config.database.dataModel` property of the `config.js` file.
