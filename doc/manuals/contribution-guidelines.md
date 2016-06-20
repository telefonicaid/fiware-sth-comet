# Contribution guidelines

## Overview

Being an open source project, everyone can contribute, provided that you follow the next guidelines:
* Before contributing any code, the author must make sure all the tests work (see below how to run the tests).
* Developed code must adhere to the syntax guidelines enforced by the linters.
* Code must be developed following the branching model and changelog policies defined below.
* For any new feature added, unit tests must be provided, taking as a reference the ones already created and included in the project.

To further guide you through your first contributions, we have created the label [```mentored```](https://github.com/telefonicaid/fiware-sth-comet/labels/mentored) which are assigned to those bugs and issues simple and interesting enough to be solved by people new to the project. Feel free to assign any of them to yourself and do not hesitate to mention any of the main developers (this is, [@gtorodelvalle](https://github.com/gtorodelvalle) or [@frbattid](https://github.com/frbattid)) in the issue's comments to get help from them during its resolution. They will be glad to help you.

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

* `master`: it holds the code for the last stable version of the project. It is only updated when a new version is released.
* `develop`: it contains the last stable development code. New features and bug fixes are always merged to `develop` until a new release is created and moved to `master`.

Apart from the previous branches, there is another set of branches called `release/X.Y.Z` where the latest version of each release code can be found. To this regard, a release called `X.Y.Z` is created whenever a new version of the project is released pointing to the latest status of the corresponding `release/X.Y.Z` release branch.

In order to start developing a new feature or refactoring, a new branch should be created in your local forked repository following the next naming convention:

* `bug/<description>`
* `feature/<description>`
* `hardening/<description>`
* `task/<description>`

depending on the type of work.

Once the final code is available in the local forked repository branch, a Pull Request should be sent to the `develop` branch in the fiware-sth-comet remote repository when a review process will start before its final landing. Remember to check both the linters and the tests before creating the Pull Request.

## Changelog

The project contains a version changelog file, called `CHANGES_NEXT_RELEASE`, that can be found in the root of the project. Whenever a new feature or bug fix is going to be merged into `develop`, a new entry should be added to this changelog file. The new entry should contain the reference number of the issue it is solving (if any).

When a new version is released, the changelog is cleared and remains fixed in the last commit of that version. The content of the changelog is also moved to the release description in the Github release.

More on this in the **Releasing** section below.

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

Another very good practice is to analyze code complexity.

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

The process of making a release consists of the following steps and should only be made by any of the owners or administrators of the main repository:

1. Synchronize the `develop` branch in your local forked repository to the latest version of the `develop` branch of the remote fiware-sth-comet repository as indicated in the **How to contribute** section above.
2. From the updated `develop` branch in your local forked repository, create a new task branch changing the development version number in the `package.json` file (currently it should include a `-next` suffix) to the new version to be released (`X.Y.Z`, for example, without any suffix).
3. Create a pull request from this task branch to the `develop` branch in the fiware-sth-comet remote repository and ask any of the additional project administrators to review it and to land it.
4. In the fiware-sth-comet main repository, create a release branch named `release/X.Y.Z` from the latest version of the `develop` branch using the corresponding version number.
5. In the fiware-sth-comet main repository, create a new release setting the tag version to `X.Y.Z` from the new release branch `release/X.Y.Z` and publish it.
6. In the fiware-sth-comet main repository, create a pull request from the new release branch `release/X.Y.Z` to the `master` branch (in this precise moment the `master`, `develop` and `release/X.Y.Z` branches are all synchronized).
7. Synchronize the `develop` branch in your local forked repository to the latest version of the `develop` branch of the remote fiware-sth-comet repository as indicated in the **How to contribute** section above.
8. From the updated `develop` branch in your local forked repository, create a new task branch and add the `-next` suffix to the current version number in the `package.json` file (to signal this as the development version) and remove the contents of the `CHANGES_NEXT_RELEASE` changelog file.
9. Create a pull request from this new task branch to the `develop` branch in the remote fiware-sth-comet repository.

## Version/release numbers

The version numbers will change for each release according to the following rules:

* All version numbers will always follow the common pattern: `X.Y.Z`
* *X* will change only when there are changes in the release breaking backwards compatibility or when there are
very important changes in the feature set of the component. If *X* changes, *Y* should be set to 0.
* *Y* will change every time a new version is released. If only *Y* changes, it means some new features or bug fixes have been released, but the component is just an improved version of the current major (*X*) release.
* *Z* will increment its value as new bug fixes are detected and fixed for each major (*X*) and minor (*Y*) release.

Between releases, the version number in the `develop` branch will be `X.Y.Z-next` (where `X.Y.Z` is the latest stable release), indicating that it is a development version.
