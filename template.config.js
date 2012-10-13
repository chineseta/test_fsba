/**
 * @fileOverview общие настройки для backend части.
 */

exports.serverPort = 8888; // порт для node.js сервера
exports.serverHost = '127.0.0.1'; // хост для которого node.js принимает запросы
exports.redisExpire = 120; // время жизни записей в redis, в секундах
exports.httpTimeout = 30 * 1000; // timeout для http(s) соединения, в миллисекундах

// параметры flightstats API
exports.flightstats = {
  appId: '',
  appKey: ''
};