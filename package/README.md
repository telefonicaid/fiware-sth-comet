# Short Term History (STH) package

This directory contains tools to make and distribute STH in RPM format used, mainly, in Red Hat, CentOS and
Fedora Linux distributions.

Within the RPM is included:

- STH software
- Node.js modules that are needed by STH
- [sth](https://github.com/telefonicaid/IoT-STH/blob/master/package/rpm/SOURCES/etc/init.d/sth "sth") init.d script with standard operations
- Daily log rotation [logrotate-sth-daily](https://github.com/telefonicaid/IoT-STH/blob/master/package/rpm/SOURCES/etc/logrotate.d/logrotate-sth-daily "logrotate")
- Creation of directories: `/var/log/sth` and `/var/run/sth`
- User `sth` is created and is the propietary of the installed files and running STH process

## Package STH software

**Prerequisites:** To make RPM is needed to have rpm build tools (rpmbuild executable), NodeJS and 
npm utilities and Internet connection to download STH node modules.

To package STH software just execute from this directory:

`./scripts/package.sh -v <version> -r <release>`

If package script works correctly appears `./rpm/RPMS/x86_64/sth-<version>-<release>.x86_64.rpm` RPM.

Type `./scripts/package.sh -h` for more information about the script.

## Installing, upgrading and erasing RPM:

**Prerequisites:** To install RPM NodeJS (node executable) is needed to be installed previously

To install or upgrade type `sudo rpm -Uvh sth-<version>-<release>.x86_64.rpm`

To remove type `sudo rpm -e sth`

## RPM detailed content:

This is the detailed tree structure created once RPM is installed:

```
/etc/init.d
└── sth

/etc/logrotate.d
└── logrotate-sth-daily

/var/log/sth

/var/run/sth

/usr/sth
├── conf
│   ├── README.md
│   └── sth_default.conf
├── node_modules
│   └── <node modules directory structure and files>
├── package.json
└── src
    └── <STH SW files>
```
