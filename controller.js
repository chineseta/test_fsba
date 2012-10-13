/**
 * @fileOverview Контроллер.
 */

var _ = require('./public/js/lib/underscore.min.js');
var fsService = require('./flight_status_service');
var kvService = require('./key_value_service');
var tool = require('./tool');
var shared = require('./public/js/shared.js');

/**
 * Получить количество часов и запросов которые нужно послать к API (в зависимости от параметров формы).
 *
 * @param {Object} params Параметры формы запроса статуса рейсов.
 * @return {Object}
 */
exports.getNumberOf = function (params)
{
  // если авиакомпания указанна то now +/- 12 часов (всего 24) иначе now +/- 4 часа (всего 8)

  if (params.airline)
  {
    return {hours: 6, requests: 4};
  }

  return {hours: 4, requests: 2};
};

/**
 * Обрабатываем форму. Отправляем запросы к API flight status.
 * В браузер возвращаем ключ для получения ответов от API.
 *
 * @param {Object} params GET параметры запроса
 * @param {String} params.iata Код аэропорта
 * @param {String} params.type Тип: dep - отправка, arr - прибытие
 * @param {String} params.airline Код авиакомпании
 * @param {Object} request Запрос
 * @param {Object} response Ответ
 */
exports.request = function (params, request, response)
{
  if (shared.formErrors(params))
  {
    return tool.panic(response, 'Wrong params', params);
  }

  var numberOf = exports.getNumberOf(params);
  var key = kvService.getNewKey(numberOf.requests);

  function success(data)
  {
    var flightsJSON = fsService.getFlightsJSON(data, params.type, params.airline);
    if (flightsJSON === 'error')
    {
      tool.trace("fsService.getFlightsJSON return 'error'", data);
    }

    kvService.push(key, flightsJSON);
  }

  function error(error, response)
  {
    tool.trace(error, response);
    kvService.push(key, 'error');
  }

  var opts = {
    iata: params.iata,
    type: params.type,
    time: fsService.getStartTimeForMultiGet(numberOf.hours, numberOf.requests),
    numberOfHours: numberOf.hours,
    numberOfRequests: numberOf.requests,
    success: success,
    error: error
  };
  fsService.multiGet(opts);

  tool.writeText(response, key);
};

/**
 * Отдаем ответы от flight status API.
 *
 * @param {Object} params GET параметры запроса
 * @param {String} params.key Ключ для получения ответов flight status API.
 * @param {Object} request Запрос
 * @param {Object} response Ответ
 */
exports.response = function (params, request, response)
{
  if (!kvService.isKeyValid(params.key))
  {
    return tool.panic(response, 'Wrong key', params.key);
  }

  getSize();

  function getSize()
  {
    kvService.getSize(response, params.key, function (size) {
      if (size === kvService.getMaxSize(params.key))
      {
        pull();
      }
      else
      {
        tool.writeJSON(response, 'null');
      }
    });
  }

  function pull()
  {
    kvService.pull(response, params.key, function (arrayOfResponses) {
      var anyError = _.any(arrayOfResponses, function (response) { return response === 'error'; });
      if (anyError)
      {
        return tool.panic(response, 'Error in array of responses');
      }

      var badAirport = _.any(arrayOfResponses, function (response) { return response === 'bad-airport'; });
      if (badAirport)
      {
        return tool.writeJSON(response, '"bad-airport"');
      }

      var arrayOfLists = _.map(arrayOfResponses, function (response) {
        return response.slice(1, -1); // '[obj1, obj2, obj3]' => 'obj1, obj2, obj3'
      });
      var list = _.compact(arrayOfLists).join(', '); // ['obj1, obj2', '', 'obj3'] => 'obj1, obj2, obj3'

      tool.writeJSON(response, '[' + list + ']');
    });
  }
};