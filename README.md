# <a name="top"></a>FIWARE Short Time Historic (STH) - Comet

[![](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/core.svg)](https://www.fiware.org/developers/catalogue/)
[![License](https://img.shields.io/github/license/telefonicaid/fiware-sth-comet.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/sth-comet.svg)](https://hub.docker.com/r/fiware/sth-comet-ngsi/)
[![](https://img.shields.io/badge/tag-fiware--sth-comet-orange.svg?logo=stackoverflow)](http://stackoverflow.com/questions/tagged/fiware-sth-comet)
[![Support badge](https://img.shields.io/badge/support-askbot-yellowgreen.svg)](https://ask.fiware.org/questions/scope%3Aall/tags%3Asth-comet/)
[![Join the chat at https://gitter.im/telefonicaid/fiware-sth-comet](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/telefonicaid/fiware-sth-comet?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
<br/>
[![Documentation badge](https://readthedocs.org/projects/fiware-sth-comet/badge/?version=latest)](https://fiware-sth-comet.readthedocs.io)
[![CI](https://github.com/telefonicaid/lightweightm2m-iotagent/workflows/CI/badge.svg)](https://github.com/telefonicaid/lightweightm2m-iotagent/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/telefonicaid/fiware-sth-comet/badge.svg?branch=master)](https://coveralls.io/github/telefonicaid/fiware-sth-comet?branch=master)
![Status](https://nexus.lab.fiware.org/static/badges/statuses/cygnus.svg)

The **FIWARE Short Time Historic (STH) - Comet** is in charge of managing (storing and retrieving) historical raw and
aggregated time series context information about the evolution in time of context data (i.e., entity attribute values)
registered in an [Orion Context Broker](https://github.com/telefonicaid/fiware-orion) instance.

All the communications between the STH and the Orion Context Broker as well as between the STH and any third party
(typically for data retrieval) use standardized
[NGSI v1](https://openmobilealliance.org/release/NGSI/V1_0-20120529-A/OMA-TS-NGSI_Context_Management-V1_0-20120529-A.pdf)
interfaces.

This project is part of [FIWARE](https://www.fiware.org/). For more information check the FIWARE Catalogue entry for the
[Core Context Management](https://github.com/Fiware/catalogue/tree/master/core).

| :books: [Documentation](https://fiware-sth-comet.readthedocs.io) | :mortar_board: [Academy](https://fiware-academy.readthedocs.io/en/latest/core/sth-comet) | :whale: [Docker Hub](https://hub.docker.com/r/fiware/sth-comet/) | :dart: [Roadmap](https://github.com/telefonicaid/fiware-sth-comet/blob/master/doc/roadmap.md) |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |


# Contents

-   [Background](#background)
-   [Install](#install)
-   [Usage](#usage)
-   [API overview](#api-overview)
-   [API walkthrough](#api-walkthrough)
-   [Testing](#testing)
    -   [Unit tests](#unit-tests)
    -   [Performance tests](#performance-tests)
-   [Advanced topics](#advanced-topics)
-   [Roadmap](#roadmap)
-   [Support](#support)
-   [License](#license)

## Background

This is the code repository for the **FIWARE Short Time Historic (STH) - Comet**, a component able to manage (storing
and retrieving) historical context information as raw and aggregated time series context information.

This project is part of [FIWARE](http://www.fiware.org).

Any feedback on this documentation is highly welcome, including bugs, typos or things you think should be included but
aren't. You can use [GitHub issues](https://github.com/telefonicaid/fiware-sth-comet/issues/new) to provide feedback.

You can find the Users & Developers Manual and the Installation & Administration Manual on
[readthedocs.org](https://fiware-sth-comet.readthedocs.io)

If this is your first contact with the STH component, it is highly recommended that you visit the
[Getting started](doc/manuals/getting-started.md) guide where we introduce some basic concepts upon which the STH
component leans on all the functionality it offers.

In case you are curious about why we called this component **Comet**, you can also visit the
[Why Comet](doc/manuals/why-comet.md) section of the documentation.

[Top](#top)

## Install

Build and Install documentation for the STH component can be found at the [Installation](doc/manuals/installation.md)
section of the documentation.

[Top](#top)

## Usage

Detailed information about how to run the STH component can be found at the
[Running the STH server](doc/manuals/running.md) section of the documentation.

[Top](#top)

## API overview

The STH component exposes a REST API covering 4 main functionalities:

1.  **Historical raw and aggregated time series context information storage**: The STH component exposes an endpoint
    where the notifications generated by a Context Broker instance (whenever an entity attribute value changes) can be
    received, processed and its associated raw and aggregated time series context information stored in an associated
    MongoDB database instance.
2.  **Raw context information retrieval**: The STH component allows the query and retrieval of historical raw context
    information, this is the concrete values an entity attribute took overtime, including the concrete timestamps when
    the value of the attributes changed.
3.  **Aggregated time series context information**: The STH component allows the query and retrieval of historical
    aggregated time series context information, this is information about the evolution of the entity attribute values
    grouped by time making it straight-forward to get distinct probabilistic measures such as means, standard
    deviations, maximum and minimum values, as well as the number of occurrences.
4.  **Raw and aggregated time series context information removal**: The STH component allows the removal of the raw and
    aggregated time series context information about the desired attributes and entities.

These APIs are detailed in the next section.

[Top](#top)

## API walkthrough

Detailed information about the API to store raw and aggregated time series context information can be found at the
[Storing historical raw and aggregated time series context information](doc/manuals/data-storage.md) section of the
documentation.

Detailed information about the API to retrieve raw context information can be found at the
[Getting historical raw context information](doc/manuals/raw-data-retrieval.md) section of the documentation.

Detailed information about the API to retrieve aggregated time series context information can be found at the
[Getting historical aggregated time series context information](doc/manuals/aggregated-data-retrieval.md) section of the
documentation.

Detailed information about the API to remove raw and aggregated time series context information can be found at the
[Removing historical raw and aggregated time series context information](doc/manuals/aggregated-data-retrieval.md)
section of the documentation.

[Top](#top)

## Testing

The STH component includes unit and performance tests.

[Top](#top)

### Unit tests

Detailed information about the unit tests included with the STH component code can be found at the
[Unit tests coverage](doc/manuals/unit-test-coverage.md) section of the documentation.

[Top](#top)

### Performance tests

Detailed information about the performance tests included with the STH component code can be found at the
[Performance tests coverage](doc/manuals/performance-test-coverage.md) section of the documentation.

[Top](#top)

## Advanced topics

If you are a developer, you may be interested in the following advanced topics:

-   [Additional resources](doc/manuals/additional-resources.md)
-   [Recommended database indexes](doc/manuals/db_indexes.md)
-   [Contribution guidelines](doc/manuals/contribution-guidelines.md)

[Top](#top)

## Roadmap

The roadmap of this FIWARE GE is described [here](doc/roadmap.md).

[Top](#top)

## Support

Ask your thorough programmming questions using [Stack Overflow](http://stackoverflow.com/questions/ask) and your general
questions on [FIWARE Q&A](https://ask.fiware.org). In both cases please use the tag `fiware-sth-comet`.

[Top](#top)

## Alarms

Alarms documentation for the STH component can be found at the [Alarms](doc/manuals/alarms.md) section of the
documentation.

[Top](#top)

---

## License

STH-Comet is licensed under Affero General Public License (GPL) version 3. You can find a
[copy of this license in the repository](./LICENSE).

© 2019 Telefonica Investigación y Desarrollo, S.A.U

### Are there any legal issues with AGPL 3.0? Is it safe for me to use?

There is absolutely no problem in using a product licensed under AGPL 3.0. Issues with GPL (or AGPL) licenses are mostly
related with the fact that different people assign different interpretations on the meaning of the term “derivate work”
used in these licenses. Due to this, some people believe that there is a risk in just _using_ software under GPL or AGPL
licenses (even without _modifying_ it).

For the avoidance of doubt, the owners of this software licensed under an AGPL 3.0 license wish to make a clarifying
public statement as follows:

> Please note that software derived as a result of modifying the source code of this software in order to fix a bug or
> incorporate enhancements is considered a derivative work of the product. Software that merely uses or aggregates (i.e.
> links to) an otherwise unmodified version of existing software is not considered a derivative work, and therefore it
> does not need to be released as under the same license, or even released as open source.
