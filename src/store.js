import * as util from './util'
import { isEmpty } from './util'

// Default storage API
const store = window.localStorage

export const META = '_meta'
export const USER = '_user'

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
  if (exists(origin)) {
    const meta = getMeta(origin)
    if (request.updated) {
      meta.updated = request.updated
    }
    try {
      // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
      switch (request.method) {
        case 'user':
          result = user()
          break
        case 'get':
          result = get(origin, request.params)
          break
        case 'set':
          set(origin, request.params)
          // update the meta data and return the timestamp
          result = setMeta(origin, meta)
          break
        case 'del':
          del(origin, request.params)
          // update the meta data and return the timestamp
          result = setMeta(origin, meta)
          break
        case 'clear':
          result = clear(origin)
          break
        case 'getAll':
          result = getAll(origin)
          break
        case 'setAll':
          setAll(origin, request.params)
          // update the meta data and return the timestamp
          result = setMeta(origin, meta)
          break
        default:
          break
      }
    } catch (err) {
      error = err.message
    }
  } else {
    error = 'UNREGISTERED'
  }

  const ret = {
    client: request.client || client,
    error: error,
    result: result
  }

  return ret
}

/**
 * Wrapper function that returns the public profile of the user.
 *
 * @returns {object} Public profile data
 */
export const user = () => {
  return getAll(USER)
}

/**
 * Wrapper function that updates the public profile of the user.
 * picture and the name.
 *
 * @param {object} data Public profile data
 */
export const updateUser = (data) => {
  return setAll(USER, data)
}

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
  // persist data in the store
  store.setItem(origin, JSON.stringify(data))
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
  // persist data in th
  store.setItem(origin, JSON.stringify(data))
}

/**
 * Clears storage for a given key.
 *
 * @param {string} key The element to clear from localStorage
 */
export const clear = (key) => {
  store.removeItem(key)
}

/**
 * Clears all store items.
 *
 */
export const clearAll = () => {
  for (let i = 0; i < store.length; i++) {
    store.removeItem(store.key(i))
  }
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
 */
export const setAll = (origin, data) => {
  // persist data in th
  store.setItem(origin, JSON.stringify(data))
}

/**
 * Wrapper around the getAll function to get the meta for an origin
 *
 * @param   {string} origin The origin of the request
 * @return  {object} The metadata corresponding to the origin
 */
export const getMeta = (origin) => {
  const item = (origin) ? `${META}_${origin}` : META
  return getAll(item)
}

/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data Extra metadata
 * @return  {object} The updated meta object
 */
export const setMeta = (origin, data) => {
  if (!origin) {
    console.log('Missing origin when trying to set meta data.')
    return
  }
  if (!data.origin) {
    data.origin = origin
  }

  origin = (origin === META) ? META : `${META}_${origin}`

  // Update the root store meta
  if (data.updated) {
    let rootMeta = getMeta()
    rootMeta.updated = data.updated
    store.setItem(META, JSON.stringify(rootMeta))
  }

  store.setItem(origin, JSON.stringify(data))

  return data
}

/**
 * Get a list of all the origins (apps) that store local data
 *
 * @return {array} Array containing all the origins
 */
export const appList = () => {
  let list = []
  for (let i = 0; i < store.length; i++) {
    if (store.key(i).indexOf('http') === 0) {
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
    if (item.indexOf(`${META}_`) === 0) {
      list.push(item)
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
  if (!data || util.isEmpty(data)) {
    return
  }

  for (let item in data) {
    if (data.hasOwnProperty(item)) {
      setAll(item, data[item])
    }
  }
}

/**
 * Verify if a key exists in the store
 *
 * @param {string} item They key to check
 */
export const exists = (item) => {
  for (let i = 0; i < store.length; i++) {
    if (store.key(i) === item) {
      return true
    }
  }
  return false
}

/**
 * Check if the storage API is available
 *
 * @return {bool} Availability status
 */
export const available = () => {
  let status = true
  try {
    if (!store) {
      status = false
    }
  } catch (err) {
    status = false
    console.log(err)
  }
  return status
}
