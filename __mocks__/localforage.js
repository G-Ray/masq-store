
const localforage = jest.genMockFromModule('localforage')
let userDB = {}

function clear () {
  userDB = {}
  return Promise.resolve()
}
function storage () {
  return userDB
}
function config (conf) {
  return Promise.resolve(true)
}
function setItem (key, value) {
  userDB[key] = value
  return Promise.resolve(value)
}
function removeItem (key) {
  delete userDB[key]
  return Promise.resolve()
}
function getItem (key) {
  if (userDB[key]) {
    return Promise.resolve(userDB[key])
  }
  return Promise.resolve(null)
}
localforage.setItem = setItem
localforage.config = config
localforage.getItem = getItem
localforage.removeItem = removeItem
localforage.clear = clear
localforage.storage = storage
module.exports = localforage
