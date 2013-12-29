var expect = require('expect.js'),
    MemLively = require('memlively'),
    LivelyStream = require('..'),
    through2 = require('through2'),
    diff = require('changeset'),
    noop = function () { };

describe('Lively Stream', function() {
  it('should be able to create a lively stream', function(done) {
    var memdb = new MemLively();
    var ls = new LivelyStream(memdb, 'eugene', {});
    var count = 0;
    var obj;
    ls
      .pipe(through2({ objectMode: true }, function (chunk, enc, cb) {
        if (count === 0) {
          // initial value
          obj = chunk.value;
          expect(obj).to.eql({ name: 'Eugene', number: 42 });
          memdb.put('eugene', { name: 'Eugene Ware' }, noop);
        } else if (count === 1) {
          // pick up database change
          diff.apply(chunk.change, obj, true);
          expect(obj).to.eql({ name: 'Eugene Ware' });
          this.push({ change: [{ type: 'put', key: [ 'name' ], value: 'Euge' }]});
        } else if (count === 2) {
          // pick up upstream change
          diff.apply(chunk.change, obj, true);
          expect(obj).to.eql({ name: 'Euge' });
          expect(memdb.db['eugene']).to.eql(obj);
          done();
        }
        count++;
        cb();
      }))
    .pipe(ls);

    memdb.put('eugene', { name: 'Eugene', number: 42 }, noop);
  });
});
