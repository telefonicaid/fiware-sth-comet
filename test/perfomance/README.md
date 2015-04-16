## Performance Tests

This is the repository for scripts to Short Term Historic (STH), used for Performance tests.
Load testing is the process of putting demand on a system and measuring its response.
Load testing is performed to determine a system's behavior under anticipated peak load conditions

#### Pre-conditions:

* "Jmeter" app exists in Launcher VM
* "ServerAgent" app exists in STH Nodes and Balancer (only in cluster case)
* have a account in Loadosophia - (http://loadosophia.org)
* "nginx" app exists in Balancer VM (only in cluster case)
* Verify nginx configuration for each scenario (only in cluster case)
* Verify that the mongoDB exists and it is installed correctly
	
#### Pre-steps:

* Launch "ServerAgent" in Balancer and each Cygnus Node VMs (java is a dependency)
```
nohup sh startAgent.sh --udp-port 0 --tcp-port 4444 &
```

#### Scripts:

**sth_notifications_v1.0.jmx**:

  >**Scenario**:
```
* N threads (notifications) in the same time against a STH instance specific, where threads are notifications total, entities are the number of entities in each service path
and service path is the div between notifications (threads) and entities.
```
  >**Steps**:
```
- verify mongo is installed correctly
- STH configuration (by command line or config file)
- restart STH app or service
- launch jmeter script
- reports path (/tmp/JMeter_result/<TESTNAME>_result_<date>)
```
  >**Properties**:
```
* TESTNAME     - test name (notifications by default)
* HOST         - IP or hostname main node(in case of clusters is Nginx)  (127.0.0.1 by default)
* PORT         - port used by cygnus (7777 by default)
* RAMPUP       -  ramp up of threads (0 by default)
* THREADS      - threads number (notifications total) (1 by default)
* ENTITIES     - number of entities in each service path  (1 by default, service path is the div between notifications (THREADS) and ENTITIES)
* CONTENT      - type of content in http (values allowed: JSON | XML )  (JSON by default)
* SERVICE      - service or tenant name prefix (my_service by default)
* SERVICE_PATH - service path name prefix (/my_serv_path by default)
* ENTITY_TYPE  - entity type value (static value) (house by default)
* ENTITY_ID    - entity id prefix (room by default)
* ATTR_NAME    - attribute name (temperature by default)
* ATTR_VALUE   - attribute value (30.5 by default)
* ATTR_TYPE    - attribute value (float by default)
```

  >**example**:
```
<jmeter_path>/jmeter.sh -n -t <path>/sth_notifications_v1.0.jmx -JHOST=X.X.X.X -JPORT=7777 -JRAMPUP=10 -JTHREADS=20 -JENTITIES=5 > <log_path>/sth_notifications_`date +%FT%T`.log &
```

#### Post-steps:
  * Upload in Loadosophia web Loadosophia_xxxxxxxxxxxxxxxxxxxxx.jtl.gz and perfmon_xxxxxxxxxxxxxxxxxxxx.jtl.gz (where "xxxxxxxxxxxxxxxxxxx" is a hash value).
  * Create Final Report (recommend google docs)

```
Comments:
    /tmp/error_xxxxxxxxxxxxxxxxxxx.html is created, because does not have access at loadosophia, the token is wrong intentionally
    This is made to not constantly access and penalizes the test times. We only store dates manually when finished test. So "xxxxxxxxxxxxxxxxxxx" is a hash value.
```