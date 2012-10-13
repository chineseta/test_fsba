describe('index file', function () {

  it('should start a server', function () {
    spyOn(require('redis'), 'createClient').andReturn({}); // не подключаемся к redis
    var server = require('../server');
    spyOn(server, 'start');

    require('../index');

    expect(server.start).toHaveBeenCalled();
  });

});