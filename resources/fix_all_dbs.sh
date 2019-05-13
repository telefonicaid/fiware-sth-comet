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

# This script is just an example. Ajust the sth_db_fixer.py as you need and remove the --dryrun safeguard
# Expiration 1209600 corresponds to 2 weeks (2 * 7 * 24 * 60 * 60 = 1209600)

for db in $(echo 'show dbs' | mongo --quiet | awk -F ' ' '{print $1}' | grep sth_)
do
  for col in $(echo "show collections" | mongo --quiet localhost:27017/$db | grep sth_ | grep -v '.aggr')
  do
    echo "* Running script in database $db collection $col"
    python sth_db_fixer.py --mongoUri 'mongodb://localhost' --db $db --col $col --dryrun --createIndex --setExpiration 1209600
  done
done

