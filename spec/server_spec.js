describe('server', function () {
  var server;

  beforeEach(function () {
    spyOn(require('redis'), 'createClient').andReturn({}); // не подключаемся к redis
    spyOn(console, 'log'); // убираем вывод сообщения 'Server has started!'
    server = require('../server');
  });

  describe('.start', function () {
    it('should start a server', function () {
      var http = require('http');
      var config = require('../config');
      spyOn(http, 'createServer').andReturn({listen: jasmine.createSpy('listen') });

      server.start();

      expect(http.createServer).toHaveBeenCalledWith(server.onRequest);
      expect(config.serverPort).toEqual(jasmine.any(Number));
      expect(config.serverHost).toEqual(jasmine.any(String));
      expect(http.createServer().listen).toHaveBeenCalledWith(config.serverPort, config.serverHost);
    });
  });

  describe('.onRequest', function () {
    it('should call route', function () {
      spyOn(server, 'route');

      server.onRequest('request', 'response');

      expect(server.route).toHaveBeenCalledWith(server.routes, 'request', 'response');
    });
  });

  describe('.route', function () {
    var action, routes;
    var response = {name: 'response'};

    beforeEach(function () {
      action = jasmine.createSpy('action');
      routes = {'/path/to/action': action};
    });

    it('should call an appropriate action', function () {
      var request = {url: 'http://example.com/path/to/action?param2=value2&param1=value1'};

      server.route(routes, request, response);

      expect(action).toHaveBeenCalledWith({param1: 'value1', param2: 'value2'}, request, response);
    });

    it('should call tool.write404 for a wrong url', function () {
      var request = {url: 'http://example.com/path/to/nowhere'};
      var tool = require('../tool');
      spyOn(tool, 'write404');

      server.route(routes, request, response);

      expect(action).not.toHaveBeenCalled();
      expect(tool.write404).toHaveBeenCalledWith(response);
    });
  });

});