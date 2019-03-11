# Getting historical raw context information

The STH component exposes an HTTP REST API to let external clients query the available historical raw context
information.

A typical URL querying for this information using a `GET` request is the following:

```text
http://<sth-host>:<sth-port>/STH/v1/contextEntities/type/<entityType>/id/<entityId>/attributes/<attrName>?hLimit=3&hOffset=0&dateFrom=2016-01-01T00:00:00.000Z&dateTo=2016-01-31T23:59:59.999Z
```

Notice that in the previous URL we have used some templates between `<` and `>` which should be substituted by the
corresponding real values.

Also notice that in the previous request a paginated response has been requested with a limit of 3 entries and an offset
of 0 entries (first page).

The requests for raw context information can use the following query parameters:

-   **lastN**: Only the requested last entries will be returned. It is a mandatory parameter if no `hLimit` and
    `hOffset` are provided.
-   **hLimit**: In case of pagination, the number of entries per page. It is a mandatory parameter if no `lastN` is
    provided.
-   **hOffset**: In case of pagination, the offset to apply to the requested search of raw context information. It is a
    mandatory parameter if no `lastN` is provided.
-   **dateFrom**: The starting date and time from which the raw context information is desired. It is an optional
    parameter.
-   **dateTo**: The final date and time until which the raw context information is desired. It is an optional parameter.
-   **filetype**: The raw context information can be requested as a file setting this query parameter to the desired
    file type. Currently, the only supported value and file type is `csv`. It is an optional parameter.
-   **count**: The total count of elements could be asked using this query parameter. Supported values are `true` or
    `false`. As a result response will include a new header: Fiware-Total-Count. It is an optional parameter which
    default is `false`.

**NOTE**: Date is specified using the [ISO 8601](http://www.wikipedia.org/wiki/ISO_8601) standard format.

In order to avoid problems handing big results there is a restriction about the the number of results per page that
could be retrieved. The rule is `hLimit <= lastN <= config.maxPageSize` Where default max page is are defined to 100.

An example response provided by the STH component to a request such as the previous one could be the following:

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
                                "recvTime": "2016-01-14T13:43:33.306Z",
                                "attrValue": "21.28"
                            },
                            {
                                "recvTime": "2016-01-14T13:43:34.636Z",
                                "attrValue": "23.42"
                            },
                            {
                                "recvTime": "2016-01-14T13:43:35.424Z",
                                "attrValue": "22.12"
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

It is important to note that if a valid query is made but it returns no data (for example because there is no raw
context information for the specified time frame), a response with code `200` is returned including an empty `values`
property array, since it is a valid query.
