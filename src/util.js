/**
 * A cross-browser version of Date.now compatible with IE8 that avoids
 * modifying the Date object.
 *
 * @return {int} The current timestamp in milliseconds
 */
export const now = () => {
  if (typeof Date.now === 'function') {
    return Date.now()
  }
  return new Date().getTime()
}

/**
 * Returns whether or not an object is empty.
 *
 * @param   {object} obj The object to check
 * @returns {bool} Whether or not the object is empoty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0
}

/**
 * Returns whether or not the parameter is an object.
 *
 * @param   {*} obj The object to check
 * @returns {bool} Whether or not the parameter is an object
 */
export const isObject = (thing) => {
  return typeof (thing) === 'object'
}

/**
 * Creates an origin URL based on a given URI value
 *
 * @param   {string} url The url to use for the origin
 * @returns {string} The origin value
 */
export const getOrigin = (url) => {
  let uri, protocol, origin

  uri = document.createElement('a')
  uri.href = url

  if (!uri.host) {
    uri = window.location
  }

  if (!uri.protocol || uri.protocol === ':') {
    protocol = window.location.protocol
  } else {
    protocol = uri.protocol
  }

  origin = protocol + '//' + uri.host
  origin = origin.replace(/:80$|:443$/, '')

  return origin
}

/**
 * Check if an (origin) URL is local based on the RFC 1918 list of reserved
 * addresses. It accepts http(s) and ws(s) schemas as well as port numbers.
 *
 * localhost
 * 127.0.0.0 – 127.255.255.255
 * 10.0.0.0 – 10.255.255.255
 * 172.16.0.0 – 172.31.255.255
 * 192.168.0.0 – 192.168.255.255
 * + extra zero config range on IEEE 802 networks:
 * 169.254.1.0 - 169.254.254.255
 *
 * Example:
 * http://localhost:8080
 * https://192.168.1.112
 * ws://10.8.8.8:9999
 * 169.254.22.99
 *
 * @param {string} url The (origin) URL to check
 * @return {bool} True if it's local
 */
export const isLocal = (url) => {
  if (!url || url.length === 0) {
    return false
  }
  const localNets = [
    /^(https?:\/\/|wss?:\/\/)?localhost+(:[0-9]*)?/,
    /^(https?:\/\/|wss?:\/\/)?127\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/,
    /^(https?:\/\/|wss?:\/\/)?10\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/,
    /^(https?:\/\/|wss?:\/\/)?172\.(1[89]|2[0-9]|3[01])\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/,
    /^(https?:\/\/|wss?:\/\/)?192\.168\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/,
    /^(https?:\/\/|wss?:\/\/)?169\.254\.([1-9]|[1-9]\d|1\d\d|2([0-4]\d|5[0-4]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))+(:[0-9]*)?/
  ]
  for (let i = 0; i < localNets.length; i++) {
    const entry = localNets[i]
    if (!(entry instanceof RegExp)) {
      continue
    }
    if (entry.test(url)) {
      return true
    }
  }
  return false
}
