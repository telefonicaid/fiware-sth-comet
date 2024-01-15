# Installation

The STH component provides 3 alternatives for its installation:

1.  Cloning the GitHub repository
2.  Automatic deployment using Docker

## Cloning the GitHub repository

To install the STH component cloning the GitHub repository, please follow the next steps:

1.  Clone the repository.
2.  Get into the directory where the STH repository has been cloned.
3.  Install the Node.js modules and dependencies.

This is:

```bash
git clone https://github.com/telefonicaid/fiware-sth-comet.git
cd fiware-sth-comet/
npm install
```

The STH component server is ready to be started as a Node application.

## Automatic deployment using Docker

To ease the testing and deployment of the STH component, there also exists Docker images hosted at the
[FIWARE Docker Hub](https://hub.docker.com/r/fiware/sth-comet/), including all the information needed to deploy and to
try the STH component via the execution of a simple Docker command.

On the other hand a [`Dockerfile`](https://github.com/telefonicaid/fiware-sth-comet/blob/master/docker/Dockerfile) and a
[`docker-compose.yml`](https://github.com/telefonicaid/fiware-sth-comet/blob/master/docker-compose.yml) files have also
been included in the component repository in GitHub to quickly and easily start your own instance of the STH component,
even including the needed associated MongoDB instance where all the data will be stored.

To do it, follow the next steps once you have installed Docker in your machine:

1.  Navigate to the path where the component repository was cloned.
2.  Compose and run the STH component image
    -   In foreground mode:
    ```bash
    sudo docker-compose -f docker-compose.yml up
    ```
    -   Or in detached mode:
    ```bash
    sudo docker-compose -f docker-compose.yml up -d
    ```

There is also the possibility to build your own local Docker image of the STH component.

To do it, follow the next steps once you have installed Docker in your machine:

1.  Navigate to the path where the component repository was cloned.
2.  Launch a Docker build
    -   Using the default NodeJS version of the operating system used defined in FROM keyword of Dockerfile:
    ```bash
    sudo docker build -f Dockerfile .
    ```
    -   Using an alternative NodeJS version:
    ```bash
    sudo docker build --build-arg NODEJS_VERSION=0.10.46 -f Dockerfile .
    ```

### Using PM2

The STH within the Docker image can be run encapsulated within the [pm2](http://pm2.keymetrics.io/) Process Manager by
adding the `PM2_ENABLED` environment variable.

```console
docker run --name sth -e PM2_ENABLED=true -d fiware/fiware-sth-comet
```

Use of pm2 is **disabled** by default. It is unnecessary and counterproductive to add an additional process manager if
your dockerized environment is already configured to restart Node.js processes whenever they exit (e.g. when using
[Kubernetes](https://kubernetes.io/))
