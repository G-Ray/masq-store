(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MasqStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWhitelisted = exports.importJSON = exports.exportJSON = exports.appList = exports.unregisterApp = exports.registerApp = exports.init = undefined;

var _sync = require('./sync');

var sync = _interopRequireWildcard(_sync);

var _store = require('./store');

var store = _interopRequireWildcard(_store);

var _permissions = require('./permissions');

var acl = _interopRequireWildcard(_permissions);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var parameters = {};
var wsClient = void 0;
var clientId = '';
var availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll', 'user'];
var defaultPermissions = availableMethods;
var wsTimeout = 3000; // Waiting (3s) for another attempt to reconnect to the WebSocket server

var log = function log() {
  for (var _len = arguments.length, text = Array(_len), _key = 0; _key < _len; _key++) {
    text[_key] = arguments[_key];
  }

  if (parameters.debug) {
    console.log('[Masq Store]', text);
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
 *    message is sent to the parent window once initialized.
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
 * @param {array} options An array of objects used for configuration
 */
var init = exports.init = function init(options) {
  parameters = options || {};
  console.log(parameters);
  // Return if storage api is unavailable
  if (!store.available()) {
    try {
      return window.parent.postMessage({ 'cross-storage': 'unavailable' }, '*');
    } catch (e) {
      return;
    }
  }

  // Initialize the window event listener for postMessage. This allows us to
  // communicate with the apps running in the parent window of the <iframe>.
  if (window.addEventListener) {
    window.addEventListener('message', listener, false);
  } else {
    window.attachEvent('onmessage', listener);
  }
  // All set, let the app know we're listening
  window.parent.postMessage({ 'cross-storage': 'listening' }, '*');

  log('Listening to clients...');
};

/**
 * Initialize the WebSocket client. This allows us to synchronize with the
 * other devices for the user.
 *
 * The current implementation unfortunately mutates the wsClient variable.
 */
var initWs = function initWs() {
  if (wsClient && wsClient.readyState === wsClient.OPEN) {
    return;
  }
  console.log('initting WS');
  sync.initWSClient(parameters.syncserver, parameters.syncroom).then(function (ws) {
    wsClient = ws;

    // Check if we need to sync the local store
    sync.check(wsClient, clientId);

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
 * Initialize the data store for the app origin.
 */
var initApp = function initApp(origin, params) {
  console.log('Attempting to initialize app: ' + origin);
  // permissionList = params.permissions || []

  // Force register the app for now (until we have proper UI)
  store.registerApp(origin);

  // Listen to online/offline events in order to trigger sync
  if (navigator.onLine !== undefined) {
    window.addEventListener('online', function () {
      onlineStatus(true, params);
    });
    window.addEventListener('offline', function () {
      onlineStatus(false, params);
    });

    onlineStatus(navigator.onLine, params);
  } else {
    // Cannot detect connection status, try to force connect the first time
    initWs(params);
  }

  window.parent.postMessage({ 'cross-storage': 'ready' }, origin);
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

  if (request['cross-storage'] === 'init') {
    initApp(origin, request.params);
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
    // Disable permission check for now since we do not share data between origins
  } else if (!isPermitted(origin, request.method)) {
    response.error = 'Invalid ' + request.method + ' permissions for ' + origin;
  } else {
    response = store.prepareResponse(origin, request, clientId);
    // Also send the changes to other devices
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      request.updated = response.result;
      sync.push(wsClient, origin, request);
    }
  }

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
  if (availableMethods.indexOf(method) < 0) {
    return false;
  }

  if (isWhitelisted(origin)) {
    return true;
  }

  if (acl.getPermissions(origin).indexOf(method) >= 0) {
    return true;
  }

  return false;
};

/**
 * Handles the current online status of the store (online/offline) in order
 * to manage the WebSocket client connection.
 *
 * @param   {bool} online Whether we're cure
 * @param   {object} params Configuration parameters
 */
var onlineStatus = function onlineStatus(online, params) {
  if (online) {
    initWs(params);
  } else {
    if (wsClient) {
      wsClient.close();
    }
    log('Working offline.');
  }
};

/**
 * Register a given app based on its origin
 *
 * @param   {string} origin The origin of the app
 * @param   {string} permissions The list of permisssions for the app
 */
var registerApp = exports.registerApp = function registerApp(origin) {
  var permissions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  // Set default list of permissions to everything for now
  if (permissions.length === 0) {
    permissions = defaultPermissions;
  }
  store.registerApp(origin, permissions);
};

/**
 * Unregister a given app based on its origin
 *
 * @param   {string} origin The origin of the app
 */
var unregisterApp = exports.unregisterApp = function unregisterApp(origin) {
  store.unregisterApp(origin);
};

var appList = exports.appList = function appList() {
  return store.appList();
};

/**
 * Exports all the data in the store
 *
 * @return {object} The contents of the store as key:value pairs
 */
var exportJSON = exports.exportJSON = function exportJSON() {
  return store.exportJSON();
};

/**
 * Imports all the data from a different store
 *
 * @param {object} data The contents of the store as a JSON object
 */
var importJSON = exports.importJSON = function importJSON(data) {
  store.importJSON(data);
};

/**
 * Check if an app origin is whitelisted
 *
 * @param {string} origin The origin of the app
 * @return {bool} True if whitelisted
 */
var isWhitelisted = exports.isWhitelisted = function isWhitelisted(origin) {
  var permissionList = [/^https?:\/\/localhost+(:[0-9]*)?/, /^https?:\/\/127\.0\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^https?:\/\/192\.168\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^https?:\/\/172\.18\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/];
  for (var i = 0; i < permissionList.length; i++) {
    var entry = permissionList[i];
    if (!(entry instanceof RegExp)) {
      continue;
    }
    if (entry.test(origin)) {
      return true;
    }
  }
  return false;
};
},{"./permissions":2,"./store":3,"./sync":4}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setPermissions = exports.getPermissions = undefined;

var _store = require('./store');

var store = _interopRequireWildcard(_store);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Gets the permission list for a given origin.
 *
 * @param   {string} origin The origin of the app
 * @return  {array} List of permissions
 */
var getPermissions = exports.getPermissions = function getPermissions(origin) {
  var meta = store.getMeta(origin);
  return meta.permissions || [];
};

/**
 * Sets the permission list for a given origin.
 *
 * @param   {string} origin The origin of the app
 * @param   {array} list List of permissions
 */
var setPermissions = exports.setPermissions = function setPermissions(origin) {
  var list = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var meta = store.getMeta(origin);
  meta.permissions = list;
  store.setMeta(origin, meta);
};
},{"./store":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.available = exports.exists = exports.importJSON = exports.exportJSON = exports.metaList = exports.appList = exports.unregisterApp = exports.registerApp = exports.setMeta = exports.getMeta = exports.setAll = exports.getAll = exports.clear = exports.del = exports.get = exports.set = exports.user = exports.prepareResponse = exports.META = exports.USER = undefined;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// Default storage API
var store = window.localStorage;

var USER = exports.USER = '_user';
var META = exports.META = '_meta';

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
  if (exists(origin)) {
    try {
      // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
      switch (request.method) {
        case 'user':
          result = user();
          break;
        case 'get':
          result = get(origin, request.params);
          break;
        case 'set':
          set(origin, request.params);
          // update the meta data and return the timestamp
          result = setMeta(origin, meta);
          break;
        case 'del':
          del(origin, request.params);
          // update the meta data and return the timestamp
          result = setMeta(origin, meta);
          break;
        case 'clear':
          result = clear(origin);
          break;
        case 'getAll':
          result = getAll(origin);
          break;
        case 'setAll':
          setAll(origin, request.params);
          // update the meta data and return the timestamp
          result = setMeta(origin, meta);
          break;
        default:
          break;
      }
    } catch (err) {
      error = err.message;
    }
  } else {
    error = 'UNREGISTERED';
  }

  var ret = {
    client: request.client || client,
    error: error,
    result: result
  };

  return ret;
};

/**
 * Returns the public profile of the user, including the picture and the name.
 * @returns {object} Public profile data
 */
var user = exports.user = function user() {
  return getAll(USER);
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
};

/**
 * Wrapper around the getAll function to get the meta for an origin
 *
 * @param   {string} origin The origin of the request
 * @return  {object} The metadata corresponding to the origin
 */
var getMeta = exports.getMeta = function getMeta(origin) {
  var item = origin ? META + '_' + origin : META;
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
  var updated = data.updated ? data.updated : util.now();

  // Update the global store meta
  var meta = getAll(META);
  meta.updated = updated;
  store.setItem(META, JSON.stringify(meta));

  // Update the meta data for the given origin
  if (!data.updated) {
    data.updated = updated;
  }
  store.setItem(META + '_' + origin, JSON.stringify(data));

  return updated;
};

/**
 * Registers the data store for an app URL.
 *
 * @param   {string} url The URL of the app
 * @param   {array} perms The list of permissions for the app
 */
var registerApp = exports.registerApp = function registerApp(url) {
  var perms = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  if (!url || url.length === 0) {
    return;
  }
  var origin = util.getOrigin(url);
  if (!exists(origin)) {
    store.setItem(origin, '{}');

    var meta = {
      permissions: perms,
      updated: 0
    };
    store.setItem(META + '_' + origin, JSON.stringify(meta));
  }
};

/**
 * Unregisters the data store for an app (origin).
 *
 * @param   {string} origin The origin of the app
 */
var unregisterApp = exports.unregisterApp = function unregisterApp(origin) {
  if (!origin) {
    return;
  }
  clear(origin);
  clear(META + '_' + origin);
};

/**
 * Get a list of all the origins (apps) that store local data
 *
 * @return {array} Array containing all the origins
 */
var appList = exports.appList = function appList() {
  var list = [];
  for (var i = 0; i < store.length; i++) {
    if (store.key(i).indexOf('http') === 0) {
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
    if (item.indexOf(META) === 0) {
      list.push(item);
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
  if (!data || util.isEmpty(data)) {
    return;
  }

  for (var item in data) {
    if (data.hasOwnProperty(item)) {
      setAll(item, data[item]);
    }
  }
};

/**
 * Verify if a key exists in the store
 *
 * @param {string} item They key to check
 */
var exists = exports.exists = function exists(item) {
  for (var i = 0; i < store.length; i++) {
    if (store.key(i) === item) {
      return true;
    }
  }
  return false;
};

/**
 * Check if the storage API is available
 *
 * @return {bool} Availability status
 */
var available = exports.available = function available() {
  var status = true;
  try {
    if (!store) {
      status = false;
    }
  } catch (err) {
    status = false;
    console.log(err);
  }
  return status;
};
},{"./util":5}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.check = exports.push = exports.handleMessage = undefined;
exports.initWSClient = initWSClient;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _store = require('./store');

var store = _interopRequireWildcard(_store);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// TODO: find a better supported URL composer
// import * as url from 'url'
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
 * Handle incoming messages received by the WebSocket client.
 *
 * @param   {object} ws The WebSocket client
 * @param   {object} msg The message recived by the WebSocket
 * @param   {string} client The local client ID
 */
var handleMessage = exports.handleMessage = function handleMessage(ws, msg, client) {
  switch (msg.type) {
    case 'sync':
      updateHandler(msg, client);
      break;
    case 'check':
      checkHandler(msg, ws, client);
      break;
    default:
      break;
  }
};

/**
 * Push updated data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
var push = exports.push = function push(ws, origin, request) {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return;
  }
  var req = {
    type: 'sync',
    origin: origin,
    request: request
  };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(req));
  }
};

/**
 * Handle incoming data updates and propagate the changes to the client app.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {string} client The local client ID
 */
var updateHandler = function updateHandler(msg, client) {
  var meta = store.getMeta(msg.origin);
  // no need to update local store if we have updated already to this version
  if (inTheFuture(msg.request.updated)) {
    return;
  }

  if (!meta || util.isEmpty(meta) || meta.updated >= msg.request.updated) {
    return;
  }

  console.log('Syncing data for', msg.origin);

  // Prepare response for the client app
  var response = store.prepareResponse(msg.origin, msg.request, client);

  // Force the local client ID
  response.client = client;
  response.sync = true;

  // postMessage requires that the target origin be set to "*" for "file://"
  var targetOrigin = msg.origin === 'file://' ? '*' : msg.origin;
  window.parent.postMessage(response, targetOrigin);
};

/**
 * Broadcast an update if we have fresh data that other devices do not.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {object} ws The WebSocket client
 */
var checkHandler = function checkHandler(msg, ws) {
  var client = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  // Check if we have local data that was changed after the specified data
  // but ignore request if the received timestamp comes from the future
  if (msg.updated && !inTheFuture(msg.updated)) {
    var meta = store.getMeta(msg.origin);
    if (msg.updated > meta.updated) {
      // Remote device has fresh data, we need to check and get it
      check(ws, client);
    } else {
      // We have fresh data and we need to send it.
      var resp = {
        type: 'sync',
        client: msg.client,
        origin: msg.origin,
        request: {
          method: 'setAll',
          updated: meta.updated,
          params: store.getAll(msg.origin)
        }
      };
      ws.send(JSON.stringify(resp));
    }
  }
};

/**
 * Check if the other devices have an update for us.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 */
var check = exports.check = function check(ws) {
  var client = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  if (!ws) {
    return;
  }
  var appList = store.metaList();
  if (appList.length === 0) {
    return;
  }

  console.log('Checking for updates on other peers');
  for (var i = 0; i < appList.length; i++) {
    var meta = store.getAll(appList[i]);
    var req = {
      type: 'check',
      client: client,
      origin: appList[i].split(store.META + '_')[1],
      updated: meta.updated
    };
    ws.send(JSON.stringify(req));
  }
};

/**
 * Check if a timestamp is in the future w.r.t. current local time.
 *
 * @param   {int} ts The timestamp to check
 * @return  {bool} Whether the timestamp is in the future or not
 */
var inTheFuture = function inTheFuture() {
  var ts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

  return ts > util.now();
};
},{"./store":3,"./util":5}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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

/**
 * Returns whether or not an object is empty.
 *
 * @param   {object} obj The object to check
 * @returns {bool} Whether or not the object is empoty
 */
var isEmpty = exports.isEmpty = function isEmpty(obj) {
  return Object.keys(obj).length === 0;
};

/**
 * Returns whether or not the parameter is an object.
 *
 * @param   {*} obj The object to check
 * @returns {bool} Whether or not the parameter is an object
 */
var isObject = exports.isObject = function isObject(thing) {
  return (typeof thing === 'undefined' ? 'undefined' : _typeof(thing)) === 'object';
};

/**
 * Creates an origin URL based on a given URI value
 *
 * @param   {string} url The url to use for the origin
 * @returns {string} The origin value
 */
var getOrigin = exports.getOrigin = function getOrigin(url) {
  var uri = void 0,
      protocol = void 0,
      origin = void 0;

  uri = document.createElement('a');
  uri.href = url;

  if (!uri.host) {
    uri = window.location;
  }

  if (!uri.protocol || uri.protocol === ':') {
    protocol = window.location.protocol;
  } else {
    protocol = uri.protocol;
  }

  origin = protocol + '//' + uri.host;
  origin = origin.replace(/:80$|:443$/, '');

  return origin;
};
},{}]},{},[1])(1)
});