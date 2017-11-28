// Default storage API
const store = window.localStorage

/**
 * Returns a response object to the application requesting an action.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {object} request Requested object sent by the application
 * @param   {object} client The ID of the client performing the request
 * @returns {object} Response object
 */
export const prepareResponse = (origin, request, client) => {
  let error, result
  const meta = { updated: request.updated }
  try {
    // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
    switch (request.method) {
      case 'get':
        result = get(origin, request.params)
        break
      case 'set':
        result = set(origin, request.params, meta)
        break
      case 'del':
        result = del(origin, request.params, meta)
        break
      case 'clear':
        result = clear(origin)
        break
      case 'getAll':
        result = getAll(origin)
        break
      case 'setAll':
        result = setAll(origin, request.params, meta)
        break
      default:
        break
    }
  } catch (err) {
    error = err.message
  }

  const ret = {
    client: request.client || client,
    error: error,
    result: result
  }

  return ret
}

/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 * @param {object} meta An object containing extra metadata
 */
export const set = (origin, params, meta) => {
    // TODO throttle writing to once per second
  let data = getAll(origin)
  data[params.key] = params.value
  // persist data in the store
  store.setItem(origin, JSON.stringify(data))
  // update the meta data and return the timestamp
  return setMeta(origin, meta)
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
 * @param {object} meta An object containing extra metadata
 */
export const del = (origin, params, meta) => {
  let data = getAll(origin)
  for (let i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]]
  }
  // persist data in th
  store.setItem(origin, JSON.stringify(data))
  // update the meta data and return the update timestamp
  return setMeta(origin, meta)
}

/**
 * Clears localStorage.
 *
 * @param {string} key The element to clear from localStorage
 */
export const clear = (key) => {
  store.removeItem(key)
}

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
export const getAll = (origin) => {
  const data = store.getItem(origin)
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
 * @param   {object} meta An object containing extra metadata
 */
export const setAll = (origin, data, meta) => {
  // persist data in th
  store.setItem(origin, JSON.stringify(data))
  // update the meta data and return the update timestamp
  return setMeta(origin, meta)
}

/**
 * Wrapper around the getAll function to get the meta for an origin
 *
 * @param   {string} origin The origin of the request
 * @return  {object} The metadata corresponding to the origin
 */
export const getMeta = (origin) => {
  const item = (origin) ? `_meta_${origin}` : '_meta'
  return getAll(item)
}
/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data Extra metadata
 * @return  {int} The timestamp of the update operation
 */
export const setMeta = (origin, data) => {
  // Use the timestamp as revision number for now
  const updated = (data.updated) ? data.updated : now()

  // Update global the store meta
  let meta = getAll('_meta')
  meta.updated = updated
  store.setItem('_meta', JSON.stringify(meta))

  // Update the origin meta
  if (!data.updated) {
    data.updated = updated
  }
  store.setItem(`_meta_${origin}`, JSON.stringify(data))

  return updated
}

/**
 * Get a list of all the origins (apps) that store local data
 *
 * @return {array} Array containing all the origins
 */
export const appList = () => {
  let list = []
  for (let i = 0; i < store.length; i++) {
    if (store.key(i).indexOf('_') !== 0) {
      list.push(store.key(i))
    }
  }
  return list
}

/**
 * Get a list of meta data keys for the local (apps)
 *
 * @return {array} Array containing all the keys
 */
export const metaList = () => {
  let list = []
  for (let i = 0; i < store.length; i++) {
    const item = store.key(i)
    if (item.indexOf('_meta_') === 0) {
      list.push(item.split('_meta_')[1])
    }
  }
  return list
}

/**
 * Exports all the data in the store
 *
 * @return {object} The contents of the store as key:value pairs
 */
export const exportJSON = () => {
  let data = {}
  for (let i = 0; i < store.length; i++) {
    data[store.key(i)] = getAll(store.key(i))
  }
  return data
}

/**
 * Imports all the data from a different store
 *
 * @param {object} data The contents of the store as a JSON object
 */
export const importJSON = (data) => {
  if (!data) {
    return
  }

  for (let item in data) {
    if (data.hasOwnProperty(item)) {
      setAll(item, data[item])
    }
  }
}

/**
 * Check
 *
 * @return {bool} If storage API is available
 */
export const isAvailable = () => {
  let available = true
  try {
    if (!store) {
      available = false
    }
  } catch (err) {
    available = false
  }
  return available
}

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
