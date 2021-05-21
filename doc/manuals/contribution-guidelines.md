# Contribution guidelines

This document describes the guidelines to contribute to Short Time Historic (STH) - Comet. If you are
planning to contribute to the code you should read this document and get familiar with its content.

## Ground rules & expectations

Before we get started, here are a few things we expect from you (and that you should expect from others):

* Be kind and thoughtful in your conversations around this project. We all come from different backgrounds and
  projects, which means we likely have different perspectives on "how open source is done." Try to listen to others
  rather than convince them that your way is correct.
* Please ensure that your contribution passes all tests. If there are test failures, you will need to address them
  before we can merge your contribution.
* When adding content, please consider if it is widely valuable. Please don't add references or links to things you or
  your employer have created as others will do so if they appreciate it.
* When reporting a vulnerability on the software, please, put in contact with STH Comet repo maintainers in order to discuss it 
  in a private way.

## Overview

Being an open source project, everyone can contribute, provided that you follow the next guidelines:

-   Before contributing any code, the author must make sure all the tests work (see below how to run the tests).
-   Developed code must adhere to the syntax guidelines enforced by the linters.
-   Code must be developed following the branching model and change log policies defined below.
-   For any new feature added, unit tests must be provided, taking as a reference the ones already created and included
    in the project.

To further guide you through your first contributions, we have created the label
[`mentored`](https://github.com/telefonicaid/fiware-sth-comet/labels/mentored) which are assigned to those bugs and
issues simple and interesting enough to be solved by people new to the project. Feel free to assign any of them to
yourself and do not hesitate to mention any of the main developers (this is,
[@gtorodelvalle](https://github.com/gtorodelvalle) or [@frbattid](https://github.com/frbattid)) in the issue's comments
to get help from them during its resolution. They will be glad to help you.

## How to contribute

In order to start contributing:

1.  Fork this repository clicking on the "Fork" button on the upper-right area of the page.
2.  Clone your just forked repository:
    ```bash
    git clone https://github.com/your-github-username/fiware-sth-comet.git
    ```
3.  Add the main fiware-sth-comet repository as a remote to your forked repository (use any name for your remote
    repository, it does not have to be fiware-sth-comet, although we will use it in the next steps):
    ```bash
    git remote add fiware-sth-comet https://github.com/telefonicaid/fiware-sth-comet.git
    ```

Before starting your contribution, remember to synchronize the `master` branch in your forked repository with the
`master` branch in the main fiware-sth-comet repository following the next steps:

1.  Change to your local `master` branch (in case you are not in it already):
    ```bash
    git checkout master
    ```
2.  Fetch the remote changes:
    ```bash
    git fetch fiware-sth-comet
    ```
3.  Merge them:
    ```bash
    git rebase fiware-sth-comet/master
    ```

Contributions following these guidelines will be added to the `master` branch, and released in the next version. The
release process is explained in the **Releasing** section below.

## Coding guidelines

ESLint

Uses the provided `.eslintrc.json` flag files. To check source code style, type

```bash
npm run lint
```

## Branching model

There is one special branch in the repository:

-   `master`: it contains the last stable development code. New features and bugfixes are always merged to `master`
    until a new release is created and published.

Apart from the previous branches, there is another set of branches called `release/X.Y.Z` where the latest version of
each release code can be found. To this regard, a release called `X.Y.Z` is created whenever a new version of the
project is released pointing to the latest status of the corresponding `release/X.Y.Z` release branch.

In order to start developing a new feature or refactoring, a new branch should be created in your local forked
repository following the next naming convention:

-   `bug/<description>`
-   `feature/<description>`
-   `hardening/<description>`
-   `task/<description>`

depending on the type of work.

Once the final code is available in the local forked repository branch, a Pull Request should be sent to the `master`
branch in the fiware-sth-comet remote repository when a review process will start before its final landing. Remember to
check both the linters and the tests before creating the Pull Request.

## Change log

The project contains a version change log file, called `CHANGES_NEXT_RELEASE`, that can be found in the root of the
project. Whenever a new feature or bug fix is going to be merged into `master`, a new entry should be added to this
change log file. The new entry should contain the reference number of the issue it is solving (if any).

When a new version is released, the change log is cleared and remains fixed in the last commit of that version. The
content of the change log is also moved to the release description in the GitHub release.

More on this in the **Releasing** section below.

## Testing

The test environment is preconfigured to run the [Mocha](https://mochajs.org/) Test Runner with support for the
[Should.js](https://shouldjs.github.io/) assertion Library .

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire).

To run tests, type:

```bash
npm test
```

## Continuous testing

Support for continuous testing by modifying a src file or a test. For continuous testing, type

```bash
npm run test:watch
```

If you want to continuously check also source code style, use instead:

```bash
npm run watch
```

## Code coverage

A very good practice is to measure the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type

```bash
npm run test:coverage
```

### Documentation guidelines

remark

To check consistency of the Markdown markup, type

```bash
npm run lint:md
```

textlint

Uses the provided `.textlintrc` flag file. To check for spelling and grammar errors, dead links and keyword consistency,
type

```bash
npm run lint:text
```

## Clean

Removes `node_modules` and `coverage` folders, and `package-lock.json` file so that a fresh copy of the project is
restored.

```bash
# Use git-bash on Windows
npm run clean
```

### Prettify Code

Runs the [prettier](https://prettier.io) code formatter to ensure consistent code style (whitespacing, parameter
placement and breakup of long lines etc.) within the codebase. Uses the `prettierrc.json` flag file. The codebase also
offers an `.editorconfig` to maintain consistent coding styles across multiple IDEs.

```bash
# Use git-bash on Windows
npm run prettier
```

To ensure consistent Markdown formatting run the following:

```bash
# Use git-bash on Windows
npm run prettier:text
```

## Releasing

The process of making a release consists of the following steps and should only be made by any of the owners or
administrators of the main repository:

1.  Synchronize the `master` branch in your local forked repository to the latest version of the `master` branch of the
    remote fiware-sth-comet repository as indicated in the **How to contribute** section above.
2.  From the updated `master` branch in your local forked repository, create a new task branch changing the development
    version number in the `package.json` file (currently it should include a `-next` suffix) to the new version to be
    released (`X.Y.Z`, for example, without any suffix).
3.  Create a pull request from this task branch to the `master` branch in the fiware-sth-comet remote repository and ask
    any of the additional project administrators to review it and to land it.
4.  In the fiware-sth-comet main repository, create a release branch named `release/X.Y.Z` from the latest version of
    the `master` branch using the corresponding version number.
5.  In the fiware-sth-comet main repository, create a new release setting the tag version to `X.Y.Z` from the new
    release branch `release/X.Y.Z` and publish it.
6.  Synchronize the `master` branch in your local forked repository to the latest version of the `master` branch of the
    remote fiware-sth-comet repository as indicated in the **How to contribute** section above.
7.  From the updated `master` branch in your local forked repository, create a new task branch and add the `-next`
    suffix to the current version number in the `package.json` file (to signal this as the development version) and
    remove the contents of the `CHANGES_NEXT_RELEASE` change log file.
8.  Create a pull request from this new task branch to the `master` branch in the remote fiware-sth-comet repository.

## Version/release numbers

The version numbers will change for each release according to the following rules:

-   All version numbers will always follow the common pattern: `X.Y.Z`
-   _X_ will change only when there are changes in the release breaking backwards compatibility or when there are very
    important changes in the feature set of the component. If _X_ changes, _Y_ should be set to 0.
-   _Y_ will change every time a new version is released. If only _Y_ changes, it means some new features or bug fixes
    have been released, but the component is just an improved version of the current major (_X_) release.
-   _Z_ will increment its value as new bugfixes are detected and fixed for each major (_X_) and minor (_Y_) release.

Between releases, the version number in the `master` branch will be `X.Y.Z-next` (where `X.Y.Z` is the latest stable
release), indicating that it is a development version.
