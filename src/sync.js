// TODO: find a better supported URL composer
// import * as url from 'url'
import * as util from './util'
import * as store from './store'

export function initWSClient (server, room) {
  return new Promise((resolve, reject) => {
    server = server || 'ws://localhost:8080'
    room = room || 'foo'
    // const wsUrl = url.resolve(server, room)
    const wsUrl = (window.URL !== undefined) ? new window.URL(room, server) : server + room

    const ws = new window.WebSocket(wsUrl)

    ws.onopen = () => {
      // throttle openning new sockets
      if (window.timerID) {
        window.clearInterval(window.timerID)
        delete window.timerID
      }

      // console.log(`Connected to ${wsUrl}`)
      // TODO: check if we need to sync with other devices
      return resolve(ws)
    }

    ws.onerror = (event) => {
      const err = `Could not connect to server at ${wsUrl}`
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
    ws.send(JSON.stringify(req))
  }
}

/**
 * Handle incoming data updates and propagate the changes to the client app.
 *
 * @param   {object} msg The contents of the message recived by the WebSocket
 * @param   {string} client The local client ID
 */
const updateHandler = (msg, client) => {
  const meta = store.getMeta(msg.origin)
  // no need to update local store if we have updated already to this version
  if (inTheFuture(msg.request.updated)) {
    return
  }

  if (!meta || util.isEmpty(meta) || meta.updated >= msg.request.updated) {
    return
  }

  console.log('Syncing data for', msg.origin)

  // Prepare response for the client app
  let response = store.prepareResponse(msg.origin, msg.request, client)

  // Force the local client ID
  response.client = client
  response.sync = true

  // postMessage requires that the target origin be set to "*" for "file://"
  const targetOrigin = (msg.origin === 'file://') ? '*' : msg.origin
  window.parent.postMessage(response, targetOrigin)
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
  if (msg.updated && !inTheFuture(msg.updated)) {
    const meta = store.getMeta(msg.origin)
    if (msg.updated > meta.updated) {
      // Remote device has fresh data, we need to check and get it
      check(ws, client)
    } else {
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
      ws.send(JSON.stringify(resp))
    }
  }
}

/**
 * Check if the other devices have an update for us.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} client The local client ID
 */
export const check = (ws, client = '') => {
  if (!ws) {
    return
  }
  const appList = store.metaList()
  if (appList.length === 0) {
    return
  }

  console.log(`Checking for updates on other peers`)
  for (let i = 0; i < appList.length; i++) {
    const meta = store.getAll(appList[i])
    let req = {
      type: 'check',
      client: client,
      origin: appList[i].split(`${store.META}_`)[1],
      updated: meta.updated
    }
    ws.send(JSON.stringify(req))
  }
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
