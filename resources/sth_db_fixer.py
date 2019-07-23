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

# NOTE: the prune functionality (--prune) needs to have the following index in your sth collection or this
# script may fail (or use --createIndex to create it)
#
# db.sth__.createIndex({entityId: 1, entityType: 1, attrName: 1})

# FIXME: unify "Raw" and "Aggr" in just one family of functions, defining the target indexes in just one place
# and implement a general processing for them

# FIXME: functions relies too much in global variables. Not sure if it is a good idea or not (actually, they are pseudo-constant, as
# they are defined at startup and neer change, but unsure after all)

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

    print 'Usage: %s --mongoUri <uri> --db <database> --col <collection> --colType <type> --createIndex --prune <n> --setExpiration <seconds> --dryrun -u' % os.path.basename(__file__)
    print ''
    print 'Parameters:'
    print "  --mongoUri <uri> (optional): mongo URI to connecto to DB. Default is 'mongodb://localhost'"
    print "  --db <database>: database to use"
    print "  --col <collection>: collection to use"
    print "  --colType <type>: collection type (either 'raw' or 'aggr')"
    print "  --createIndex (optional): create index for optimal performance (the ones described in https://github.com/telefonicaid/fiware-sth-comet/blob/master/resources/README.md)"
    print "  --setExpiration <seconds> (optional): set expiration in raw and agg collections to <seconds> seconds"
    print "  --overrideExpiration (optional): override the value of the expiration index in the case there is already one with a different value of the one specified in --setExpiration"
    print "  --prune <n> (optional): prune collection so only the last <n> elements per attribute and entity are kept (only for raw collections)"
    print "  --dryrun (optional): if used script does a dry-run pass (i.e. without doing any modification in DB). It can be used to inspect indexes."
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


def getRelevantIndexesRaw():
    """
    Get relevant indexes in raw collection

    :return: a list of two elements (first the one for optimal queries, second the one for expiration). An element of the list can be None if the index is not found.
    """

    index0 = None
    index1 = None
    for index in client[DB][COL].list_indexes():
        keys = index['key'].keys()
        
        if (len(keys) == 4 and keys[0] == 'entityId' and keys[1] == 'entityType' and keys[2] == 'attrName' and keys[3] == 'recvTime' and
           index['key']['entityId'] == 1 and index['key']['entityType'] == 1 and index['key']['attrName'] == 1 and index['key']['recvTime'] == -1):
            index0 = index
       
        if len(keys) == 1 and keys[0] == 'recvTime' and index['key']['recvTime'] == 1:
            index1 = index
       
    return [index0, index1]


def getRelevantIndexesAggr():
    """
    Get relevant indexes in aggrs collection

    :return: a list of two elements (first the one for optimal queries, second the one for expiration). An element of the list can be None if the index is not found.
    """

    index0 = None
    index1 = None
    for index in client[DB][COL].list_indexes():
        keys = index['key'].keys()
        
        if (len(keys) == 5 and keys[0] == '_id.entityId' and keys[1] == '_id.entityType' and keys[2] == '_id.attrName' and keys[3] == '_id.resolution' and keys[4] == '_id.origin' and
           index['key']['_id.entityId'] == 1 and index['key']['_id.entityType'] == 1 and index['key']['_id.attrName'] == 1 and index['key']['_id.resolution'] == 1 and index['key']['_id.origin'] == 1):
            index0 = index
       
        if len(keys) == 1 and keys[0] == '_id.origin' and index['key']['_id.origin'] == 1:
            index1 = index
       
    return [index0, index1]


def createIndexRaw():
    """
    Create index in raw collection
    """

    index = [ ('entityId', ASCENDING), ('entityType', ASCENDING), ('attrName', ASCENDING), ('recvTime', DESCENDING) ]
    print '- Creating index in raw collection: %s. Please wait, this operation may take a while...' % str(index)
    client[DB][COL].create_index(index, background=True)


def createIndexAggr():
    """
    Create index in aggr collection
    """
    
    index = [ ('_id.entityId', ASCENDING), ('_id.entityType', ASCENDING), ('_id.attrName', ASCENDING), ('_id.resolution', ASCENDING), ('_id.origin', ASCENDING) ]
    print '- Creating index in aggr collection: %s. Please wait, this operation may take a while...' % str(index)
    client[DB][COL].create_index(index, background=True)


def setExpirationRaw(remove):
    """
    Set expiration index for raw collection"

    :param remove: if True remove previous index, if False don't remove
    """

    index = [ ('recvTime', ASCENDING) ]
    if remove:
        print '- Remove index in raw collection: %s' % str(index)
        client[DB][COL].drop_index(index)
    print '- Creating index in raw collection: %s with expireAfterSeconds %d. Please wait, this operation may take a while...' % (str(index), EXPIRATION)
    client[DB][COL].create_index(index, background=True, expireAfterSeconds=EXPIRATION)


def setExpirationAggr(remove):
    """
    Set expiration index for aggr collection
    
    :param remove: if True remove previous index, if False don't remove
    """

    index = [ ('_id.origin', ASCENDING) ]
    if remove:
        print '- Remove index in aggr collection: %s' % str(index)
        client[DB][COL].drop_index(index)
    print '- Creating index in aggr collection: %s with expireAfterSeconds %d. Please wait, this operation may take a while...' % (str(index), EXPIRATION)
    client[DB][COL].create_index(index, background=True, expireAfterSeconds=EXPIRATION)


# Get CLI arguments
try:
    opts, args = getopt(sys.argv[1:], 'u', ['mongoUri=', 'db=', 'col=', 'colType=', 'createIndex', 'prune=', 'setExpiration=', 'overrideExpiration', 'dryrun'])
except GetoptError:
    usage_and_exit('wrong parameter')

# Defaults (to be changed by user CLI parameters)
MONGO_URI= 'mongodb://localhost'
DB = ''
COL = ''
COL_TYPE = ''
N = 0
EXPIRATION = 0
OVERRIDE = False
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
    elif opt == '--colType':
        COL_TYPE = arg
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
    elif opt == '--overrideExpiration':
        OVERRIDE = True
    elif opt == '--dryrun':
        DRYRUN = True
    else:
        usage_and_exit()

if DB == '':
    usage_and_exit('--db must be provided')
if COL == '':
    usage_and_exit('--col must be provided')
if COL_TYPE == '':
    usage_and_exit("--colType must be provided (valid values: 'raw' and 'aggr')")
if not COL_TYPE in ['raw', 'aggr']:
    usage_and_exit("--colType %s is not valid (valid values: 'raw' and 'aggr')" % COL_TYPE)
if N > 0 and COL_TYPE == 'aggr':
    usage_and_exit('--prune cannot be used in aggregated collection in the current version of this script')

client = MongoClient(MONGO_URI)

if COL_TYPE == 'raw':
    pre_index = getRelevantIndexesRaw()
else:
    pre_index = getRelevantIndexesAggr()

index0_string = 'None'
if not pre_index[0] is None:
    index0_string = str(pre_index[0]['key'])

index1_string = 'None'
if not pre_index[1] is None:
    index1_string = str(pre_index[1]['key'])
    if 'expireAfterSeconds' in pre_index[1].keys():
        index1_string += ' - expireAfterSeconds: %d' % pre_index[1]['expireAfterSeconds']

print "- Pre-existing index in collection:"
print "  + Optimization: %s" % str(index0_string)
print "  + Expiration:   %s" % str(index1_string)

if not DRYRUN and INDEX_CREATE:
    if pre_index[0] is None:
        if COL_TYPE == 'raw':
            createIndexRaw()
        else:
            createIndexAggr()
    else:
        print '- Optimization index already exists, --createIndex is ignored'

if not DRYRUN and EXPIRATION > 0:
    if pre_index[1] is None:
        if COL_TYPE == 'raw':
            setExpirationRaw(False)
        else:
            setExpirationAggr(False)
    else:
        if OVERRIDE:
            if COL_TYPE == 'raw':
                setExpirationRaw(True)
            else:
                setExpirationAggr(True)
        else:
            print '- Expiration index already exists, --setExpiration is ignored. Use --overrideExpiration if you cant to override existing value'
 

# Early return
if N == 0:
    sys.exit(0)

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
        print '- %s:%s - %s (%d): first=%s, last=%s' % (entityId, entityType, attrName, total, first_time, last_time)
    else:
        if total > N:
            deleted = prune(entityId, entityType, attrName, last_time)
            info = '%d docs removed' % deleted
        else:
            info = 'under limit'

        print '- %s:%s - %s (%d): first=%s, last=%s - %s' % (entityId, entityType, attrName, total, first_time, last_time, info)
