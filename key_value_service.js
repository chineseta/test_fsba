/**
 * @fileOverview Сервис для работы с key value хранилищем Redis.
 */

var uuid = require('node-uuid');
var config = require('./config');
var tool = require('./tool');

/**
 * Объект для доступа к redis db. Экспорт нужен для тестирования.
 *
 * @type {RedisClient}
 */
exports.redis = require('redis').createClient();

/**
 * Получить случайный ключ.
 *
 * @return {String}
 */
exports.randomKey = function ()
{
  return uuid.v4();
};

/**
 * Получить ключ для хранения нового списка с максимальным размером maxSize.
 *
 * @param {Integer} maxSize
 * @return {String}
 */
exports.getNewKey = function (maxSize)
{
  return 'fs:' + maxSize + ':' + exports.randomKey();
};

/**
 * Проверяем что ключ валидный.
 *
 * @param {String} key
 * @return {Boolean}
 */
exports.isKeyValid = function (key)
{
  return /^fs:\d:[-a-z0-9]{36}$/.test(key);
};

/**
 * Получить максимальный размер для списка с ключом key.
 *
 * @param {String} key
 * @return {Integer}
 */
exports.getMaxSize = function (key)
{
  return key.match(/^fs:(\d+):/)[1] * 1;
};

/**
 * Запихнуть новое значение в список.
 * Продлить время жизни списка на config.redisExpire секунд.
 *
 * @param {String} key Ключ по которому хранится список
 * @param {String} value
 */
exports.push = function (key, value)
{
  exports.redis.rpush(key, value);
  exports.redis.expire(key, config.redisExpire);
};

/**
 * Получить реальный размер списка.
 * В случае ошибки вызывается return tool.panic(response, error);
 *
 * @param {Object} response
 * @param {String} key Ключ по которому хранится список
 * @param {Function} success function(size) вызывается в случае успешного выполнения.
 */
exports.getSize = function (response, key, success)
{
  exports.redis.llen(key, function (error, size) {
    if (error)
    {
      return tool.panic(response, error);
    }

    success(size);
  });
};

/**
 * Получить значения списка и удалить список из хранилища.
 * В случае ошибки вызывается return tool.panic(response, error);
 *
 * @param {Object} response
 * @param {String} key Ключ по которому хранится список
 * @param {Function} success function(list) вызывается в случае успешного выполнения.
 */
exports.pull = function (response, key, success)
{
  exports.redis.lrange(key, 0, -1, function (error, list) {
    if (error)
    {
      return tool.panic(response, error);
    }

    success(list);
  });
  exports.redis.del(key);
};