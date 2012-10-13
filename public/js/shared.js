/**
 * @fileOverview Самописные функции общие для frontend и backend.
 */

(function(exports) {

  /**
   * Валидация формы.
   *
   * @param {Object} attrs
   * @return {Array|undefined} Возвращает массив с ошибками, если такие были.
   */
  exports.formErrors = function (attrs)
  {
    attrs = attrs || {};
    var errors = {};

    // Код аэропорта ИАТА состоит из 3 букв латинского алфавита.
    if (attrs.iata === '')
    {
      errors.iata = 'Required!';
    }
    else if (!/^[A-Z]{3}$/.test(attrs.iata))
    {
      errors.iata = 'Invalid!';
    }

    // Код авиакомпании ИАТА может состоять из 2 или из 3 символов.
    // ИАТА предусматривает введение в действие кодов авиакомпаний из 3 латинских букв, однако такие коды ещё никому не присвоены.
    if (!/^[A-Z0-9]{2,3}$|^$/.test(attrs.airline))
    {
      errors.airline = 'Invalid!';
    }

    // Тип: dep - отправка, arr - прибытие
    if (!/^dep$|^arr$/.test(attrs.type))
    {
      errors.type = 'Invalid!';
    }

    for (var field in errors)
    {
      if (errors.hasOwnProperty(field))
      {
        return errors;
      }
    }
  };

  /**
   * Переиндексировать массив объектов по значению поля ключа.
   *
   * @param {Array} arrayOfObjects Массив объектов
   * @param {String} keyField Имя поля в котором хранится значение ключа переиндексации
   * @param {String} [valueField] Имя поля с новым значением, если не указанно то по новому ключу будет храниться весь объект.
   * @return {Object}
   */
  exports.reindex = function (arrayOfObjects, keyField, valueField)
  {
    var hash = {};
    if (!arrayOfObjects) { return hash; }

    if (valueField)
    {
      for (var i = arrayOfObjects.length - 1; i >= 0; i--)
      {
        hash[arrayOfObjects[i][keyField]] = arrayOfObjects[i][valueField];
      }
    }
    else
    {
      for (var i = arrayOfObjects.length - 1; i >= 0; i--)
      {
        hash[arrayOfObjects[i][keyField]] = arrayOfObjects[i];
      }
    }

    return hash;
  }

})(typeof(exports) === 'undefined' ? this['shared'] = {} : exports);