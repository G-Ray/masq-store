import * as util from './util'
import localForage from 'localforage'

export const STOREVERSION = 1.0
export const METAVERSION = 1.0
export const META = '_meta'
export const USER = '_user'

// Default storage API
const store = localForage.createInstance({
  driver: localForage.INDEXEDDB,
  name: 'MasqStore',
  version: STOREVERSION
})

const metaStore = localForage.createInstance({
  driver: localForage.INDEXEDDB,
  name: 'MetaStore',
  version: METAVERSION
})

/**
 * Check if the store is ready.
 */
export const ready = async () => {
  await store.ready()
  return metaStore.ready()
}

/**
 * Returns a response object to the application requesting an action.
 *
 * @param   {string} origin The origin for which to determine permissions
 * @param   {object} request Requested object sent by the application
 * @param   {object} client The ID of the client performing the request
 * @returns {object} Response object
 */
export const prepareResponse = async (origin, request, client) => {
  let error, result
  if (await exists(origin)) {
    const meta = await getMeta(origin)
    if (request.updated) {
      meta.updated = request.updated
    }
    try {
      // 'get', 'set', 'del', 'clear', 'getAll' or 'setAll'
      switch (request.method) {
        case 'user':
          result = await user()
          break
        case 'get':
          result = await get(origin, request.params)
          break
        case 'set':
          await set(origin, request.params)
          // update the meta data and return the timestamp
          result = await setMeta(origin, meta)
          break
        case 'del':
          await del(origin, request.params)
          // update the meta data and return the timestamp
          result = await setMeta(origin, meta)
          break
        case 'clear':
          result = await clear(origin)
          break
        case 'getAll':
          result = await getAll(origin)
          break
        case 'setAll':
          await setAll(origin, request.params)
          // update the meta data and return the timestamp
          result = await setMeta(origin, meta)
          break
        default:
          break
      }
    } catch (err) {
      error = err.message
    }
  } else {
    // origin doesn't exist in the store -> app needs to be registered
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
export const user = async () => {
  return getAll(USER)
}

/**
 * Wrapper function that updates the public profile of the user.
 * picture and the name.
 *
 * @param {object} data Public profile data
 */
export const updateUser = async (data) => {
  return setAll(USER, data)
}

/**
 * Sets a key to the specified value, based on the origin of the request.
 *
 * @param {string} origin The origin of the request
 * @param {object} params An object with key and value
 */
export const set = async (origin, params) => {
    // TODO throttle writing to once per second
  let data = await getAll(origin)
  data[params.key] = params.value
  // persist data in the store
  return store.setItem(origin, data)
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
export const get = async (origin, params) => {
  let data, result, value

  result = []

  data = await getAll(origin)

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
export const del = async (origin, params) => {
  let data = await getAll(origin)
  for (let i = 0; i < params.keys.length; i++) {
    delete data[params.keys[i]]
  }
  // persist data in the store
  return store.setItem(origin, data)
}

/**
 * Clears storage for a given key.
 *
 * @param {string} key The element to clear from localStorage
 */
export const clear = async (key) => {
  return store.removeItem(key)
}

/**
 * Clears meta data for a given origin.
 *
 * @param {string} origin The origin for which to clear the meta data
 */
export const clearMeta = async (origin) => {
  origin = (origin) ? `${META}_${origin}` : META
  return metaStore.removeItem(origin)
}

/**
 * Clears all store items.
 *
 */
export const clearAll = async () => {
  await metaStore.clear()
  return store.clear()
}

/**
 * Returns all data limited to the scope of the origin.
 *
 * @param   {string} origin The origin of the request
 * @returns {object} The data corresponding to the origin
 */
export const getAll = async (origin, datastore) => {
  // TODO: do not expect an object if we allow any data to be
  // stored in the future
  datastore = datastore || store
  const data = await datastore.getItem(origin)
  if (!data || data.length === 0) {
    return {}
  }
  try {
    return data
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
export const setAll = async (origin, data) => {
  // persist data in the store
  return store.setItem(origin, data)
}

/**
 * Wrapper around the getAll function to get the meta for an origin
 *
 * @param   {string} origin The origin of the request
 * @return  {object} The metadata corresponding to the origin
 */
export const getMeta = async (origin) => {
  origin = (origin) ? `${META}_${origin}` : META

  return getAll(origin, metaStore)
}

/**
 * Sets the metadata for a given origin.
 *
 * @param   {string} origin The origin of the request
 * @param   {object} data Extra metadata
 * @return  {object} The updated meta object
 */
export const setMeta = async (origin, data) => {
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
    let rootMeta = await getMeta()
    rootMeta.updated = data.updated
    // TODO: wait for this step to finish? (for consistency)
    await metaStore.setItem(META, rootMeta)
  }

  return metaStore.setItem(origin, data)
}

/**
 * Get a list of all the origins (apps) that store local data
 *
 * @return {array} Array containing all the origins
 */
export const appList = async () => {
  return store.keys().then((keys) => {
    return keys
  }).catch((err) => {
    // This code runs if there were any errors
    console.log(err)
  })
}

/**
 * Get a list of meta data keys for the local (apps)
 *
 * @return {array} Array containing all the keys
 */
export const metaList = async () => {
  return metaStore.keys().then((keys) => {
    return keys.filter((elem, index, arr) => elem !== META)
  }).catch((err) => {
    // This code runs if there were any errors
    console.log(err)
  })
}

/**
 * Unregister an app by removing it (data + meta) from the store
 */
export const unregisterApp = async (origin) => {
  if (!origin || origin.length === 0) {
    return
  }
  await clear(origin)
  return clearMeta(origin)
}

/**
 * Exports all the data in the store
 *
 * @return {object} The contents of the store as key:value pairs
 */
export const exportJSON = async () => {
  let data = {}
  return store.iterate((val, key) => {
    data[key] = val
  }).then((keys) => {
    return data
  }).catch((err) => {
    // This code runs if there were any errors
    console.log(err)
  })
}

/**
 * Imports all the data from a different store
 *
 * @param {object} data The contents of the store as a JSON object
 */
export const importJSON = async (data) => {
  if (!data || util.isEmpty(data)) {
    return
  }

  for (let item in data) {
    if (data.hasOwnProperty(item)) {
      await setAll(item, data[item])
    }
  }
}

/**
 * Verify if a key exists in the store
 *
 * @param {string} item They key to check
 */
export const exists = async (item) => {
  const data = await store.getItem(item)
  return (data !== null && data !== undefined)
}
