# Storing historical raw and aggregated time series context information

There are 2 main ways to store historical raw and aggregated time series context information into the STH component:

1.  The _formal_ option.
2.  The _minimalistic_ option.

The _formal_ option uses an additional component of the FIWARE ecosystem as it is
[Cygnus](https://github.com/telefonicaid/fiware-cygnus/). Cygnus is the component in charge of persisting in distinct
repositories or data storages the context information managed by an Orion Context Broker instance over time. To do it,
Cygnus supports distinct connectors (aka., sinks) to many external repositories or data storages such as
[Apache Hadoop](https://hadoop.apache.org), [Apache Kafka](https://kafka.apache.org), [CartoDB](https://cartodb.com),
[CKAN](http://ckan.org), [MySQL](https://www.mysql.com), [PostgreSQL](https://www.postgresql.org), amongst others.

To register the raw and aggregated time series context information into the STH component using Cygnus, we implemented 2
additional sinks such as:

1.  The [MongoDB](https://www.mongodb.com) sink: the MongoDB sink is in charge of persisting into MongoDB databases the
    desired context information as it is registered into an Orion Context Broker instance. Once it is stored in the
    desired MongoDB databases, the STH component is able to make it available by means of the raw context information
    API it provides which will be presented in the next sections.
2.  The **STH** sink: the STH sink is in charge of persisting into MongoDB databases the desired aggregated time series
    context information as it is registered into an Orion Context Broker instance. The STH sink pre-aggregates the
    context information according to the configured resolutions making the retrieval of this aggregated time series
    context information almost instantaneous, using the API the STH component exposes and which will be presented in the
    next sections.

To properly configure and use the MongoDB and the STH sinks to register raw and aggregated time series context
information into MongoDB databases susceptible of being retrieved by the STH component, please refer to the following
documentation provided at the [Cygnus Github repository](https://github.com/telefonicaid/fiware-cygnus) site:

-   [Connecting Orion Context Broker and Cygnus](https://github.com/telefonicaid/fiware-cygnus/blob/master/doc/cygnus-ngsi/user_and_programmer_guide/connecting_orion.md)
-   [NGSIMongoSink](https://github.com/telefonicaid/fiware-cygnus/blob/master/doc/cygnus-ngsi/flume_extensions_catalogue/ngsi_mongo_sink.md)
-   [NGSISTHSink](https://github.com/telefonicaid/fiware-cygnus/blob/master/doc/cygnus-ngsi/flume_extensions_catalogue/ngsi_sth_sink.md)

The second and so-called _minimalistic_ option to register raw and aggregated time series context information
susceptible of being retrieved by the STH component consists on using the STH component itself to receive and process
the notifications sent by an Orion Context Broker instance as the values of the entity attributes of interest change
over time.

As a way to subscribe the STH component instance to the entity attributes of interest, a request such as the following
one has to be sent to the Orion Context Broker instance whose raw and aggregated time series context information wants
to be managed by the STH component:

```bash
curl <orion-context-broker-host>:<orion-context-broker-port>/v1/subscribeContext -s -S --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'Fiware-Service: <service>' --header 'Fiware-ServicePath: <service-path>' -d @- <<EOF
{
    "entities": [
        {
            "type": "<entity-type>",
            "isPattern": "<false|true>",
            "id": "<entity-id>"
        }
    ],
    "attributes": [
        "<attribute2Notify1>",
        ...,
        "<attribute2NotifyK>"
    ],
    "reference": "http://<sth-host>:<sth-port>/notify",
    "duration": "<duration>",
    "notifyConditions": [
        {
            "type": "ONCHANGE",
            "condValues": [
                "<attribute2Observe1>",
                ...,
                "<attribute2ObserveN>"
            ]
        }
    ],
    "throttling": "<throttling>"
}
EOF
```

Notice that in the previous subscriptions we are using templates instead of real values. These templates should be
substituted by the desired values in each concrete case.

It is important to note that the subscription expire and must be re-enabled. More concretely, the `duration` property
sets the duration of the subscription.

On the other hand, for the time being the STH component only is able to manage notifications in JSON format and
consequently it is very important to set the `Accept` header to `application/json`.

Last but not least, the `throttling` makes it possible to control the frequency of the notifications. Depending on the
resolution of the aggregated time series context information you are interested in, the `throttling` should be
fine-tuned accordingly. For example, it may make no sense to set the minimum resolution in the STH component to `second`
but set the throttling to `PT60s` (60 seconds), since with this configuration 1 value update will be notified every 60
seconds (1 minute) the most, and corresponding the minimum recommended resolutions should be `minute`.

Further information about the Orion Context Broker subscription API can be found in its documentation:

-   [Subscriptions for NGSI version 2](http://fiware-orion.readthedocs.io/en/latest/user/walkthrough_apiv2/index.html#subscriptions).
-   [Subscriptions for NGSI version 1](http://fiware-orion.readthedocs.io/en/latest/user/walkthrough_apiv1/index.html#context-subscriptions).
