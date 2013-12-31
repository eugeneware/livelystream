var events = require('events'),
    Stream = require('stream'),
    inherits = require('util').inherits,
    equals = require('lodash.isequal'),
    diff = require('changeset'),
    noop = function () {};

module.exports = LivelyStream;

function LivelyStream(db) {
  Stream.Duplex.call(this, { objectMode: true });
  this.db = db;
  this.loaded = false;
}
inherits(LivelyStream, Stream.Duplex);

LivelyStream.prototype._read = noop;

LivelyStream.prototype._write = function (chunk, enc, cb) {
  var self = this;
  if ('listen' in chunk) {
    this.key = chunk.listen.key;
    this.initalValue = chunk.listen.initialValue;
    this.getInitialValue();
    this.watchForChanges();
    cb();
  } else if (this.loaded && 'change' in chunk) {
    this.db.get(this.key, applyChange);

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

LivelyStream.prototype.getInitialValue = function () {
  var self = this;
  this.loaded = false;
  this.db.get(self.key, function (err, data) {
    if (err) {
      if (err.notFound) data = self.initialValue;
      else return self.emit('error', err);
    }
    self.loaded = true;
    self.push({ value: data });
  });
};

LivelyStream.prototype.watchForChanges = function () {
  var self = this;
  this.db.on('change', function (key, change) {
    if (self.loaded && equals(key, self.key)) self.push({ change: change });
  });
};
