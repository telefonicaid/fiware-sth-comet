# Introduction

The Short Time Historic (STH, aka. Comet) is a component of the [FIWARE](https://www.fiware.org/) ecosystem
in charge of managing (storing and retrieving) historical raw and aggregated time series information about the evolution in time of context data (i.e., entity attribute values) registered in an [Orion Context Broker](https://github.com/telefonicaid/fiware-orion) instance.

All the communications between the STH and the Orion Context Broker as well as between the STH and any third party (typically for data retrieval) use standardized NGSI9 and [NGSI10](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/ngsi-v1-0) interfaces.
