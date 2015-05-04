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

#
#  Note: the "skip" tag is to skip the scenarios that still are not developed or failed
#        -tg=-skip
#

Feature: Store in mongo new notifications from context broker in raw and aggregated format
  As a sth user
  I want to be able to Store in mongo new notifications from context broker in raw and aggregated format
  so that they become more functional and useful

  @happy_path
  Scenario: stored new notifications in mongo from context broker with metadata
    And service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo

  @resolutions
  Scenario Outline: stored new notifications in mongo from context broker with metadata with several resolutions
    And service "test_resolutions", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "<resolution>" in mongo
  Examples:
    | resolution |
    | month      |
    | day        |
    | hour       |
    | minute     |
    | second     |

  @service
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several services
    And service "<service>", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
    And delete database in mongo
  Examples:
    | service                    |
    | orga60100                  |
    | ORGA60111                  |
    | Org_61401                  |
    | random service length = 50 |

  @service_path
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several service_paths
    And service "test_service_path", service path "<service_path>", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | service_path                    |
    | serv6010                        |
    | SERV6012                        |
    | Serv_614                        |
    | 1234567890                      |
    | /1234567890                     |
    | /                               |
    | random service path length = 50 |

  @entity_type
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several entities types
    And service "test_entity_type", service path "/my_service_path", entity type "<entity_type>", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | entity_type |
    | room        |
    | HOUSE       |
    | HOUSE34     |
    | HOUSE_34    |
    | HouSE_34    |
    | house_flat  |
    | house.flat  |
    | house/flat  |
    | house-flat  |
    | house-flat  |
    | house<flat> |
    | house#flat  |

  @entity_id
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several entities id
    And service "test_entity_id", service path "/my_service_path", entity type "house", entity_id "<entity_id>", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | entity_id   |
    | room1       |
    | romm_2      |
    | ROOM        |
    | ROOM4       |
    | ROOM_56     |
    | romm.light  |
    | room/ligth  |
    | room-light  |
    | room-light  |
    | room<light> |
    | room#light  |

  @attributes_number
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several attributes
    And service "test_attributes_number", service path "/my_service_path", entity type "house", entity_id "room2", with attribute number "<attributes_number>", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | attributes_number |
    | 1                 |
    | 5                 |
    | 10                |
    | 50                |
    | 100               |

  @attributes_name
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several attributes name
    And service "test_attributes_name", service path "/my_service_path", entity type "house", entity_id "room2", with attribute number "1", attribute name "<attributes_name>" and attribute type "celcius"
    When receives a notification with attributes value "random number=2", metadata value "True" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | attributes_name  |
    | random           |
    | random number=60 |
    | temperature      |
    | tempo_45         |
    | tempo/45         |

  @attributes_values
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several attributes values and metadatas
    And service "test_attributes_values", service path "/my_service_path", entity type "house", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "<attributes_value>", metadata value "<metadata>" and content "json"
    Then validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is generate by resolution "month" in mongo
  Examples:
    | attributes_value                    | metadata |
    | 34                                  | True     |
    | 34.67                               | False    |
    | 0.45                                | True     |
    | 4.324234233129797897978997          | False    |
    | 4234234234.324234233129797897978997 | False    |
    | random number=10                    | True     |

  @error_values @BUG_46 @skip
  Scenario Outline:  stored new notifications in mongo from context broker with metadata with several attributes values and metadatas
    And service "test_error_values", service path "/my_service_path", entity type "house", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    When receives a notification with attributes value "<attributes_value>", metadata value "False" and content "json"
    Then check in log, label "lvl=FATAL" and text "msg=Attribute value not aggregatable, alarm_status=ALARM"
    And validate that the attribute value and type are stored in mongo
    And validate that the aggregated value is not generate by resolution "month" in mongo
  Examples:
    | attributes_value                                                                             |
    | fsdfsdf                                                                                      |
    | 40.418889, -3.691944                                                                         |
    | {"circle": {"centerLatitude": "40.418889","centerLongitude": "-3.691944","radius": "15000"}} |



