# Short Term History configuration procedure

STH is able to start multiple instances by adding and configuring certain files of this directory
using [sth](../../../etc/init.d/sht "sth") service script

To start multiple instances is needed to place in `/usr/sth/conf` one configuration file for 
each instance that is wanted to run. RPM cames with one preconfigured instance (config 
file called sth_default.conf) that can be used as a template to configure another instances.

The [init.d](../../../etc/init.d/sht "sth") service script to start looks for files in 
`/usr/sth/conf` that begins with `sth_` prefix and has `.conf` extension and start one 
process for file found.

It is important to change `STH_PORT` to one not used by other STH intances/services. And it is
good practice change `LOG_FILE_NAME` to avoid logs mixed by serveral instances.

[sth](../../../etc/init.d/sht "sth") init.d is packaged into the RPM and is needed to execute STH
in multiinstace explained above. It has the next operations:
- **start**: `sudo /sbin/service sth start [<instance>]` if `<instance>` is not provided, script try to
start as many instances as files that match with `sth_*.conf` template othewise only starts one 
instance whit name provided. I.E. `sudo /sbin/service sth start default` starts a instance that has a
file named `sth_default.conf`
- **stop**: `sudo /sbin/service sth stop [<instance>]` if `<instance>` is not provided, script try to
stop all the instances by listing all pid files under `/var/run/sht` with the pattern `sth_*.pid`.
If `<instance>` is provided try to stop a instance with a pid file `/var/run/sht/sth_<instance>.pid`
- **status**: `sudo /sbin/service sth status [<instance>]` work in the same way that `stop` works but 
showing information about intances status instead stopping it.
- **restart** `sudo /sbin/service sth stop [<instance>]` performs a `stop` and a `start` opetarions 
applying to one or all instances if `<instance>` is provided or not respectively.

Process STH (node) is running as sth user