(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MasqStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Default storage API
var store = window.localStorage;

/**
 * Returns a response object to the application requesting an action.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {object} request Requested object sent by the application
 * @param   {object} client The ID of the client performing the request
 * @returns {object} Response object
 */
var prepareResponse = exports.prepareResponse = function prepareResponse(origin, request, client) {
  var error = void 0,
      result = void 0;
  var meta = { updated: request.updated };
  try {
    // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
    switch (request.method) {
      case 'get':
        result = get(origin, request.params);
        break;
      case 'set':
        result = set(origin, request.params, meta);
        break;
      case 'del':
        result = del(origin, request.params, meta);
        break;
      case 'clear':
        result = clear(origin);
        break;
      case 'getAll':
        result = getAll(origin);
        break;
      case 'setAll':
        result = setAll(origin, request.params, meta);
        break;
      default:
        break;
    }
  } catch (err) {
    error = err.message;
  }

  var ret = {
    client: request.client || client,
    error: error,
    result: result
  };

  return ret;
};

/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 * @param {object} meta An object containing extra metadata
 */
var set = exports.set = function set(origin, params, meta) {
  // TODO throttle writing to once per second
  var data = getAll(origin);
  data[params.key] = params.value;
  // persist data in the store
  store.setItem(origin, JSON.stringify(data));
  // update the meta data and return the timestamp
  return setMeta(origin, meta);
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
 * @param {object} meta An object containing extra metadata
 */
var del = exports.del = function del(origin, params, meta) {
  var data = getAll(origin);
  for (var i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]];
  }
  // persist data in th
  store.setItem(origin, JSON.stringify(data));
  // update the meta data and return the update timestamp
  return setMeta(origin, meta);
};

/**
 * Clears localStorage.
 *
 * @param {string} key The element to clear from localStorage
 */
var clear = exports.clear = function clear(key) {
  store.removeItem(key);
};

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
var getAll = exports.getAll = function getAll(origin) {
  var data = store.getItem(origin);
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
 * @param   {object} meta An object containing extra metadata
 */
var setAll = exports.setAll = function setAll(origin, data, meta) {
  // persist data in th
  store.setItem(origin, JSON.stringify(data));
  // update the meta data and return the update timestamp
  return setMeta(origin, meta);
};

/**
 * Wrapper around the getAll function to get the meta for an origin
 *
 * @param   {string} origin The origin of the request
 * @return  {object} The metadata corresponding to the origin
 */
var getMeta = exports.getMeta = function getMeta(origin) {
  var item = origin ? '_meta_' + origin : '_meta';
  return getAll(item);
};
/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data Extra metadata
 * @return  {int} The timestamp of the update operation
 */
var setMeta = exports.setMeta = function setMeta(origin, data) {
  // Use the timestamp as revision number for now
  var updated = data.updated ? data.updated : now();

  // Update global the store meta
  var meta = getAll('_meta');
  meta.updated = updated;
  store.setItem('_meta', JSON.stringify(meta));

  // Update the origin meta
  if (!data.updated) {
    data.updated = updated;
  }
  store.setItem('_meta_' + origin, JSON.stringify(data));

  return updated;
};

/**
 * Get a list of all the origins (apps) that store local data
 *
 * @return {array} Array containing all the origins
 */
var appList = exports.appList = function appList() {
  var list = [];
  for (var i = 0; i < store.length; i++) {
    if (store.key(i).indexOf('_') !== 0) {
      list.push(store.key(i));
    }
  }
  return list;
};

/**
 * Get a list of meta data keys for the local (apps)
 *
 * @return {array} Array containing all the keys
 */
var metaList = exports.metaList = function metaList() {
  var list = [];
  for (var i = 0; i < store.length; i++) {
    var item = store.key(i);
    if (item.indexOf('_meta_') === 0) {
      list.push(item.split('_meta_')[1]);
    }
  }
  return list;
};

/**
 * Exports all the data in the store
 *
 * @return {object} The contents of the store as key:value pairs
 */
var exportJSON = exports.exportJSON = function exportJSON() {
  var data = {};
  for (var i = 0; i < store.length; i++) {
    data[store.key(i)] = getAll(store.key(i));
  }
  return data;
};

/**
 * Imports all the data from a different store
 *
 * @param {object} data The contents of the store as a JSON object
 */
var importJSON = exports.importJSON = function importJSON(data) {
  if (!data) {
    return;
  }

  for (var item in data) {
    if (data.hasOwnProperty(item)) {
      setAll(item, data[item]);
    }
  }
};

/**
 * Check
 *
 * @return {bool} If storage API is available
 */
var isAvailable = exports.isAvailable = function isAvailable() {
  var available = true;
  try {
    if (!store) {
      available = false;
    }
  } catch (err) {
    available = false;
  }
  return available;
};

/**
 * A cross-browser version of Date.now compatible with IE8 that avoids
 * modifying the Date object.
 *
 * @return {int} The current timestamp in milliseconds
 */
var now = exports.now = function now() {
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
var wsTimeout = 3000; // Waiting (3s) for another attempt to reconnect to the WebSocket server

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
 *    The data store is then initialized to accept requests from any of
 *    the matching origins, allowing access to the associated lists of methods.
 *    Methods may include any of: get, set, del, clear, getAll and setAll. A 'ready'
 *    message is sent to the parent window once complete.
 *  - debug flag
 * @example
 * // Subdomain can get, but only root domain can set and del
 * MasqStore.init({
 *   permissions: [{origin: /\.example.com$/, allow: ['get']},
 *    {origin: /:(www\.)?example.com$/, allow: ['get', 'set', 'del']}],
 *   debug: false,
 *   syncroom: 'someRandomName',
 *   syncserver: 'wss://....'
 * });
 *
 * @param {array} parameters An array of objects used for configuration
 */
var init = exports.init = function init(parameters) {
  debug = parameters.debug;

  // Return if storage api is unavailable
  if (!api.isAvailable()) {
    try {
      return window.parent.postMessage({ 'cross-storage': 'unavailable' }, '*');
    } catch (e) {
      return;
    }
  }

  permissionList = parameters.permissions || [];

  // Listen to online/offline events in order to trigger sync
  if (navigator.onLine !== undefined) {
    window.addEventListener('online', function () {
      onlineStatus(true, parameters);
    });
    window.addEventListener('offline', function () {
      onlineStatus(false, parameters);
    });

    onlineStatus(navigator.onLine, parameters);
  } else {
    // Cannot detect connection status, let's try to connect anyway the first time
    initWs(parameters);
  }

  // All set, let the client app know we're ready
  initListener();
};

/**
 * Initialize the WebSocket client. This allows us to synchronize with the
 * other devices for the user.
 *
 * The current implementation unfortunately mutates the wsClient variable.
 */
var initWs = function initWs(parameters) {
  sync.initWSClient(parameters.syncserver, parameters.syncroom).then(function (ws) {
    wsClient = ws;

    // Check if we need to sync the local store
    sync.checkUpdates(wsClient, clientId);

    wsClient.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        sync.handleMessage(wsClient, msg, clientId);
      } catch (err) {
        log(err);
      }
    };

    wsClient.onclose = function (event) {
      log('WebSocket connection closed');
      // Try to reconnect if the connection was closed
      if (event.wasClean === false || event.code === 1006) {
        log('..trying to reconnect');
        if (!window.timerID) {
          window.timerID = setInterval(function () {
            initWs(parameters);
          }, wsTimeout);
        }
      }
    };
  }).catch(function (err) {
    log(err);
  });
};

/**
 * Initialize the window event listener for postMessage. This allows us to
 * communicate with the apps running in the parent window of the <iframe>.
 */
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

  // Check whether message.data is a valid json
  try {
    request = message.data;
  } catch (err) {
    return;
  }

  if (request.client) {
    clientId = request.client;
  }

  // Ignore the ready message when viewing the store directly
  if (request['cross-storage'] === 'ready') return;

  // Handle polling for a ready message
  if (request['cross-storage'] === 'poll') {
    window.parent.postMessage({ 'cross-storage': 'ready' }, message.origin);
    return;
  }

  // Check whether request.method is a string
  if (!request || typeof request.method !== 'string') {
    return;
  }

  // Init a placeholder response object
  response = {
    client: clientId,
    result: {}
  };

  if (!request.method) {
    return;
  } else if (!isPermitted(origin, request.method)) {
    response.error = 'Invalid ' + request.method + ' permissions for ' + origin;
  } else {
    response = api.prepareResponse(origin, request, clientId);
    // Also send the changes to other devices
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      request.updated = response.result;
      sync.push(wsClient, 'update', origin, request);
    }
  }

  log('Change detected: ' + response);

  // postMessage requires that the target origin be set to "*" for "file://"
  targetOrigin = origin === 'file://' ? '*' : origin;
  window.parent.postMessage(response, targetOrigin);
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
 * Handles the current online status of the store (online/offline) in order
 * to manage the WebSocket client connection.
 *
 * @param   {bool} online Whether we're cure
 * @param   {object} parameters Configuration parameters
 */
var onlineStatus = function onlineStatus(online, parameters) {
  if (online) {
    initWs(parameters);
  } else {
    if (wsClient) {
      wsClient.close();
    }
    log('Working offline.');
  }
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
exports.checkUpdates = exports.handleMessage = exports.push = undefined;
exports.initWSClient = initWSClient;

var _api = require('./api');

var api = _interopRequireWildcard(_api);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function initWSClient(server, room) {
  return new Promise(function (resolve, reject) {
    server = server || 'ws://localhost:8080';
    room = room || 'foo';
    // const wsUrl = url.resolve(server, room)
    var wsUrl = window.URL !== undefined ? new window.URL(room, server) : server + room;

    var ws = new window.WebSocket(wsUrl);

    ws.onopen = function () {
      // throttle openning new sockets
      if (window.timerID) {
        window.clearInterval(window.timerID);
        delete window.timerID;
      }
      // console.log(`Connected to ${wsUrl}`)
      // TODO: check if we need to sync with other devices
      return resolve(ws);
    };

    ws.onerror = function (event) {
      var err = 'Could not connect to server at ' + wsUrl;
      // console.log(err)
      return reject(err);
    };
  });
}

/**
 * Push updated data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} type The type of the request
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
// TODO: find a better supported URL composer
// import * as url from 'url'
var push = exports.push = function push(ws, type, origin, request) {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return;
  }
  var req = {
    type: type,
    origin: origin,
    request: request
  };
  ws.send(JSON.stringify(req));
};

var handleMessage = exports.handleMessage = function handleMessage(ws, msg, client) {
  switch (msg.type) {
    case 'update':
      handleUpdates(msg, client);
      break;
    case 'check':
      exportBackup(msg, ws);
      break;
    default:
      break;
  }
};

var handleUpdates = function handleUpdates(msg, client) {
  console.log('Incoming update');
  var meta = api.getMeta(msg.origin);
  // no need to update local store if we have updated already to this version
  if (meta.updated >= msg.request.updated) {
    return;
  }
  // Prepare response for the client app
  var response = api.prepareResponse(msg.origin, msg.request, client);

  // Force the local client ID
  response.client = client;
  response.sync = true;

  // postMessage requires that the target origin be set to "*" for "file://"
  var targetOrigin = msg.origin === 'file://' ? '*' : msg.origin;
  window.parent.postMessage(response, targetOrigin);
};

var exportBackup = function exportBackup(msg, ws) {
  // Check if we have local data that was changed after the specified data
  console.log('Incoming check');
  if (msg.lastModified) {
    var meta = api.getMeta(msg.origin);
    if (meta.updated > msg.lastModified) {
      // We have fresh data and we need to send it.
      var resp = {
        type: 'update',
        client: msg.client,
        origin: msg.origin,
        request: {
          method: 'setAll',
          updated: meta.updated,
          params: api.getAll(msg.origin)
        }
      };
      console.log('Pushing update', resp);
      ws.send(JSON.stringify(resp));
    }
  }
};

var checkUpdates = exports.checkUpdates = function checkUpdates(ws, client) {
  if (!ws) {
    return;
  }
  var appList = api.metaList();
  for (var i = 0; i < appList.length; i++) {
    var meta = api.getAll('_meta_' + appList[i]);
    var req = {
      type: 'check',
      client: client,
      origin: appList[i],
      lastModified: meta.updated
    };
    ws.send(JSON.stringify(req));
  }
};
},{"./api":1}]},{},[2])(2)
});