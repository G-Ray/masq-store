// TODO: find a better supported URL composer
// import * as url from 'url'
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
 * Push updated data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} type The type of the request
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
export const push = (ws, type, origin, request) => {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return
  }
  const req = {
    type: type,
    origin: origin,
    request: request
  }
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(req))
  }
}

export const handleMessage = (ws, msg, client) => {
  switch (msg.type) {
    case 'update':
      handleUpdates(msg, client)
      break
    case 'check':
      exportBackup(msg, ws)
      break
    default:
      break
  }
}

const handleUpdates = (msg, client) => {
  console.log('Incoming update')
  const meta = store.getMeta(msg.origin)
  // no need to update local store if we have updated already to this version
  if (meta.updated >= msg.request.updated) {
    return
  }
  // Prepare response for the client app
  let response = store.prepareResponse(msg.origin, msg.request, client)

  // Force the local client ID
  response.client = client
  response.sync = true

  // postMessage requires that the target origin be set to "*" for "file://"
  const targetOrigin = (msg.origin === 'file://') ? '*' : msg.origin
  window.parent.postMessage(response, targetOrigin)
}

const exportBackup = (msg, ws) => {
  // Check if we have local data that was changed after the specified data
  if (msg.lastModified) {
    const meta = store.getMeta(msg.origin)
    if (meta.updated > msg.lastModified) {
      // We have fresh data and we need to send it.
      const resp = {
        type: 'update',
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

export const checkUpdates = (ws, client = '') => {
  if (!ws) {
    return
  }
  const appList = store.metaList()
  for (let i = 0; i < appList.length; i++) {
    const meta = store.getAll(appList[i])
    let req = {
      type: 'check',
      client: client,
      origin: appList[i].split('_meta_')[1],
      lastModified: meta.updated
    }
    ws.send(JSON.stringify(req))
  }
}
