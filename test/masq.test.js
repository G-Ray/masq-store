import localforage from 'localforage'
import common from 'masq-common'
import Masq from '../src/masq'
import Store from '../src/store'
import MasqCrypto from 'masq-crypto'

jest.mock('localforage')
jest.mock('masq-crypto')

const passphrase = 'hello'
let user1 = {
  username: 'some username',
  firstname: 'John',
  lastname: 'Doe',
  image: '',
  passphrase: 'hello'
}

const applications = [
  {
    name: 'Qwant Music',
    color: '#5c00f3',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    enabled: true,
    image: 'https://images.pexels.com/photos/63703/pexels-photo-63703.jpeg?w=1260&h=750&auto=compress&cs=tinysrgb',
    active: true,
    url: 'https://www.qwant.com/music'
  },
  {
    name: 'Qwant Maps',
    color: '#a3005c',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    enabled: false,
    image: 'https://images.pexels.com/photos/592753/pexels-photo-592753.jpeg?w=1260&h=750&auto=compress&cs=tinysrgb',
    url: 'https://www.qwant.com/maps'
  }
]

describe('User management', () => {
  let store = null

  beforeAll(async () => {
    store = new Masq.Masq({storage: localforage, passphrase: passphrase})
  })
  afterAll(async () => {
    await localforage.clear()
  })

  it('should init an empty storage', async () => {
    // console.log(store)
    await store.init()
    expect(await store.listUsers()).toEqual({})
  })

  it('should fail to create a user : no username', async () => {
    let userWithError = {
      username: '',
      firstname: 'John',
      lastname: 'Doe',
      image: ''
    }
    expect.assertions(1)
    await store.createUser(userWithError).catch(e => {
      expect(e.name).toEqual(common.ERRORS.WRONGPARAMETER)
    })
  })
  it('should fail to create a user : no passphrase', async () => {
    let userWithError = {
      username: 'bob',
      firstname: 'John',
      lastname: 'Doe',
      image: ''
    }
    expect.assertions(1)
    await store.createUser(userWithError).catch(e => {
      expect(e.name).toEqual(common.ERRORS.WRONGPARAMETER)
    })
  })

  it('should create  a user', async () => {
    const id = await store.createUser(user1)
    expect(id).toBeDefined()
  })

  it('should fail to create a user : existing username', async () => {
    expect.assertions(1)
    await store.createUser(user1).catch(e => {
      expect(e.name).toEqual(common.ERRORS.EXISTINGUSERNAME)
    })
  })

  it('should get  a public user profile list', async () => {
    const users = await store.listUsers()
    expect(users[user1.username].username).toEqual(user1.username)
    expect(users[user1.username].firstname).toEqual(user1.firstname)
    expect(users[user1.username].lastname).toEqual(user1.lastname)
  })

  it('Should fail to sign in : no username provided', async () => {
    expect.assertions(1)
    await store.signIn('', 'secret').catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOUSERNAME)
    })
  })
  it('Should fail to sign in : no passphrase provided', async () => {
    expect.assertions(1)
    await store.signIn('bob', '').catch(e => {
      console.log(e)
      expect(e.name).toEqual(common.ERRORS.NOPASSPHRASE)
    })
  })

  it('Should fail to sign in : username does not exist', async () => {
    expect.assertions(1)
    await store.signIn('a strange username', 'secret').catch(e => {
      expect(e.name).toEqual(common.ERRORS.USERNAMENOTFOUND)
    })
  })

  it('Should sign in', async () => {
    await store.signIn(user1.username, passphrase)
    let user = await store.getUser()
    expect(user._id).toBeDefined()
    expect(user.username).toEqual(user1.username)
    expect(user.firstname).toEqual(user1.firstname)
    expect(user.lastname).toEqual(user1.lastname)
  })

  it('Should sign out', async () => {
    await store.signOut()
    store.getUser().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })
  it('Should not remove the userList after a new instance', async () => {
    const newStoreInstance = new Masq.Masq({storage: localforage})
    await newStoreInstance.init()
    const users = await newStoreInstance.listUsers()
    expect(users).toEqual(await store.listUsers())
  })

  it('Should fail to delete a user : not logged', async () => {
    expect.assertions(1)
    await store.deleteUser().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Should fail to get  user public info : not logged', async () => {
    expect.assertions(1)
    await store.getUser().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Should fail to get  user private info : not logged', async () => {
    expect.assertions(1)
    await store.getProfile().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('should return the private user profile', async () => {
    await store.signIn(user1.username, passphrase)
    const profile = await store.getProfile()
    expect(profile.deviceList).toBeDefined()
    expect(profile.appList).toBeDefined()
    expect(profile.tokenList).toBeDefined()
  })

  it('Should fail to set  user private info : not logged', async () => {
    await store.signOut()
    expect.assertions(1)
    await store.setProfile().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })
  it('Should fail to set  user private info : empty profile', async () => {
    await store.signIn(user1.username, passphrase)
    expect.assertions(1)
    await store.setProfile().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })

  it('should set the private user profile', async () => {
    await store.signIn(user1.username, passphrase)
    let profile = await store.getProfile()
    profile.appList['foo'] = {bar: 'baz'}
    await store.setProfile(profile)
    // Updated profile
    profile = await store.getProfile()
    expect(profile.appList['foo']).toEqual({bar: 'baz'})
  })

  it('Should fail to update a user : not logged', async () => {
    await store.signOut()
    expect.assertions(1)
    await store.updateUser(user1).catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Sould update a user', async () => {
    await store.signIn(user1.username, passphrase)
    const user1Updated = Object.assign({}, user1)
    user1Updated.username = 'new name'
    let previousUser = await store.getUser()
    await store.updateUser(user1Updated)
    let user = await store.getUser()
    expect(user._id).toEqual(previousUser._id)
    expect(user.username).toEqual(user1Updated.username)
  })

  it('Should delete a user', async () => {
    const curentUser = await store.getUser()
    await store.deleteUser()
    const users = await store.listUsers()
    expect(users['new name']).toBeUndefined()
    let aesCipher = await new MasqCrypto.AES({key: store.key})
    const profile = new Store.Store(curentUser._id, localforage, aesCipher)
    await profile.init()
    expect(await profile.dumpStore()).toEqual({})
  })

  it('Should fail to sign in after a delete', async () => {
    expect.assertions(1)
    await store.signIn('new name', 'secret').catch(e => {
      expect(e.name).toEqual(common.ERRORS.USERNAMENOTFOUND)
    })
  })
})

describe('App management', () => {
  let store = null
  beforeAll(async () => {
    store = new Masq.Masq({storage: localforage})
    await store.init()
    await store.createUser(user1)
  })
  afterAll(async () => {
    await localforage.clear()
  })

  it('Should fail to add an application : no logged user', async () => {
    expect.assertions(1)
    await store.addApp(applications[0]).catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Should fail to delete an application : not logged', async () => {
    expect.assertions(1)
    await store.deleteApp(applications[0].url).catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Should fail to list apps : not logged', async () => {
    expect.assertions(1)
    await store.listApps().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOLOGGEDUSER)
    })
  })

  it('Should fail to add an application : no url provided', async () => {
    let app = {
      name: 'Qwant Music',
      color: '#5c00f3',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
      enabled: true,
      image: 'https://images.pexels.com/photos/63703/pexels-photo-63703.jpeg?w=1260&h=750&auto=compress&cs=tinysrgb',
      active: true
    }

    await store.signIn(user1.username, passphrase)
    expect.assertions(1)
    await store.addApp(app).catch(e => {
      expect(e.name).toEqual(common.ERRORS.WRONGPARAMETER)
    })
  })

  it('Should succesfully add a new application', async () => {
    let token = await store.addApp(applications[0])
    const user = await store.getProfile()
    const appId = user.tokenList[token]
    expect(user.appList[appId].name).toEqual(applications[0].name)
    expect(user.appList[appId].color).toEqual(applications[0].color)
    expect(user.appList[appId].url).toEqual(applications[0].url)
    expect(user.appList[appId].description).toEqual(applications[0].description)
    expect(Object.keys(user).length).toEqual(3)
  })

  it('should get an application list', async () => {
    const apps = await store.listApps()
    expect(apps).toBeDefined()
    expect(apps[Object.keys(apps)[0]].name).toEqual(applications[0].name)
    expect(apps[Object.keys(apps)[0]].color).toEqual(applications[0].color)
    expect(apps[Object.keys(apps)[0]].url).toEqual(applications[0].url)
  })

  it('Should fail to update an application : no url', async () => {
    expect.assertions(1)
    await store.updateApp({}).catch(e => {
      expect(e.name).toEqual(common.ERRORS.WRONGPARAMETER)
    })
  })

  it('Should fail to update an application : different url', async () => {
    expect.assertions(1)
    let app1Updated = {url: 'http://www.qwant.com/music'}
    await store.updateApp(app1Updated).catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOEXISTINGKEY)
    })
  })

  it('Should update an application', async () => {
    let app1Updated = applications[0]
    app1Updated.name = 'Qwant Music2'
    await store.updateApp(app1Updated)
    const apps = await store.listApps()

    expect(apps[Object.keys(apps)[0]].name).toEqual(app1Updated.name)
    expect(apps[Object.keys(apps)[0]].color).toEqual(app1Updated.color)
    expect(apps[Object.keys(apps)[0]].url).toEqual(app1Updated.url)
    expect(apps[Object.keys(apps)[0]].description).toEqual(app1Updated.description)
    expect(apps[Object.keys(apps)[0]].id).toEqual(Object.keys(apps)[0])
  })

  it('Should fail to delete an application : no url', async () => {
    expect.assertions(1)
    await store.deleteApp().catch(e => {
      expect(e.name).toEqual(common.ERRORS.WRONGPARAMETER)
    })
  })

  it('should fail to get an application ID if no token is provided', async () => {
    store.getAppIdByToken().catch(e => {
      expect(e.name).toEqual(common.ERRORS.NOVALUE)
    })
  })

  it('should get an application ID based on the corresponding token', async () => {
    const profile = await store.getProfile()
    const token = Object.keys(profile.tokenList)[0]
    const appId = Object.keys(await store.listApps())[0]
    expect(await store.getAppIdByToken(token)).toBe(appId)
  })

  it('Should delete the application ', async () => {
    let appId = null
    const apps = await store.listApps()
    appId = Object.keys(apps)[0]
    const appData = await store.initInstance(appId)
    await appData.setItem('foo', 'bar')
    await store.deleteApp(applications[0].url)
    const user = await store.getProfile()
    expect(user.tokenList).toEqual({})
    expect(user.appList).toEqual({})
    expect(await appData.dumpStore()).toEqual({})
  })
})

describe('Web App direct integration', () => {
  let store = null
  let appData = null
  beforeAll(async () => {
    store = new Masq.Masq({storage: localforage})
    await store.init()
    await store.createUser(user1)
    await store.signIn(user1.username, passphrase)
    const apps = await store.listApps()
    const appId = Object.keys(apps)[0]
    appData = await store.initInstance(appId)
  })

  it('Should succesfully add a new application', async () => {
    const token = await store.addApp(applications[0])
    const user = await store.getProfile()
    const appId = user.tokenList[token]
    expect(user.appList[appId].name).toEqual(applications[0].name)
    expect(user.appList[appId].color).toEqual(applications[0].color)
    expect(user.appList[appId].url).toEqual(applications[0].url)
    expect(user.appList[appId].description).toEqual(applications[0].description)
  })

  it('should write/read data to app store', async () => {
    await appData.setItem('foo', 'bar')
    const item = await appData.getItem('foo')
    expect(item).toEqual('bar')
  })

  it('should get list of keys from app store', async () => {
    const keys = await appData.listKeys()
    expect(keys.length).toEqual(1)
    expect(keys[0]).toEqual('foo')
  })

  it('should return undefined for a non existent key', async () => {
    const item = await appData.getItem('fooo')
    expect(item).toBeUndefined()
  })

  it('should delete data from app store', async () => {
    await appData.removeItem('foo')
    const item = await appData.getItem('foo')
    expect(item).toBeUndefined()
  })
})
