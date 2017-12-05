import * as sync from './sync'
import * as store from './store'

let debug = false
let permissionList = []
let wsClient
let clientId = ''
const availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll', 'user']
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
 * @param {array} parameters An array of objects used for configuration
 */
export const init = (parameters) => {
  debug = parameters.debug

  // Return if storage api is unavailable
  if (!store.available()) {
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
  if (wsClient && wsClient.readyState === wsClient.OPEN) {
    return
  }
  sync.initWSClient(parameters.syncserver, parameters.syncroom).then((ws) => {
    wsClient = ws

    // Check if we need to sync the local store
    log(`Checking for updates on other peers`)
    sync.check(wsClient, clientId)

    wsClient.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        sync.handleMessage(wsClient, msg, clientId)
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

  // Check whether message.data is a valid json
  try {
    request = message.data
  } catch (err) {
    return
  }

  console.log('Request', request)
  if (request.client) {
    clientId = request.client
  }

  // Ignore the ready message when viewing the store directly
  if (request['cross-storage'] === 'ready') return

  // Handle polling for a ready message
  if (request['cross-storage'] === 'poll') {
    console.log('Polling...')
    window.parent.postMessage({'cross-storage': 'ready'}, message.origin)
    return
  }

  // Check whether request.method is a string
  if (!request || typeof request.method !== 'string') {
    return
  }

  // Init a placeholder response object
  response = {
    client: clientId,
    result: {}
  }

  if (!request.method) {
    return
  // // Disable permission check for now since we do not share data between origins
  // } else if (!isPermitted(origin, request.method)) {
  //   response.error = `Invalid ${request.method} permissions for ${origin}`
  } else {
    response = store.prepareResponse(origin, request, clientId)
    // Also send the changes to other devices
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      request.updated = response.result
      sync.push(wsClient, origin, request)
    }
  }

  log(`Change detected: ${response}`)

  // postMessage requires that the target origin be set to "*" for "file://"
  targetOrigin = (origin === 'file://') ? '*' : origin
  window.parent.postMessage(response, targetOrigin)
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

/**
 * Handles the current online status of the store (online/offline) in order
 * to manage the WebSocket client connection.
 *
 * @param   {bool} online Whether we're cure
 * @param   {object} parameters Configuration parameters
 */
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
 * Exports all the data in the store
 *
 * @return {object} The contents of the store as key:value pairs
 */
export const exportJSON = () => {
  return store.exportJSON()
}

/**
 * Imports all the data from a different store
 *
 * @param {object} data The contents of the store as a JSON object
 */
export const importJSON = (data) => {
  store.importJSON(data)
}
