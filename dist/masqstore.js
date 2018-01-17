(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MasqStore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Generate a PBKDF2 derived key based on user given passPhrase
 *
 * @param {string} passPhrase The passphrase that is used to derive the key
 * @returns {Promise}   A promise that contains the derived key
 */
var deriveKey = exports.deriveKey = function deriveKey() {
  var passPhrase = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var keyLenth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 18;
  var iterations = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10000;

  if (passPhrase.length === 0) {
    passPhrase = randomString(keyLenth);
  }

  // TODO: set this to a real value later
  var salt = new Uint8Array('');

  return crypto.subtle.importKey('raw', toArray(passPhrase), 'PBKDF2', false, ['deriveBits', 'deriveKey']).then(function (baseKey) {
    return crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'sha-256'
    }, baseKey, 128);
  }, logFail).then(function (derivedKey) {
    return new Uint8Array(derivedKey);
  }, logFail);
};

// Generate a random string using the Webwindow API instead of Math.random
// (insecure)
var randomString = exports.randomString = function randomString() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 18;

  var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  if (window.crypto && window.crypto.getRandomValues) {
    var values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (var i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
  } else {
    console.log("Your browser can't generate secure random numbers");
  }
  return result;
};

/**
 * Decrypt data with AES-GCM cipher
 *
 * @param {ArrayBuffer} data Data to decrypt
 * @param {ArrayBuffer} key Aes key as raw data. 128 or 256 bits
 * @param {ArrayBuffer} iv The IV with a size of 96 bits (12 bytes)
 * @param {string} mode The encryption mode : AES-GCM
 * @param {ArrayBuffer} additionalData The non-secret authenticated data
 * @returns {ArrayBuffer}
 */
var decryptBuffer = function decryptBuffer(data, key, iv, mode, additionalData) {
  // TODO: test input params
  return crypto.subtle.importKey('raw', key, {
    name: mode
  }, true, ['encrypt', 'decrypt']).then(function (bufKey) {
    return crypto.subtle.decrypt({
      name: mode,
      iv: iv,
      additionalData: additionalData
    }, bufKey, data).then(function (result) {
      return new Uint8Array(result);
    }, logFail);
  }, logFail);
};

/**
 * Encrypt data with AES-GCM cipher
 *
 * @param {ArrayBuffer} data Data to encrypt
 * @param {ArrayBuffer} key Aes key as raw data. 128 or 256 bits
 * @param {ArrayBuffer} iv The IV with a size of 96 bits (12 bytes)
 * @param {string} mode The encryption mode : AES-GCM
 * @param {ArrayBuffer} additionalData The non-secret authenticated data
 * @returns {ArrayBuffer}
 */
var encryptBuffer = function encryptBuffer(data, key, iv) {
  var mode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "aes-gcm";
  var additionalData = arguments[4];

  return crypto.subtle.importKey('raw', key, {
    name: mode
  }, true, ['encrypt', 'decrypt']).then(function (bufKey) {
    return crypto.subtle.encrypt({
      name: mode,
      iv: iv,
      additionalData: additionalData
    }, bufKey, data).then(function (result) {
      return new Uint8Array(result);
    }, logFail);
  }, logFail);
};

/**
 * Encrypt an object
 *
 * @param {ArrayBuffer} key Encryption key
 * @param {string} data A string containing data to be encrypted (e.g. a stringified JSON)
 * @param {string} additionalData The authenticated data (ex. version number :1.0.1 )
 * @returns {object} Return a promise with a JSON object having the following format :
 *     { ciphertext : {hexString}, iv : {hexString}, version : {string} }
 */
var encrypt = exports.encrypt = function encrypt(key, data, additionalData) {
  // Prepare context
  var iv = window.crypto.getRandomValues(new Uint8Array(12));
  var toEncrypt = toArray(data);

  return encryptBuffer(toEncrypt, key, iv, 'AES-GCM', toArray(additionalData)).then(function (result) {
    return { ciphertext: bufferToHexString(result), iv: bufferToHexString(iv), version: additionalData };
  }, logFail);
};

/**
 * Decrypt an object
 *
 * @param {ArrayBuffer} key Decryption key
 * @param {object} encrypted data Must contain 3 values:
 *     { ciphertext : {hexString}, iv : {hexString}, version : {string}
 * @returns {string} Return the decrypted data as a string.
 *
 */
var decrypt = exports.decrypt = function decrypt(key, data) {
  // Prepare context
  var ciphertext = hexStringToBuffer(data.ciphertext);
  var additionalData = toArray(data.version);
  var iv = hexStringToBuffer(data.iv);

  return decryptBuffer(ciphertext, key, iv, 'AES-GCM', additionalData).then(function (decrypted) {
    return toString(decrypted);
  }, logFail);
};

/**
 * Print error messages
 *
 * @param {Error} err Error message
 */
var logFail = function logFail(err) {
  console.log(err);
};

/**
 * Gets tag from encrypted data
 *
 * @param {ArrayBuffer} encrypted Encrypted data
 * @param {number} tagLength Tag length in bits. Default 128 bits
 * @returns {ArrayBuffer}
 */
var getTag = exports.getTag = function getTag(encrypted) {
  var tagLength = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 128;

  return encrypted.slice(encrypted.byteLength - (tagLength + 7 >> 3));
};

/**
 * Convert hex String to ArrayBufffer
 * ex : '11a1b2' -> Uint8Array [ 17, 161, 178 ]
 *
 * @param {String} hexString
 * @returns {ArrayBuffer}
 */
var hexStringToBuffer = exports.hexStringToBuffer = function hexStringToBuffer(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hexString');
  }
  var arrayBuffer = new Uint8Array(hexString.length / 2);

  for (var i = 0; i < hexString.length; i += 2) {
    var byteValue = parseInt(hexString.substr(i, 2), 16);
    if (isNaN(byteValue)) {
      throw new Error('Invalid hexString');
    }
    arrayBuffer[i / 2] = byteValue;
  }

  return arrayBuffer;
};

/**
 * Convert ArrayBufffer to hex String
 * ex : Uint8Array [ 17, 161, 178 ] -> '11a1b2'
 *
 * @param {ArrayBuffer} bytes
 * @returns {String}
 */
var bufferToHexString = exports.bufferToHexString = function bufferToHexString(bytes) {
  if (!bytes) {
    return null;
  }
  var hexBytes = [];

  for (var i = 0; i < bytes.length; ++i) {
    var byteString = bytes[i].toString(16);
    if (byteString.length < 2) {
      byteString = '0' + byteString;
    }
    hexBytes.push(byteString);
  }

  return hexBytes.join('');
};

/**
 * Convert ascii to ArrayBufffer
 * ex : "bonjour" -> Uint8Array [ 98, 111, 110, 106, 111, 117, 114 ]
 *
 * @param {String} str
 * @returns {ArrayBuffer}
 */
var toArray = exports.toArray = function toArray() {
  var str = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  var chars = [];
  for (var i = 0; i < str.length; ++i) {
    chars.push(str.charCodeAt(i));
  }
  return new Uint8Array(chars);
};

/**
 * Convert ArrayBufffer to ascii
 * ex : Uint8Array [ 98, 111, 110, 106, 111, 117, 114 ] -> "bonjour"
 *
 * @param {ArrayBuffer} bytes
 * @returns {String}
 */
var toString = exports.toString = function toString(bytes) {
  return String.fromCharCode.apply(null, new Uint8Array(bytes));
};
},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unregisterApp = exports.registerApp = exports.syncApps = exports.syncApp = exports.init = undefined;

var _store = require('./store');

Object.keys(_store).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _store[key];
    }
  });
});

var _sync = require('./sync');

var sync = _interopRequireWildcard(_sync);

var store = _interopRequireWildcard(_store);

var _permissions = require('./permissions');

var acl = _interopRequireWildcard(_permissions);

var _crypto = require('./crypto');

var crypto = _interopRequireWildcard(_crypto);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var parameters = {};
// Export API

var wsClient = void 0;
var devSyncServer = 'ws://localhost:8080';
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
 *   debug: false,
 *   syncroom: 'someRandomName',
 *   syncserver: 'wss://....'
 * });
 *
 * @param {array} params An array of objects used for configuration
 */
var init = exports.init = function init() {
  var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  parameters = params;

  log('Initializing Masq Store...');

  // Return if storage api is unavailable
  if (!store.available()) {
    try {
      window.parent.postMessage({ 'cross-storage': 'unavailable' }, '*');
      return;
    } catch (e) {
      log(e);
      return e;
    }
  }

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
var initWs = function initWs(params) {
  if (wsClient) {
    try {
      wsClient.close();
    } catch (e) {
      // no need to do anything
    }
  }
  if (!params) {
    params = parameters;
  }

  // reconnect handler
  var reconnect = function reconnect() {
    log('..trying to reconnect');
    setTimeout(function () {
      initWs(parameters);
    }, wsTimeout);
  };

  log('Initializing WebSocket with params:', params);
  sync.initWSClient(params.syncserver, params.syncroom).then(function (ws) {
    wsClient = ws;
    if (params.cryptoKey) {
      wsClient.cryptoKey = crypto.hexStringToBuffer(params.cryptoKey);
    }

    wsClient.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.ciphertext && wsClient.cryptoKey) {
          // decrypt message first
          crypto.decrypt(wsClient.cryptoKey, msg).then(function (decrypted) {
            try {
              sync.handleMessage(wsClient, JSON.parse(decrypted), clientId);
            } catch (err) {
              console.log(err);
            }
          }).catch(function (err) {
            console.log(err);
          });
        } else {
          sync.handleMessage(wsClient, msg, clientId);
        }
      } catch (err) {
        log(err);
      }
    };

    wsClient.onclose = function (event) {
      log('WebSocket connection closed', event);
      // Try to reconnect if the connection was closed
      if (event.wasClean === false || event.code === 1006) {
        reconnect();
      }
    };

    // Check if we need to sync the local store
    sync.check(wsClient, clientId);

    // Check if we need to sync all apps
    if (params.syncApps) {
      syncApps();
    }
  }).catch(function (err) {
    log('Failed to initialize WebSocket.', err);
    reconnect();
  });
};

/**
 * Initialize the data store for the app origin.
 */
var initApp = function initApp(origin, params) {
  console.log('Initializing app ' + origin);
  // permissionList = params.permissions || []

  // Force register the app for now (until we have proper UI)
  if (parameters.autoregister) {
    registerApp(origin);
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
    // } else if (!isPermitted(origin, request.method)) {
    // response.error = `Invalid ${request.method} permissions for ${origin}`
  } else {
    request.updated = util.now();
    response = store.prepareResponse(origin, request, clientId);
    // Also send the changes to other devices if sync is active
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      var meta = store.getMeta(origin);
      if (meta.sync) {
        request.updated = meta.updated;
        sync.push(wsClient, origin, request);
      }
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

  if (util.isLocal(origin)) {
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
  params.syncserver = params.syncserver || devSyncServer;
  if (online || util.isLocal(params.syncserver)) {
    initWs(params);
  } else {
    if (wsClient) {
      wsClient.close();
    }
    log('Working offline.');
  }
};

/**
 * Force sync a given app
 *
 * @param   {string} url The URL of the app
 */
var syncApp = exports.syncApp = function syncApp(url) {
  if (url && url.length > 0) {
    sync.checkOne(wsClient, clientId, url);
  }
};

/**
 * Sync app metadata from remote devices
 *
 */
var syncApps = exports.syncApps = function syncApps() {
  sync.syncApps(wsClient);
};

/**
 * Register a given app based on its URL
 *
 * @param   {string} url The URL of the app
 * @param   {object} meta An object containing additional meta data for the app
 */
var registerApp = exports.registerApp = function registerApp(url) {
  var meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (url && url.length > 0) {
    var origin = util.getOrigin(url);
    if (!store.exists(origin)) {
      store.setAll(origin, {});

      meta.origin = origin;
      meta.permissions = meta.permissions || defaultPermissions;

      var updatedMeta = store.setMeta(origin, meta);
      // Trigger sync if this was a new app we just added
      sync.checkOne(wsClient, clientId, origin);
      log('Registered app:', origin);
      return updatedMeta;
    }
  }
};

/**
 * Unregister a given app based on its origin
 *
 * @param   {string} origin The origin of the app
 */
var unregisterApp = exports.unregisterApp = function unregisterApp(origin) {
  if (!origin || origin.length === 0) {
    return;
  }
  store.clear(origin);
  store.clear(store.META + '_' + origin);
};
},{"./crypto":1,"./permissions":3,"./store":4,"./sync":5,"./util":6}],3:[function(require,module,exports){
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
},{"./store":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.available = exports.exists = exports.importJSON = exports.exportJSON = exports.metaList = exports.appList = exports.setMeta = exports.getMeta = exports.setAll = exports.getAll = exports.clearAll = exports.clear = exports.del = exports.get = exports.set = exports.updateUser = exports.user = exports.prepareResponse = exports.USER = exports.META = undefined;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// Default storage API
var store = window.localStorage;

var META = exports.META = '_meta';
var USER = exports.USER = '_user';

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
  if (exists(origin)) {
    var meta = getMeta(origin);
    if (request.updated) {
      meta.updated = request.updated;
    }
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
 * Wrapper function that returns the public profile of the user.
 *
 * @returns {object} Public profile data
 */
var user = exports.user = function user() {
  return getAll(USER);
};

/**
 * Wrapper function that updates the public profile of the user.
 * picture and the name.
 *
 * @param {object} data Public profile data
 */
var updateUser = exports.updateUser = function updateUser(data) {
  return setAll(USER, data);
};

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
 */
var del = exports.del = function del(origin, params) {
  var data = getAll(origin);
  for (var i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]];
  }
  // persist data in th
  store.setItem(origin, JSON.stringify(data));
};

/**
 * Clears storage for a given key.
 *
 * @param {string} key The element to clear from localStorage
 */
var clear = exports.clear = function clear(key) {
  store.removeItem(key);
};

/**
 * Clears all store items.
 *
 */
var clearAll = exports.clearAll = function clearAll() {
  for (var i = 0; i < store.length; i++) {
    store.removeItem(store.key(i));
  }
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
 */
var setAll = exports.setAll = function setAll(origin, data) {
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
 * @return  {object} The updated meta object
 */
var setMeta = exports.setMeta = function setMeta(origin, data) {
  if (!origin) {
    console.log('Missing origin when trying to set meta data.');
    return;
  }
  if (!data.origin) {
    data.origin = origin;
  }

  origin = origin === META ? META : META + '_' + origin;

  // Update the root store meta
  if (data.updated) {
    var rootMeta = getMeta();
    rootMeta.updated = data.updated;
    store.setItem(META, JSON.stringify(rootMeta));
  }

  store.setItem(origin, JSON.stringify(data));

  return data;
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
    if (item.indexOf(META + '_') === 0 && item !== META) {
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
},{"./util":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.syncApps = exports.checkOne = exports.check = exports.push = exports.handleMessage = undefined;
exports.initWSClient = initWSClient;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _store = require('./store');

var store = _interopRequireWildcard(_store);

var _crypto = require('./crypto');

var crypto = _interopRequireWildcard(_crypto);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function initWSClient(server, room) {
  return new Promise(function (resolve, reject) {
    // const wsUrl = url.resolve(server, room)
    if (!server || !room) {
      return reject(new Error('No WebSocket server or room provided.'));
    }
    var wsUrl = window.URL !== undefined ? new window.URL(room, server) : server + room;

    var ws = new window.WebSocket(wsUrl);

    ws.onopen = function () {
      console.log('Connected to Sync server at ' + wsUrl);
      // TODO: check if we need to sync with other devices
      return resolve(ws);
    };

    ws.onerror = function (event) {
      var err = new Error('Could not connect to Sync server at ' + wsUrl);
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
// TODO: find a better supported URL composer
// import * as url from 'url'
var handleMessage = exports.handleMessage = function handleMessage(ws, msg, client) {
  switch (msg.type) {
    case 'sync':
      updateHandler(msg, client);
      break;
    case 'check':
      checkHandler(msg, ws, client);
      break;
    case 'import':
      importHandler(msg, ws, client);
      break;
    case 'export':
      exportHandler(msg, ws, client);
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
    send(ws, req);
  }
};

/**
 * Handle incoming data updates and propagate the changes to the client app.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {string} client The local client ID
 */
var updateHandler = function updateHandler(msg, client) {
  if (!msg.origin) {
    return;
  }
  var meta = store.getMeta(msg.origin);
  // no need to update local store if we have updated already to this version
  if (util.inTheFuture(msg.request.updated)) {
    return;
  }
  if (util.isEmpty(meta) || meta.updated > msg.request.updated || !meta.sync) {
    return;
  }

  // Prepare response for the client app
  store.prepareResponse(msg.origin, msg.request, client);

  // Force the local client ID
  msg.client = msg.request.client || client;
  msg.sync = true;

  // postMessage requires that the target origin be set to "*" for "file://"
  var targetOrigin = msg.origin === 'file://' ? '*' : msg.origin;
  // only need to notify parent if running in an iframe
  if (window.self !== window.top) {
    window.parent.postMessage(msg, targetOrigin);
  }
};

/**
 * Broadcast an update if we have fresh data that other devices do not.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {object} ws The WebSocket client
 * @param   {string} client The app client ID
 */
var checkHandler = function checkHandler(msg, ws) {
  var client = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  // Check if we have local data that was changed after the specified data
  // but ignore request if the received timestamp comes from the future
  if (store.exists(msg.origin) && msg.updated !== undefined && !util.inTheFuture(msg.updated)) {
    var meta = store.getMeta(msg.origin);
    if (msg.updated > meta.updated) {
      // Remote device has fresh data, we need to check and get it
      check(ws, client);
    } else if (meta.updated > 0 && msg.updated < meta.updated) {
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
      send(ws, resp);
    }
  }
};

/**
 * Send local list of apps to remote device.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {object} ws The WebSocket client
 * @param   {string} client The app client ID
 */
var importHandler = function importHandler(msg, ws) {
  var client = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  var apps = store.metaList();
  if (apps.length === 0) {
    return;
  }
  var list = [];
  apps.forEach(function (key) {
    var app = {};
    app.key = key;
    app.data = store.getAll(key);
    if (app.data.sync) {
      // clear irrelevant data
      delete app.data.updated;
      app.data.sync = false;
      list.push(app);
    }
  });
  var resp = {
    type: 'export',
    client: msg.client,
    origin: msg.origin,
    list: list
  };
  console.log(resp);
  send(ws, resp);
};

/**
 * Store remote list of apps locally.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {object} ws The WebSocket client
 * @param   {string} client The app client ID
 */
var exportHandler = function exportHandler(msg, ws) {
  var client = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  if (!msg.list || !Array.isArray(msg.list)) {
    return;
  }
  msg.list.forEach(function (app) {
    if (!store.exists(app.key)) {
      store.setAll(app.key, app.data);
      store.setAll(app.data.origin, {});
      // Send event to UI app
      var event = new window.CustomEvent('syncapp', { detail: app.data });
      window.dispatchEvent(event);
    }
  });
};

/**
 * Check if the other devices have an update for us.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 * @param   {array} list A list of app origins to check
 */
var check = exports.check = function check(ws) {
  var client = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var list = arguments[2];

  if (!ws) {
    return;
  }
  var appList = list || store.metaList();
  if (appList.length === 0) {
    return;
  }

  for (var i = 0; i < appList.length; i++) {
    var meta = store.getAll(appList[i]);
    if (meta.sync) {
      meta.updated = meta.updated || 0;
      var req = {
        type: 'check',
        client: client,
        origin: meta.origin,
        updated: meta.updated
      };
      send(ws, req);
    }
  }
};

/**
 * Check if the other devices have an update for a given app.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 * @param   {string} origin The app origin to check
 */
var checkOne = exports.checkOne = function checkOne(ws) {
  var client = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var origin = arguments[2];

  if (!ws) {
    return;
  }
  var meta = store.getMeta(origin);
  meta.updated = meta.updated || 0;
  var req = {
    type: 'check',
    client: client,
    origin: meta.origin,
    updated: meta.updated
  };
  send(ws, req);
};

/**
 * Force sync of app metadata from other devices.
 * This is typically done right after pairing a new device.
 *
 * @param   {object} ws The WebSocket client
 */
var syncApps = exports.syncApps = function syncApps(ws) {
  if (!ws) {
    return;
  }
  var req = {
    type: 'import'
  };
  send(ws, req);
};

/**
 * Send a message using a WebSocket session
 *
 * @param   {object} ws The WebSocket client
 * @param   {object} data The data to be sent
 */
var send = function send(ws, data) {
  if (ws.cryptoKey) {
    crypto.encrypt(ws.cryptoKey, JSON.stringify(data), '').then(function (encrypted) {
      ws.send(JSON.stringify(encrypted));
    });
    return;
  }
  ws.send(JSON.stringify(data));
};
},{"./crypto":1,"./store":4,"./util":6}],6:[function(require,module,exports){
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
 * Check if a timestamp is in the future w.r.t. current local time.
 *
 * @param   {int} ts The timestamp to check
 * @return  {bool} Whether the timestamp is in the future or not
 */
var inTheFuture = exports.inTheFuture = function inTheFuture() {
  var ts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

  // Allow 60 seconds of delay
  return ts > now() + 60000;
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

/**
 * Check if an (origin) URL is local based on the RFC 1918 list of reserved
 * addresses. It accepts http(s) and ws(s) schemas as well as port numbers.
 *
 * localhost
 * 127.0.0.0 – 127.255.255.255
 * 10.0.0.0 – 10.255.255.255
 * 172.16.0.0 – 172.31.255.255
 * 192.168.0.0 – 192.168.255.255
 * + extra zero config range on IEEE 802 networks:
 * 169.254.1.0 - 169.254.254.255
 *
 * Example:
 * http://localhost:8080
 * https://192.168.1.112
 * ws://10.8.8.8:9999
 * 169.254.22.99
 *
 * @param {string} url The (origin) URL to check
 * @return {bool} True if it's local
 */
var isLocal = exports.isLocal = function isLocal(url) {
  if (!url || url.length === 0) {
    return false;
  }
  var localNets = [/^(https?:\/\/|wss?:\/\/)?localhost+(:[0-9]*)?/, /^(https?:\/\/|wss?:\/\/)?127\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^(https?:\/\/|wss?:\/\/)?10\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^(https?:\/\/|wss?:\/\/)?172\.(1[89]|2[0-9]|3[01])\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^(https?:\/\/|wss?:\/\/)?192\.168\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/, /^(https?:\/\/|wss?:\/\/)?169\.254\.([1-9]|[1-9]\d|1\d\d|2([0-4]\d|5[0-4]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/];
  for (var i = 0; i < localNets.length; i++) {
    var entry = localNets[i];
    if (!(entry instanceof RegExp)) {
      continue;
    }
    if (entry.test(url)) {
      return true;
    }
  }
  return false;
};

/**
 * Transform the base64 representation of an image into a real image
 *
 * @param {string} base64data The base64 encoding of an image
 */
var dataToImg = exports.dataToImg = function dataToImg(base64data) {
  var data = base64data.split(',')[1];
  var binary = void 0;
  if (base64data.split(',')[0].indexOf('base64') >= 0) {
    binary = atob(data);
  } else {
    binary = decodeURI(data);
  }

  var buffer = new ArrayBuffer(binary.length);
  var ia = new Uint8Array(buffer);
  for (var i = 0; i < binary.length; i++) {
    ia[i] = binary.charCodeAt(i);
  }
  var blob = new Blob([ia], { type: $scope.imageType });

  return blob;
};
},{}]},{},[2])(2)
});