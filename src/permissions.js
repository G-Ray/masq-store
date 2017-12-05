import * as store from './store'

/**
 * Gets the permission list for a given origin.
 *
 * @param   {string} origin The origin of the app
 * @return  {array} List of permissions
 */
export const getPermissions = (origin) => {
  const meta = store.getMeta(origin)
  return meta.permissions || []
}

/**
 * Sets the permission list for a given origin.
 *
 * @param   {string} origin The origin of the app
 * @param   {array} list List of permissions
 */
export const setPermissions = (origin, list = []) => {
  let meta = store.getMeta(origin)
  meta.permissions = list
  store.setMeta(origin, meta)
}
