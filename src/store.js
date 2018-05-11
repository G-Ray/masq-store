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
  }

  async init () {
    if (this.storage.setItem && this.storage.getItem) {
      let inst = await this.storage.getItem(this.id)
      if (!inst) {
        await this.storage.setItem(this.id, {})
      }
    } else {
      throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
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
    if (!key || key === '') {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    if (this.storage.setItem && this.storage.getItem) {
      let inst = await this.storage.getItem(this.id)
      inst[key] = value
      return this.storage.setItem(this.id, inst)
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Return an array of storage keys
   */
  async listKeys () {
    if (this.storage.getItem) {
      let inst = await this.storage.getItem(this.id)
      return Object.keys(inst)
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }
  /**
   * Get an item with the received key.
   */
  async getItem (key) {
    // TODO decrypt
    if (!key || key === '') {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    if (this.storage.getItem) {
      let inst = await this.storage.getItem(this.id)
      return inst[key]
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }
  /**
   * Remove an item corresponding to the received key.
   */
  async removeItem (key) {
    if (!key || key === '') {
      throw common.generateError(common.ERRORS.NOVALUE)
    }
    if (this.storage.setItem && this.storage.getItem) {
      let inst = await this.storage.getItem(this.id)
      if (!inst[key]) {
        throw common.generateError(common.ERRORS.NOVALUE)
      }
      delete inst[key]
      return this.storage.setItem(this.id, inst)
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Clear the indexedDB.
   *
   */
  async clear () {
    if (this.storage.setItem) {
      return this.storage.setItem(this.id, {})
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Get all storage
   *
   */
  async dumpStore () {
    if (this.storage.getItem) {
      return this.storage.getItem(this.id)
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }
}

module.exports.Store = Store
