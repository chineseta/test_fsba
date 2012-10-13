/**
 * @fileOverview Сервис для работы с Flight Status API.
 */

var https = require('https');
var _ = require('./public/js/lib/underscore.min.js');
var config = require('./config');
var tool = require('./tool');
var shared = require('./public/js/shared');

/**
 * Получить URL для запроса к API flight status by airport.
 *
 * @param {Object} opts Опции запроса
 * @param {String} opts.iata Код аэропорта
 * @param {String} opts.type Тип: dep - отправка, arr - прибытие.
 * @param {Integer} opts.time Время в миллисекундах, округляется до часа.
 * @param {Integer} opts.numberOfHours Количество часов по которым нужна статистика. Максимум 6.
 *
 * @return {String}
 */
exports.requestUrl = function (opts)
{
  var date = new Date(opts.time);
  var year = date.getUTCFullYear();
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();
  var hours = date.getUTCHours();

  return 'https://api.flightstats.com/flex/flightstatus/rest/v2/json/airport/status/' +
    opts.iata + '/' + opts.type + '/' +
    year + '/' + month + '/' + day + '/' + hours +
    '?codeType=IATA&utc=true&numHours=' + opts.numberOfHours +
    '&appId=' + config.flightstats.appId + '&appKey=' + config.flightstats.appKey;
};

/**
 * Отправить одиночный запрос к API flight status by airport.
 * Параметры такие же как и у функции requestUrl +2 новых: opts.success, opts.error.
 *
 * @param {Object} opts Опции запроса
 * @param {String} opts.iata Код аэропорта
 * @param {String} opts.type Тип: dep - отправка, arr - прибытие.
 * @param {Integer} opts.time Время в миллисекундах, округляется до часа.
 * @param {Integer} opts.numberOfHours Количество часов по которым возвращается статистика. Максимум 6.
 *
 * @param {Function} opts.success function(data) вызывается в случае успешного выполнения.
 * @param {Function} opts.error function(error) вызывается в случае ошибки.
 */
exports.get = function (opts)
{
  var url = exports.requestUrl(opts);

  function callback(response) {
    if (response.statusCode !== 200)
    {
      return opts.error('Response status code is ' + response.statusCode, response);
    }

    var data = '';
    response.on('data', function(chunk) { data += chunk; });
    response.on('end' , function() { opts.success(data); });
  }

  https.get(url, callback)
    .on('error', opts.error)
    .setTimeout(config.httpTimeout);
};

/**
 * Отправить пакет запросов к API flight status by airport.
 * Каждый следующий запрос сдвигается на opts.numberOfHours относительно предыдущего.
 * Параметры такие же как и у функции get +1 новый: opts.numberOfRequests.
 *
 * @param {Object} opts Опции запроса
 * @param {String} opts.iata Код аэропорта
 * @param {String} opts.type Тип: dep - отправка, arr - прибытие.
 * @param {Integer} opts.time Время в миллисекундах, округляется до часа.
 * @param {Integer} opts.numberOfHours Количество часов (для одного запроса) по которым
 *   возвращается информация. Максимум 6.
 *
 * @param {Function} opts.success function(data) вызывается в случае успешного выполнения.
 * @param {Function} opts.error function(error) вызывается в случае ошибки.
 *
 * @param {Integer} opts.numberOfRequests Количество запросов которое необходимо отправить.
 */
exports.multiGet = function (opts)
{
  _.times(opts.numberOfRequests, function (i) {
    var optsWithOffset = _.clone(opts);
    optsWithOffset.time = opts.time + i * opts.numberOfHours * tool.hour();

    exports.get(optsWithOffset);
  });
};

/**
 * Получить time для первого запроса из пакета запросов функции multiGet.
 * Вычисляется из расчёта что запросы охватывают время now +/- totalHours/2.
 *
 * @param {Integer} numberOfHours Количество часов (для одного запроса) по которым
 *   возвращается информация. Максимум 6.
 * @param {Integer} numberOfRequests Количество запросов которое необходимо отправить.
 *
 * @return {Integer} Время в миллисекундах.
 */
exports.getStartTimeForMultiGet = function (numberOfHours, numberOfRequests)
{
  var halfOfTotalHours = numberOfHours * numberOfRequests / 2;

  return new Date().getTime() - halfOfTotalHours * tool.hour();
};

/**
 * Вытащить из ответа API Flight status by airport данные для коллекции Flights на frontend'е.
 *
 * @param response Ответ из которого извлекаем данные
 * @param {String} type Тип: dep - отправка, arr - прибытие
 * @param {String} [airline] Код авиакомпании
 * @return {String} JSON для коллекции Flights на frontend'е. Или 'error' в случае ошибки.
 */
exports.getFlightsJSON = function (response, type, airline)
{
  var data;
  try
  {
    data = JSON.parse(response);
  }
  catch (e)
  {
    tool.trace('Error while JSON.parse(' + response + ')', e);
    return 'error';
  }

  if (data.error)
  {
    if (data.error.errorCode === 'BAD_AIRPORT_CODE')
    {
      return 'bad-airport';
    }
    else
    {
      tool.trace("Field 'error' is present in flights JSON", data.error);
      return 'error';
    }
  }

  var airports = shared.reindex(data.appendix && data.appendix.airports, 'fs');
  var airlines = shared.reindex(data.appendix && data.appendix.airlines, 'fs');

  var keys = {};
  if (type === 'dep') // отправка
  {
    keys.airportCode = 'arrivalAirportFsCode';
    keys.date = 'departureDate';
    keys.actualGate = 'actualGateDeparture';
    keys.terminal = 'departureTerminal';
    keys.gate = 'departureGate';
  }
  else if (type === 'arr') // прибытие
  {
    keys.airportCode = 'departureAirportFsCode';
    keys.date = 'arrivalDate';
    keys.actualGate = 'actualGateArrival';
    keys.terminal = 'arrivalTerminal';
    keys.gate = 'arrivalGate';
  }

  var flights = [];
  _.each(data.flightStatuses, function (fs) {
    var flight = {
      airport: fs[keys.airportCode] + ' ' + airports[fs[keys.airportCode]].city,
      flight: fs.carrierFsCode + ' ' + fs.flightNumber,
      airline: airlines[fs.carrierFsCode].name,
      schedule: fs[keys.date].dateLocal.substr(0, 16), // => YYYY-MM-DDTHH:MM - для корректной сортировки
      status: fs.status
    };

    if (airline) // если выбрана авиакомпания показываем поле date
    {
      flight.date = fs[keys.date].dateLocal.substr(0, 10); // => YYYY-MM-DD
    }

    if (fs.operationalTimes && fs.operationalTimes[keys.actualGate])
    {
      flight.actual = fs.operationalTimes[keys.actualGate].dateLocal.substr(0, 16); // => YYYY-MM-DDTHH:MM - для корректной сортировки
    }

    if (fs.airportResources)
    {
      var termgate = [];

      if (fs.airportResources[keys.terminal])
      {
        termgate.push('T-' + fs.airportResources[keys.terminal]);
      }

      if (fs.airportResources[keys.gate])
      {
        termgate.push(fs.airportResources[keys.gate]);
      }

      if (termgate.length)
      {
        flight.termgate = termgate.join(' ');
      }
    }

    if (!airline || airline === fs.carrierFsCode)
    {
      flights.push(flight);
    }

    if (fs.codeshares)
    {
      var operator = flight.flight + ' ' + flight.airline;

      _.each(fs.codeshares, function (cs) {
        if (airline && airline !== cs.fsCode) { return; }

        var codeshare = _.clone(flight);
        codeshare.codeshare = 1;
        codeshare.operator = operator;
        codeshare.flight = cs.fsCode + ' ' + cs.flightNumber;
        codeshare.airline = airlines[cs.fsCode].name;

        flights.push(codeshare);
      });
    }
  });

  return JSON.stringify(flights);
};