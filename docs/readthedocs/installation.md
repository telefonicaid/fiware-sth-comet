# Installation

The STH component provides 3 alternatives for its installation:
1. Cloning the Github repository
2. Using a RPM package
3. Automatic deployment using Docker

## Cloning the Github repository

To install the STH component cloning the Github repository, please follow the next steps:
1. Clone the repository:
    ```bash
    git clone https://github.com/telefonicaid/fiware-sth-comet.git
    ```
2. Get into the directory where the STH repository has been cloned:
    ```bash
    cd fiware-sth-comet/
    ```
3. Install the Node.js modules and dependencies:
    ```bash
    npm install
    ```

The STH component server is ready to be started as a Node application.

## Using a RPM package

In the next sections we detail the steps to follow to install, update and remove the STH component using a RPM package.

### Package generation

**Prerequisites:** To generate the RPM package from the STH component sources it is needed to have the rpm build tools (`rpmbuild` executable), Node and the
npm utilities, as well as an Internet connection to download the required Node modules.

To generate the RPM package for the STH component, execute the following
command from the root of the STH component:
```bash
./rpm/create-rpm.sh -v <version> -r <release>
```

If everything goes fine, a new RPM package such as `
```bash
./rpm/RPMS/x86_64/fiware-sth-comet-<version>-<release>.x86_64.rpm
```
will be created.

Execute:
```bash
./rpm/create-rpm.sh -h
```
for more information about the RPM package creation script.

### Installation, upgrade and removal

**Prerequisites:** Node is needed to install the generated STH component RPM package.

To install or upgrade the STH component, execute:
```bash
sudo rpm -Uvh fiware-sth-comet-<version>-<release>.x86_64.rpm
```

After the installation, the following files and directories are created:
```
/etc/init.d
└── sth

/etc/logrotate.d
└── logrotate-sth-daily

/var/log/sth

/var/run/sth

/opt/sth
├── conf
│   └── <empty> Here is where instances are configured
├── node_modules
│   └── <node modules directory structure and files>
├── package.json
└── src
    └── <STH SW files>
```

To remove a previous STH component installation, execute: `sudo rpm -e fiware-sth-comet`

### Configuration

STH is able to start multiple instances using the [sth](rpm/SOURCES/etc/init.d/sth "sth") service script by adding and configuring certain files as detailed next.

To start multiple instances, one configuration file per instance has to be included in the `/opt/sth/conf` directory. It is important to note that the default installation includes preconfigured instances.

It is important to change the `STH_PORT` value included in the configuration files to a value not used by other STH instances/services. It is also a good practice to change the `LOG_FILE_NAME` value to avoid getting the logs from several instances mixed.

The [init.d](rpm/SOURCES/etc/init.d/sth "sth") service script includes the following operations:
* **start** (`sudo /sbin/service sth start [<instance>]`): if `<instance>` is not provided, the script starts an instance per configuration file found in the `/opt/sth/conf` directory matching the `sth_*.conf` template. If `<instance>` is provided, a configuration file named `sth_<instance>.conf` is searched in the `/opt/sth/conf` directory and the corresponding instance is started.
* **stop** (`sudo /sbin/service sth stop [<instance>]`): if `<instance>` is not provided, the script stops all the instances by listing all pid files under `/var/run/sth` matching the pattern `sth_*.pid`. If `<instance>` is provided, the scripts stops the instance with the associated pid file `/var/run/sth/sth_<instance>.pid`
* **status** (`sudo /sbin/service sth status [<instance>]`): The status operation shows information about one or more running instances
following the same procedure detailed in the `stop` operation.
* **restart** (`sudo /sbin/service sth stop [<instance>]`): The restart operation executes a `stop` operation followed by a `start` operation according to the procedure detailed in those operations.

An example [`sth_default.conf`](rpm/EXAMPLES/sth_default.conf) file has been included in this Github repository to guide the STH instance configuration.

Last but not least, the STH process (a `node` process) runs the as `sth` user.

## Automatic deployment using Docker

To ease the testing and deployment of the STH component we have prepared a Docker repository which can be found at [https://registry.hub.docker.com/u/fiwareiotplatform/iot-sth/](https://registry.hub.docker.com/u/fiwareiotplatform/iot-sth/), including all the information needed to try and to deploy the STH component via the execution of a simple Docker command.

On the other hand a [`Dockerfile`](https://github.com/telefonicaid/fiware-sth-comet/blob/master/Dockerfile) and a [`docker-compose.yml`](https://github.com/telefonicaid/fiware-sth-comet/blob/master/docker-compose.yml) files have also been included in this very repository to quickly and easily start your own instance of the STH component, even including the associated MongoDB instance where all the data will be stored.

To do it, follow the next steps once you have installed Docker in your machine:
1. Navigate to the path where this repository was cloned.
2. Compose and run the new STH component image:
```bash
docker-compose up
```
