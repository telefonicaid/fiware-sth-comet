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

/* eslint-disable consistent-return */

const ROOT_PATH = require('app-root-path');
const sthConfig = require(ROOT_PATH + '/lib/configuration/sthConfiguration');
const sthDatabaseNameCodec = require(ROOT_PATH + '/lib/database/model/sthDatabaseNameCodec');
const expect = require('expect.js');

describe('sthDatabaseNameCodec tests', function() {
    describe('database name codification tests', function() {
        it('should encode the / character as x002f', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('/')).to.equal('x002f');
        });

        it('should encode the \\ character as x005c', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('\\')).to.equal('x005c');
        });

        it('should encode the . character as x002e', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('.')).to.equal('x002e');
        });

        it('should encode the whitespace character as x0020', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName(' ')).to.equal('x0020');
        });

        it('should encode the " character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('"')).to.equal('x0022');
        });

        it('should encode the $ character as x0024', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('$')).to.equal('x0024');
        });

        it('should encode the null character as x0000', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('\0')).to.equal('x0000');
        });

        it(
            'should encode the separator character ' + sthConfig.NAME_SEPARATOR + ' as x' + sthConfig.NAME_SEPARATOR,
            function() {
                expect(sthDatabaseNameCodec.encodeDatabaseName('x12ab')).to.equal('xx12ab');
            }
        );

        it('should encode x12ab as xx12ab as xx12ab', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('x12ab')).to.equal('xx12ab');
        });

        it('should encode x12AB as x12x0041x0042', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('x12AB')).to.equal('x12x0041x0042');
        });

        it('should encode uppercase letters', function() {
            for (let ii = 65; ii <= 90; ii++) {
                expect(sthDatabaseNameCodec.encodeDatabaseName(String.fromCharCode(ii))).to.equal(
                    'x00' + ii.toString(16)
                );
            }
        });

        it('should not encode lowercase letters', function() {
            for (let ii = 97; ii <= 122; ii++) {
                expect(sthDatabaseNameCodec.encodeDatabaseName(String.fromCharCode(ii))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not encode the _ character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('_')).to.equal('_');
        });

        it('should not encode the ¿ character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('¿')).to.equal('¿');
        });

        it('should not encode the ? character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('?')).to.equal('?');
        });

        it('should not encode the ¡ character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('¡')).to.equal('¡');
        });

        it('should not encode the ! character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('!')).to.equal('!');
        });

        it('should not encode the | character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('|')).to.equal('|');
        });

        it('should not encode the , character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName(',')).to.equal(',');
        });

        it('should not encode the # character', function() {
            expect(sthDatabaseNameCodec.encodeDatabaseName('#')).to.equal('#');
        });

        it(
            'should encode Service.Madrid#North\\Alcobendas City as ' +
                'x0053ervicex002ex004dadrid#x004eorthx005cx0041lcobendasx0020x0043ity',
            function() {
                expect(sthDatabaseNameCodec.encodeDatabaseName('Service.Madrid#North\\$Alcobendas City')).to.equal(
                    'x0053ervicex002ex004dadrid#x004eorthx005cx0024x0041lcobendasx0020x0043ity'
                );
            }
        );
    });

    describe('database name decodification tests', function() {
        it('should decode the x002f as the / character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x002f')).to.equal('/');
        });

        it('should decode x005c as the \\ character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x005c')).to.equal('\\');
        });

        it('should decode x002e as the . character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x002e')).to.equal('.');
        });

        it('should decode x0020 as the whitespace character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x0020')).to.equal(' ');
        });

        it('should decode x0022 as the " character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x0022')).to.equal('"');
        });

        it('should decode x0024 as the $ character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x0024')).to.equal('$');
        });

        it('should decode x0000 as the null character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x0000')).to.equal('\0');
        });

        it('should not decode the separator character ' + sthConfig.NAME_SEPARATOR, function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName(sthConfig.NAME_SEPARATOR)).to.equal(
                sthConfig.NAME_SEPARATOR
            );
        });

        it('should decode xx12ab as x12ab', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('xx12ab')).to.equal('x12ab');
        });

        it('should decode x12x0041x0042 as x12AB', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('x12x0041x0042')).to.equal('x12AB');
        });

        it('should decode uppercase letters', function() {
            for (let ii = 65; ii <= 90; ii++) {
                expect(sthDatabaseNameCodec.decodeDatabaseName('x00' + ii.toString(16))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not decode lowercase letters', function() {
            for (let ii = 97; ii <= 122; ii++) {
                expect(sthDatabaseNameCodec.decodeDatabaseName('x00' + ii.toString(16))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not decode the _ character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('_')).to.equal('_');
        });

        it('should not decode the ¿ character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('¿')).to.equal('¿');
        });

        it('should not decode the ? character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('?')).to.equal('?');
        });

        it('should not decode the ¡ character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('¡')).to.equal('¡');
        });

        it('should not decode the ! character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('!')).to.equal('!');
        });

        it('should not decode the | character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('|')).to.equal('|');
        });

        it('should not decode the , character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName(',')).to.equal(',');
        });

        it('should not decode the # character', function() {
            expect(sthDatabaseNameCodec.decodeDatabaseName('#')).to.equal('#');
        });

        it(
            'should decode x0053ervicex002ex004dadrid#x004eorthx005cx0024x0041lcobendasx0020x0043ity as ' +
                'Service.Madrid#North\\$Alcobendas City',
            function() {
                expect(
                    sthDatabaseNameCodec.decodeDatabaseName(
                        'x0053ervicex002ex004dadrid#x004eorthx005cx0041lcobendasx0020x0043ity'
                    )
                ).to.equal('Service.Madrid#North\\Alcobendas City');
            }
        );
    });

    describe('collection name codification tests', function() {
        it('should encode the $ character as x0024', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('$')).to.equal('x0024');
        });

        it('should encode the null character as x0000', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('\0')).to.equal('x0000');
        });

        it('should encode the / character as x002f', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('/')).to.equal('x002f');
        });

        it('should encode system. at the beggining as xsystem.', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('system.')).to.equal('xsystem.');
        });

        it('should encode xsystem. at the beggining as xxsystem.', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('xsystem.')).to.equal('xxsystem.');
        });

        it('should not encode the.system.collection', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('the.system.collection')).to.equal(
                'the.system.collection'
            );
        });

        it(
            'should encode the separator character ' + sthConfig.NAME_SEPARATOR + ' as x' + sthConfig.NAME_SEPARATOR,
            function() {
                expect(sthDatabaseNameCodec.encodeCollectionName('x12ab')).to.equal('xx12ab');
            }
        );

        it('should encode x12ab as xx12ab', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('x12ab')).to.equal('xx12ab');
        });

        it('should not encode x12AB', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('x12AB')).to.equal('x12AB');
        });

        it('should not encode uppercase letters', function() {
            for (let ii = 65; ii <= 90; ii++) {
                expect(sthDatabaseNameCodec.encodeCollectionName(String.fromCharCode(ii))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not encode lowercase letters', function() {
            for (let ii = 97; ii <= 122; ii++) {
                expect(sthDatabaseNameCodec.encodeCollectionName(String.fromCharCode(ii))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not encode the _ character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('_')).to.equal('_');
        });

        it('should not encode the ¿ character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('¿')).to.equal('¿');
        });

        it('should not encode the ? character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('?')).to.equal('?');
        });

        it('should not encode the ¡ character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('¡')).to.equal('¡');
        });

        it('should not encode the ! character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('!')).to.equal('!');
        });

        it('should not encode the | character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('|')).to.equal('|');
        });

        it('should not encode the , character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName(',')).to.equal(',');
        });

        it('should not encode the # character', function() {
            expect(sthDatabaseNameCodec.encodeCollectionName('#')).to.equal('#');
        });

        it(
            'should encode /ServicePath.Madrid#North\\$Alcobendas City as ' +
                'x002fServicePath.Madrid#North\\x0024Alcobendas City',
            function() {
                expect(
                    sthDatabaseNameCodec.encodeCollectionName('/ServicePath.Madrid#North\\$Alcobendas City')
                ).to.equal('x002fServicePath.Madrid#North\\x0024Alcobendas City');
            }
        );
    });

    describe('collection name decodification tests', function() {
        it('should decode x0024 as the $ character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('x0024')).to.equal('$');
        });

        it('should decode x0000 as the null character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('x0000')).to.equal('\0');
        });

        it('should decode x002f as the / character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('x002f')).to.equal('/');
        });

        it('should decode xsystem. at the beggining as system.', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('xsystem.')).to.equal('system.');
        });

        it('should decode xxsystem. at the beggining as xsystem.', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('xxsystem.')).to.equal('xsystem.');
        });

        it('should not decode the.system.collection', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('the.system.collection')).to.equal(
                'the.system.collection'
            );
        });

        it('should not decode the separator character ' + sthConfig.NAME_SEPARATOR, function() {
            expect(sthDatabaseNameCodec.decodeCollectionName(sthConfig.NAME_SEPARATOR)).to.equal(
                sthConfig.NAME_SEPARATOR
            );
        });

        it('should decode xx12ab as x12ab', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('xx12ab')).to.equal('x12ab');
        });

        it('should not decode x12AB', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('x12AB')).to.equal('x12AB');
        });

        it('should not decode uppercase letters', function() {
            for (let ii = 65; ii <= 90; ii++) {
                expect(sthDatabaseNameCodec.decodeCollectionName(String.fromCharCode(ii))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not decode lowercase letters', function() {
            for (let ii = 97; ii <= 122; ii++) {
                expect(sthDatabaseNameCodec.decodeCollectionName(String.fromCharCode(ii))).to.equal(
                    String.fromCharCode(ii)
                );
            }
        });

        it('should not decode the _ character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('_')).to.equal('_');
        });

        it('should not decode the ¿ character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('¿')).to.equal('¿');
        });

        it('should not decode the ? character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('?')).to.equal('?');
        });

        it('should not decode the ¡ character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('¡')).to.equal('¡');
        });

        it('should not decode the ! character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('!')).to.equal('!');
        });

        it('should not decode the | character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('|')).to.equal('|');
        });

        it('should not decode the , character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName(',')).to.equal(',');
        });

        it('should not decode the # character', function() {
            expect(sthDatabaseNameCodec.decodeCollectionName('#')).to.equal('#');
        });

        it(
            'should decode x002fServicePath.Madrid#North\\x0024Alcobendas City as ' +
                '/ServicePath.Madrid#North\\$Alcobendas City',
            function() {
                expect(
                    sthDatabaseNameCodec.decodeCollectionName('x002fServicePath.Madrid#North\\x0024Alcobendas City')
                ).to.equal('/ServicePath.Madrid#North\\$Alcobendas City');
            }
        );
    });
});
