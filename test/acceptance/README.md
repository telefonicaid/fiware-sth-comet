# STH Acceptance Tests

Folder for acceptance tests of STH (Short Term Historic).

## How to Run the Acceptance Tests

### Prerequisites:

- Python 2.6 or newer
- pip installed (http://docs.python-guide.org/en/latest/starting/install/linux/)
- virtualenv installed (pip install virtualenv) (optional).
Note: We recommend the use of virtualenv, because is an isolated working copy of Python which allows you to work on a specific project without worry of affecting other projects.

##### Environment preparation:

- If you are going to use a virtual environment (optional):
  * Create a virtual environment somewhere, e.g. in ~/venv (virtualenv ~/venv) (optional)
  * Activate the virtual environment (source ~/venv/bin/activate) (optional)
- Both if you are using a virtual environment or not:
  * Change to the test/acceptance folder of the project.
  * Install the requirements for the acceptance tests in the virtual environment
     ```
     pip install -r requirements.txt --allow-all-external
     ```
  * Verify if  xmltodict and requests libraries are installed, if not:
     ```
     pip install xmltodict requests
     ```

#### Requirements to fabric
    ```
     yum install gcc python-devel
    ```

### Tests execution:

- Change to the test/acceptance folder of the project if not already on it.
- `properties.json` will be create automatically from setting folder (see configuration.json), with configurations files previously created
- Run lettuce_tools (see available params with the -h option).

```
Some examples:
   lettuce_tools                                   -- run all features
   lettuce_tools -ft ckan_row.feature              -- run only one feature
   lettuce_tools -tg test -ft ckan_row.feature     -- run scenarios tagged with "test" in a feature
   lettuce_tools -tg=-skip -ft ckan_row.feature    -- run all scenarios except tagged with "skip" in a feature
```

### Tests Suites Coverage:

- notifications.
- aggregated.
- raw (pending).
- alarms (pending)

### configuration.json

We recommend to create `settings` folder in acceptance folder if it does not exists and store all configurations to features referenced by `properties.json.base` files.
The settings folder path could be changed in the `configuration.json` file in `path_to_settings_folder` field
This file initially will overwrite properties.json in each feature.
   ```
   ex: epg_properties.json
   ```
   * path_to_settings_folder: path where are stored all configurations referenced by properties.json.base
   * log_file: path and file where is log file
   * jenkins: it is used mainly per not jenkins environment (false) and the properties will be read from config file in `path_to_settings_folder`.
              If jenkins (true) won't read config file previously and properties must be provisioned in consoles jenkins.

### checking log file

Verify if a label and its text exists in the last lines. The file log by default is `"/var/log/sth/sth.log`(see configuration.json)

### properties.json

- environment
    * name: name of product tested.
    * logs_path: folder name to logs.


- sth
    * sth_protocol: web protocol used (http by default)
    * sth_host: sth host (localhost by default)
    * sth_port: sth port (8666 by default)
    * sth_version: sth version (x.y.z by default)
    * sth_verify_version: determine whether the version is verified or not (True or False).
    * sth_fabric_user: user used to connect by Fabric
    * sth_fabric_password: password used to connect by Fabric, if use password, cert_file must be None.
    * sth_fabric_cert_file: cert_file used to connect by Fabric, if use cert file, password must be None.
    * sth_fabric_error_retry: Number of times Fabric will attempt to connect when connecting to a new server
    * sth_fabric_source_path: source path where are templates files
    * sth_fabric_target_path: target path where are copied config files
    * sth_fabric_sudo:  with superuser privileges (True | False)

- mongo
    * mongo_host: IP address or host of mongo Server.
    * mongo_port: port where mongo is listening.
    * mongo_user: user valid in the mongo server.
    * mongo_pass: password to user above.
    * mongo_version: mongo version installed.
    * mongo_verify_version: determine whether the version is verified or not (True or False).
    * mongo_database: mongo database (sth by default).
    * mongo_retries_search: number of retries for data verification.
    * mongo_delay_to_retry: time to delay in each retry.

### tags

You can to use multiples tags in each scenario, possibles tags used:

    - happy_path, skip, errors_40x, only_develop, ISSUE_XXX, BUG_XXX, etc

and to filter scenarios by these tags: see Tests execution section.



