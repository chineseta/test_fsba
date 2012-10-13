describe('tool', function () {
  var tool = require('../tool');

  beforeEach(function () {
    spyOn(console, 'log'); // убираем вывод в консоль
  });

  function itBehavesLikeWriter(status, contentType, content, writer)
  {
    var response = jasmine.createSpyObj('response', ['writeHead', 'write', 'end']);

    writer(response);

    expect(response.writeHead).toHaveBeenCalledWith(status, {
      'Content-Type': contentType, 'Content-Length': Buffer.byteLength(content)
    });
    expect(response.write).toHaveBeenCalledWith(content);
    expect(response.end).toHaveBeenCalledWith();
  }

  it('has .write', function () {
    itBehavesLikeWriter(123, 'type', 'text текст', function (response) {
      tool.write(response, 123, 'type', 'text текст');
    });
  });

  it('has .write404', function () {
    itBehavesLikeWriter(404, 'text/html', '404 Not Found', tool.write404);
  });

  it('has .write500', function () {
    itBehavesLikeWriter(500, 'text/html', '500 Internal Server Error', tool.write500);
  });

  it('has .writeText', function () {
    itBehavesLikeWriter(200, 'text/plain', 'This is text!', function (response) {
      tool.writeText(response, 'This is text!');
    });
  });

  it('has .writeJSON', function () {
    itBehavesLikeWriter(200, 'text/json', '{name: "json"}', function (response) {
      tool.writeJSON(response, '{name: "json"}');
    });
  });

  it('has .hour', function () {
    expect(tool.hour()).toBe(60 * 60 * 1000);
  });

  it('has .trace', function () {
    spyOn(console, 'trace');

    tool.trace('Error message 1');
    tool.trace('Error message 2', {param1: 'value1'});

    expect(console.trace.callCount).toBe(2);
  });

  it('has .panic', function () {
    var response = {name: 'response'};
    var error = 'error message';
    var object = {name: 'object'};
    spyOn(tool, 'trace');
    spyOn(tool, 'write500');

    tool.panic(response, error);
    tool.panic(response, error, object);

    expect(tool.trace).toHaveBeenCalledWith(error, undefined);
    expect(tool.trace).toHaveBeenCalledWith(error, object);
    expect(tool.write500).toHaveBeenCalledWith(response);
    expect(tool.write500.callCount).toBe(2);
  });

});