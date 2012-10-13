describe('key value service', function () {
  var tool = require('../tool');
  var kvService;
  var redis;

  var response = {name: 'response'};
  var key = 'some key';
  var list = [1, 2, 3, 4, 5];
  var size = 5;

  beforeEach(function () {
    spyOn(require('redis'), 'createClient').andReturn({}); // не подключаемся к redis серверу
    kvService = require('../key_value_service');

    redis = kvService.redis;
    redis.llen = jasmine.createSpy('llen');
    redis.rpush = jasmine.createSpy('rpush');
    redis.expire = jasmine.createSpy('expire');
    redis.lrange = jasmine.createSpy('lrange');
    redis.del = jasmine.createSpy('del');

    spyOn(tool, 'panic');
  });

  it('has .randomKey', function () {
    expect(kvService.randomKey()).not.toEqual(kvService.randomKey());
    expect(kvService.randomKey().length).toBe(36); // длина uuid
  });

  it('has .getNewKey', function () {
    spyOn(kvService, 'randomKey').andCallThrough();

    expect(kvService.getNewKey(5)).not.toEqual(kvService.getNewKey(5));
    expect(kvService.randomKey.callCount).toBe(2);
    expect(kvService.getNewKey(6)).toMatch(/^fs:6:/);
    expect(kvService.getNewKey(7).length).toBe(5 + 36);
  });

  it('has .isKeyValid', function () {
    var validKey = kvService.getNewKey(3);
    var invalidKey = 'not a key';

    expect(kvService.isKeyValid(validKey)).toBe(true);
    expect(kvService.isKeyValid(invalidKey)).toBe(false);
    expect(kvService.isKeyValid(validKey + '-abc123')).toBe(false);
  });

  it('has .getMaxSize', function () {
    var key = kvService.getNewKey(5);

    expect(kvService.getMaxSize(key)).toBe(5);
  });

  describe('.push', function () {
    it('should append a value to list and set an expire time', function () {
      var config = require('../config');

      kvService.push('key 1', 'value 1');

      expect(redis.rpush).toHaveBeenCalledWith('key 1', 'value 1');
      expect(config.redisExpire).toEqual(jasmine.any(Number));
      expect(redis.expire).toHaveBeenCalledWith('key 1', config.redisExpire);
    });
  });

  describe('.getSize', function () {
    var callback;

    beforeEach(function () {
      callback = jasmine.createSpy('success callback');
    })

    it('should get size', function () {
      kvService.getSize(response, key, callback);

      expect(redis.llen).toHaveBeenCalledWith(key, jasmine.any(Function));
    });

    it('should call callback(size) when no redis error', function () {
      redis.llen.andCallFake(function (key, handler) {
        handler(null, size);
      });

      kvService.getSize(response, key, callback);

      expect(callback).toHaveBeenCalledWith(size);
    });

    it('should panic when redis error', function () {
      redis.llen.andCallFake(function (key, handler) {
        handler('Some redis error', size);
      });

      kvService.getSize(response, key, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(tool.panic).toHaveBeenCalledWith(response, 'Some redis error');
    });
  });

  describe('.pull', function () {
    var callback;

    beforeEach(function () {
      callback = jasmine.createSpy('success callback');
    })

    it('should get a list and erase it', function () {
      kvService.pull(response, key, callback);

      expect(redis.lrange).toHaveBeenCalledWith(key, 0, -1, jasmine.any(Function));
      expect(redis.del).toHaveBeenCalledWith(key);
    });

    it('should call a callback when no redis error', function () {
      redis.lrange.andCallFake(function (key, index1, index2, handler) {
        handler(null, list);
      });

      kvService.pull(response, key, callback);

      expect(callback).toHaveBeenCalledWith(list);
    });

    it('should panic when redis error', function () {
      redis.lrange.andCallFake(function (key, index1, index2, handler) {
        handler('Some redis error', list);
      });

      kvService.pull(response, key, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(tool.panic).toHaveBeenCalledWith(response, 'Some redis error');
    });
  });
});