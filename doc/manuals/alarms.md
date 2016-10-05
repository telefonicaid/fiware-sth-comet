# Alarms

When in a production environment, the STH component is typically alarmed using the following alarms (we also include some guidelines regarding how to react if they arise):

1. **Alarm `STH-0`**:
    - **Description**: Error when connecting to MongoDB or error when starting the Hapi server or any uncaught exception.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `| lvl=ERROR | corr=NA | trans=NA | op=OPER_STH_SHUTDOWN` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the logs to infer the concrete error
        2. If error when connecting to MongoDB:
            1. Check the MongoDB instance or replica-set is running. If not, start it up.
            2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. If any other error:
            1. Restart the STH server.
            2. Contact the development team to inform them about this error.
2. **Alarm `STH-1`**:
    - **Description**: Internal Hapi server error.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `| lvl=ERROR | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Restart the STH server.
        2. Contact the development team to inform them about this error.
3. **Alarm `STH-2`**:
    - **Description**: Error when getting raw or aggregated data from a MongoDB collection.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `lvl=ERROR` and `msg=Error when getting data from collection` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the MongoDB instance or replica-set is running. If not, start it up.
        2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. Contact the development team to inform them about this error.
4. **Alarm `STH-3`**:
    - **Description**: Error when getting the collection in MongoDB from which the raw or aggregated data should be retrieved.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `lvl=ERROR` and `msg=Error when getting the collection` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the MongoDB instance or replica-set is running. If not, start it up.
        2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. The problem could be related to the limitation MongoDB imposes on the namespaces maximum size (for further information, see: http://docs.mongodb.org/manual/reference/limits/ , for the concrete MongoDB instance version)
        4. Contact the development team to inform them about this error.
5. **Alarm `STH-4`**:
    - **Description**: Error when storing raw data in the corresponding MongoDB collection.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `lvl=ERROR` and `msg=Error when storing the raw data associated to a notification event` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the MongoDB instance or replica-set is running. If not, start it up.
        2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. Contact the development team to inform them about this error.
6. **Alarm `STH-5`**:
    - **Description**: Error when storing aggregated data in the corresponding MongoDB collection.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `lvl=ERROR` and `msg=Error when storing the aggregated data associated to a notification event` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the MongoDB instance or replica-set is running. If not, start it up.
        2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. Contact the development team to inform them about this error.
7. **Alarm `STH-6`**:
    - **Description**: Error when creating the index to force TTL in the newly created collection.
    - **Severity**: CRITICAL.
    - **Detection strategy**: `lvl=ERROR` and `msg=Error when creating the index for TTL for collection` in the log messages.
    - **Stop condition**: `| lvl=INFO | corr=NA | trans=NA | op=OPER_STH_SERVER_LOG |` and msg containing `'Everything OK'` in the log messages.
    - **Procedure**:
        1. Check the MongoDB instance or replica-set is running. If not, start it up.
        2. Check if the machine where the STH is running has connectivity to the MongoDB instance or replica-set. If not accessible, make it accessible.
        3. Contact the development team to inform them about this error.
