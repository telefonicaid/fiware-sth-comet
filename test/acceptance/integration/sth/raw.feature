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

Feature: get raw values with differents requests from sth
  As a sth user
  I want to be able to get raw values with differents requests from sth
  so that they become more functional and useful


  @happy_path
  Scenario: get raw values using sth
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully

  @service
  Scenario Outline: get raw values using sth with several services
    Given service "<service>", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
    And delete database in mongo
  Examples:
    | service                    |
    | test_orga601000            |
    | test_ORGA601110            |
    | test_Org_614010            |
    | random service length = 50 |

  @service_path
  Scenario Outline: get raw values using sth with several services paths
    Given service "test_service_path", service path "<service_path>", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | service_path                    |
    | serv60100                       |
    | SERV60120                       |
    | Serv_6140                       |
    | 12345678900                     |
    | /12345678900                    |
    | /                               |
    | random service path length = 50 |

  @entity_type
  Scenario Outline: get raw values using sth with several entities types
    Given service "test_entity_type", service path "/test", entity type "<entity_type>", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | entity_type |
    | room        |
    | HOUSE       |
    | HOUSE34     |
    | HOUSE_34    |
    | HouSE_34    |
    | house_flat  |
    | house.flat  |
    | house@flat  |
    | house-flat  |
    | house<flat> |

  @entity_type_error
  Scenario Outline: try to get raw values using sth with several wrong entities types
    Given service "test_entity_type", service path "/test", entity type "<entity_type>", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Not Found" http code
  Examples:
    | entity_type |
    | house/flat  |
    | house#flat  |

  @entity_id
  Scenario Outline: get raw values using sth with several entities id
    Given service "test_entity_id", service path "/test", entity type "room", entity_id "<entity_id>", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | entity_id   |
    | room1       |
    | romm_2      |
    | ROOM        |
    | ROOM4       |
    | ROOM_56     |
    | romm.light  |
    | room-light  |
    | room@light  |
    | room<light> |

  @entity_id_error
  Scenario Outline: try to get raw values using sth with several wrong entities id
    Given service "test_entity_id", service path "/test", entity type "room", entity_id "<entity_id>", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Not Found" http code
  Examples:
    | entity_id  |
    | room/ligth |
    | room#light |

  @attribute_name
  Scenario Outline: get raw values using sth with several attributes names
    Given service "test_attribute_name", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "<attribute_name>" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | attribute_name   |
    | random           |
    | random number=60 |
    | temperature      |
    | tempo_45         |

  @attribute_name_error
  Scenario Outline: try to get raw values using sth with several wrong attributes names
    Given service "test_attribute_name", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "<attribute_name>" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Not Found" http code
  Examples:
    | attribute_name |
    | tempo/45       |

  @attribute_name_error
  Scenario Outline: try to get raw values using sth with several wrong attributes names
    Given service "test_attribute_name", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "<attribute_name>" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code
  Examples:
    | attribute_name |
    | tempo#45       |

  @attribute_value
  Scenario Outline: get raw values using sth with several attributes values
    Given service "test_attribute_value", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "<attribute_value>" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | attribute_value                     |
    | 34                                  |
    | 34.67                               |
    | 0.45                                |
    | 0                                   |
    | -45                                 |
    | -46.29                              |
    | 4.324234233129797897978997          |
    | 4234234234.324234233129797897978997 |
    | 1234567890122222                    |

  @limit_offset
  Scenario Outline: get raw values using sth with several limits, offset and notifications
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "<notifications>" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | <limit>             |
      | hOffset   | <offset>            |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | notifications | limit | offset |
    | 3             | 10    | 0      |
    | 5             | 2     | 0      |
    | 5             | 10    | 2      |
    | 7             | 3     | 3      |
    | 5             | 1     | 3      |

  @limit_offset_error
  Scenario Outline: try to get raw values using sth with several wrong limits or wrong offset
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "<notifications>" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | <limit>             |
      | hOffset   | <offset>            |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code
  Examples:
    | notifications | limit | offset |
    | 3             |       | 3      |
    | 3             | 1     |        |
    | 3             | 1     | sdsad  |
    | 3             | dfdsf | 1      |
    | 3             | 1     | sd&ad  |
    | 3             | df&sf | 1      |
    | 3             | 1     | sd/ad  |
    | 3             | df/sf | 1      |
    | 3             | 1     | sd?ad  |
    | 3             | df?sf | 1      |

  @limit_offset_missing
  Scenario: try to get raw values using sth with limit but without offset
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code

  @limit_offset_missing
  Scenario: try to get raw values using sth with offset but without limit
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hOffset   | 10                  |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code

  @lastN @BUG_55 @skip
  Scenario Outline: get raw values using sth with several lastN and notifications
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "<notifications>" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | lastN     | <lastN>             |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | notifications | lastN |
    | 3             | 10    |
    | 10            | 7     |
    | 10            | 2     |

  @lastN_error
  Scenario Outline: try to get raw values using sth with several wrong lastN
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "<notifications>" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | lastN     | <lastN>             |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code
  Examples:
    | notifications | lastN |
    | 3             |       |
    | 3             | dfdsf |
    | 3             | df&sf |
    | 3             | df/sf |
    | 3             | df?sf |

  @lastN_missing
  Scenario: try to get raw values using sth with several wrong lastN
    Given service "test_limit_offset", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "Bad Request" http code

  @date_both
  Scenario: get raw values using sth with both dates
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully

  @date_only_dateFrom
  Scenario: get raw values using sth with only dateFrom
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateFrom  | 2015-02-14T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully

  @date_only_dateTo @ISSUE_53 @skip
  Scenario: get raw values using sth with only dateTo
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value               |
      | hLimit    | 10                  |
      | hOffset   | 0                   |
      | dateTo    | 2015-12-31T00:00:00 |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully

  @date_without_dates
  Scenario: get raw values using sth without dates
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value |
      | hLimit    | 10    |
      | hOffset   | 0     |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully

  @date_with_values
  Scenario Outline: get raw values using sth with values in both dates
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value      |
      | hLimit    | 10         |
      | hOffset   | 0          |
      | dateFrom  | <dateFrom> |
      | dateTo    | <dateTo>   |
    Then I receive an "OK" http code
    And validate that the raw is returned successfully
  Examples:
    | dateFrom            | dateTo              |
    | 2015-12-31T00:00:00 | 2015-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31 00:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31 00:00:00 |

  @date_error
  Scenario Outline: try to get raw values using sth with error in dates
    Given service "test_happy_path", service path "/test", entity type "room", entity_id "room2", with attribute number "1", attribute name "random" and attribute type "celcius"
    And receives "3" notifications with consecutive values beginning with "51" and with step one
    When ask for raw with queries parameters
      | parameter | value      |
      | hLimit    | 10         |
      | hOffset   | 0          |
      | dateFrom  | <dateFrom> |
      | dateTo    | <dateTo>   |
    Then I receive an "Bad Request" http code
  Examples:
    | dateFrom            | dateTo              |
    |                     |                     |
    | 2010-12-31T00:00:00 |                     |
    |                     | 2015-12-31T00:00:00 |
    | 201012-31T00:00:00  | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 201412-31T00:00:00  |
    | 2010_12-31T00:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12_31T00:00:00 |
    | 201e-12-31T00:00:00 | 2010-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 201e-12-31T00:00:00 |
    | 2010-17-31T00:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-17-31T00:00:00 |
    | 2010-12-36T00:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-36T00:00:00 |
    | 2010-12-31T25:00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T25:00:00 |
    | 2010-12-31T00:64:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T00:64:00 |
    | 2010-12-31T00:00:66 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T00:00:66 |
    | 2010-12-31T00.00:00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T00.00:00 |
    | 2010-12-31T00:00.00 | 2014-12-31T00:00:00 |
    | 2010-12-31T00:00:00 | 2014-12-31T00:00.00 |

