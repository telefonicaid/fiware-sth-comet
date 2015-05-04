# -*- coding: utf-8 -*-
#
# Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
#
# This file is part of Short Term Historic (FI-WARE project).
#
# iot-sth is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General
# Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any
# later version.
# iot-sth is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
# warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along with iot-sth. If not, see
# http://www.gnu.org/licenses/.
#
# For those usages not covered by the GNU Affero General Public License please contact:
# iot_support at tid.es
#
from tools import http_utils
from tools.remote_log_utils import Remote_Log

__author__ = 'Iván Arias León (ivan.ariasleon at telefonica dot com)'

import string

from lettuce import world

import general_utils
from tools.fabric_utils import FabricSupport
from tools.notification_utils import Notifications

# constants
EMPTY              = u''
PROTOCOL           = u'protocol'
PROTOCOL_DEFAULT   = u'http'
HOST               = u'host'
PORT               = u'port'
STH_NOTIFICATION   = u'notify'
VERSION            = u'version'
VERIFY_VERSION     = u'verify_version'
FABRIC_USER        = u'fabric_user'
FABRIC_PASSWORD    = u'fabric_password'
FABRIC_CERT_FILE   = u'fabric_cert_file'
FABRIC_ERROR_RETRY = u'fabric_error_retry'
FABRIC_SOURCE_PATH = u'fabric_source_path'
FABRIC_TARGET_PATH = u'fabric_target_path'
FABRIC_SUDO        = u'fabric_sudo'

RANDOM                     = u'random'
CHARS_ALLOWED              = string.ascii_letters + string.digits + u'_'      # [a-zA-Z0-9_]+ regular expression
RANDOM_SERVICE_LENGTH      = u'random service length ='
RANDOM_SERVICE_PATH_LENGTH = u'random service path length ='

STH_DATABASE_PREFIX   = u'sth'
STH_COLLECTION_PREFIX = u'sth'
AGGR                  = u'aggr'
URL_PATH              = u'STH/v1/contextEntities'

# headers constants
HEADER_ACCEPT                             = u'Accept'
HEADER_CONTENT_TYPE                       = u'Content-Type'
HEADER_APPLICATION                        = u'application/json'
HEADER_SERVICE                            = u'Fiware-Service'
HEADER_SERVICE_PATH                       = u'Fiware-ServicePath'
HEADER_USER_AGENT                         = u'User-Agent'



class STH:
    """
    manage Short Term Historic
    """

    def __init__(self, **kwargs):
        """
        constructor

        :param sth_protocol: web protocol (http | https)
        :param sth_host: sth host   
        :param sth_port: sth port 
        :param version : sth version 
        :param verify_version : determine if verify sth version or not (True | False)
        :param fabric_user: ssh user used to connect remotely by fabric 
        :param fabric_password: password used to connect remotely by fabric, if use cert file, password will be None 
        :param fabric_cert_file: cert_file used to connect remotely by fabric, if use password, cert_file will be None 
        :param fabric_error_retry: Number of times that fabric will attempt connecting to a new server 
        :param fabric_source_path: source path where are config templates files
        :param fabric_target_path: target path where are copied config files 
        :param fabric_sudo: operations in sth with superuser privileges (True | False)
        """
        self.protocol=kwargs.get(PROTOCOL, PROTOCOL_DEFAULT)
        self.sth_host = kwargs.get(HOST, EMPTY)
        self.sth_port = kwargs.get(PORT, EMPTY)
        self.sth_url = "%s://%s:%s/%s" % (self.protocol, self.sth_host, self.sth_port, STH_NOTIFICATION)
        self.sth_version = kwargs.get(VERSION, EMPTY)
        self.sth_verify_version = kwargs.get(VERIFY_VERSION, EMPTY)
        self.sth_version = kwargs.get(VERSION, EMPTY)
        self.fabric_user=kwargs.get(FABRIC_USER, EMPTY)
        self.fabric_password=kwargs.get(FABRIC_PASSWORD, EMPTY)
        self.fabric_cert_file=kwargs.get(FABRIC_CERT_FILE, EMPTY)
        self.fabric_error_retry=kwargs.get(FABRIC_ERROR_RETRY, 1)
        self.fabric_source_path=kwargs.get(FABRIC_SOURCE_PATH, EMPTY)
        self.fabric_target_path=kwargs.get(FABRIC_TARGET_PATH, EMPTY)
        self.fabric_sudo=kwargs.get(FABRIC_SUDO, False)


    def verify_mongo_version(self):
        """
        verify mongo version
        if the version is incorrect show an error with both versions, the used and the expected
        """
        world.mongo.connect()
        resp = world.mongo.eval_version()
        world.mongo.disconnect()
        assert resp == u'OK', resp

    def verify_sth_version(self):
        """
        verify sth version
        Still has not been developed this feature and remember that the assert is better in the step
        """
        pass


    def init_log_file(self):
        """
        reinitialize log file
        delete and create a new log file (empty)
        """
        myfab = FabricSupport(host=self.sth_host, user=self.fabric_user, password=self.fabric_password, cert_file=self.fabric_cert_file, retry=self.fabric_error_retry, hide=False, sudo=self.fabric_sudo)
        log = Remote_Log (fabric=myfab)
        log.delete_log_file()
        log.create_log_file(owner="sysadmin", group="sysadmin", mod="777")


    def sth_service(self, operation):
        """
        cygnus service (status | stop | start | restart)
        :param operation:
        """
        myfab = FabricSupport(host=self.sth_host, user=self.fabric_user, password=self.fabric_password, cert_file=self.fabric_cert_file, retry=self.fabric_error_retry, hide=False, sudo=self.fabric_sudo)
        myfab.run("HOST=0.0.0.0 npm start", path=self.fabric_target_path, sudo=False)

    def configuration(self, service, service_path, entity_type, entity_id, attributes_number, attributes_name, attribute_type):
        """
        configuration values
        """
        # service
        if service.find(RANDOM_SERVICE_LENGTH) >= 0:
            characters = int(service.split(" = ")[1])
            self.service = general_utils.string_generator(characters, CHARS_ALLOWED)
        else:
            self.service = service

        # service_path
        if service_path.find(RANDOM_SERVICE_PATH_LENGTH) >= 0:
            characters = int(service_path.split(" = ")[1])
            self.service_path = "/"+general_utils.string_generator(characters, CHARS_ALLOWED)
        else:
            self.service_path = service_path
        #if self.service_path[:1] == "/": self.service_path = self.service_path[1:]

        # entity_type and entity id
        self.entity_type = entity_type
        self.entity_id   = entity_id
        #attributes
        self.attributes_number = attributes_number
        self.attributes_name   = attributes_name
        self.attribute_type    = attribute_type

    def get_timestamp_remote(self):
        """
        return date-time in timestamp from sth server
        :return float
        """
        myfab = FabricSupport(host=self.sth_host, user=self.fabric_user, password=self.fabric_password, cert_file=self.fabric_cert_file, retry=self.fabric_error_retry, hide=True, sudo=self.fabric_sudo)
        return float(myfab.run("date +%s"))  # get timestamp

    def received_notification(self, attribute_value, metadata_value, content):
        """
        notifications
        :param attribute_value: attribute value
        :param metadata_value: metadata value (true or false)
        :param content: xml or json
        """
        self.date_time = None
        self.content = content
        self.metadata_value = metadata_value
        metadata_attribute_number = 1
        notification = Notifications (self.sth_url,tenant=self.service, service_path=self.service_path, content=self.content)
        if self.metadata_value.lower() == "true":
            notification.create_metadatas_attribute(metadata_attribute_number, RANDOM, RANDOM, RANDOM)
        notification.create_attributes (self.attributes_number, self.attributes_name, self.attribute_type, attribute_value)
        resp = notification.send_notification(self.entity_id, self.entity_type)

        self.date_time = self.get_timestamp_remote()
        self.attributes = notification.get_attributes()
        self.attributes_name = notification.get_attributes_name()
        self.attributes_value =notification.get_attributes_value()
        self.attributes_number = notification.get_attributes_number()
        self.attributes_number = int(notification.get_attributes_number())
        return resp

    def drop_database_in_mongo(self, driver):
         """
         delete database and collections in mongo
         :param driver: mongo instance
         """
         driver.connect("%s_%s" % (STH_DATABASE_PREFIX, self.service))
         driver.drop_database()
         driver.disconnect()

    def  __create_headers(self):
        """
        create the header for different requests
        :return: headers dictionary
        """
        return {HEADER_ACCEPT: HEADER_APPLICATION, HEADER_CONTENT_TYPE: HEADER_APPLICATION, HEADER_SERVICE: self.service, HEADER_SERVICE_PATH: self.service_path}

    def ask_for_aggregated(self, step, method, resolution):
        """
        ask for aggregates with method and resolution
        :param step: dates parameters: [OPTIONAL]
                      the format of the table is:
                          | date_type | value               |
                          | dateFrom  | 2015-02-14T00:00:00 |
                          | dateTo    | 2015-12-31T00:00:00 |
        :param method: aggregated method, allowed values ( sum | sum2 | min | max )
        :param resolution: Aggregation period or resolution ( month | day |hour | minute |second )
        :return response
        """

        params = "aggrMethod=%s&aggrPeriod=%s" % (method, resolution)
        for line in step.hashes:  # get dates parameters. they are optional
            params = params + "&%s=%s" % (line["date_type"], line["value"]) # ex: &dateFrom=2015-02-14T00:00:00&dateTo=2015-12-31T00:00:00
        url = "%s://%s:%s/%s?%s" % (self.protocol, self.sth_host, self.sth_port, URL_PATH, params)
        http_utils.print_request(http_utils.GET, url, self.__create_headers(), "")
        #resp =  http_utils.request(http_utils.GET, url=url, headers=self.__create_headers())



    # --------------------------- verifications -------------------------------------------

    def verify_values_in_mongo(self):
        """
        verify attribute value and type from mongo
        :return document dict (cursor)
        """
        find_dict = { "entityId" : self.entity_id,
                      "entityType": self.entity_type,
                      "attrName": {'$regex':'%s.*' % (self.attributes_name)}, #the regular expression is because in  multi attribute the name is with postfix <_value>. ex: temperature_0
                      "attrType" : self.attribute_type,
                      "attrValue" : str(self.attributes_value)
        }
        world.mongo.connect("%s_%s" % (STH_DATABASE_PREFIX, self.service))
        world.mongo.choice_collection("%s_%s" % (STH_COLLECTION_PREFIX, self.service_path))
        cursor = world.mongo.find_with_retry(find_dict)
        assert cursor.count() != 0, " ERROR - the attributes with prefix %s has not been stored in mongo successfully" % (self.attributes_name)
        world.mongo.disconnect()

    def verify_aggregates_in_mongo(self, resolution):
        """
        verify aggregates from mongo:
            - origin, max, min, sum sum2
        :param resolution: resolutions type (  month | day | hour | minute | second )
        """
        find_dict = {"_id.attrName" :  {'$regex':'%s.*' % (self.attributes_name)}, #the regular expression is because in  multi attribute the name is with postfix + <_value>. ex: temperature_0
                     "_id.entityId" : self.entity_id,
                     "_id.entityType" : self.entity_type,
                     "_id.resolution" : resolution }

        origin_year   = general_utils.get_date_only_one_value(self.date_time, "year")
        origin_month  = general_utils.get_date_only_one_value(self.date_time, "month")
        origin_day    = general_utils.get_date_only_one_value(self.date_time, "day")
        origin_hour   = general_utils.get_date_only_one_value(self.date_time, "hour")
        origin_minute = general_utils.get_date_only_one_value(self.date_time, "minute")
        origin_second = general_utils.get_date_only_one_value(self.date_time, "second")

        world.mongo.connect("%s_%s" % (STH_DATABASE_PREFIX, self.service))
        world.mongo.choice_collection("%s_%s.%s" % (STH_COLLECTION_PREFIX, self.service_path, AGGR))
        cursor = world.mongo.find_with_retry(find_dict)
        assert cursor.count() != 0, " ERROR - the aggregated has not been stored in mongo successfully "
        doc_list = world.mongo.get_cursor_value(cursor)   # get all dictionaries into a cursor, return a list

        for doc in doc_list:
            offset = int(general_utils.get_date_only_one_value(self.date_time, resolution))
            if resolution == "month":
                offset=offset-1
                origin_by_resolution = "%s-01-01 00:00:00" % (origin_year)
            elif resolution == "day":
                offset=offset-1
                origin_by_resolution = "%s-%s-01 00:00:00" % (origin_year, origin_month)
            elif resolution == "hour":
                origin_by_resolution = "%s-%s-%s 00:00:00" % (origin_year, origin_month, origin_day)
            elif resolution == "minute":
                origin_by_resolution = "%s-%s-%s %s:00:00" % (origin_year, origin_month, origin_day, origin_hour)
            elif resolution == "second":
                c = 0
                MAX_SECS = 20
                while (c < MAX_SECS):
                    if float(doc["points"][offset]["min"]) == float(self.attributes_value):
                        break
                    offset = offset - 1
                    if offset < 0: offset = 59
                    c = c + 1
                if (origin_second < c): origin_minute = origin_minute - 1
                origin_by_resolution = "%s-%s-%s %s:%s:00" % (origin_year, origin_month, origin_day, origin_hour, origin_minute)
            else:
                assert False, " ERROR - resolution type \"%s\" is not allowed, review your tests in features..." % (resolution)

            assert str(doc["_id"]["origin"]) == origin_by_resolution, " ERROR -- in origin field by the %s resolution in %s attribute" % (resolution, str(doc["_id"]["attrName"]))
            assert float(doc["points"][offset]["min"]) == float(self.attributes_value), " ERROR -- in minimun value into offset %s in %s attribute" % (str(offset), str(doc["_id"]["attrName"]))
            assert float(doc["points"][offset]["max"]) == float(self.attributes_value), " ERROR -- in maximun value into offset %s in %s attribute" % (str(offset), str(doc["_id"]["attrName"]))
            assert float(doc["points"][offset]["sum"]) == float(self.attributes_value), " ERROR -- in sum value into offset %s in %s attribute" % (str(offset), str(doc["_id"]["attrName"]))
            assert float(doc["points"][offset]["sum2"]) == (float(self.attributes_value)*float(self.attributes_value)), " ERROR -- in sum2 value into offset %s in %s attribute" % (str(offset), str(doc["_id"]["attrName"]))

        world.mongo.disconnect()

    def verify_aggregates_is_not_in_mongo(self, resolution):
        """
        verify that aggregates is not stored in mongo:
        :param resolution: resolutions type (  month | day | hour | minute | second )
        """
        find_dict = {"_id.attrName" :  {'$regex':'%s.*' % (self.attributes_name)}, #the regular expression is because in  multi attribute the name is with postfix + <_value>. ex: temperature_0
                     "_id.entityId" : self.entity_id,
                     "_id.entityType" : self.entity_type,
                     "_id.resolution" : resolution }
        world.mongo.connect("%s_%s" % (STH_DATABASE_PREFIX, self.service))
        world.mongo.choice_collection("%s_%s.%s" % (STH_COLLECTION_PREFIX, self.service_path, AGGR))
        cursor = world.mongo.find_with_retry(find_dict)
        assert cursor.count() == 0, " ERROR - the aggregated has been stored in mongo."
        world.mongo.disconnect()

    def verify_log(self, label, text):
        """
        Verify in log file if a label with a text exists
        :param label: label to find
        :param text: text to find (begin since the end)
        """
        myfab = FabricSupport(host=self.sth_host, user=self.fabric_user, password=self.fabric_password, cert_file=self.fabric_cert_file, retry=self.fabric_error_retry, hide=True, sudo=self.fabric_sudo)
        log = Remote_Log (fabric=myfab)
        line = log.find_line(label, text)

        #verify if a line with a level and a text exists in the log
        assert line != None, "ERROR  - label %s and text %s is not found.    \n       - %s" % (label, text, line)
        # verify if the new line in log has been wrote after the notification was sent
        assert self.date_time < log.get_line_time_in_log(line), "ERROR - the lines has not  been logged"
