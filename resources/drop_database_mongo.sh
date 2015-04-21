#!/usr/bin/
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
#    http://www.gnu.org/licenses/.
#
# For those usages not covered by the GNU Affero General Public License please contact:
#    iot_support at tid.es
#
# author: 'Iván Arias León (ivan.ariasleon at telefonica dot com)'
#

if [  "$1" == ""  ]
  then
    echo "ERROR - No prefix supplied (Mandatory)"
    echo "usage:"
    echo "    ./drop_database_mongo.sh <prefix> "
    echo "    example: ./drop_database_mongo.sh mydb_ "
    exit
fi

prefix=$1

dbs=(`(echo 'show databases' | mongo) | grep $prefix`)
for db in ${dbs[@]};
    do
      if [[ $db =~ .*$prefix.* ]]
         then
           (echo 'db.dropDatabase()' | mongo $db)
      fi
done


