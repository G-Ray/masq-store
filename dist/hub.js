(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MasqHub = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var debug = false;
var permissionList = [];
var availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll'];

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

  debug = parameters.debug;
  permissionList = parameters.permissions || [];
  installListener();
  window.parent.postMessage({ 'cross-storage': 'ready' }, '*');

  log('Listening to clients...');
};

/**
 * Installs the necessary listener for the window message event. Accommodates
 * IE8 and up.
 *
 * @private
 */
var installListener = function installListener() {
  if (window.addEventListener) {
    window.addEventListener('message', listener, false);
  } else {
    window.attachEvent('onmessage', listener);
  }
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
      method = void 0,
      error = void 0,
      result = void 0,
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

  if (!request.method) {
    return;
  } else if (!isPermitted(origin, request.method)) {
    error = 'Invalid ' + request.method + ' permissions for ' + origin;
  } else {
    try {
      log(request.method);
      // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
      switch (request.method) {
        case 'get':
          result = get(origin, request.params);
          break;
        case 'set':
          result = set(origin, request.params);
          break;
        case 'del':
          result = del(origin, request.params);
          break;
        case 'clear':
          result = clear(origin, request.params);
          break;
        case 'getAll':
          result = getAll(origin, request.params);
          break;
        case 'setAll':
          result = setAll(origin, request.params);
          break;
        default:
          break;
      }
    } catch (err) {
      error = err.message;
    }
  }

  response = {
    client: request.client,
    error: error,
    result: result
  };

  log('Sendind response data:', response);

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

  if (!inArray(method, availableMethods)) {
    return false;
  }

  for (i = 0; i < permissionList.length; i++) {
    entry = permissionList[i];
    if (!(entry.origin instanceof RegExp) || !(entry.allow instanceof Array)) {
      continue;
    }

    match = entry.origin.test(origin);
    if (match && inArray(method, entry.allow)) {
      return true;
    }
  }

  return false;
};

/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 */
var set = function set(origin, params) {
  // TODO throttle writing to once per second
  var data = getAll(origin);
  data[params.key] = params.value;
  window.localStorage.setItem(origin, JSON.stringify(data));
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
var get = function get(origin, params) {
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
var del = function del(origin, params) {
  var data = getAll(origin);
  for (var i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]];
  }
  window.localStorage.setItem(origin, JSON.stringify(data));
};

/**
 * Clears localStorage.
 *
 * @param {string} origin The origin of the request
 */
var clear = function clear(origin) {
  window.localStorage.removeItem(origin);
};

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
var getAll = function getAll(origin) {
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
var setAll = function setAll(origin, data) {
  window.localStorage.setItem(origin, JSON.stringify(data));
};

/**
 * Returns whether or not a value is present in the array. Consists of an
 * alternative to extending the array prototype for indexOf, since it's
 * unavailable for IE8.
 *
 * @param   {*}    value The value to find
 * @param   {[]*}  array The array in which to search
 * @returns {bool} Whether or not the value was found
 */
var inArray = function inArray(value, array) {
  for (var i = 0; i < array.length; i++) {
    if (value === array[i]) return true;
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

/**
 * A cross-browser version of Date.now compatible with IE8 that avoids
 * modifying the Date object.
 *
 * @return {int} The current timestamp in milliseconds
 */
// const now = () => {
//   if (typeof Date.now === 'function') {
//     return Date.now()
//   }

//   return new Date().getTime()
// }
},{}]},{},[1])(1)
});