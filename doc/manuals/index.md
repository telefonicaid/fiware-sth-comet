# Welcome to the FIWARE Short Time Historic (STH) - Comet documentation.

[![](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/core.svg)](https://www.fiware.org/developers/catalogue/)
[![](https://img.shields.io/badge/tag-fiware--sth--comet-orange.svg?logo=stackoverflow)](http://stackoverflow.com/questions/tagged/fiware-sth-comet)

The Short Time Historic (STH, aka. Comet) is a component of the [FIWARE](https://www.fiware.org/) ecosystem in charge of
managing (storing and retrieving) historical raw and aggregated time series information about the evolution in time of
context data (i.e., entity attribute values) registered in an
[Orion Context Broker](https://github.com/telefonicaid/fiware-orion) instance.

All the communications between the STH and the Orion Context Broker as well as between the STH and any third party
(typically for data retrieval) use standardized NGSI9 and
[NGSI10](https://openmobilealliance.org/release/NGSI/V1_0-20120529-A/OMA-TS-NGSI_Context_Management-V1_0-20120529-A.pdf)
interfaces.
