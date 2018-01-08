import * as sync from './sync'
import * as store from './store'
import * as acl from './permissions'
import * as crypto from './crypto'
import * as util from './util'
import { decrypt } from './crypto';
// Export API
export * from './store'

let parameters = {}
let wsClient
const devSyncServer = 'ws://localhost:8080'
let clientId = ''
const availableMethods = ['get', 'set', 'del', 'clear', 'getAll', 'setAll', 'user']
const defaultPermissions = availableMethods
const wsTimeout = 3000 // Waiting (3s) for another attempt to reconnect to the WebSocket server

const log = (...text) => {
  if (parameters.debug) {
    console.log('[Masq Store]', text)
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
 *   debug: false,
 *   syncroom: 'someRandomName',
 *   syncserver: 'wss://....'
 * });
 *
 * @param {array} params An array of objects used for configuration
 */
export const init = (params = {}) => {
  parameters = params

  log(`Initializing Masq Store...`)

  // Return if storage api is unavailable
  if (!store.available()) {
    try {
      window.parent.postMessage({'cross-storage': 'unavailable'}, '*')
      return
    } catch (e) {
      log(e)
      return e
    }
  }

  // Listen to online/offline events in order to trigger sync
  if (navigator.onLine !== undefined) {
    window.addEventListener('online', () => {
      onlineStatus(true, params)
    })
    window.addEventListener('offline', () => {
      onlineStatus(false, params)
    })

    onlineStatus(navigator.onLine, params)
  } else {
    // Cannot detect connection status, try to force connect the first time
    initWs(params)
  }

  // Initialize the window event listener for postMessage. This allows us to
  // communicate with the apps running in the parent window of the <iframe>.
  if (window.addEventListener) {
    window.addEventListener('message', listener, false)
  } else {
    window.attachEvent('onmessage', listener)
  }
  // All set, let the app know we're listening
  window.parent.postMessage({'cross-storage': 'listening'}, '*')

  log(`Listening to clients...`)
}

/**
 * Initialize the WebSocket client. This allows us to synchronize with the
 * other devices for the user.
 *
 * The current implementation unfortunately mutates the wsClient variable.
 */
const initWs = (params) => {
  if (wsClient && wsClient.readyState === wsClient.OPEN) {
    return
  }
  if (!params) {
    params = parameters
  }

  // reconnect handler
  const reconnect = () => {
    log(`..trying to reconnect`)
    setTimeout(() => {
      initWs(parameters)
    }, wsTimeout)
  }

  log('Initializing WebSocket with params:', params)
  sync.initWSClient(params.syncserver, params.syncroom).then((ws) => {
    wsClient = ws
    if (params.cryptoKey) {
      wsClient.cryptoKey = crypto.hexStringToBuffer(params.cryptoKey)
    }

    // Check if we need to sync the local store
    sync.check(wsClient, clientId)

    wsClient.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.ciphertext && wsClient.cryptoKey) {
          // decrypt message first
          crypto.decrypt(wsClient.cryptoKey, msg).then(decrypted => {
            try {
              sync.handleMessage(wsClient, JSON.parse(decrypted), clientId)
            } catch (err) {
              console.log(err)
            }
          }).catch(err => {
            console.log(err)
          })
        } else {
          sync.handleMessage(wsClient, msg, clientId)
        }
      } catch (err) {
        log(err)
      }
    }

    wsClient.onclose = (event) => {
      log(`WebSocket connection closed`, event)
        // Try to reconnect if the connection was closed
      if (event.wasClean === false || event.code === 1006) {
        reconnect()
      }
    }
  }).catch((err) => {
    log('Failed to initialize WebSocket.', err)
    reconnect()
  })
}

/**
 * Initialize the data store for the app origin.
 */
const initApp = (origin, params) => {
  console.log(`Initializing app ${origin}`)
  // permissionList = params.permissions || []

  // Force register the app for now (until we have proper UI)
  if (parameters.autoregister) {
    registerApp(origin)
  }

  window.parent.postMessage({'cross-storage': 'ready'}, origin)
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

  if (request.client) {
    clientId = request.client
  }

  // Ignore the ready message when viewing the store directly
  if (request['cross-storage'] === 'ready') return

  // Handle polling for a ready message
  if (request['cross-storage'] === 'poll') {
    window.parent.postMessage({'cross-storage': 'ready'}, message.origin)
    return
  }

  if (request['cross-storage'] === 'init') {
    initApp(origin, request.params)
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
  // Disable permission check for now since we do not share data between origins
  // } else if (!isPermitted(origin, request.method)) {
    // response.error = `Invalid ${request.method} permissions for ${origin}`
  } else {
    request.updated = util.now()
    response = store.prepareResponse(origin, request, clientId)
    // Also send the changes to other devices if sync is active
    if (['set', 'setAll', 'del'].indexOf(request.method) >= 0) {
      var meta = store.getMeta(origin)
      if (meta.sync) {
        request.updated = meta.updated
        sync.push(wsClient, origin, request)
      }
    }
  }

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
  if (availableMethods.indexOf(method) < 0) {
    return false
  }

  if (util.isLocal(origin)) {
    return true
  }

  if (acl.getPermissions(origin).indexOf(method) >= 0) {
    return true
  }

  return false
}

/**
 * Handles the current online status of the store (online/offline) in order
 * to manage the WebSocket client connection.
 *
 * @param   {bool} online Whether we're cure
 * @param   {object} params Configuration parameters
 */
const onlineStatus = (online, params) => {
  params.syncserver = params.syncserver || devSyncServer
  if (online || util.isLocal(params.syncserver)) {
    initWs(params)
  } else {
    if (wsClient) {
      wsClient.close()
    }
    log(`Working offline.`)
  }
}

/**
 * Force sync a given app
 *
 * @param   {string} url The URL of the app
 * @param   {object} meta An object containing additional meta data for the app
 */
export const syncApp = (url) => {
  if (url && url.length > 0) {
    sync.checkOne(wsClient, clientId, url)
  }
}

/**
 * Register a given app based on its URL
 *
 * @param   {string} url The URL of the app
 * @param   {object} meta An object containing additional meta data for the app
 */
export const registerApp = (url, meta = {}) => {
  if (url && url.length > 0) {
    const origin = util.getOrigin(url)
    if (!store.exists(origin)) {
      store.setAll(origin, {})

      meta.origin = origin
      meta.permissions = meta.permissions || defaultPermissions

      const updated = store.setMeta(origin, meta)
      // Trigger sync if this was a new app we just added
      sync.checkOne(wsClient, clientId, origin)
      log(`Registered app:`, origin)
      return updated
    }
  }
}

/**
 * Unregister a given app based on its origin
 *
 * @param   {string} origin The origin of the app
 */
export const unregisterApp = (origin) => {
  if (!origin || origin.length === 0) {
    return
  }
  store.clear(origin)
  store.clear(`${store.META}_${origin}`)
}
