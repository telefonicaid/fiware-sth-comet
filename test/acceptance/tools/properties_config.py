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
from tools.fabric_utils import FabricSupport

__author__ = 'Iván Arias León (ivan.ariasleon at telefonica dot com)'
import json
import os
import subprocess

from lettuce import world

from tools.sth import STH
from tools.mongo_utils import Mongo

# constants
EMPTY                 = u''
FILE                  = u'file'
FILE_NAME             = u'properties.json'
CONFIGURATION_FILE    = u'configuration.json'
SETTINGS_PATH         = u'path_to_settings_folder'
SUDO                  = u'sudo'
JENKINS               = u'jenkins'



class Properties:
    """
    copy properties.json file associated to a feature from settings folder to overwrite properties.json
    after storing dictionaries
    """

    def __init__(self, **kwargs):
        """
         constructor
        :param file: properties.json file associated to a feature
        :param sudo:  with superuser privileges (True | False)
        """
        self.file_name = kwargs.get(FILE, EMPTY)
        self.sudo      = kwargs.get(SUDO, "false")
        try:
            with open(CONFIGURATION_FILE) as config_file:
                configuration = json.load(config_file)
        except Exception, e:
            assert False, 'Error parsing configuration.json file: \n%s' % (e)

        sudo_run = ""
        if self.sudo.lower() == "true": sudo_run = SUDO
        if configuration[JENKINS].lower() == "false":
             with open("%s/%s" % (configuration[SETTINGS_PATH], self.file_name)) as config_file:
                 for line in config_file.readlines():
                     p = subprocess.Popen("%s %s"% (sudo_run, str(line)), shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                     STDOUT = p.stdout.readlines()
                     assert STDOUT == [], "ERROR - coping %s from setting folder. \n %s" % (self.file_name, STDOUT)

    def read_properties(self):
        """
        Parse the JSON configuration file located in the acceptance folder and
        store the resulting dictionary in the lettuce world global variable.
        Make sure the logs path exists and create it otherwise.
        """
        try:
            with open(FILE_NAME) as config_file:
                world.config = json.load(config_file)
                if not os.path.exists(world.config["environment"]["logs_path"]):
                    os.makedirs(world.config["environment"]["logs_path"])
        except Exception, e:
            assert False, 'Error parsing properties file (%s): \n%s' % (FILE_NAME, e)

    def storing_dictionaries(self):
        """
        store dictionaries used by cygnus
        """
        world.sth = STH(protocol=world.config['sth']['sth_protocol'],
                host=world.config['sth']['sth_host'],
                port=world.config['sth']['sth_port'],
                version=world.config['sth']['sth_version'],
                verify_version=world.config['sth']['sth_verify_version'],
                fabric_user=world.config['sth']['sth_fabric_user'],
                fabric_password=world.config['sth']['sth_fabric_password'],
                fabric_cert_file=world.config['sth']['sth_fabric_cert_file'],
                fabric_error_retry=world.config['sth']['sth_fabric_error_retry'],
                fabric_source_path=world.config['sth']['sth_fabric_source_path'],
                fabric_target_path=world.config['sth']['sth_fabric_target_path'],
                fabric_sudo=world.config['sth']['sth_fabric_sudo']
        )

        world.mongo = Mongo(host=world.config['mongo']['mongo_host'],
                            port=world.config['mongo']['mongo_port'],
                            user=world.config['mongo']['mongo_user'],
                            password=world.config['mongo']['mongo_user'],
                            version=world.config['mongo']['mongo_version'],
                            verify_version=world.config['mongo']['mongo_verify_version'],
                            database=world.config['mongo']['mongo_database'],
                            retries=world.config['mongo']['mongo_retries_search'],
                            retry_delay=world.config['mongo']['mongo_delay_to_retry']
        )


