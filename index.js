var events = require('events'),
    Stream = require('stream'),
    inherits = require('util').inherits,
    equals = require('lodash.isequal'),
    diff = require('changeset'),
    noop = function () {};

module.exports = LivelyStream;

function LivelyStream(db, key, initialValue) {
  Stream.Duplex.call(this, { objectMode: true });
  this.db = db;
  this.key = key;
  this.initialValue = initialValue;

  var self = this;
  var loaded = false;
  this.db.get(key, function (err, data) {
    if (err) {
      if (err.notFound) data = self.initialValue;
      else return self.emit('error', err);
    }
    loaded = true;
    self.push({ value: data });
  });
  self.db.on('change', function (key, change) {
    if (loaded && equals(key, self.key)) self.push({ change: change });
  });
}
inherits(LivelyStream, Stream.Duplex);

LivelyStream.prototype._read = noop;

LivelyStream.prototype._write = function (chunk, enc, cb) {
  var self = this;
  if ('change' in chunk) {
    self.db.get(self.key, applyChange);

    // update local database
    function applyChange(err, data) {
      if (err) {
        if (err.notFound) data = self.initalValue;
        else return cb(err);
      }
      diff.apply(chunk.change, data, true);
      self.db.put(self.key, data, notify);
    }

    function notify() {
      // replicate to all listeners
      self.push(chunk);
      cb();
    }
  } else {
    cb();
  }
};
