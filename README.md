# livelystream

Stream changes to and from a lively database as a node.js stream.

[![build status](https://secure.travis-ci.org/eugeneware/livelystream.png)](http://travis-ci.org/eugeneware/livelystream)

## Installation

This module is installed via npm:

``` bash
$ npm install livelystream
```

## Example Usage

LivelyStream when used in conjunction with
[ObserveStream](https://github.com/eugeneware/observestream) will replicate
data from the database pointed to LivelyStream with the local javascript
object pointed to by ObserveStream:

``` js
// a database to replicate to/from
var memdb = new MemLively();

// bind the database to the lively stream
var ls = new LivelyStream(memdb);

// scope will contain the local javascript versions of the data in the database
var scope = {};

// Watch for any changes on scope.target and replicate to the 'eugene' key in
// the remote database
var os = new ObserveStream('eugene', scope, 'target', {});

// Connect the database to the observestream to do two-way replication
ls.pipe(os).pipe(ls);

// Making any changes to the database, should eventually replicate
// the changes to scope.target
memdb.put('eugene', { name: 'Eugene', number: 42 }, function () {});

// Making any changes to the local scope.target will replicate to he database
scope.target.name = 'Susan';
```

## API

### LivelyStream(db)

Constructs a new LivelyStream instance bound to a Lively database.

* ```db``` - the Lively database to synchronize to. (eg.
  [MemLively](https://github.com/eugeneware/memlively)

### Outbound 'data' Events emitted by LivelyStream

The LivelyStream emits 'data' events with the following format:

#### Initial ```value``` events

The very first event that the LivelyStream fires will be the ```value``` event.
This will contain the inital value of the ```key``` in the database, or if the
key is not found in the database, then the ```initialValue``` will be returned.

For example, if the initial value in the database is ```my value``` then the
first event emitted would be:

``` js
['value', 'my value']
```

#### ```change``` events

Any time there is a change in the database, a ```change``` event is emitted.
The change is in [changeset](https://github.com/eugeneware/changeset) object
diff format. For example:

``` js
['change', [
    { type: 'put', key: ['name'], value: 'Eugene' },
    { type: 'put', key: ['number'], value: 42 },
    { type: 'del', key: ['old'] } ] ]
```

### Inbound events consumed by LivelyStream to change database values

#### ```listen``` event

The very first event that should be received to synchronization should be a
```listen``` event, which contains a ```key``` and an ```initialValue```.

A sample message is:

``` js
['listen', { key: 'my key', initialValue: {} }]
```

* ```key``` - The key to bind to the remote database for watching.
* ```initialValue``` - If there is nothing in the database at the ```key```
  then use this as the initial value.

#### ```change``` events

When piped from a stream such as
[ObserveStream](https://github.com/eugeneware/observestream), the inbound
stream can write events that can modify the underlying database values pointed
to by the ```key```.

The format of these events is the same as the ```change``` event listed above.

Eg:

``` js
['change', [
    { type: 'put', key: ['name'], value: 'Eugene' },
    { type: 'put', key: ['number'], value: 42 },
    { type: 'del', key: ['old'] } ] ]
```
