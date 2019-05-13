#!/usr/bin/env python
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
#
# This can be done using --createIndex

__author__ = 'fermin'

import json
import sys
import os
from getopt import getopt, GetoptError
from pymongo import MongoClient, ASCENDING, DESCENDING

def usage():
    """
    Print usage message
    """

    print 'Usage: %s --mongoUri <uri> --db <database> --col <collection> --createIndex --prune <n> --setExpiration <seconds> --dryrun -u' % os.path.basename(__file__)
    print ''
    print 'Parameters:'
    print "  --mongoUri <uri> (optional): mongo URI to connecto to DB. Default is 'http://localhost'"
    print "  --db <database>: database to use"
    print "  --col <collection>: name of the raw collection to use (it is assumed that agg collection is the same plus '.aggr' suffix)"
    print "  --createIndex (optional): create index on {entityId: 1, entityType: 1, attrName: 1} for optimal performance in raw collection"
    print "  --prune <n> (optional): prune collection so only the last <n> elements per attribute and entity are kept"
    print "  --setExpiration <seconds> (optional): set expiration in raw and agg collections to <seconds> seconds"
    print "  --dryrun (optional): if used script does a dry-run pass (i.e. without doing any modification in DB"
    print "  -u, print this usage mesage"


def usage_and_exit(msg):
    """
    Print usage message and exit"

    :param msg: optional error message to print
    """

    if msg != '':
        print "ERROR: " + msg
        print

    usage()
    sys.exit(1)


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


# Get CLI arguments
try:
    opts, args = getopt(sys.argv[1:], 'u', ['mongoUri=', 'db=', 'col=', 'createIndex', 'prune=', 'setExpiration=', 'dryrun'])
except GetoptError:
    usage_and_exit('wrong parameter')

# Defaults (to be changed by user CLI parameters)
MONGO_URI= 'mongodb://localhost'
DB = ''
COL = ''
N = 0
EXPIRATION = 0
INDEX_CREATE = False
DRYRUN = False

for opt, arg in opts:
    if opt == '-u':
        usage()
        sys.exit(0)
    elif opt == '--mongoUri':
        MONGO_URI == arg
    elif opt == '--db':
        DB = arg
    elif opt == '--col':
        COL = arg
    elif opt == '--prune':
        try:
            N = int(arg)
            if not N > 0:
                usage_and_exit('--prune value must be an integer greater than 0')
        except ValueError:
            usage_and_exit('--prune value must be an integer greater than 0')
    elif opt == '--setExpiration':
        try:
            EXPIRATION = int(arg)
            if not EXPIRATION > 0:
                usage_and_exit('--setExpiration value must be an integer greater than 0')
        except ValueError:
            usage_and_exit('--setExpiration value must be an integer greater than 0')
    elif opt == '--createIndex':
        INDEX_CREATE = True
    elif opt == '--dryrun':
        DRYRUN = True
    else:
        usage_and_exit()

if DB == '':
    usage_and_exit('--db must be provided')
if COL == '':
    usage_and_exit('--col must be provided')

client = MongoClient(MONGO_URI)

pipeline = [
    {
        '$group' : {
            '_id' : { 'entityId': '$entityId', 'entityType': '$entityType', 'attrName': '$attrName'},
            'count': { '$sum': 1 }
        }
    },
    { '$sort' : { 'count': -1 } }
]

if not DRYRUN and INDEX_CREATE:
    indexForRaw = [ ('entityId', ASCENDING), ('entityType', ASCENDING), ('attrName', ASCENDING), ('recvTime', DESCENDING) ]
    indexForAgg = [ ('_id.entityId', ASCENDING), ('_id.entityType', ASCENDING), ('_id.attrName', ASCENDING), ('_id.resolution', ASCENDING), ('_id.origin', ASCENDING) ]
    print 'Creating index in raw collection: %s. Please wait, this operation may take a while...' % str(indexForRaw)
    client[DB][COL].create_index(indexForRaw, background=True)
    print 'Creating index in raw collection: %s. Please wait, this operation may take a while...' % str(indexForAgg)
    client[DB][COL + '.aggr'].create_index(indexForAgg, background=True)

if not DRYRUN and EXPIRATION > 0:
    indexForRaw = [ ('recvTime', ASCENDING) ]
    indexForAgg = [ ('_id.origin', ASCENDING) ]
    print 'Creating index in raw collection: %s with expireAfterSeconds %d. Please wait, this operation may take a while...' % (str(indexForRaw), EXPIRATION)
    client[DB][COL].create_index(indexForRaw, background=True, expireAfterSeconds=EXPIRATION)
    print 'Creating index in agg collection: %s with expireAfterSeconds %d. Please wait, this operation may take a while...' % (str(indexForAgg), EXPIRATION)
    client[DB][COL + '.aggr'].create_index(indexForAgg, background=True, expireAfterSeconds=EXPIRATION)

# Early return
if N == 0:
    sys.exit(0)

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
