/**
 * @fileOverview Общие вспомогательные функции.
 */

/**
 * Пишем заголовки и тело ответа, закрываем ответ.
 *
 * @param {Object} response Объект ответа
 * @param {String} status HTTP статус
 * @param {String} contentType MIME тип тела ответа
 * @param {String} content Тело ответа
 */
exports.write = function (response, status, contentType, content)
{
  response.writeHead(status, {
    'Content-Type': contentType, 'Content-Length': Buffer.byteLength(content)
  });
  response.write(content);
  response.end();
};

/**
 * Пишем ответ на 404 ошибку, закрываем ответ.
 *
 * @param {Object} response Объект ответа
 */
exports.write404 = function (response)
{
  exports.write(response, 404, 'text/html', '404 Not Found');
};

/**
 * Пишем ответ для внутренней ошибки сервера, закрываем ответ.
 *
 * @param {Object} response Объект ответа
 */
exports.write500 = function (response)
{
  exports.write(response, 500, 'text/html', '500 Internal Server Error');
};

/**
 * Пишем протой текст в ответ, закрываем ответ.
 *
 * @param {Object} response Объект ответа
 * @param {String} text Текст ответа
 */
exports.writeText = function (response, text)
{
  exports.write(response, 200, 'text/plain', text);
};

/**
 * Пишем JSON строку в ответ, закрываем ответ.
 *
 * @param {Object} response Объект ответа
 * @param {String} json JSON строка
 */
exports.writeJSON = function (response, json)
{
  exports.write(response, 200, 'text/json', json);
};

/**
 * Возвращает количество миллисекунд в 1 часе.
 *
 * @return {Integer}
 */
exports.hour = function hour()
{
  return 3600000;
};

/**
 * Трассировка ошибки.
 *
 * @param {Anything} error Преобразуется к JSON строке
 * @param {Anything} [object] Преобразуется к JSON строке
 */
exports.trace = function (error, object)
{
  console.log("\n");
  console.trace(JSON.stringify(error) + (object ? ' ' + JSON.stringify(object) : ''));
};

/**
 * Вызываем (вместе с return) при ошибке которую нельзя исправить.
 * Функция делает трассировку ошибки, пишет ответ как для 500-й ошибки, закрывает ответ.
 *
 * Пример: if (error) { return tool.panic(response, error); }
 *
 * @param {Object} response Объект ответа
 * @param {Anything} error Преобразуется к JSON строке
 * @param {Anything} [object] Преобразуется к JSON строке
 */
exports.panic = function (response, error, object)
{
  exports.trace(error, object);
  exports.write500(response);
};