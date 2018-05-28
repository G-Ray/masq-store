import Store from '../src/store'
import common from 'masq-common'
import localforage from 'localforage'

jest.mock('localforage')


describe('Store API using localforage', () => {
  let store = null
  beforeAll(async () => {
    store = new Store.Store('123', localforage)
  })
  it('should init an empty storage', async () => {
    await store.init()
    expect(await store.dumpStore()).toEqual({})
  })
  it('should init an existing storage', async () => {
    await store.setItem('foo', 'bar')
    let store2 = new Store.Store('123', localforage)
    await store2.init()
    const val = await store2.getItem('foo')
    expect(val).toEqual('bar')
  })
  it('should fail to set an empty/null key', async () => {
    expect.assertions(2)
    await store.setItem('').catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
    await store.setItem().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })
  it('should fail to get an empty/null key', async () => {
    expect.assertions(2)
    await store.getItem('').catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
    await store.getItem().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })
  it('should fail to remove an empty/null key', async () => {
    expect.assertions(2)
    await store.removeItem('').catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
    await store.removeItem().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })
  it('should fail to remove a key that does not exist', async () => {
    expect.assertions(1)
    await store.removeItem('baz').catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })
  it('should set/get a key', async () => {
    const key = 'hello'
    const value = 'world'
    await store.setItem(key, value)
    const val = await store.getItem(key)
    expect(val).toEqual(value)
  })
  it('should get all storage data', async () => {
    const val = await store.dumpStore()
    expect(val.hello).toEqual('world')
  })
  it('should remove a key', async () => {
    const key = 'hello'

    await store.removeItem(key)
    const val = await store.getItem(key)
    expect(val).toBeUndefined()
  })
  it('should clear the storage', async () => {
    const key = 'hello'
    const value = 'world'
    await store.setItem(key, value)
    await store.clear()
    const val = await store.getItem(key)
    expect(val).toBeUndefined()
  })
})

describe('Store API using inMemoryStorage', () => {
  let store = null
  beforeAll(async () => {
    store = new Store.Store('123')
  })
  it('should init an empty storage', async () => {
    await store.init()
    expect(await store.dumpStore()).toEqual({})
  })
  it('should set a key', async () => {
    const key = 'hello'
    const value = 'world'

    await store.setItem(key, value)
    const val = await store.getItem(key)
    expect(val).toEqual(value)
  })

  it('should list all keys', async () => {
    const keys = await store.listKeys()
    expect(keys.length).toEqual(1)
    expect(keys[0]).toEqual('hello')
  })
  it('should get all storage data', async () => {
    const val = await store.dumpStore()
    expect(val.hello).toEqual('world')
  })
  it('should remove a key', async () => {
    const key = 'hello'

    await store.removeItem(key)
    const val = await store.getItem(key)
    expect(val).toBeUndefined()
  })
  it('should clear the storage', async () => {
    const key = 'hello'
    const value = 'world'
    await store.setItem(key, value)
    await store.clear()
    const val = await store.getItem(key)
    expect(val).toBeUndefined()
  })
})

describe('Store API bad interface', () => {
  let store = null

  it('should throw error when calling constructor', async () => {
    expect.assertions(1)
    try {
      store = new Store.Store('123', {})
    } catch (err) {
      expect(err).toBeDefined()
    }
  })
})
