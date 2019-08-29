# Architecture

The Short Time Historic (STH, aka. Comet) adds memory to the FIWARE platform, making it possible to get raw and
aggregated data about the values certain attributes took over time. To this regard, the STH can be considered as a
so-called [Time Series Database](https://en.wikipedia.org/wiki/Time_series_database).

After analysing some of the most important time series databases available in the market (such as
[InfluxDB](https://www.influxdata.com/), [OpenTSDB](http://opentsdb.net/) or [MAPR](https://mapr.com/)), we ended up
to the conclusion that using any of them, although probably the most straight-forward option, was not the best one. The
reasons which brought us to this decision were:

1.  Risk:
    -   Some of the options available in the market (such as InfluxDB, for example) were not mature enough for a high
        availability scenario such as the one the STH should fit into.
    -   Our expertise using this specific type of databases was not the best one.
2.  Flexibility:
    -   We needed a highly flexible solution to make it possible to adapt it to our specific needs and the ones which
        may arise in the future.
3.  Current inversions:
    -   There were other databases for which our company already had licences.

Consequently, these technical and non-technical constraints made us opt for a more traditional solution to implement the
functionality to be provided by the STH. This solution consists on a Web server (exposing the component REST HTTP API)
and MongoDB as the final database.

Since the STH is a Node application and regarding the Web server, we opted for hapi as the module to use. Once again, we
opted for flexibility and modularity over any other characteristic and hapi was the Web server which provided the best
one (see [compare Express vs Hapi](https://strongloop.com/strongblog/compare-express-restify-hapi-loopback/) and
[npm compare Express vs Hapi](https://npmcompare.com/compare/connect,express,hapi,koa) for further information).

In the next figure we depict a high level view of the STH architecture including the concrete Web server and database
currently used:

![STH Architecture](./images/STH_Architecture.png "STH Architecture")
