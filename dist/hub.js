(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MasqHub = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 */
var set = exports.set = function set(origin, params) {
  // TODO throttle writing to once per second
  var data = getAll(origin);
  data[params.key] = params.value;
  window.localStorage.setItem(origin, JSON.stringify(data));
  setMeta(origin);
};

/**
 * Accepts an object with an array of keys for which to retrieve their values.
 * Returns a single value if only one key was supplied, otherwise it returns
 * an array. Any keys not set result in a null element in the resulting array.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} params An object with an array of keys
 * @returns {*|*[]}  Either a single value, or an array
 */
var get = exports.get = function get(origin, params) {
  var data = void 0,
      result = void 0,
      value = void 0;

  result = [];

  data = getAll(origin);

  for (var i = 0; i < params.keys.length; i++) {
    try {
      value = data[params.keys[i]];
    } catch (e) {
      value = null;
    }
    result.push(value);
  }

  return result.length > 1 ? result : result[0];
};

/**
 * Deletes all keys specified in the array found at params.keys.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with an array of keys
 */
var del = exports.del = function del(origin, params) {
  var data = getAll(origin);
  for (var i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]];
  }
  window.localStorage.setItem(origin, JSON.stringify(data));
  setMeta(origin);
};

/**
 * Clears localStorage.
 *
 * @param {string} key The element to clear from localStorage
 */
var clear = exports.clear = function clear(key) {
  window.localStorage.removeItem(key);
};

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
var getAll = exports.getAll = function getAll(origin) {
  var data = window.localStorage.getItem(origin);
  if (!data || data.length === 0) {
    return {};
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

/**
 * Sets all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data The data payload
 */
var setAll = exports.setAll = function setAll(origin, data) {
  window.localStorage.setItem(origin, JSON.stringify(data));
  setMeta(origin);
};

/**
 * Gets all metadata for a given origin.
 *
 * @param   {string} origin The origin for which we want the metadata
 * @return  {object} The metadata payload
 */
var getMeta = exports.getMeta = function getMeta(origin) {
  var data = window.localStorage.getItem('meta_' + origin);
  if (!data || data.length === 0) {
    return {};
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
};

/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data The metadata payload
 */
var setMeta = exports.setMeta = function setMeta(origin, data) {
  data = data || {};
  data.updated = now();
  window.localStorage.setItem('meta_' + origin, JSON.stringify(data));
};

/**
 * A cross-browser version of Date.now compatible with IE8 that avoids
 * modifying the Date object.
 *
 * @return {int} The current timestamp in milliseconds
 */
var now = function now() {
  if (typeof Date.now === 'function') {
    return Date.now();
  }

  return new Date().getTime();
};
},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.init = undefined;

var _sync = require('./sync');

var sync = _interopRequireWildcard(_sync);

var _api = require('./api');

var api = _interopRequireWildcard(_api);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var debug = false;
var permissionList = [];
var wsClient = void 0;
var clientId = '';
var availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll', 'getMeta'];

var log = function log() {
  for (var _len = arguments.length, text = Array(_len), _key = 0; _key < _len; _key++) {
    text[_key] = arguments[_key];
  }

  if (debug) {
    console.log(text);
  }
};

/**
 * Forked from https://github.com/zendesk/cross-storage
 *
 * Accepts an array of objects used for configuration:
 *  - an array of permissions containing objects with two keys: origin and allow.
 *    The value of origin is expected to be a RegExp, and allow, an array of strings.
 *    The cross storage hub is then initialized to accept requests from any of
 *    the matching origins, allowing access to the associated lists of methods.
 *    Methods may include any of: get, set, del, clear, getAll and setAll. A 'ready'
 *    message is sent to the parent window once complete.
 *  - debug flag
 * @example
 * // Subdomain can get, but only root domain can set and del
 * MasqHub.init({
 *   permissions: [{origin: /\.example.com$/,        allow: ['get']},
 *    {origin: /:(www\.)?example.com$/, allow: ['get', 'set', 'del']}],
 *   debug: false
 * });
 *
 * @param {array} parameters An array of objects used for configuration
 */
var init = exports.init = function init(parameters) {
  var available = true;

  debug = parameters.debug;

  // Return if localStorage is unavailable, or third party
  // access is disabled
  try {
    if (!window.localStorage) available = false;
  } catch (e) {
    available = false;
  }

  if (!available) {
    try {
      return window.parent.postMessage({ 'cross-storage': 'unavailable' }, '*');
    } catch (e) {
      return;
    }
  }

  permissionList = parameters.permissions || [];

  sync.initWSClient('foo').then(function (ws) {
    wsClient = ws;

    wsClient.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        var response = prepareResponse(data.origin, data.request);

        log('Sendind updated data: ' + response);

        // postMessage requires that the target origin be set to "*" for "file://"
        var targetOrigin = data.origin === 'file://' ? '*' : data.origin;
        window.parent.postMessage(response, targetOrigin);
      } catch (err) {
        log(err);
      }
    };

    initListener();
  }).catch(function (err) {
    log(err);
    initListener();
  });
};

var initListener = function initListener() {
  // Init listener
  if (window.addEventListener) {
    window.addEventListener('message', listener, false);
  } else {
    window.attachEvent('onmessage', listener);
  }
  // All set, let the app know we're ready
  window.parent.postMessage({ 'cross-storage': 'ready' }, '*');

  log('Listening to clients...');
};

/**
 * The message handler for all requests posted to the window. It ignores any
 * messages having an origin that does not match the originally supplied
 * pattern. Given a JSON object with one of get, set, del or getAll as the
 * method, the function performs the requested action and returns its result.
 *
 * @param {MessageEvent} message A message to be processed
 */
var listener = function listener(message) {
  var origin = void 0,
      targetOrigin = void 0,
      request = void 0,
      response = void 0;

  // postMessage returns the string "null" as the origin for "file://"
  origin = message.origin === 'null' ? 'file://' : message.origin;

  // Handle polling for a ready message
  if (message.data['cross-storage'] === 'poll') {
    return window.parent.postMessage({ 'cross-storage': 'ready' }, message.origin);
  }

  // Ignore the ready message when viewing the hub directly
  if (message.data['cross-storage'] === 'ready') return;

  // Check whether message.data is a valid json
  try {
    request = message.data;
  } catch (err) {
    return;
  }

  // Check whether request.method is a string
  if (!request || typeof request.method !== 'string') {
    return;
  }

  // Init a placeholder response object
  response = {
    client: request.client,
    result: {}
  };
  if (request.client) {
    clientId = request.client;
  }

  if (!request.method) {
    return;
  } else if (!isPermitted(origin, request.method)) {
    response.error = 'Invalid ' + request.method + ' permissions for ' + origin;
  } else {
    response = prepareResponse(origin, request);
    // Also send the changes to other devices
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      sync.send(wsClient, origin, request);
    }
  }

  log('Sendind response data: ' + response);

  // postMessage requires that the target origin be set to "*" for "file://"
  targetOrigin = origin === 'file://' ? '*' : origin;

  window.parent.postMessage(response, targetOrigin);
};

/**
 * Returns a response object to the application requesting an action.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {object} request Requested object sent by the application
 * @returns {object} Response object
 */
var prepareResponse = function prepareResponse(origin, request) {
  var error = void 0,
      result = void 0;
  try {
    // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
    switch (request.method) {
      case 'get':
        result = api.get(origin, request.params);
        break;
      case 'set':
        result = api.set(origin, request.params);
        break;
      case 'del':
        result = api.del(origin, request.params);
        break;
      case 'clear':
        result = api.clear(origin);
        break;
      case 'getAll':
        result = api.getAll(origin);
        break;
      case 'setAll':
        result = api.setAll(origin, request.params);
        break;
      case 'getMeta':
        result = api.getMeta(origin);
        break;
      default:
        break;
    }
  } catch (err) {
    error = err.message;
  }

  return {
    client: request.client || clientId,
    error: error,
    result: result
  };
};

/**
 * Returns a boolean indicating whether or not the requested method is
 * permitted for the given origin. The argument passed to method is expected
 * to be one of 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {string} method Requested action
 * @returns {bool}   Whether or not the request is permitted
 */
var isPermitted = function isPermitted(origin, method) {
  var i = void 0,
      entry = void 0,
      match = void 0;

  if (availableMethods.indexOf(method) < 0) {
    return false;
  }

  for (i = 0; i < permissionList.length; i++) {
    entry = permissionList[i];
    if (!(entry.origin instanceof RegExp) || !(entry.allow instanceof Array)) {
      continue;
    }

    match = entry.origin.test(origin);
    if (match && entry.allow.indexOf(method) >= 0) {
      return true;
    }
  }

  return false;
};

/**
 * Returns whether or not an object is empty.
 *
 * @param   {object} obj The object to check
 * @returns {bool} Whether or not the object is empoty
 */
// const isEmpty = (obj) => {
//   return Object.keys(obj).length === 0
// }

/**
 * Returns whether or not a variable is an object.
 *
 * @param   {*} variable The variable to check
 * @returns {bool} Whether or not the variable is an object
 */
// const isObject = (variable) => {
//   return typeof (variable) === 'object'
// }
},{"./api":1,"./sync":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initWSClient = initWSClient;
function initWSClient(room, server) {
  // const channelName = 'user-session-id'
  var local = 'ws://localhost:8080/';

  return new Promise(function (resolve, reject) {
    server = server || local;

    var ws = new window.WebSocket(server + room);

    ws.onopen = function () {
      console.log('Connected to ' + server + room + '.');
      // TODO: check if we need to sync with other devices
      return resolve(ws);
    };

    ws.onerror = function (event) {
      var err = 'Could not connect to server at ' + server;
      console.log(err);
      return reject(err);
    };
  });
}

/**
 * Sets all data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
var send = exports.send = function send(ws, origin, request) {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return;
  }
  ws.send(JSON.stringify({ origin: origin, request: request }));
};
},{}]},{},[2])(2)
});