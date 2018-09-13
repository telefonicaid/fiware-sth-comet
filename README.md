# <a name="top"></a>FIWARE Short Time Historic (STH) - Comet

[![FIWARE Core Context Management](https://img.shields.io/badge/FIWARE-Core-233c68.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAVCAYAAAC33pUlAAAABHNCSVQICAgIfAhkiAAAA8NJREFUSEuVlUtIFlEUx+eO+j3Uz8wSLLJ3pBiBUljRu1WLCAKXbXpQEUFERSQF0aKVFAUVrSJalNXGgmphFEhQiZEIPQwKLbEUK7VvZrRvbr8zzjfNl4/swplz7rn/8z/33HtmRhn/MWzbXmloHVeG0a+VSmAXorXS+oehVD9+0zDN9mgk8n0sWtYnHo5tT9daH4BsM+THQC8naK02jCZ83/HlKaVSzBey1sm8BP9nnUpdjOfl/Qyzj5ust6cnO5FItJLoJqB6yJ4QuNcjVOohegpihshS4F6S7DTVVlNtFFxzNBa7kcaEwUGcbVnH8xOJD67WG9n1NILuKtOsQG9FngOc+lciic1iQ8uQGhJ1kVAKKXUs60RoQ5km93IfaREvuoFj7PZsy9rGXE9G/NhBsDOJ63Acp1J82eFU7OIVO1OxWGwpSU5hb0GqfMydMHYSdiMVnncNY5Vy3VbwRUEydvEaRxmAOSSqJMlJISTxS9YWTYLcg3B253xsPkc5lXk3XLlwrPLuDPKDqDIutzYaj3eweMkPeCCahO3+fEIF8SfLtg/5oI3Mh0ylKM4YRBaYzuBgPuRnBYD3mmhA1X5Aka8NKl4nNz7BaKTzSgsLCzWbvyo4eK9r15WwLKRAmmCXXDoA1kaG2F4jWFbgkxUnlcrB/xj5iHxFPiBN4JekY4nZ6ccOiQ87hgwhe+TOdogT1nfpgEDTvYAucIwHxBfNyhpGrR+F8x00WD33VCNTOr/Wd+9C51Ben7S0ZJUq3qZJ2OkZz+cL87ZfWuePlwRcHZjeUMxFwTrJZAJfSvyWZc1VgORTY8rBcubetdiOk+CO+jPOcCRTF+oZ0okUIyuQeSNL/lPrulg8flhmJHmE2gBpE9xrJNkwpN4rQIIyujGoELCQz8ggG38iGzjKkXufJ2Klun1iu65bnJub2yut3xbEK3UvsDEInCmvA6YjMeE1bCn8F9JBe1eAnS2JksmkIlEDfi8R46kkEkMWdqOv+AvS9rcp2bvk8OAESvgox7h4aWNMLd32jSMLvuwDAwORSE7Oe3ZRKrFwvYGrPOBJ2nZ20Op/mqKNzgraOTPt6Bnx5citUINIczX/jUw3xGL2+ia8KAvsvp0ePoL5hXkXO5YvQYSFAiqcJX8E/gyX8QUvv8eh9XUq3h7mE9tLJoNKqnhHXmCO+dtJ4ybSkH1jc9XRaHTMz1tATBe2UEkeAdKu/zWIkUbZxD+veLxEQhhUFmbnvOezsJrk+zmqMo6vIL2OXzPvQ8v7dgtpoQnkF/LP8Ruu9zXdJHg4igAAAABJRU5ErkJgggA=)](https://www.fiware.org/developers/catalogue/)
[![License: APGL](https://img.shields.io/github/license/telefonicaid/fiware-sth-comet.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Documentation badge](https://img.shields.io/readthedocs/fiware-sth-comet.svg)](http://fiware-sth-comet.readthedocs.org/en/latest/?badge=latest)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/sth-comet.svg)](https://hub.docker.com/r/fiware/sth-comet/)
[![Support Badge](https://img.shields.io/badge/tag-fiware--sth--comet-orange.svg?logo=stackoverflow)](http://stackoverflow.com/questions/tagged/fiware-sth-comet)
[![Join the chat at https://gitter.im/telefonicaid/fiware-sth-comet](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/telefonicaid/fiware-sth-comet?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

* [Introduction](#introduction)
* [Overall description](#overall-description)
* [Build and install](#build-and-install)
* [Running](#running)
* [API overview](#api-overview)
* [API walkthrough](#api-walkthrough)
* [Testing](#testing)
    * [Unit tests](#unit-tests)
    * [Performance tests](#performance-tests)
* [Advanced topics](#advanced-topics)
* [License](#license)
* [Support](#support)
* [Contact](#contact)

## Introduction

This is the code repository for the **FIWARE Short Time Historic (STH) - Comet**, a component able to manage (storing and retrieving) historical context information as raw and aggregated time series context information.

This project is part of [FIWARE](http://www.fiware.org).

Any feedback on this documentation is highly welcome, including bugs, typos or things you think should be included but aren't. You can use [github issues](https://github.com/telefonicaid/fiware-sth-comet/issues/new) to provide feedback.

You can find the Users & Developers Manual and the Installation & Administration Manual on [readthedocs.org](https://fiware-sth-comet.readthedocs.org)

[Top](#top)

## Overall description

The **FIWARE Short Time Historic (STH) - Comet** is a component of the [FIWARE](https://www.fiware.org/) ecosystem in charge of managing (storing and retrieving) historical raw and aggregated time series context information about the evolution in time of context data (i.e., entity attribute values) registered in an [Orion Context Broker](https://github.com/telefonicaid/fiware-orion) instance.

All the communications between the STH and the Orion Context Broker as well as between the STH and any third party (typically for data retrieval) use standardized NGSI9 and [NGSI10](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/ngsi-v1-0) interfaces.

If this is your first contact with the STH component, it is highly recommended that you visit the [Getting started](doc/manuals/getting-started.md) guide where we introduce some basic concepts upon which the STH component leans on all the functionality it offers.

In case you are curious about why we called this component **Comet**, you can also visit the [Why Comet](doc/manuals/why-comet.md) section of the documentation.

[Top](#top)

## Build and install

Build and Install documentation for the STH component can be found at the [Installation](doc/manuals/installation.md) section of the documentation.

[Top](#top)

## Running

Detailed information about how to run the STH component can be found at the [Running the STH server](doc/manuals/running.md) section of the documentation.

[Top](#top)

## API overview

The STH component exposes a REST API covering 4 main functionalities:

1. **Historical raw and aggregated time series context information storage**: The STH component exposes an endpoint where the notifications generated by a Context Broker instance (whenever an entity attribute value changes) can be received, processed and its associated raw and aggregated time series context information stored in an associated MongoDB database instance.
2. **Raw context information retrieval**: The STH component allows the query and retrieval of historical raw context information, this is the concrete values an entity attribute took overtime, including the concrete timestamps when the value of the attributes changed.
3. **Aggregated time series context information**: The STH component allows the query and retrieval of historical aggregated time series context information, this is information about the evolution of the entity attribute values grouped by time making it straight-forward to get distinct probabilistic measures such as means, standard deviations, maximum and minimum values, as well as the number of occurrences.
4. **Raw and aggregated time series context information removal**: The STH component allows the removal of the raw and aggregated time series context information about the desired attributes and entities.

These APIs are detailed in the next section.

[Top](#top)

## API walkthrough

Detailed information about the API to store raw and aggregated time series context information can be found at the [Storing historical raw and aggregated time series context information](doc/manuals/data-storage.md) section of the documentation.

Detailed information about the API to retrieve raw context information can be found at the [Getting historical raw context information](doc/manuals/raw-data-retrieval.md) section of the documentation.

Detailed information about the API to retrieve aggregated time series context information can be found at the [Getting historical aggregated time series context information](doc/manuals/aggregated-data-retrieval.md) section of the documentation.

Detailed information about the API to remove raw and aggregated time series context information can be found at the [Removing historical raw and aggregated time series context information](doc/manuals/aggregated-data-retrieval.md) section of the documentation.

[Top](#top)

## Testing

The STH component includes unit and performance tests.

[Top](#top)

### Unit tests

Detailed information about the unit tests included with the STH component code can be found at the [Unit tests coverage](doc/manuals/unit-test-coverage.md) section of the documentation.

[Top](#top)

### Performance tests

Detailed information about the performance tests included with the STH component code can be found at the [Performance tests coverage](doc/manuals/performance-test-coverage.md) section of the documentation.

[Top](#top)

## Advanced topics

If you are a developer, you may be interested in checking the [Additional resources](doc/manuals/additional-resources.md) section of the documentation as well as the [Contribution guidelines](doc/manuals/contribution-guidelines.md) section in case you may be interested in contributing to the project.

[Top](#top)

## Licence

The STH component is licensed under Affero General Public License (GPL) version 3.

[Top](#top)

## Support

Ask your thorough programmming questions using [stackoverflow](http://stackoverflow.com/questions/ask) and your general questions on [FIWARE Q&A](https://ask.fiware.org). In both cases please use the tag `fiware-sth-comet`.

[Top](#top)

## Alarms

Alarms documentation for the STH component can be found at the [Alarms](doc/manuals/alarms.md) section of the documentation.

[Top](#top)


## Contact

* Germán Toro del Valle ([german.torodelvalle@telefonica.com](mailto:german.torodelvalle@telefonica.com), [@gtorodelvalle](http://www.twitter.com/gtorodelvalle))
* Francisco Romero Bueno ([francisco.romerobueno@telefonica.com](mailto:francisco.romerobueno@telefonica.com))
* Iván Arias León ([ivan.ariasleon@telefonica.com](mailto:ivan.ariasleon@telefonica.com))

[Top](#top)
