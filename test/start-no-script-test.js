var net = require('net'),
    path = require('path'),
    assert = require('assert'),
    spawn = require('child_process').spawn,
    jsonStream = require('json-stream'),
    cb = require('assert-called');

var PORT = 5438,
    gotMessage = false;

var server = net.createServer(cb(function (socket) {
  var stream = socket.pipe(jsonStream());

  stream.on('readable', cb(function () {
    var chunk = stream.read(),
        clientPort;

    if (chunk && chunk.service === 'health/process/start') {
      assert.equal(chunk.metric, 0);
      assert(chunk.description.match(/Error: Cannot find module/));
      assert.equal(chunk.meta.app.name, 'test-app');
      assert.equal(chunk.meta.app.user, 'maciej');
      gotMessage = true;
    }
  }));

  socket.on('end', function () {
    server.close();
  });
}));

server.listen(PORT, cb(function () {
  var child = spawn(
    path.join(__dirname, '..', 'forza'),
    [
      '-h', '127.0.0.1', '-p', PORT.toString(), '--app-name', 'test-app', '--app-user', 'maciej',
      '--', 'node', path.join(__dirname, 'fixtures', 'no-such-script.js')
    ]
  );
}));

process.on('exit', function () {
  assert(gotMessage);
});
