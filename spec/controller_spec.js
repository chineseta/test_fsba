describe('controller', function () {
  var controller;
  var kvService;

  beforeEach(function () {
    spyOn(require('redis'), 'createClient').andReturn({}); // не подключаемся к redis серверу
    controller = require('../controller');
    kvService = require('../key_value_service');
  });

  describe('.getNumberOf', function () {
    it('should return a number of requests for a valid kvService key', function () {
      var requestsWithoutAirline = controller.getNumberOf({}).requests;
      var requestsWithAirline = controller.getNumberOf({airline: 'AA'}).requests;

      var keyWithoutAirline = kvService.getNewKey(requestsWithoutAirline);
      var keyWithAirline = kvService.getNewKey(requestsWithAirline);

      expect(kvService.isKeyValid(keyWithoutAirline)).toBe(true);
      expect(kvService.isKeyValid(keyWithAirline)).toBe(true);
      expect(requestsWithoutAirline).not.toEqual(requestsWithAirline);
      expect(keyWithoutAirline).not.toEqual(keyWithAirline);
    });
  });

});