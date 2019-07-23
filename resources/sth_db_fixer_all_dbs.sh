#!/bin/bash

# Copyright 2019 Telefonica Investigacion y Desarrollo, S.A.U
#
# This file is part of Short Time Historic (STH) component
#
# STH is free software: you can redistribute it and/or
# modify it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# STH is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with STH.
# If not, see http://www.gnu.org/licenses/.
#
# For those usages not covered by this license please contact with
# iot_support at tid dot es

# Usage: ./sth_db_fixer_all_dbs.sh <mongo_uri> <replica_set>
#
# - <mongo_uri>, is the base mongo URI (only hosts/ports part), e.g: "mongodb://10.0.0.19:27017,10.0.0.20:27017,10.0.0.21:27017".
#   **without ending slash**. If omitted then "mongodb://localhost" is used
# - <replica_set>, is the replica_set to use. If ommited no replica set is used

# This script is just an example. Ajust the sth_db_fixer.py CLI as you need and remove the --dryrun safeguard
# Expiration 1209600 corresponds to 2 weeks (2 * 7 * 24 * 60 * 60 = 1209600)

if [ -n "$1" ]
then
  BASE_MONGO_URI=$1
else
  BASE_MONGO_URI='mongodb://localhost'
fi

if [ -n "$2" ]
then
  RPL_SET_OPTION="?replicaSet=$2"
else
  RPL_SET_OPTION=""
fi

MONGO_URI=$BASE_MONGO_URI/$RPL_SET_OPTION

for db in $(echo 'show dbs' | mongo --quiet $MONGO_URI | awk -F ' ' '{print $1}' | grep sth_)
do
  MONGO_URI_DB=$BASE_MONGO_URI/$db$RPL_SET_OPTION

  # For raw collections
  for col in $(echo "show collections" | mongo --quiet $MONGO_URI_DB | grep sth_ | grep -v '.aggr')
  do
    echo "* Running script in database $db collection $col"
    python sth_db_fixer.py --mongoUri $MONGO_URI --db $db --col $col --colType raw --dryrun --createIndex --setExpiration 1209600
    echo
  done

  # For aggr collections
  for col in $(echo "show collections" | mongo --quiet $MONGO_URI_DB | grep sth_ | grep '.aggr')
  do
    echo "* Running script in database $db collection $col"
    python sth_db_fixer.py --mongoUri $MONGO_URI --db $db --col $col --colType aggr --dryrun --createIndex --setExpiration 1209600
    echo
  done
done

