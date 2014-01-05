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
  this.locked = false;
  this.lastChange = JSON.stringify([]);
}
inherits(LivelyStream, Stream.Duplex);

LivelyStream.prototype._read = noop;

LivelyStream.prototype._write = function (chunk, enc, cb) {
  var self = this;
  if (Array.isArray(chunk) && chunk.length >= 2) {
    var msg = chunk[0];
    var data = chunk[1];
    switch (msg) {
      case 'listen':
        return this.handleListen(data, cb);

      case 'change':
        return this.handleChange(data, cb);
    }
  } else {
    cb();
  }
};

LivelyStream.prototype.handleListen = function (data, cb) {
  this.key = data.key;
  this.initalValue = data.initialValue;
  this.getInitialValue();
  this.watchForChanges();
  cb();
};

LivelyStream.prototype.handleChange = function (change, cb) {
  if (!this.loaded) return cb();

  var self = this;
  doUpdate();

  function doUpdate() {
    if (self.locked) return setImmediate(doUpdate);
    self.locked = true;

    self.db.get(self.key, applyChange);

    // update local changebase
    function applyChange(err, data) {
      if (err) {
        if (err.notFound) change = self.initalValue;
        else {
          self.locked = false;
          return cb(err);
        }
      }
      data = diff.apply(change, data, true);
      self.lastChange = JSON.stringify(change);
      self.db.put(self.key, data, finish);
    }

    function finish() {
      self.locked = false;
      cb();
    }
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
    self.push(['value', data]);
  });
};

LivelyStream.prototype.watchForChanges = function () {
  var self = this;
  this.db.on('change', function (key, change) {
    if (JSON.stringify(change) === self.lastChange) return;
    if (self.loaded && equals(key, self.key)) self.push(['change', change]);
  });
};

