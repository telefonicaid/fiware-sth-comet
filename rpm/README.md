# Short Term History (STH) package

This directory contains tools to make and distribute STH in RPM format used, mainly, in Red Hat, CentOS and
Fedora Linux distributions.

Within the RPM is included:
- STH software
- Node.js modules that are needed by STH
- [sth](SOURCES/etc/init.d/sth "sth") init.d script with standard operations
- Daily log rotation [logrotate-sth-daily](SOURCES/etc/logrotate.d/logrotate-sth-daily.conf "logrotate")
- Creation of directories: `/var/log/sth` and `/var/run/sth`
- User `sth` is created and is the propietary of the installed files and running STH process

## Package STH software

**Prerequisites:** To make RPM is needed to have rpm build tools (rpmbuild executable), NodeJS and 
npm utilities and Internet connection to download STH node modules.

To package STH software just execute from this directory:

`./create-rpm.sh -v <version> -r <release>`

If package script works correctly appears `./rpm/RPMS/x86_64/fiware-sth-comet-<version>-<release>.x86_64.rpm` RPM.

Type `./create-rpm.sh -h` for more information about the script.

## Installing, upgrading and erasing RPM:

**Prerequisites:** To install RPM NodeJS (node executable) is needed to be installed previously

To install or upgrade type `sudo rpm -Uvh fiware-sth-comet-<version>-<release>.x86_64.rpm`

To remove type `sudo rpm -e fiware-sth-comet`

## RPM detailed content:

This is the detailed tree structure created once RPM is installed:

```
/etc/init.d
└── sth

/etc/logrotate.d
└── logrotate-sth-daily

/var/log/sth

/var/run/sth

/opt/sth
├── conf
│   └── <empty> Here we configure instances
├── node_modules
│   └── <node modules directory structure and files>
├── package.json
└── src
    └── <STH SW files>
```
To configure instances, see [Running the STH server](../README.md#running-the-sth-server)

# Short Term History configuration procedure

STH is able to start multiple instances by adding and configuring certain files of this directory
using [sth](SOURCES/etc/init.d/sth "sth") service script

To start multiple instances is needed to place in `/opt/sth/conf` one configuration file for 
each instance that is wanted to run. RPM cames without preconfigured instances.

The [init.d](SOURCES/etc/init.d/sth "sth") service script to start looks for files in 
`/opt/sth/conf` that begins with `sth_` prefix and has `.conf` extension and start one 
process for file found.

It is important to change `STH_PORT` to one not used by other STH intances/services. And it is
good practice change `LOG_FILE_NAME` to avoid logs mixed by serveral instances.

[sth](SOURCES/etc/init.d/sth "sth") init.d is packaged into the RPM and is needed to execute STH
in multiinstace explained above. It has the next operations:
- **start**: `sudo /sbin/service sth start [<instance>]` if `<instance>` is not provided, script try to
start as many instances as files that match with `sth_*.conf` template othewise only starts one 
instance whit name provided. I.E. `sudo /sbin/service sth start default` starts a instance that has a
file named `sth_default.conf`
- **stop**: `sudo /sbin/service sth stop [<instance>]` if `<instance>` is not provided, script try to
stop all the instances by listing all pid files under `/var/run/sth` with the pattern `sth_*.pid`.
If `<instance>` is provided try to stop a instance with a pid file `/var/run/sth/sth_<instance>.pid`
- **status**: `sudo /sbin/service sth status [<instance>]` work in the same way that `stop` works but 
showing information about intances status instead stopping it.
- **restart** `sudo /sbin/service sth stop [<instance>]` performs a `stop` and a `start` opetarions 
applying to one or all instances if `<instance>` is provided or not respectively.

Process STH (node) is running as sth user

