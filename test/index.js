var expect = require('expect.js'),
    MemLively = require('memlively'),
    LivelyStream = require('..'),
    through2 = require('through2'),
    diff = require('changeset'),
    noop = function () { };

describe('Lively Stream', function() {
  it('should be able to create a lively stream', function(done) {
    var memdb = new MemLively();
    memdb.put('eugene', { name: 'Eugene', number: 42 }, noop);

    var ls = new LivelyStream(memdb);
    var count = 0;
    var obj;
    ls
      .pipe(through2({ objectMode: true }, function (chunk, enc, cb) {
        if (count === 0) {
          // First message: initial value
          expect(chunk[0]).to.equal('value');
          obj = chunk[1];
          expect(obj).to.eql({ name: 'Eugene', number: 42 });

          // Change the database and see if change comes down
          memdb.put('eugene', { name: 'Eugene Ware' }, noop);
        } else if (count === 1) {
          // Subsequent messages are change: pick up database change
          expect(chunk[0]).to.equal('change');
          diff.apply(chunk[1], obj, true);
          expect(obj).to.eql({ name: 'Eugene Ware' });
          done();
        }
        count++;
        cb();
      }))
    .pipe(ls);

    // Send the inital request to listen to the 'eugene' key on the database
    ls.write(['listen', {
      key: 'eugene',
      initialValue: {}
    }]);
  });
});
