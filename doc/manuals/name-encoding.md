# Database and collection name encoding and decoding

MongoDB imposes a set of restrictions regarding the characters which cannot be used as part of the databases and
collection names, as well as other limitations. These restrictions are detailed at the
[MongoDB Limits and Thresholds](https://docs.mongodb.com/manual/reference/limits/) section in the MongoDB documentation.

Since the names of the databases and the collections used by the STH component are composed from the concatenation of
the values assigned to the service, service path, entity id, entity type and attribute name (depending on the chosen
data model) and we do not want the potential users of the STH component to inherit the restrictions imposed by MongoDB
(as the database used by the STH component), a codification mechanism is used before conforming the name of the
databases and collections.

The codification mechanism is detailed next:

1.  For **database names**:
    1.  Encode the forbidden characters (i.e., ` /``\``.``(blank space)``"``$``(null character) `) using an escaping
        character (`x`) and the numerical Unicode code for each character. For instance, the `$` character will be
        encoded as `x0024`.
    2.  User defined strings already using the above encoding must be escaped prepending another `x`, for instance: the
        text `x002a` will be encoded as `xx002a`.
    3.  To avoid the case sensitivity restrictions imposed by MongoDB to the database names, uppercase characters (since
        they are supposed to be less common than lowercase ones) are also be encoded (i.e., `Service` -> `x0053ervice`).
    4.  The separator used to concatenate the name elements is the character group `xffff`. If this group of characters
        appears in an encoded database or collection name it univocally corresponds to the separator character since in
        case of appearing in any of the elements it would be encoded as `xxffff`.
2.  For **collection names**:
    1.  Encode the forbidden characters (i.e., ` $``(null character)``(empty string) `) using an escaping character
        (`x`) and the numerical Unicode code for each character. For instance, the `$` character will be encoded as
        `x0024`.
    2.  Encode the text `system.` at the beginning of the collection names as `xsystem.`.
    3.  User defined strings already using the above encoding must be escaped prepending another `x`, for instance: the
        text `x002a` will be encoded as `xx002a`.
    4.  Tools such as `mongodump`/`restore` and `mongoexport`/`import` do not support the `/` character in collections
        (see `https://jira.mongodb.org/browse/TOOLS-1163`) and consequently it is also encoded as `x002f`.
    5.  The separator used to concatenate the name elements is the character group `xffff`. If this group of characters
        appears in an encoded database or collection name it univocally corresponds to the separator character since in
        case of appearing in any of the elements it would be encoded as `xxffff`.

To ease the migration process from databases and collections of previous versions of the STH component not using the
previous codification mechanism, we provide a command-line tool called `sthDatabaseNameCodecTool`.

To run the name encoding/decoding tool, please execute the following command:

```bash
./bin/sthDatabaseNameCodecTool
```

which will present the command help information:

```text
Usage: sthDatabaseNameCodecTool [options]

  Options:

    -h, --help                         output usage information
    -V, --version                      output the version number
    -e, --encode                       Shows a report regarding the result of the codification process if applied to databases and collections of a specific STH instance (either the -e or -d options are mandatory)
    -d, --decode                       Shows a report regarding the result of the decodification process if applied to databases and collections of a specific STH instance (either the -e or -d options are mandatory)
    -f, --force                        Forces the codification (-e) or decodification (-d) process and consequently the databases  will be renamed
    -b, --database <databaseName>      Limits the codification or decodification process to certain database
    -c, --collection <collectionName>  Limits the codification or decodification process to certain collection
```

You can use the `sthDatabaseNameCodecTool` command-line tool to analyse your STH component databases and to get reports
about the name encoding or decoding results which the encoding or decoding process would make on your databases and
collections.

Once you are fine with the analysis report and you are sure it is what you really want to do, set the `-f, --force`
option to apply the name codification or decodification process.

The `sthDatabaseNameCodecTool` command-line tool makes also possible to filter the analysis report and the application
of the codification or decodification by database names and by collection names.
