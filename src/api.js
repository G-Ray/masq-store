/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 */
export const set = (origin, params) => {
    // TODO throttle writing to once per second
  let data = getAll(origin)
  data[params.key] = params.value
  data = setMeta(origin, data)
  window.localStorage.setItem(origin, JSON.stringify(data))
}

/**
 * Accepts an object with an array of keys for which to retrieve their values.
 * Returns a single value if only one key was supplied, otherwise it returns
 * an array. Any keys not set result in a null element in the resulting array.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} params An object with an array of keys
 * @returns {*|*[]}  Either a single value, or an array
 */
export const get = (origin, params) => {
  let data, result, value

  result = []

  data = getAll(origin)

  for (let i = 0; i < params.keys.length; i++) {
    try {
      value = data[params.keys[i]]
    } catch (e) {
      value = null
    }
    result.push(value)
  }

  return (result.length > 1) ? result : result[0]
}

/**
 * Deletes all keys specified in the array found at params.keys.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with an array of keys
 */
export const del = (origin, params) => {
  let data = getAll(origin)
  for (let i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]]
  }
  data = setMeta(origin, data)
  window.localStorage.setItem(origin, JSON.stringify(data))
}

/**
 * Clears localStorage.
 *
 * @param {string} key The element to clear from localStorage
 */
export const clear = (key) => {
  window.localStorage.removeItem(key)
}

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
export const getAll = (origin) => {
  const data = window.localStorage.getItem(origin)
  if (!data || data.length === 0) {
    return {}
  }
  try {
    return JSON.parse(data)
  } catch (err) {
    return {}
  }
}

/**
 * Sets all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data The data payload
 */
export const setAll = (origin, data) => {
  data = setMeta(origin, data)
  window.localStorage.setItem(origin, JSON.stringify(data))
}

/**
 * Gets all metadata for a given origin.
 *
 * @param   {string} origin The origin for which we want the metadata
 * @return  {object} The metadata payload
 */
export const getMeta = (origin) => {
  const data = window.localStorage.getItem(origin)
  if (!data || data.length === 0) {
    return {}
  }
  try {
    const parsed = JSON.parse(data)
    return parsed._meta
  } catch (err) {
    return {}
  }
}

/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data The data object
 * @param   {object} meta Extra metadata
 */
export const setMeta = (origin, data, meta) => {
  meta = meta || {}
  if (!meta.updated) {
    meta.updated = now()
  }
  data._meta = meta
  return data
}

/**
 * A cross-browser version of Date.now compatible with IE8 that avoids
 * modifying the Date object.
 *
 * @return {int} The current timestamp in milliseconds
 */
const now = () => {
  if (typeof Date.now === 'function') {
    return Date.now()
  }

  return new Date().getTime()
}
