/*
 * Copyright 2016 Telefónica Investigación y Desarrollo, S.A.U
 *
 * This file is part of the Short Time Historic (STH) component
 *
 * STH is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * STH is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with STH.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with: [german.torodelvalle@telefonica.com]
 */

'use strict';

var ROOT_PATH = require('app-root-path');
var sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
var sthDatabaseNameMapper = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameMapper');
var expect = require('expect.js');

describe('sthDatabaseNameMapper tests', function() {
    describe('mapping tests', function() {
        var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
        var ORIGINAL_NAME_MAPPING = sthConfig.NAME_MAPPING;

        before(function() {
            sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
        });

        it("should map the 'testservice' service as 'mappedtestservice'", function() {
            expect(sthDatabaseNameMapper.mapService('testservice')).to.equal('mappedtestservice');
        });

        it("should map the 'testservicepath' service path as '/mappedtestservicepath'", function() {
            expect(sthDatabaseNameMapper.mapServicePath('testservice', '/testservicepath')).to.equal(
                '/mappedtestservicepath'
            );
        });

        it("should map the 'entityId' entity id or name as 'mappedEntityId'", function() {
            expect(sthDatabaseNameMapper.mapEntityName('testservice', '/testservicepath', 'entityId')).to.equal(
                'mappedEntityId'
            );
        });

        it("should map the 'entityType' entity type as 'mappedEntityType'", function() {
            expect(sthDatabaseNameMapper.mapEntityType('testservice', '/testservicepath', 'entityType')).to.equal(
                'mappedEntityType'
            );
        });

        it("should map the 'attrName' attribute name as 'mappedAttrName'", function() {
            expect(
                sthDatabaseNameMapper.mapAttributeName('testservice', '/testservicepath', 'entityId', 'attrName')
            ).to.equal('mappedAttrName');
        });

        it("should map the 'attrType' attribute type as 'mappedAttrType'", function() {
            expect(
                sthDatabaseNameMapper.mapAttributeType('testservice', '/testservicepath', 'entityId', 'attrType')
            ).to.equal('mappedAttrType');
        });

        it(
            "should map the '" +
                sthConfig.DB_PREFIX +
                "testservice' database as '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice'",
            function() {
                expect(sthDatabaseNameMapper.mapDatabaseName(sthConfig.DB_PREFIX + 'testservice')).to.equal(
                    sthConfig.DB_PREFIX + 'mappedtestservice'
                );
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath' collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per service path data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath.aggr' collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per service path data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath.aggr');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId' collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId.aggr' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId.aggr');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedEntityType');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType.aggr' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedEntityType.aggr');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_attrName' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedAttrName'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_attrName'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedAttrName');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_attrName.aggr' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedAttrName.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_attrName.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedAttrName.aggr');
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType_attrName' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType_attrName'
                    )
                ).to.equal(
                    sthConfig.COLLECTION_PREFIX +
                        '/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName'
                );
            }
        );

        it(
            "should map the '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType_attrName.aggr' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "testservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.mapCollectionName(
                        'testservice',
                        sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType_attrName.aggr'
                    )
                ).to.equal(
                    sthConfig.COLLECTION_PREFIX +
                        '/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName.aggr'
                );
            }
        );

        after(function() {
            sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });
    });

    describe('unmapping tests', function() {
        var ORIGINAL_DATA_MODEL = sthConfig.DATA_MODEL;
        var ORIGINAL_NAME_MAPPING = sthConfig.NAME_MAPPING;

        before(function() {
            sthConfig.NAME_MAPPING = require(ROOT_PATH + '/test/unit/nameMappings/name-mapping.json');
        });

        it("should unmap the 'mappedtestservice' service as 'testservice'", function() {
            expect(sthDatabaseNameMapper.unmapService('mappedtestservice')).to.equal('testservice');
        });

        it("should unmap the 'testservicepath' service path as '/mappedtestservicepath'", function() {
            expect(sthDatabaseNameMapper.unmapServicePath('mappedtestservice', '/mappedtestservicepath')).to.equal(
                '/testservicepath'
            );
        });

        it("should unmap the 'mappedEntityId' entity id or name as '/entityId'", function() {
            expect(
                sthDatabaseNameMapper.unmapEntityName('mappedtestservice', '/mappedtestservicepath', 'mappedEntityId')
            ).to.equal('entityId');
        });

        it("should unmap the 'mappedEntityType' entity type as '/entityType'", function() {
            expect(
                sthDatabaseNameMapper.unmapEntityType('mappedtestservice', '/mappedtestservicepath', 'mappedEntityType')
            ).to.equal('entityType');
        });

        it("should unmap the 'mappedAttrName' attribute name as '/attrName'", function() {
            expect(
                sthDatabaseNameMapper.unmapAttributeName(
                    'mappedtestservice',
                    '/mappedtestservicepath',
                    'mappedEntityId',
                    'mappedAttrName'
                )
            ).to.equal('attrName');
        });

        it("should unmap the 'mappedAttrType' attribute type as '/attrType'", function() {
            expect(
                sthDatabaseNameMapper.unmapAttributeType(
                    'mappedtestservice',
                    '/mappedtestservicepath',
                    'mappedEntityId',
                    'mappedAttrType'
                )
            ).to.equal('attrType');
        });

        it(
            "should unmap the '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' database as '" +
                sthConfig.DB_PREFIX +
                "testservice'",
            function() {
                expect(sthDatabaseNameMapper.unmapDatabaseName(sthConfig.DB_PREFIX + 'mappedtestservice')).to.equal(
                    sthConfig.DB_PREFIX + 'testservice'
                );
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath' collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per service path data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath.aggr' collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per service path data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_SERVICE_PATH;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath.aggr');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_entityId' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_mappedEntityId'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId.aggr' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per " +
                "entity data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId.aggr');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedEntityType'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType.aggr' collection " +
                "of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per entity data model as " +
                "'" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ENTITY;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedEntityType.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType.aggr');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedentityId_mappedattrName' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_attrName'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedAttrName'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_attrName');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedentityId_mappedattrName.aggr' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_attrName.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX + '/mappedtestservicepath_mappedEntityId_mappedAttrName.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_attrName.aggr');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType_attrName'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX +
                            '/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType_attrName');
            }
        );

        it(
            "should unmap the '" +
                sthConfig.COLLECTION_PREFIX +
                "/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName.aggr' " +
                "collection of database '" +
                sthConfig.DB_PREFIX +
                "mappedtestservice' with the collection per attribute " +
                "data model as '" +
                sthConfig.COLLECTION_PREFIX +
                "/testservicepath_entityId_entityType_attrName.aggr'",
            function() {
                sthConfig.DATA_MODEL = sthConfig.DATA_MODELS.COLLECTION_PER_ATTRIBUTE;
                expect(
                    sthDatabaseNameMapper.unmapCollectionName(
                        'mappedtestservice',
                        sthConfig.COLLECTION_PREFIX +
                            '/mappedtestservicepath_mappedEntityId_mappedEntityType_mappedAttrName.aggr'
                    )
                ).to.equal(sthConfig.COLLECTION_PREFIX + '/testservicepath_entityId_entityType_attrName.aggr');
            }
        );

        after(function() {
            sthConfig.DATA_MODEL = ORIGINAL_DATA_MODEL;
            sthConfig.NAME_MAPPING = ORIGINAL_NAME_MAPPING;
        });
    });
});
