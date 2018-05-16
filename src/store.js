import common from 'masq-common'

/**
   * Store
   * @constructor
   * @param {string} id - The instance id
   * @param {Object} storage - The storage interface
   * @param {Object} [aesCipher] - The aes instance
   */
class Store {
  constructor (id, storage, aesCipher) {
    this.id = id
    this.storage = storage || new this.InMemoryStorage()
    this.aesCipher = aesCipher || null
  }

  async init () {
    if (this.storage.setItem && this.storage.getItem) {
      let inst = await this.getAndDecrypt(this.id)

      if (!inst) {
        await this.encryptAndSet(this.id, {})
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
      let inst = await this.getAndDecrypt(this.id)
      inst[key] = value
      await this.encryptAndSet(this.id, inst)
      return
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Encrypt data and set item to store
   */
  async encryptAndSet (key, value) {
    // If encrypted store
    if (this.aesCipher) {
      const ciphertext = await this.aesCipher.encrypt(JSON.stringify(value))
      return this.storage.setItem(key, ciphertext)
    }
    return this.storage.setItem(key, value)
  }

  /**
   * Get data and decrypt it
   */
  async getAndDecrypt (key) {
    const inst = await this.storage.getItem(key)
    // If encrypted store
    if (!inst) {
      return
    }
    if (this.aesCipher) {
      const plaintext = await this.aesCipher.decrypt(inst)
      return JSON.parse(plaintext)
    }
    return inst
  }

  /**
   * Return an array of storage keys
   */
  async listKeys () {
    if (this.storage.getItem) {
      let inst = await this.getAndDecrypt(this.id)
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
      let inst = await this.getAndDecrypt(this.id)
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
      let inst = await this.getAndDecrypt(this.id)
      if (!inst[key]) {
        throw common.generateError(common.ERRORS.NOVALUE)
      }
      delete inst[key]
      return this.encryptAndSet(this.id, inst)
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Clear the indexedDB.
   *
   */
  async clear () {
    if (this.storage.setItem) {
      return this.encryptAndSet(this.id, {})
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }

  /**
   * Get all storage
   *
   */
  async dumpStore () {
    if (this.storage.getItem) {
      let inst = await this.getAndDecrypt(this.id)
      return inst
    }
    throw common.generateError(common.ERRORS.FUNCTIONNOTDEFINED)
  }
}

module.exports.Store = Store
