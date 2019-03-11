# Getting Started

Although the STH supports the storing and retrieval of raw context information, this is, the concrete entity attribute
value which where registered in an Orion Context Broker instance over time, its main capability and responsibility is
the generation of aggregated time series context information about the evolution in time of those entity attribute
values.

Regarding the generation of aggregated time series context information, the STH manages 4 main concepts:

1.  **_Resolution_** or **_aggregation period_**: The time period by which the aggregated time series information is
    grouped. Possible valid resolution values supported by the STH are: `month`, `day`, `hour`, `minute` and `second`.
2.  **_Origin_**: For certain resolution, it is the origin of time for which the aggregated time series context
    information applies. For example, for a resolution of `minutes`, a valid origin value could be:
    `2015-03-01T13:00:00.000Z`, meaning the 13th hour of March, the 3rd, 2015. The origin is stored using UTC time to
    avoid locale issues.
3.  **_Offset_**: For certain resolution, it is the offset from the origin for which the aggregated time series context
    information applies. For example, for a resolution of `minutes` and an origin `2015-03-01T13:00:00.000Z`, an offset
    of 10 refers to the 10th minute of the concrete hour pointed by the origin. In this example, there would be a
    maximum of 60 offsets from 0 to 59 corresponding to each one of the 60 minutes within the concrete hour.
4.  **_Samples_**: For certain resolution, origin and offset, it is the number of samples, values, events or
    notifications available for that concrete offset from the origin.

All these concepts will appear clearer as you read the rest of the documentation about the STH component but it is
important to introduce them from the very beginning since they apply far and wide all around the component internals and
exposed APIs.
