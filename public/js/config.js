/**
 * @fileOverview общие настройки для frontend части.
 */

var config = {
  ajaxTimeout: 30 * 1000, // timeout для ajax запросов, в миллисекундах

  // с какой периодичностью (в миллисекундах) запрашивать информацию по перелётам у backend'а
  flightsPingTimeout: 2000
};

$.ajaxSetup({timeout: config.ajaxTimeout});