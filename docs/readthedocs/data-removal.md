# Removing historical raw and aggregated time series context information

Last, but not least, the STH component exposes through its REST API the possibility to remove previously stored historical raw and aggregated data. Due to the sensible nature of these operations, they should be used with caution since their effects cannot be undone.

The STH component exposes 3 main URLs for data removal, all of them invoked using `DELETE`
as the HTTP method and including the service and service path information as headers (`Fiware-Service` and
`Fiware-ServicePath` headers, respectively) such as in the `curl` examples included in the previous sections. The
provided URLs are the following ones:
1. Removing all the data associated to certain service and service path:
    ```
    http://<sth-host>:<sth-port>/STH/v1/contextEntities
    ```
2. Removing all the data associated to certain entity, service and service path:
    ```
    http://<sth-host>:<sth-port>/STH/v1/contextEntities/type/<entityType>/id/<entityId>
    ```
3. Removing all the data associated to certain attribute of certain entity, service and service path:
    ```
    http://<sth-host>:<sth-host>/STH/v1/contextEntities/type/<entityType>/id/<entityId>/attributes/>attrName>
    ```

The values between `<` and `>` should be substituted by their real values.

It is important to note that the data removal accomplished depends on the value of the `SHOULD_STORE` configuration
parameter. This means that depending on this configuration option only the associated data (raw, aggregated or both) will be removed.
