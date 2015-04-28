/**
 * Created by gtv on 21/04/15.
 */
function assertEntriesPerCollection(entriesPerCollection) {
  if (!entriesPerCollection || isNaN(entriesPerCollection)) {
    return print('Usage: assert(entriesPerCollection);')
  } else {
    // Get the available databases
    var databases = db.getMongo().getDBs().databases;
    var caseCounter = 0;
    var errorCounter = 0;
    for (var i = 0; i < databases.length; i++) {
      if (databases[i].name.indexOf('sth_') === 0) {
        print('* Checking database ' + databases[i].name + '...');
        var database = db.getSisterDB(databases[i].name);
        var collections = database.getCollectionNames();
        for (var j = 0; j < collections.length; j++) {
          if (collections[j].indexOf('sth_') === 0 && collections[j].indexOf('aggr') === -1) {
            caseCounter++;
            print('** Checking collection ' + collections[j] + '...');
            var count = database[collections[j]].count();
            var percentage = (count / entriesPerCollection) * 100;
            print('*** Expected ' + entriesPerCollection + ' and found ' + count + '... ' + percentage + '% ' +
              ((percentage === 100) ? 'PERFECT' : 'ERROR'));
            if (percentage !== 100) {
              errorCounter++;
            }
          }
        }
      }
    }
    print();
    print('SUMARY:');
    print('  - Passed: ' + caseCounter);
    print('  - Errors: ' + errorCounter);
  }
}
