import common from 'masq-common'

/**
   * Store
   * @constructor
   * @param {Object} params - The store params
   * @param {string} params.id - The instance id
   * @param {Object} params.storage - The storage interface
   */
class Store {
  constructor (id, storage) {
    this.id = id
    this.storage = storage || new this.InMemoryStorage()

    if (!this.storage.setItem || !this.storage.getItem) {
      throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
    }
  }

  _checkKey (key) {
    if (typeof key !== 'string' || key === '') {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
  }

  async init () {
    let inst = await this.storage.getItem(this.id)
    if (!inst) {
      await this.storage.setItem(this.id, {})
    }
  }

  InMemoryStorage () {
    let userDB = {}
    this.setItem = (key, value) => {
      userDB[key] = value
      return Promise.resolve(value)
    }
    this.getItem = (key) => {
      return Promise.resolve(userDB[key])
    }
  }

  /**
   * Set an item with the received key.
   */
  async setItem (key, value) {
    // TODO encrypt
    this._checkKey(key)
    let inst = await this.storage.getItem(this.id)
    inst[key] = value
    return this.storage.setItem(this.id, inst)
  }

  /**
   * Return an array of storage keys
   */
  async listKeys () {
    let inst = await this.storage.getItem(this.id)
    return Object.keys(inst)
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }
  /**
   * Get an item with the received key.
   */
  async getItem (key) {
    // TODO decrypt
    this._checkKey(key)
    let inst = await this.storage.getItem(this.id)
    return inst[key]
  }
  /**
   * Remove an item corresponding to the received key.
   */
  async removeItem (key) {
    this._checkKey(key)
    let inst = await this.storage.getItem(this.id)
    if (!inst[key]) {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    delete inst[key]
    return this.storage.setItem(this.id, inst)
  }

  /**
   * Clear the indexedDB.
   *
   */
  async clear () {
    return this.storage.setItem(this.id, {})
  }

  /**
   * Get all storage
   *
   */
  async dumpStore () {
    return this.storage.getItem(this.id)
  }
}

module.exports.Store = Store
