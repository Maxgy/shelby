var net = require('net'),
    path = require('path'),
    assert = require('assert'),
    spawn = require('child_process').spawn,
    jsonStream = require('json-stream'),
    cb = require('assert-called');

var PORT = 5476;

var server = net.createServer(cb(function (socket) {
  var stream = socket.pipe(jsonStream()),
      chunks = [],
      service = { 'logs/stdout': 0, 'logs/stderr': 0 };

  stream.on('readable', cb(function () {
    var chunk = stream.read();

    if (chunk && chunk.service.indexOf('logs/') === 0) {
      service[chunk.service] += chunk.description.split('\n').filter(Boolean).length;
      assert(chunk.description.match(chunk.service === 'logs/stdout'
        ? /Hello, \x1b\[32mstdout\x1b\[39m!\n/
        : /Hello, \x1b\[31mstderr\x1b\[39m!\n/
      ));
    }
  }));

  socket.on('end', cb(function () {
    assert.equal(service['logs/stdout'], 1024);
    assert.equal(service['logs/stderr'], 1024);
    server.close();
  }));
}));

server.listen(PORT, function () {
  var child = spawn(
    path.join(__dirname, '..', 'forza'),
    [ '-h', '127.0.0.1', '-p', PORT.toString(), '--', 'node', path.join(__dirname, 'fixtures', 'output.js') ]
  );
});
