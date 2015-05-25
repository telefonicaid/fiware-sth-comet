REPORTER = list
MOCHA_OPTIONS = --ui tdd

test:
	clear
	echo STARTING TESTS ********************
	./node_modules/mocha/bin/mocha --reporter $(REPORTER) $(MOCHA_OPTIONS) test/node/sth_app_test.js
	echo TESTS ENDED ***********************

test-database:
	clear
	echo STARTING DATABASE TESTS ********************
	./node_modules/mocha/bin/mocha --reporter $(REPORTER) $(MOCHA_OPTIONS) test/node/sth_database_test.js
	echo TESTS DATABASE ENDED ***********************

test-watch:
	clear
	echo STARTING TESTS ********************
	./node_modules/mocha/bin/mocha --reporter $(REPORTER) --growl --watch $(MOCHA_OPTIONS) test/*.js

.PHONY: test test-database test-watch
