// TODO: find a better supported URL composer
// import * as url from 'url'
import * as util from './util'
import * as store from './store'
import * as crypto from './crypto'

export function initWSClient (server, room) {
  return new Promise((resolve, reject) => {
    // const wsUrl = url.resolve(server, room)
    if (!server || !room) {
      return reject(new Error(`No WebSocket server or room provided.`))
    }
    const wsUrl = (window.URL !== undefined) ? new window.URL(room, server) : server + room

    const ws = new window.WebSocket(wsUrl)

    ws.onopen = () => {
      console.log(`Connected to Sync server at ${wsUrl}`)
      // TODO: check if we need to sync with other devices
      return resolve(ws)
    }

    ws.onerror = (event) => {
      const err = new Error(`Could not connect to Sync server at ${wsUrl}`)
      // console.log(err)
      return reject(err)
    }
  })
}

/**
 * Handle incoming messages received by the WebSocket client.
 *
 * @param   {object} ws The WebSocket client
 * @param   {object} msg The message recived by the WebSocket
 * @param   {string} client The local client ID
 */
export const handleMessage = (ws, msg, client) => {
  switch (msg.type) {
    case 'sync':
      updateHandler(msg, client)
      break
    case 'check':
      checkHandler(msg, ws, client)
      break
    default:
      break
  }
}

/**
 * Push updated data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
export const push = (ws, origin, request) => {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return
  }
  const req = {
    type: 'sync',
    origin: origin,
    request: request
  }
  if (ws.readyState === ws.OPEN) {
    send(ws, req)
  }
}

/**
 * Handle incoming data updates and propagate the changes to the client app.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {string} client The local client ID
 */
const updateHandler = (msg, client) => {
  if (!msg.origin) {
    return
  }
  const meta = store.getMeta(msg.origin)
  // no need to update local store if we have updated already to this version
  if (inTheFuture(msg.request.updated)) {
    return
  }
  if (util.isEmpty(meta) || meta.updated > msg.request.updated || !meta.sync) {
    return
  }

  // Prepare response for the client app
  store.prepareResponse(msg.origin, msg.request, client)

  // Force the local client ID
  msg.client = client
  msg.sync = true

  // postMessage requires that the target origin be set to "*" for "file://"
  const targetOrigin = (msg.origin === 'file://') ? '*' : msg.origin
  // only need to notify parent if running in an iframe
  if (window.self !== window.top) {
    window.parent.postMessage(msg, targetOrigin)
  }
}

/**
 * Broadcast an update if we have fresh data that other devices do not.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {object} ws The WebSocket client
 */
const checkHandler = (msg, ws, client = '') => {
  // Check if we have local data that was changed after the specified data
  // but ignore request if the received timestamp comes from the future
  if (store.exists(msg.origin) && msg.updated !== undefined && !inTheFuture(msg.updated)) {
    const meta = store.getMeta(msg.origin)
    if (msg.updated > meta.updated) {
      // Remote device has fresh data, we need to check and get it
      check(ws, client)
    } else if (meta.updated > 0 && msg.updated < meta.updated) {
      // We have fresh data and we need to send it.
      const resp = {
        type: 'sync',
        client: msg.client,
        origin: msg.origin,
        request: {
          method: 'setAll',
          updated: meta.updated,
          params: store.getAll(msg.origin)
        }
      }
      send(ws, resp)
    }
  }
}

/**
 * Check if the other devices have an update for us.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 * @param   {array} list A list of app origins to check
 */
export const check = (ws, client = '', list) => {
  if (!ws) {
    return
  }
  const appList = list || store.metaList()
  if (appList.length === 0) {
    return
  }

  for (let i = 0; i < appList.length; i++) {
    const meta = store.getAll(appList[i])
    meta.updated = meta.updated || 0
    if (meta.sync) {
      let req = {
        type: 'check',
        client: client,
        origin: meta.origin,
        updated: meta.updated
      }
      
    }
  }
}

/**
 * Check if the other devices have an update for a given app.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 * @param   {string} origin The app origin to check
 */
export const checkOne = (ws, client = '', origin) => {
  if (!ws) {
    return
  }
  const meta = store.getMeta(origin)
  meta.updated = meta.updated || 0
  let req = {
    type: 'check',
    client: client,
    origin: meta.origin,
    updated: meta.updated
  }
  send(ws, req)
}

/**
 * Send a message using a WebSocket session
 *
 * @param   {object} ws The WebSocket client
 * @param   {object} data The data to be sent
 */
const send = (ws, data) => {
  if (ws.cryptoKey) {
    crypto.encrypt(ws.cryptoKey, JSON.stringify(data), '').then(encrypted => {
      ws.send(JSON.stringify(encrypted))
    })
    return
  }
  ws.send(JSON.stringify(data))
}
/**
 * Check if a timestamp is in the future w.r.t. current local time.
 *
 * @param   {int} ts The timestamp to check
 * @return  {bool} Whether the timestamp is in the future or not
 */
const inTheFuture = (ts = 0) => {
  return ts > util.now()
}
