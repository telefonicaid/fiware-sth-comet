#!/usr/bin/python
# -*- coding: latin-1 -*-
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

# NOTE: you need to have the following index in your sth collection or this
# script may fail:
#
# db.sth__.createIndex({entityId: 1, entityType: 1, attrName: 1})

__author__ = 'fermin'

from pymongo import MongoClient
from pymongo import DESCENDING

##############################################################
# BEGIN of the configuration part (don't touch above this line ;)

# Database and collection to use. Only the collection with the raw samples is
# allowed, the aggregates collection is not supported
DB = 'sth_service'
COL = 'sth__'

# The number of samples per entities to keep
N = 10

# If dryrun is True the script doesn't touch the database, only shows a report
DRYRUN = True


# END of the configuration part (don't touch below this line ;)
##############################################################


def get_info(entityId, entityType, attrName):
    """
    Get info related with the entity and attribute provided as argument

    :param entityId: the entity id
    :param entityType: the entity type
    :param attrName: the attribute name
    :return: a triple with total number of samples, recvTime of first sample and recvTime of the N-th sample
            (ordered by increasing recvTime)
    """

    cursor = client[DB][COL].find({'entityId': entityId, 'entityType': entityType, 'attrName': attrName}).sort('recvTime', DESCENDING)

    total = cursor.count()
    first = cursor[0]
    if total < N:
        last =  cursor[total - 1]
    else:
        last = cursor[N - 1]

    return (total, first['recvTime'], last['recvTime'])


def prune(entityId, entityType, attrName, last_time):
    """
    Remove all samples associated to a given entity and attribute except the N first one (ordered by recvTime)

    :param entityId: the entity id
    :param entityType: the entity type
    :param attrName: the attribute name
    :param last_time: the recvTime of the N-th sample (ordered by recvTime)
    :return: the number of deleted documents
    """

    # First pass, removes the most of the documents
    result = client[DB][COL].delete_many({'entityId': entityId, 'entityType': entityType, 'attrName': attrName, 'recvTime': {'$lt': last_time}})
    deleted = result.deleted_count

    # Some times there are "ties" and the $lt filter doesn't removes all the documents. Thus, we need to do a second pass to ensure only N remain
    for doc in client[DB][COL].find({'entityId': entityId, 'entityType': entityType, 'attrName': attrName}).sort('recvTime', DESCENDING).skip(N):
        client[DB][COL].remove(doc)
        deleted += 1

    return deleted


client = MongoClient('localhost', 27017)

pipeline = [
    {
        '$group' : {
            '_id' : { 'entityId': '$entityId', 'entityType': '$entityType', 'attrName': '$attrName'},
            'count': { '$sum': 1 }
        }
    },
    { '$sort' : { 'count': -1 } }
]

for doc in client[DB][COL].aggregate(pipeline):
    entityId = doc['_id']['entityId']
    entityType = doc['_id']['entityType']
    attrName =  doc['_id']['attrName']

    (total, first_time, last_time) = get_info(entityId, entityType, attrName)

    if DRYRUN:
        print '%s:%s - %s (%d): first=%s, last=%s' % (entityId, entityType, attrName, total, first_time, last_time)
    else:
        if total > N:
            deleted = prune(entityId, entityType, attrName, last_time)
            info = '%d docs removed' % deleted
        else:
            info = 'under limit'

        print '%s:%s - %s (%d): first=%s, last=%s - %s' % (entityId, entityType, attrName, total, first_time, last_time, info)
