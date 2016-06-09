# Contribution guidelines

## Overview

Being an open source project, everyone can contribute, provided that you follow the next guidelines:
* Before contributing any code, the author must make sure all the tests work (see below how to run the tests).
* Developed code must adhere to the syntax guidelines enforced by the linters.
* Code must be developed following the branching model and changelog policies defined below.
* For any new feature added, unit tests must be provided, following the example of the ones already created.

## How to contribute

In order to start contributing:
1. Fork this repository clicking on the "Fork" button on the upper-right area of the page.
2. Clone your just forked repository:
    ```
    git clone https://github.com/your-github-username/fiware-sth-comet.git
    ```
3. Add the main fiware-sth-comet repository as a remote to your forked repository (use any name for your remote repository, it does not have to be fiware-sth-comet, although we will use it in the next steps):
    ```
    git remote add fiware-sth-comet https://github.com/telefonicaid/fiware-sth-comet.git
    ```

Before starting your contribution, remember to synchronize the `develop` branch in your forked repository with the `develop` branch in the main fiware-sth-comet repository following the next steps:
1. Change to your local `develop` branch (in case you are not in it already):
    ```
    git checkout develop
    ```
2. Fetch the remote changes:
    ```
    git fetch fiware-sth-comet
    ```
3. Merge them:
    ```
    git rebase fiware-sth-comet/develop
    ```

Contributions following these guidelines will be added to the `develop` branch, and released in the next version. The release process is explained in the **Releasing** section below.

## Coding guidelines

Coding guidelines are defined via the provided `.jshintrc` and `.gjslintrc` flag files. The latter requires Python and its use can be disabled while creating the project skeleton with grunt-init.
To check source code style, type:
```bash
grunt lint
```

Checkstyle reports can be used together with Jenkins to monitor project quality metrics by means of Checkstyle and Violations plugins. To generate Checkstyle and JSLint reports under `report/lint/`, type:
```bash
grunt lint-report
```

## Branching model

There are two special branches in the repository:
* `master`: holds the code for the last stable version of the project. It is only updated when a new version is released.
* `develop`: contains the last stable development code. New features and bug fixes are always merged to `develop`.

In order to start developing a new feature or refactoring, a new branch should be created with name `task/<taskName>` in the newly forked repository. This new branch must be created from the current version of the `develop` branch (remember to fetch the latest changes from the remote `develop` branch before creating this new branch). Once the new functionality has been completed, a pull request should be created from the new branch to the `develop` branch in the main remote repository. Remember to check both the linters and the tests before creating the pull request.

Fixing bugs follow the same branching guidelines as in the case of adding a new feature or refactoring code with the exception of the branch name. In the case of bug fixes, the new branch should be called `bug/<bugName>`.

There are another set of branches called `release/<versionNumber>`, one for each version of the product. These branches point to each one of the released versions of the project. They are permanent and they are created with each release.

## Changelog

The project contains a version changelog file, called `CHANGES_NEXT_RELEASE`, that can be found in the root of the project. Whenever a new feature or bug fix is going to be merged with `develop`, a new entry should be added to this changelog. The new entry should contain the reference number of the issue it is solving (if any).

When a new version is released, the changelog is cleared, and remains fixed in the last commit of that version. The content of the changelog is also moved to the release description in the Github release.

## Testing

The test environment is preconfigured to run the [Mocha](http://visionmedia.github.io/mocha/) Test Runner with support for the [Chai](http://chaijs.com/) assertion library as well as for [Sinon](http://sinonjs.org/) spies, stubs, etc., following a [BDD](http://chaijs.com/api/bdd/) testing style with `chai.expect` and `chai.should()` available globally while executing tests, as well as the [Sinon-Chai](http://chaijs.com/plugins/sinon-chai) plugin.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire).

To run tests, type:
```bash
grunt test
```

Tests reports can be used together with Jenkins to monitor project quality metrics by means of TAP or XUnit plugins. To generate TAP report in `report/test/unit_tests.tap`, type
```bash
grunt test-report
```
## Continuous testing

Support for continuous testing is provided so that tests are run when any source file or test is modified.

For continuous testing, type:
```bash
grunt watch
```

## Code coverage

A very good practice is to measure the code coverage of your tests.

To generate an HTML coverage report under the `site/coverage/` path and to print out a summary, type:
```bash
# Use git-bash on Windows
grunt coverage
```

To generate a Cobertura report in `report/coverage/cobertura-coverage.xml` that can be used together with Jenkins to monitor project quality metrics by means of Cobertura plugin, type
```bash
# Use git-bash on Windows
grunt coverage-report
```

## Code complexity

Another very good practice is to analise code complexity.

Support for using Plato and storing the generated report in the `site/report/` path is provided. This capability can be used together with Jenkins by means of DocLinks plugin.

To generate a code complexity report, type:
```bash
grunt complexity
```

## Source code documentation

HTML code documentation can be generated under the `site/doc/` path. It can be used together with Jenkins by means of DocLinks plugin.

For compiling source code documentation, type:
```bash
grunt doc
```

## Releasing

The process of making a release consists of the following steps and should be made by any of the owners or administrators of the main repository:
1. Create a new task branch changing the development version number in the `package.json` file (with a suffix `-next`) to the new target version (without any suffix), and create a pull request of this new task branch into `develop`. Remember to delete the temporary created task branch.
2. Create a release branch named `release/<versionNumber>` from the last version of `develop` using the corresponding version number.
3. Create a new release in Github setting the tag version as `<versionNumber>` from the new release branch `release/<versionNumber>` and publish it.
4. Create a pull request from the new release branch `release/<versionNumber>` to `master`.
5. Create a new task branch to prepare the `develop` branch for the next release, adding the `-next` suffix to the current version number in the `package.json` file (to signal this as the development version) and removing the contents of the `CHANGES_NEXT_RELEASE` changelog file. Create a pull request from this new task branch to `develop`. Remember to delete the temporary created task branch.

To further guide you through your first contributions, we have created the label [```mentored```](https://github.com/telefonicaid/fiware-sth-comet/labels/mentored) which are assigned to those bugs and issues simple and interesting enough to be solved by people new to the project. Feel free to assign any of them to yourself and do not hesitate to mention any of the main developers (this is, [@gtorodelvalle](https://github.com/gtorodelvalle) or [@frbattid](https://github.com/frbattid)) in the issue's comments to get help from them during its resolution. They will be glad to help you.
