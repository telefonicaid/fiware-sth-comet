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


__author__ = 'Iván Arias León (ivan.ariasleon at telefonica dot com)'


import time

from lettuce import world, after, before
from termcolor import colored

import tools.general_utils
from tools.properties_config import Properties

def initial_conf(file_name, sudo_run, drop_all_databases):
    """
    define initial config simulate background in lettuce
    :param file_name:
    :param sudo_run:
    :param drop_all_databases:
    """
    print colored("  Background: in terrain...", 'white', 'on_grey', attrs=['bold'])
    print colored("    Given starting the configuration from terrain...", 'green', 'on_grey', attrs=['bold'])
    properties = Properties (file=file_name, sudo=sudo_run)
    print colored("    And updating properties.json from %s" % file_name, 'green', 'on_grey', attrs=['bold'])
    properties.read_properties()
    print colored("    And reading properties", 'green', 'on_grey', attrs=['bold'])
    properties.storing_dictionaries()
    print colored("    And creating instances to sth and mongo with properties", 'green', 'on_grey', attrs=['bold'])
    # The next line is commented because at the moment the rpm package does not exists. STH is executed manually
    #world.sth.sth_service("restart")
    #print colored("    And restarting sth service", 'green', 'on_grey', attrs=['bold'])
    world.sth.verify_sth_version()
    print colored("    And verifying sth version", 'green', 'on_grey', attrs=['bold'])
    world.sth.verify_mongo_version()
    print colored("    And verifying mongo version", 'green', 'on_grey', attrs=['bold'])
    if drop_all_databases:
        world.sth.drop_all_test_databases()
        print colored("    And drop all tests databases with prefix: sth_test", 'green', 'on_grey', attrs=['bold'])
    print colored("    Then completed the configuration from terrain...", 'green', 'on_grey', attrs=['bold'])


@before.all
def before_all_scenarios():
    """
    actions before all scenario
    :param scenario:
    """
    world.test_time_init = time.strftime("%c")


@before.each_feature
def setup_some_feature(feature):
    """
    actions before each feature
    :param feature:
    """
    config_properties_file   = u'epg_config.txt'
    config_local_sudo_run    = u'false'
    drop_all_tests_databases = False

    if feature.described_at.file.find("notifications.feature") >= 0 or \
       feature.described_at.file.find("aggregated.feature") >= 0 or\
       feature.described_at.file.find("raw.feature") >= 0:
        initial_conf(config_properties_file, config_local_sudo_run, drop_all_tests_databases)


@before.each_scenario
def before_each_scenario(scenario):
    """
    actions before each scenario
    :param scenario:
    """
    pass


@after.each_scenario
def after_each_scenario(scenario):
    """
    actions after each scenario
    :param scenario:
    """
    world.sth.drop_database_in_mongo(world.mongo)
    print colored("    And database is dropped. See terrain.py not steps", 'cyan', 'on_grey', attrs=['bold'])


@after.all
def after_all_scenarios(scenario):
    """
    Actions after all scenarios
    Show the initial and final time of the tests completed
    Delete all cygnus instances files and cygnus services is stopped
    :param scenario:
    """
    # The next line is commented because at the moment the rpm package does not exists. STH is executed manually
    #world.sth.sth_service("stop")
    tools.general_utils.show_times(world.test_time_init)

