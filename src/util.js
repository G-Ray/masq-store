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
