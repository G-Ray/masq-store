;(function (root) {
  var MasqHub = {}

  MasqHub._log = function (text) {
    if (MasqHub._debug) {
      console.log(text)
    }
  }

  /**
   * Forked from https://github.com/zendesk/cross-storage
   *
   * Accepts an array of objects used for configuration:
   *  - an array of permissions containing objects with two keys: origin and allow.
   *    The value of origin is expected to be a RegExp, and allow, an array of strings.
   *    The cross storage hub is then initialized to accept requests from any of
   *    the matching origins, allowing access to the associated lists of methods.
   *    Methods may include any of: get, set, del, getData and clear. A 'ready'
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
  MasqHub.init = function (parameters) {
    var available = true

    // Return if localStorage is unavailable, or third party
    // access is disabled
    try {
      if (!window.localStorage) available = false
    } catch (e) {
      available = false
    }

    if (!available) {
      try {
        return window.parent.postMessage({'cross-storage': 'unavailable'}, '*')
      } catch (e) {
        return
      }
    }

    MasqHub._debug = parameters.debug || false
    MasqHub._permissions = parameters.permissions || []
    MasqHub._installListener()
    window.parent.postMessage({'cross-storage': 'ready'}, '*')

    MasqHub._log('Listening to clients...')
  }

  /**
   * Installs the necessary listener for the window message event. Accommodates
   * IE8 and up.
   *
   * @private
   */
  MasqHub._installListener = function () {
    var listener = MasqHub._listener
    if (window.addEventListener) {
      window.addEventListener('message', listener, false)
    } else {
      window.attachEvent('onmessage', listener)
    }
  }

  /**
   * The message handler for all requests posted to the window. It ignores any
   * messages having an origin that does not match the originally supplied
   * pattern. Given a JSON object with one of get, set, del or getData as the
   * method, the function performs the requested action and returns its result.
   *
   * @param {MessageEvent} message A message to be processed
   */
  MasqHub._listener = function (message) {
    var origin, targetOrigin, request, method, error, result, response

    // postMessage returns the string "null" as the origin for "file://"
    origin = (message.origin === 'null') ? 'file://' : message.origin

    // Handle polling for a ready message
    if (message.data['cross-storage'] === 'poll') {
      return window.parent.postMessage({'cross-storage': 'ready'}, message.origin)
    }

    // Ignore the ready message when viewing the hub directly
    if (message.data['cross-storage'] === 'ready') return

    // Check whether message.data is a valid json
    try {
      request = message.data
    } catch (err) {
      return
    }

    // Check whether request.method is a string
    if (!request || typeof request.method !== 'string') {
      return
    }

    if (!request.method) {
      return
    } else if (!MasqHub._permitted(origin, request.method)) {
      error = 'Invalid ' + request.method + ' permissions for ' + origin
    } else {
      try {
        result = MasqHub['_' + request.method](origin, request.params)
      } catch (err) {
        error = err.message
      }
    }

    response = {
      client: request.client,
      error: error,
      result: result
    }

    MasqHub._log('Received data:' + response)

    // postMessage requires that the target origin be set to "*" for "file://"
    targetOrigin = (origin === 'file://') ? '*' : origin

    window.parent.postMessage(response, targetOrigin)
  }

  /**
   * Returns a boolean indicating whether or not the requested method is
   * permitted for the given origin. The argument passed to method is expected
   * to be one of 'get', 'set', 'del', 'clear', 'getData' or 'setData'.
   *
   * @param   {string} origin The origin for which to determine permissions
   * @param   {string} method Requested action
   * @returns {bool}   Whether or not the request is permitted
   */
  MasqHub._permitted = function (origin, method) {
    var available, i, entry, match

    available = ['get', 'set', 'del', 'clear', 'getData', 'setData']
    if (!MasqHub._inArray(method, available)) {
      return false
    }

    for (i = 0; i < MasqHub._permissions.length; i++) {
      entry = MasqHub._permissions[i]
      if (!(entry.origin instanceof RegExp) || !(entry.allow instanceof Array)) {
        continue
      }

      match = entry.origin.test(origin)
      if (match && MasqHub._inArray(method, entry.allow)) {
        return true
      }
    }

    return false
  }

  /**
   * Sets a key to the specified value, based on the origin of the request.
   *
   * @param {string} origin The origin of the request
   * @param {object} params An object with key and value
   */
  MasqHub._set = function (origin, params) {
    // TODO throttle writing to once per second
    var data = MasqHub._getData(origin)
    data[params.key] = params.value
    window.localStorage.setItem(origin, JSON.stringify(data))
  }

  /**
   * Accepts an object with an array of keys for which to retrieve their values.
   * Returns a single value if only one key was supplied, otherwise it returns
   * an array. Any keys not set result in a null element in the resulting array.
   *
   * @param   {string} origin The origin of the request
   * @param   {object} params An object with an array of keys
   * @returns {*|*[]}  Either a single value, or an array
   */
  MasqHub._get = function (origin, params) {
    var data, result, i, value

    result = []

    data = MasqHub._getData(origin)

    for (i = 0; i < params.keys.length; i++) {
      try {
        value = data[params.keys[i]]
      } catch (e) {
        value = null
      }

      result.push(value)
    }

    return (result.length > 1) ? result : result[0]
  }

  /**
   * Deletes all keys specified in the array found at params.keys.
   *
   * @param {string} origin The origin of the request
   * @param {object} params An object with an array of keys
   */
  MasqHub._del = function (origin, params) {
    var data = MasqHub._getData(origin)
    for (var i = 0; i < params.keys.length; i++) {
      delete data[params.keys[i]]
    }
    window.localStorage.setItem(JSON.stringify(data))
  }

  /**
   * Clears localStorage.
   *
   * @param {string} origin The origin of the request
   */
  MasqHub._clear = function (origin) {
    window.localStorage.removeItem(origin)
  }

  /**
   * Returns all data limited to the scope of the origin.
   *
   * @param   {string} origin The origin of the request
   * @returns {object} The data corresponding to the origin
   */
  MasqHub._getData = function (origin) {
    var data = window.localStorage.getItem(origin)
    if (!data || data.length === 0) {
      return {}
    }
    try {
      return JSON.parse(data)
    } catch (err) {
      return {}
    }
  }

  /**
   * Sets all data limited to the scope of the origin.
   *
   * @param   {string} origin The origin of the request
   * @param   {object} data The data payload
   */
  MasqHub._setData = function (origin, data) {
    window.localStorage.setItem(origin, JSON.stringify(data))
  }

  /**
   * Returns whether or not a value is present in the array. Consists of an
   * alternative to extending the array prototype for indexOf, since it's
   * unavailable for IE8.
   *
   * @param   {*}    value The value to find
   * @parma   {[]*}  array The array in which to search
   * @returns {bool} Whether or not the value was found
   */
  MasqHub._inArray = function (value, array) {
    for (var i = 0; i < array.length; i++) {
      if (value === array[i]) return true
    }

    return false
  }

  /**
   * Returns whether or not an object is empty.
   *
   * @param   {object} obj The object to check
   * @returns {bool} Whether or not the object is empoty
   */
  MasqHub._isEmpty = function (obj) {
    return Object.keys(obj).length === 0
  }

  /**
   * Returns whether or not a variable is an object.
   *
   * @param   {*} variable The variable to check
   * @returns {bool} Whether or not the variable is an object
   */
  MasqHub._isObject = function (variable) {
    return typeof (variable) === 'object'
  }

  /**
   * A cross-browser version of Date.now compatible with IE8 that avoids
   * modifying the Date object.
   *
   * @return {int} The current timestamp in milliseconds
   */
  MasqHub._now = function () {
    if (typeof Date.now === 'function') {
      return Date.now()
    }

    return new Date().getTime()
  }

  /**
   * Export for various environments.
   */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MasqHub
  } else if (typeof exports !== 'undefined') {
    exports.MasqHub = MasqHub
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return MasqHub
    })
  } else {
    root.MasqHub = MasqHub
  }
}(this))
