import Store from './store'
import common from 'masq-common'
import MasqCrypto from 'masq-crypto'

/**
 * Masq store library, allows masq-app to
 * manage masq store data.
 */

/**
 @typedef masqDevice
 @type {Object}
 @property {string} name - The name of the device
 @property {string} color - The color indicator
 @property {boolean} enabled - The state indicator
 @property {boolean} new - True if last appaired device
 */

/**
 @typedef masqApp
 @type {Object}
 @property {string} name - The name of the application
 @property {string} color - The color indicator
 @property {string} description - The application description
 @property {boolean} enabled - True if application is synchronised
 @property {boolean} active - True if last appaired application
 @property {string} image - The link to the profil picture
 */

/**
 @typedef masqUser
 @type {Object}
 @property {string} username - The username
 @property {string} firstname - The firstname
 @property {string} lastname - The lastname
 @property {string} image - The link to the profil picture
 @property {string} passphrase - The passphrase
 */

/**
  * @typedef MasqError
  * @type {Object}
  * @property {boolean} error
  * @property {int} status - THe status of the error
  * @property {string} message - The status of the error
  * @property {string} name - The name of the error
  * @property {string} stack - The stack
  */

/**
* The list of required parameters for an app, used wich common.checkObject function
*/
const requiredParameterApp = ['name', 'url']
/**
* The list of required parameters for an user, used wich common.checkObject function
*/
const requiredParameterUser = ['username', 'passphrase']

/**
   * Masq
   * @constructor
   * @param {Object} params - The MasqStore cipher parameters
   * @param {ArrayBuffer} [params.passphrase] - The passphrase
   */
class Masq {
  constructor (params = {}) {
    this.passphrase = params.passphrase || ''
    this._key = []
    this._currentUserId = null
    this.storage = params.storage
    this.publicStore = null
    this.profileStore = null
    this.aesCipher = null
  }

  // get key () {
  //   return this._key
  // }

  // set key (newKey) {
  //   this._key = newKey
  // }

  checkCurrentUser () {
    if (!this._currentUserId) {
      throw common.generateError(common.ERRORS.NOLOGGEDUSER)
    }
  }
  async init () {
    this.publicStore = await this.initInstance('public')
    let userList = await this.listUsers()
    if (!userList) {
      await this.publicStore.setItem('userList', {})
    }
  }

  /**
   * Create a new user, add a new object in userList.
   * A uuid is added to the received object, this allows to
   * change the username without modifying the key inside the db.
   *
   * @param {masqUser} user - The user
   * @returns {Promise}
   *
   */
  async createUser (user) {
    common.checkObject(user, requiredParameterUser)
    const users = await this.publicStore.getItem('userList')
    if (users[user.username]) {
      throw common.generateError(common.ERRORS.EXISTINGUSERNAME)
    }
    // Add a uuid.
    user._id = common.generateUUID()
    users[user.username] = user
    this.key = await MasqCrypto.utils.deriveKey(user.passphrase)
    if (!this.key || this.key.length === 0) {
      throw common.generateError(common.ERRORS.WRONGPASSPHRASE)
    }

    delete user.passphrase
    await this.publicStore.setItem('userList', users)
    this.profileStore = await this.initInstance(user._id, this.key)
    await this.profileStore.setItem('appList', {})
    await this.profileStore.setItem('deviceList', {})
    await this.profileStore.setItem('tokenList', {})
    return user._id
  }

  /**
   * Delete a user meta info from the userList and the associated
   * key (id) which contains all the user data.
   * The user must be logged before.
   *
   * * @returns {Promise}
   */
  async deleteUser () {
    this.checkCurrentUser()
    const user = await this.getUser()

    let users = await this.publicStore.getItem('userList')
    delete users[user.username]
    await this.publicStore.setItem('userList', users)
    await this.profileStore.clear()
    await this.signOut()
  }

  /**
   * Update the current logged user info.
   *
   * @param {masqUser} user - The updated user
   * @returns {Promise}
   */
  async updateUser (user) {
    this.checkCurrentUser()
    let existingUser = await this.getUser()
    let users = await this.listUsers()
    // Get the user info object
    user._id = this._currentUserId
    users[user.username] = user
    if (existingUser.username !== user.username) {
      delete users[existingUser.username]
    }
    await this.publicStore.setItem('userList', users)
  }

  /**
   * Return the list of registered users.
   *
   * @returns {Promise<MasqUser>} - The list of users
   *
   */
  listUsers () {
    return this.publicStore.getItem('userList')
  }

  /**
   * Return the logged user public info
   *
   * @returns {Promise<MasqUser>} - The logged user
   *
   */
  async getUser () {
    this.checkCurrentUser()
    // Get the user public info
    let users = await this.publicStore.getItem('userList')
    for (let key of Object.keys(users)) {
      if (users[key]._id === this._currentUserId) {
        return users[key]
      }
    }
  }

  /**
   * Return the user profile info (private)
   *
   * @returns {Promise<Object>} - The user profile
   *
   */
  async getProfile () {
    this.checkCurrentUser()
    return this.profileStore.dumpStore()
  }
  /**
   * Update the user profile info (private)
   * @param {object} profile - The username must be the same as during the registration
   * @returns {Promise} - The user profile
   *
   */
  async setProfile (profile) {
    this.checkCurrentUser()
    if (!profile) {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    for (let key of Object.keys(profile)) {
      await this.profileStore.setItem(key, profile[key])
    }
  }

  /**
   * Login function, based on the username, the user id is
   * retrieved and stored as the value of key *this._currentUserId*
   *
   * TODO : we need an authentication system based on PBKDF2.
   *
   * @param {string} username - The username must be the same as during the registration
   * @param {string} passphrase - The passphrase
   * @returns {Promise}
   *
   */
  async signIn (username, passphrase) {
    if (!username || username === '') {
      throw common.generateError(common.ERRORS.NOUSERNAME)
    }
    if (!passphrase || passphrase === '') {
      throw common.generateError(common.ERRORS.NOPASSPHRASE)
    }
    const users = await this.publicStore.getItem('userList')
    if (!users[username]) {
      throw common.generateError(common.ERRORS.USERNAMENOTFOUND)
    }
    this.key = await MasqCrypto.utils.deriveKey(passphrase)
    this._currentUserId = users[username]._id
    // Initialise the profile instance
    if (!this.profileStore) {
      this.profileStore = await this.initInstance(this._currentUserId, this.key)
    }
    // test if the passphrase is valid
    try {
      const user = await this.getProfile()
      // TODO add a test to check the key, ex JSON .parse
    } catch (error) {
      throw common.generateError(common.ERRORS.WRONGPASSPHRASE)
    }
  }

  /**
 * Logout function
 *
 */
  signOut () {
    // TODO delete passphrase from memory
    this._currentUserId = null
    this.profileStore = null
  }

  /**
   * Init an instance of a store (e.g. 'public', user profile, web app store)
   *
   * @param {string} id
   * @param {Uint8Array} [key] - The encryption key, if encryption enabled
   */
  async initInstance (id, key) {
    let instance
    if (key) {
      if (!this.aesCipher) {
        this.aesCipher = await new MasqCrypto.AES({key: key})
      }
      instance = new Store.Store(id, this.storage, this.aesCipher)
    } else {
      instance = new Store.Store(id, this.storage)
    }
    await instance.init()
    return instance
  }

  /**
   * Delete the storage instance
   *
   * @param {string} id
   */
  async deleteInstance (id) {
    const instance = new Store.Store(id, this.storage)
    await instance.init()
    return instance.clear()
  }

  /**
 * Generate the app uuid based on secret and app url
 * @param {string} url - The app url
 * @returns {string} - The app id
 */
  deriveAppId (url) {
    // TODO
    // return  hash(symmetricKey | url)
    return this.passphrase + url
  }

  /**
 * Get application ID based on assigned token
 *
 * @param {string} token - The token for the application
 * @returns {Promise}
 */
  async getAppIdByToken (token) {
    if (!token) {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    this.checkCurrentUser()
    const user = await this.getProfile()
    return user.tokenList[token]
  }

  /**
 * Register a new application, add the app meta to the appList.
 * Create an appToken for the web app. Add the token to tokenList.
 *
 * @param {masqApp} appMeta - The application metadata
 * @returns {Promise<string>} - The generated token
 *
 */
  async addApp (appMeta) {
    this.checkCurrentUser()
    common.checkObject(appMeta, requiredParameterApp)
    let user = await this.getProfile()

    // Check if the application is already registered
    const receivedAppId = this.deriveAppId(appMeta.url)

    // appToken will be sent to the web app.
    const appToken = common.generateUUID()
    // appId is derived.
    const appId = this.deriveAppId(appMeta.url)
    // add token to list of authorized apps.
    user.tokenList[appToken] = appId
    appMeta.id = appId
    user.appList[appId] = appMeta

    await this.setProfile(user)
    return appToken
  }

  /**
 * Delete application and all associated data.
 *
 * @param {string} url - The url of the application
 * @returns {Promise}
 */
  async deleteApp (url) {
    this.checkCurrentUser()
    if (!url || url === '') {
      throw common.generateError(common.ERRORS.WRONGPARAMETER)
    }
    let user = await this.getProfile()
    const appId = this.deriveAppId(url)
    // Remove meta
    delete user.appList[appId]

    // Remove tokens
    Object.keys(user.tokenList).forEach(key => {
      if (user.tokenList[key] === appId) {
        delete user.tokenList[key]
      }
    })
    // await this.profileStore.setItem(this._currentUserId, user)
    await this.setProfile(user)

    // Delete app data
    await this.deleteInstance(appId)
  }

  /**
 * Update the received application
 * The url must be unchanged.
 *
 * @param {masqApp} appMeta - The updated appMeta
 * @returns {Promise}
 */
  async updateApp (appMeta) {
    this.checkCurrentUser()
    common.checkObject(appMeta, ['url'])
    const appId = this.deriveAppId(appMeta.url)
    let user = await this.getProfile()
    if (!user.appList[appId]) {
      throw common.generateError(common.ERRORS.NOEXISTINGKEY)
    }
    appMeta.id = appId
    user.appList[appId] = appMeta
    // await this.profileStore.setItem(this._currentUserId, user)
    await this.setProfile(user)
  }

  /**
 * Return the list of registered applications for the logged user.
 *
 * @returns {Promise<masqApp>} - The list of applications
 *
 */
  async listApps () {
    this.checkCurrentUser()
    let user = await this.getProfile()
    return user.appList
  }

  //   /**
  //  * Register a new device, appends the object to the deviceList.
  //  *
  //  * @param {masqDevice} device - The newly appaired device
  //  * @returns {Promise}
  //  *
  //  */
  //   async addDevice (device) {
  //     this.checkCurrentUser()
  //     let data = await this.getItem(this._currentUserId)
  //     data.deviceList.push(device)
  //     await this.setItem(this._currentUserId, data)
  //     DEBUG(`*** A new device/app has been added to device list.***`)
  //   }

  //   /**
  //  * Delete a device, remove the object from the deviceList.
  //  *
  //  * @param {masqDevice} device - The device object which must contain at least the app name
  //  * @returns {Promise}
  //  *
  //  */
  //   async deleteDevice (device) {

  //     // TODO
  //   }

  //   /**
  //  * Update a device.
  //  *
  //  * @param {masqDevice} device - The device object with updated info
  //  * @returns {Promise}
  //  *
  //  */
  //   async updateDevice (device) {
  //     this.checkCurrentUser()
  //     let data = await this.getItem(this._currentUserId)
  //     if (data.deviceList.length === 0) {
  //       return new Error('No registered device.')
  //     }
  //     let index = data.appList.findIndex(dev => dev.name === device.name)
  //     data.deviceList[index] = device
  //     await this.setItem(this._currentUserId, data)
  //     DEBUG(`Application ${device.name} has been updated. `)
  //   }
  //   /**
  //  * Return the list of registered devices for the logged user.
  //  *
  //  * @returns {Promise<masqDevice[]>} - The list of devices
  //  *
  //  */
  //   async listDevices () {
  //     this.checkCurrentUser()
  //     let data = await this.getItem(this._currentUserId)
  //     return data.deviceList
  //   }

//   /**
//  * Clear the indexedDB.
//  *
//  */
//   async clearStorage () {
//     await this.publicStore.clear()
//     return this.profileStore.clear()
//   }
}

module.exports.Masq = Masq
