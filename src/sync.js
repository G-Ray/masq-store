// TODO: find a better supported URL composer
// import * as url from 'url'

export function initWSClient (server, room) {
  return new Promise((resolve, reject) => {
    server = server || 'ws://localhost:8080'
    room = room || 'foo'
    // const wsUrl = url.resolve(server, room)
    const wsUrl = (window.URL !== undefined) ? new window.URL(room, server) : server + room

    const ws = new window.WebSocket(wsUrl)

    ws.onopen = () => {
      console.log(`Connected to ${wsUrl}.`)
      // TODO: check if we need to sync with other devices
      return resolve(ws)
    }

    ws.onerror = (event) => {
      const err = `Could not connect to server at ${wsUrl}`
      console.log(err)
      return reject(err)
    }
  })
}

/**
 * Sets all data limited to the scope of the origin.
 *
 * @param   {object} ws The WebSocket client
 * @param   {string} origin The origin of the request
 * @param   {object} request The request object
 */
export const send = (ws, origin, request) => {
  if (!ws || origin.length === 0 || Object.keys(request.params).length === 0) {
    return
  }
  ws.send(JSON.stringify({origin: origin, request: request}))
}
