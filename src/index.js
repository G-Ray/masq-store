import * as sync from './sync'
import * as api from './api'

let debug = false
let permissionList = []
let wsClient
let clientId = ''
const availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll', 'getMeta']
const wsTimeout = 3000 // Waiting (3s) for another attempt to reconnect to the WebSocket server

const log = (...text) => {
  if (debug) {
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
 *    Methods may include any of: get, set, del, clear, getAll and setAll. A 'ready'
 *    message is sent to the parent window once complete.
 *  - debug flag
 * @example
 * // Subdomain can get, but only root domain can set and del
 * MasqHub.init({
 *   permissions: [{origin: /\.example.com$/,        allow: ['get']},
 *    {origin: /:(www\.)?example.com$/, allow: ['get', 'set', 'del']}],
 *   debug: false,
 *   syncroom: 'someRandomName',
 *   syncserver: 'wss://....'
 * });
 *
 * @param {array} parameters An array of objects used for configuration
 */
export const init = (parameters) => {
  let available = true

  debug = parameters.debug

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

  permissionList = parameters.permissions || []

  // Listen to online/offline events in order to trigger sync
  if (navigator.onLine !== undefined) {
    window.addEventListener('online', () => {
      onlineStatus(true, parameters)
    })
    window.addEventListener('offline', () => {
      onlineStatus(false, parameters)
    })

    onlineStatus(navigator.onLine, parameters)
  } else {
    // Cannot detect connection status, let's try to connect anyway the first time
    initWs(parameters)
  }

  // All set, let the client app know we're ready
  initListener()
}

/**
 * Initialize the WebSocket client. This allows us to synchronize with the
 * other devices for the user.
 *
 * The current implementation unfortunately mutates the wsClient variable.
 */
const initWs = (parameters) => {
  sync.initWSClient(parameters.syncserver, parameters.syncroom).then((ws) => {
    wsClient = ws

    wsClient.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        let response = prepareResponse(data.origin, data.request)

        // Force the client ID to be the local one
        response.client = clientId
        response.sync = true

        // postMessage requires that the target origin be set to "*" for "file://"
        const targetOrigin = (data.origin === 'file://') ? '*' : data.origin
        window.parent.postMessage(response, targetOrigin)
      } catch (err) {
        log(err)
      }
    }
    wsClient.onclose = (event) => {
      log(`WebSocket connection closed`)
        // Try to reconnect if the connection was closed
      if (event.wasClean === false || event.code === 1006) {
        log(`..trying to reconnect`)
        if (!window.timerID) {
          window.timerID = setInterval(() => {
            initWs(parameters)
          }, wsTimeout)
        }
      }
    }
  }).catch((err) => {
    log(err)
  })
}

/**
 * Initialize the window event listener for postMessage. This allows us to
 * communicate with the apps running in the parent window of the <iframe>.
 */
const initListener = () => {
  // Init listener
  if (window.addEventListener) {
    window.addEventListener('message', listener, false)
  } else {
    window.attachEvent('onmessage', listener)
  }
  // All set, let the app know we're ready
  window.parent.postMessage({'cross-storage': 'ready'}, '*')

  log(`Listening to clients...`)
}

const initServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', {scope: '/'})
    .then((reg) => {
      // registration worked
      // check if we can update anything
      // console.log(`Registration succeeded. Scope is ${reg.scope}`)
      reg.update()
    }).catch((error) => {
      // registration failed
      console.log(`Registration failed with ${error}`)
    })
  }
}

/**
 * The message handler for all requests posted to the window. It ignores any
 * messages having an origin that does not match the originally supplied
 * pattern. Given a JSON object with one of get, set, del or getAll as the
 * method, the function performs the requested action and returns its result.
 *
 * @param {MessageEvent} message A message to be processed
 */
const listener = (message) => {
  let origin, targetOrigin, request, response

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

  // Init a placeholder response object
  response = {
    client: request.client,
    result: {}
  }
  if (request.client) {
    clientId = request.client
  }

  if (!request.method) {
    return
  } else if (!isPermitted(origin, request.method)) {
    response.error = `Invalid ${request.method} permissions for ${origin}`
  } else {
    response = prepareResponse(origin, request)
    // Also send the changes to other devices
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      sync.send(wsClient, origin, request)
    }
  }

  log(`Sendind response data: ${response}`)

  // postMessage requires that the target origin be set to "*" for "file://"
  targetOrigin = (origin === 'file://') ? '*' : origin

  window.parent.postMessage(response, targetOrigin)
}

/**
 * Returns a response object to the application requesting an action.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {object} request Requested object sent by the application
 * @returns {object} Response object
 */
const prepareResponse = (origin, request) => {
  let error, result
  try {
    // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
    switch (request.method) {
      case 'get':
        result = api.get(origin, request.params)
        break
      case 'set':
        result = api.set(origin, request.params)
        break
      case 'del':
        result = api.del(origin, request.params)
        break
      case 'clear':
        result = api.clear(origin)
        break
      case 'getAll':
        result = api.getAll(origin)
        break
      case 'setAll':
        result = api.setAll(origin, request.params)
        break
      case 'getMeta':
        result = api.getMeta(origin)
        break
      default:
        break
    }
  } catch (err) {
    error = err.message
  }

  const ret = {
    client: request.client || clientId,
    error: error,
    result: result
  }

  return ret
}

/**
 * Returns a boolean indicating whether or not the requested method is
 * permitted for the given origin. The argument passed to method is expected
 * to be one of 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {string} method Requested action
 * @returns {bool}   Whether or not the request is permitted
 */
const isPermitted = (origin, method) => {
  let i, entry, match

  if (availableMethods.indexOf(method) < 0) {
    return false
  }

  for (i = 0; i < permissionList.length; i++) {
    entry = permissionList[i]
    if (!(entry.origin instanceof RegExp) || !(entry.allow instanceof Array)) {
      continue
    }

    match = entry.origin.test(origin)
    if (match && entry.allow.indexOf(method) >= 0) {
      return true
    }
  }

  return false
}

const onlineStatus = (online, parameters) => {
  if (online) {
    initWs(parameters)
  } else {
    if (wsClient) {
      wsClient.close()
    }
    log(`Working offline.`)
  }
}

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
