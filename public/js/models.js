/**
 * @fileOverview Модели и коллекции Backbone для страницы index.html.
 */

/**
 * Модель с информацией о статусе авиарейса.
 *
 * @type {Class}
 */
var Flight = Backbone.Model.extend({
  defaults: {
    codeshare: 0, // 0 — нормальный рейс или оператор, 1 — codeshare рейс
    operator: '', // оператор для codeshare рейса (flight airline)
    date: '', // дата отправки/прибытия (для правильной сортировки передается в формате YYYY-MM-DDTHH:MM)
    airport: '', // другой аэропорт отправки/прибытия (код город)
    flight: '', // авиарейс (код авиакомпании номер авиарейса)
    airline: '', // название авиакомпании
    schedule: '', // плановое время отправки/прибытия (для правильной сортировки передается в формате YYYY-MM-DDTHH:MM)
    actual: '', // действительное время отправки/прибытия (для правильной сортировки передается в формате YYYY-MM-DDTHH:MM)
    termgate: '', // терминал и гейт отправки/прибытия
    status: '' // статус авиарейса
  }
});

/**
 * Коллекция статусов авиарейсов.
 *
 * @type {Class}
 */
var Flights = Backbone.Collection.extend({
  model: Flight,

  /**
   * Сравниваем записи.
   *
   * @param flight1
   * @param flight2
   * @return {Integer} +1 (flight1 > flight2), 0 (flight1 == flight2), -1 (flight1 < flight2)
   */
  comparator: function(flight1, flight2)
  {
    var sort = flightsTableModel.get('sort'); // [fieldName, +1(asc)/-1(desc)]

    function getSortValue(flight)
    {
      return flight.get(sort[0]) +
        flight.get('airport') + flight.get('schedule') +
        flight.get('codeshare') + flight.get('flight');
    }

    var value1 = getSortValue(flight1);
    var value2 = getSortValue(flight2);

    if (value1 > value2)
    {
      return +1 * sort[1];
    }

    if (value1 < value2)
    {
      return -1 * sort[1];
    }

    return 0;
  }
});

/**
 * Модель для формы. Содержит информацию о параметрах текущего запроса пользователя.
 *
 * @type {Class}
 */
var FormModel = Backbone.Model.extend({
  defaults: {
    iata: '', // IATA код аэропорта
    type: '', // тип: dep - отправка, arr - прибытие.
    airline: '' // код авиакомпании
  },

  /**
   * Валидация модели.
   *
   * @param {Object} attrs
   * @return {Array|undefined} Возвращает массив с ошибками, если такие были.
   */
  validate: function (attrs)
  {
    // для валидации используется код общий для frontend и backend (shared.js).
    return shared.formErrors(attrs);
  },

  /**
   * Отправляем форму, приходит ключ по которому можно получить JSON для коллекции Flights.
   */
  send: function ()
  {
    $.ajax({
      url: '/request?' + $.param(formModel.attributes),
      dataType: 'text'
    }).success(function (responseKey) {
      flightsTableModel.set('responseKey', responseKey);
    }).error(function (error) {
      flightsTableModel.set('state', 'error');
    });
  }
});
var formModel = new FormModel();

/**
 * Модель для таблицы с результатами.
 *
 * @type {Class}
 */
var FlightsTableModel = Backbone.Model.extend({
  defaults: {
    state: 'hide', // hide/ping/found/not-found/bad-airport/error
    responseKey: '', // ключ для получения от backend'а информации по авиарейсам
    sort: ['schedule', 1], // [field_name, +1(asc)/-1(desc)]
    flights: new Flights(), // статусы авиарейсов
    timeoutId: null // timeout используемый для периодического опроса backend
  },

  /**
   * @constructor
   */
  initialize: function ()
  {
    // при изменении responseKey переходим в состояние ping (периодически опрашиваем backend)
    this.on('change:responseKey', function () {
      this.set('state', 'ping');
      this.ping();
    });
  },

  /**
   * Периодически запрашиваем от backend информацию по авиарейсам.
   */
  ping: function ()
  {
    // если начали ping с новым responseKey, а старый ещё не закончился
    clearTimeout(this.get('timeoutId'));

    this.set('timeoutId', setTimeout(delayed, config.flightsPingTimeout));
    // не используем setInterval так как при низкой скорости "пинги" могут наложится друг на друга

    function delayed()
    {
      jQuery.ajax({
        url: '/response?key=' + flightsTableModel.get('responseKey'),
        dataType: 'json'
      }).success(function (flights) {
        if (flights === null)
        {
          flightsTableModel.ping();
        }
        else if (flights === 'bad-airport')
        {
          flightsTableModel.get('flights').reset([]);
          flightsTableModel.set('state', 'bad-airport');
        }
        else
        {
          flightsTableModel.get('flights').reset(flights);
          flightsTableModel.set('state', flights.length ? 'found' : 'not-found');
        }
      }).error(function (error) {
        flightsTableModel.set('state', 'error');
      });
    }
  }
});
var flightsTableModel = new FlightsTableModel();