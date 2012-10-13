/**
 * @fileOverview Виджеты (View) Backbone для страницы index.html.
 */

/**
 * Виджет формы.
 *
 * @type {Class}
 */
var FormView = Backbone.View.extend({
  el: $('#form-view'),
  form: $('#form-view form'),
  events: {
    'submit form': 'onSubmit'
  },

  /**
   * @constructor
   */
  initialize: function ()
  {
    formModel.on('error', this.showErrors, this);
  },

  /**
   * Показать ошибки модели FormModel.
   *
   * @param {Object} model
   * @param {Array} errors Массив с ошибками (см. shared.formErrors)
   */
  showErrors: function(model, errors)
  {
    this.clearErrors(); // не у всех полей могут быть ошибки

    _.each(errors, function (message, field) {
      $('.control-group.' + field, this.$el).addClass('error');
      $('.control-group.' + field + ' .help-inline', this.$el).html(message);
    });
  },

  /**
   * Убрать сообщения об ошибках.
   */
  clearErrors: function ()
  {
    $('.control-group', this.$el).removeClass('error');
    $('.control-group .help-inline', this.$el).html('');
  },

  /**
   * Обновить связанную с виджетом модель.
   *
   * @return {FormModel|false} Возвращает FormModel если модель обновилась (модель всегда валидная),
   *   false если модель не обновилась.
   */
  updateModel: function ()
  {
    this.clearErrors();

    var values = shared.reindex(this.form.serializeArray(), 'name', 'value');
    values.iata = values.iata.toUpperCase(); // модель принимает iata только в верхнем регистре
    values.airline = values.airline.toUpperCase(); // модель принимает airline только в верхнем регистре

    // устанавливаем все значения, в values некоторых может не быть (radiobuttons+firebug)
    return formModel.set(_.extend(_.clone(formModel.defaults), values));
  },

  /**
   * Сабмит формы ajax'ом.
   *
   * @return {Boolean}
   */
  onSubmit: function ()
  {
    if (this.updateModel())
    {
      formModel.send();
    }

    return false; // не отправлять форму
  }
});
var formView = new FormView();

/**
 * Виджет таблицы с результатами.
 *
 * @type {Class}
 */
var FlightsTableView = Backbone.View.extend({
  el: $('#flights-table-view'),
  foundTemplate: $('#found-template').html(),
  snippets: {
    'ping': $('#ping-snippet').html(),
    'not-found': $('#not-found-snippet').html(),
    'bad-airport':  $('#bad-airport-snippet').html(),
    'error': $('#error-snippet').html()
  },
  events: {
    'click th': 'resort'
  },

  /**
   * Статусы перелета.
   *
   * @type {Object}
   */
  statuses: {
    // code: 'Status Name'
    A: 'Active',
    C: 'Canceled',
    D: 'Diverted',
    DN: 'Data source needed',
    L: 'Landed',
    NO: 'Not Operational',
    R: 'Redirected',
    S: 'Scheduled',
    U: 'Unknown'
  },

  /**
   * @constructor
   */
  initialize: function ()
  {
    flightsTableModel.on('change:state', this.render, this);
  },

  /**
   * Пересортировать и показать таблицу.
   *
   * @param {Event} event
   */
  resort: function (event)
  {
    var oldSort = flightsTableModel.get('sort');
    var oldColumn = oldSort[0];
    var oldOrder = oldSort[1];

    var target = event.target; // если щелкнули по th
    if (event.target.tagName.toLowerCase() === 'i') // если щелкнули по иконке внутри th
    {
      target = event.target.parentNode;
    }
    var newColumn = target.className;

    if (newColumn === oldColumn)
    {
      // меняем порядок сортировки
      flightsTableModel.set('sort', [oldColumn, oldOrder * -1]);
    }
    else
    {
      // сортируем по новой колонке по возрастанию
      flightsTableModel.set('sort', [newColumn, +1]);
    }

    flightsTableModel.get('flights').sort();
    this.render();
  },

  /**
   * Отобразить состояние модели flightsTableModel.
   */
  render: function ()
  {
    var state = flightsTableModel.get('state');


    if (state === 'found')
    {
      var type = formModel.get('type');

      this.$el.html(_.template(this.foundTemplate, {
        airportType: type === 'dep' ? 'Destination' : 'Origin',
        flightType: type === 'dep' ? 'Departure' : 'Arrival',
        airline: formModel.get('airline'),
        flights: flightsTableModel.get('flights').models,
        statuses: this.statuses,
        icon: this.renderSortIcon
      }));
    }
    else // ping/not-found/bad-airport/error
    {
      this.$el.html(this.snippets[state]);
    }
  },

  /**
   * Отобразить иконку сортировки для соответствующей колонки.
   *
   * @param {String} column Название поля для которого вызывается renderSortIcon.
   * @return {String}
   */
  renderSortIcon: function (column)
  {
    var sort = flightsTableModel.get('sort');
    if (column !== sort[0])
    {
      return '';
    }

    return sort[1] > 0 ? '<i class="icon-arrow-up"></i>' : '<i class="icon-arrow-down"></i>';
  }
});
var flightsTableView = new FlightsTableView();