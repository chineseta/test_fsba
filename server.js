/**
 * @fileOverview Сервер и роутер.
 */

var http = require('http');
var url = require('url');
var config = require('./config');
var tool = require('./tool');
var controller = require('./controller');

/**
 * Карта роутинга.
 * {'/url_path1': function action1(params, request, response), ... }
 *
 * @type {Object}
 */
exports.routes = {
  '/request': controller.request,
  '/response': controller.response
};

/**
 * Запуск сервера.
 */
exports.start = function ()
{
  http.createServer(exports.onRequest).listen(config.serverPort, config.serverHost);

// только для разработки, на сервере используется runit
//  process.on('uncaughtException', function (exception) {
//    console.log(exception.stack);
//  });

  console.log('Server has started!');
};

/**
 * Обработчик запросов.
 *
 * @param {Object} request
 * @param {Object} response
 */
exports.onRequest = function (request, response)
{
  exports.route(exports.routes, request, response);
};

/**
 * В зависимости от запроса вызываем соответствующее действие.
 *
 * @param routes Карта роутинга {urlpath1: handler1, ...}
 * @param request Запрос
 * @param response Ответ
 */
exports.route = function (routes, request, response)
{
  var parsedUrl = url.parse(request.url, true);
  var action = routes[parsedUrl.pathname];

  if (typeof(action) === 'function')
  {
    action(parsedUrl.query, request, response);
  }
  else
  {
    tool.write404(response);
  }
};