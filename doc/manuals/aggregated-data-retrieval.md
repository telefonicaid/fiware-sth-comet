# Getting historical aggregated time series context information

The STH component exposes an HTTP REST API to let external clients query the stored historical aggregated time series
context information.

A typical URL querying for this information using a GET request is the following:

```text
http://<sth-host>:<sth-port>/STH/v2/entities/<entityId>/attrs/<attrName>?type=<entityType>&aggrMethod=sum&aggrPeriod=second&dateFrom=2016-01-01T00:00:00.000Z&dateTo=2016-01-01T23:59:59.999Z
```

Notice that in the previous URL we have used some templates between `<` and `>` which should be substituted by the
corresponding real values.

Also notice how in the previous request `sum` aggregated context information is requested with a resolution of `second`
from `2016-01-01T00:00:00.000Z` until `2016-01-01T23:59:59.999Z`.

The requests for aggregated time series context information can use the following query parameters:

-   **aggrMethod**: The aggregation method. The STH component supports the following aggregation methods: `max` (maximum
    value), `min` (minimum value), `sum` (sum of all the samples) and `sum2` (sum of the square value of all the
    samples) for numeric attribute values and `occur` for attributes values of type string. It accepts multiple values
    separated by comma (eg. `aggrMethod=min,max`) to get multiple aggregation method values. Additionally, `aggrMethod=all` can be used
    to get all the aggregation method values. Combining the information provided by these aggregated methods with the
    number of samples, it is possible to calculate probabilistic values such as the average value, the variance as well
    as the standard deviation. It is a mandatory parameter.
-   **aggrPeriod**: Aggregation period or resolution. A fixed resolution determines the origin time format and the
    possible offsets. It is a mandatory parameter. Possible valid resolution values supported by the STH are: `month`,
    `day`, `hour`, `minute` and `second`.
-   **dateFrom**: The starting date and time from which the aggregated time series information is desired. It is an
    optional parameter.
-   **dateTo**: The final date and time until which the aggregated time series information is desired. It is an optional
    parameter.

**NOTE**: Date is specified using the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) standard format.

An example response provided by the STH component to a request such as the previous one (for a numeric attribute value)
could be the following:

```json
{
    "type": "StructuredValue",
    "values": [
        {
            "_id": {
                "origin": "2016-01-01T02:46:00.000Z",
                "resolution": "second"
            },
            "points": [
                {
                    "offset": 13,
                    "samples": 1,
                    "sum": 34.59
                }
            ]
        }
    ]
}
```

In the previous example response, aggregated time series context information for a resolution of `second` is returned.
This information has as its origin the 46nd minute, of the 2nd hour of January, the 1st, 2016. And includes data for the
13th second, for which there is a sample and the sum (and value of that sample) is 34.59.

On the other hand, if the attribute value was of type string, a query such as the following (with `aggrMethod` as
`occur`) could be sent to the STH component (properly substituting the templates between `<` and `>`):

```text
http://<sth-host>:<sth-port>/STH/v2/entities/<entityId>/attrs/<attrName>?type=<entityType>&aggrMethod=occur&aggrPeriod=second&dateFrom=2016-01-22T00:00:00.000Z&dateTo=2016-01-22T23:59:59.999Z
```

An example response for the previous request could be:

```json
{
    "type": "StructuredValue",
    "values": [
        {
            "_id": {
                "origin": "2016-01-22T02:46:00.000Z",
                "resolution": "second"
            },
            "points": [
                {
                    "offset": 35,
                    "samples": 34,
                    "occur": {
                        "string01": 7,
                        "string02": 4,
                        "string03": 5,
                        "string04": 6,
                        "string05": 12
                    }
                }
            ]
        }
    ]
}
```

It is important to note that if a valid query is made but it returns no data (for example because there is no aggregated
data for the specified time frame), a response with code `200` is returned including an empty `values` property array,
since it is a valid query.

Another very important aspect is that since the strings are used as properties in the generated aggregated data, the
[limitations to this regard imposed by MongoDB](https://stackoverflow.com/questions/40542336/mongodb-insert-key-with-dollar)
must be respected. More concretely: "In some cases, you may wish to build a BSON object with a user-provided key. In
these situations, keys will need to substitute the reserved $ and . characters. Any character is sufficient, but
consider using the Unicode full width equivalents: U+FF04 (i.e. “＄”) and U+FF0E (i.e. “．”).".

Due to the previous MongoDB limitation, if the textual values stored in the attributes for which aggregated context
information is being generated contain the `$` or the `.` characters, they will be substituted for their Javascript
Unicode full width equivalents, this is: `\uFF04` instead of `$` and `\uFF0E` instead of `.`.

## Deprecated API

There is an alternative method based in old V1 API. However, this is deprecated functionality, included here for the
sake of completeness. You are encouraged to not using it, as it can be removed in a future STH version.

Alternative URL for first case:

```text
http://<sth-host>:<sth-port>/STH/v1/contextEntities/type/<entityType>/id/<entityId>/attributes/<attrName>?aggrMethod=sum&aggrPeriod=second&dateFrom=2016-01-01T00:00:00.000Z&dateTo=2016-01-01T23:59:59.999Z
```

Example:

```json
{
    "contextResponses": [
        {
            "contextElement": {
                "attributes": [
                    {
                        "name": "attrName",
                        "values": [
                            {
                                "_id": {
                                    "origin": "2016-01-01T02:46:00.000Z",
                                    "resolution": "second"
                                },
                                "points": [
                                    {
                                        "offset": 13,
                                        "samples": 1,
                                        "sum": 34.59
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "id": "entityId",
                "isPattern": false
            },
            "statusCode": {
                "code": "200",
                "reasonPhrase": "OK"
            }
        }
    ]
}
```

Alternative URL for case two:

```text
http://<sth-host>:<sth-port>/STH/v1/contextEntities/type/<entityType>/id/<entityId>/attributes/<attrName>?aggrMethod=occur&aggrPeriod=second&dateFrom=2016-01-22T00:00:00.000Z&dateTo=2016-01-22T23:59:59.999Z
```

Response:

```json
{
    "contextResponses": [
        {
            "contextElement": {
                "attributes": [
                    {
                        "name": "attrName",
                        "values": [
                            {
                                "_id": {
                                    "origin": "2016-01-22T02:46:00.000Z",
                                    "resolution": "second"
                                },
                                "points": [
                                    {
                                        "offset": 35,
                                        "samples": 34,
                                        "occur": {
                                            "string01": 7,
                                            "string02": 4,
                                            "string03": 5,
                                            "string04": 6,
                                            "string05": 12
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "id": "entityId",
                "isPattern": false
            },
            "statusCode": {
                "code": "200",
                "reasonPhrase": "OK"
            }
        }
    ]
}
```
