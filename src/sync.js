export function initWSClient (room, server) {
  // const channelName = 'user-session-id'
  const local = 'ws://localhost:8080/'

  return new Promise((resolve, reject) => {
    server = server || local

    const ws = new window.WebSocket(server + room)

    ws.onopen = () => {
      console.log(`Connected to ${server}${room}.`)
      // TODO: check if we need to sync with other devices
      return resolve(ws)
    }

    ws.onerror = (event) => {
      const err = `Could not connect to server at ${server}`
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
