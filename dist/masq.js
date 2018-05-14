'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _store = require('./store');

var _store2 = _interopRequireDefault(_store);

var _masqCommon = require('masq-common');

var _masqCommon2 = _interopRequireDefault(_masqCommon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import common from 'masq-common'

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
var requiredParameterApp = ['name', 'url'];
/**
* The list of required parameters for an user, used wich common.checkObject function
*/
var requiredParameterUser = ['username'];

/**
   * Masq
   * @constructor
   * @param {Object} params - The MasqStore cipher parameters
   * @param {ArrayBuffer} [params.passphrase] - The passphrase
   */

var Masq = function () {
  function Masq() {
    var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck3.default)(this, Masq);

    this.passphrase = params.passphrase || '';
    this._key = [];
    this._currentUserId = null;
    this.storage = params.storage;
    this.publicStore = null;
    this.profileStore = null;
  }

  // get key () {
  //   return this._key
  // }

  // set key (newKey) {
  //   this._key = newKey
  // }

  (0, _createClass3.default)(Masq, [{
    key: 'checkCurrentUser',
    value: function checkCurrentUser() {
      if (!this._currentUserId) {
        throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOLOGGEDUSER);
      }
    }
  }, {
    key: 'init',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var userList;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.initInstance('public');

              case 2:
                this.publicStore = _context.sent;
                _context.next = 5;
                return this.listUsers();

              case 5:
                userList = _context.sent;

                if (userList) {
                  _context.next = 9;
                  break;
                }

                _context.next = 9;
                return this.publicStore.setItem('userList', {});

              case 9:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function init() {
        return _ref.apply(this, arguments);
      }

      return init;
    }()

    /**
     * Create a new user, add a new object in userList.
     * A uuid is added to the received object, this allows to
     * change the username without modifying the key inside the db.
     *
     * @param {masqUser} user - The user
     * @returns {Promise}
     *
     */

  }, {
    key: 'createUser',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(user) {
        var users;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _masqCommon2.default.checkObject(user, requiredParameterUser);
                _context2.next = 3;
                return this.publicStore.getItem('userList');

              case 3:
                users = _context2.sent;

                if (!users[user.username]) {
                  _context2.next = 6;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.EXISTINGUSERNAME);

              case 6:
                // Add a uuid.
                user._id = _masqCommon2.default.generateUUID();
                users[user.username] = user;
                _context2.next = 10;
                return this.publicStore.setItem('userList', users);

              case 10:
                _context2.next = 12;
                return this.initInstance(user._id);

              case 12:
                this.profileStore = _context2.sent;
                _context2.next = 15;
                return this.profileStore.setItem('appList', {});

              case 15:
                _context2.next = 17;
                return this.profileStore.setItem('deviceList', {});

              case 17:
                _context2.next = 19;
                return this.profileStore.setItem('tokenList', {});

              case 19:
                return _context2.abrupt('return', user._id);

              case 20:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function createUser(_x2) {
        return _ref2.apply(this, arguments);
      }

      return createUser;
    }()

    /**
     * Delete a user meta info from the userList and the associated
     * key (id) which contains all the user data.
     * The user must be logged before.
     *
     * * @returns {Promise}
     */

  }, {
    key: 'deleteUser',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
        var user, users;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                this.checkCurrentUser();
                _context3.next = 3;
                return this.getUser();

              case 3:
                user = _context3.sent;
                _context3.next = 6;
                return this.publicStore.getItem('userList');

              case 6:
                users = _context3.sent;

                delete users[user.username];

                _context3.next = 10;
                return this.publicStore.setItem('userList', users);

              case 10:
                _context3.next = 12;
                return this.profileStore.clear();

              case 12:
                _context3.next = 14;
                return this.signOut();

              case 14:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function deleteUser() {
        return _ref3.apply(this, arguments);
      }

      return deleteUser;
    }()

    /**
     * Update the current logged user info.
     *
     * @param {masqUser} user - The updated user
     * @returns {Promise}
     */

  }, {
    key: 'updateUser',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(user) {
        var existingUser, users;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                this.checkCurrentUser();
                _context4.next = 3;
                return this.getUser();

              case 3:
                existingUser = _context4.sent;
                _context4.next = 6;
                return this.listUsers();

              case 6:
                users = _context4.sent;

                // Get the user info object
                user._id = this._currentUserId;
                users[user.username] = user;
                if (existingUser.username !== user.username) {
                  delete users[existingUser.username];
                }
                _context4.next = 12;
                return this.publicStore.setItem('userList', users);

              case 12:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function updateUser(_x3) {
        return _ref4.apply(this, arguments);
      }

      return updateUser;
    }()

    /**
     * Return the list of registered users.
     *
     * @returns {Promise<MasqUser>} - The list of users
     *
     */

  }, {
    key: 'listUsers',
    value: function listUsers() {
      return this.publicStore.getItem('userList');
    }

    /**
     * Return the logged user public info
     *
     * @returns {Promise<MasqUser>} - The logged user
     *
     */

  }, {
    key: 'getUser',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
        var users, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key;

        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                this.checkCurrentUser();
                // Get the user public info
                _context5.next = 3;
                return this.publicStore.getItem('userList');

              case 3:
                users = _context5.sent;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context5.prev = 7;
                _iterator = Object.keys(users)[Symbol.iterator]();

              case 9:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context5.next = 16;
                  break;
                }

                key = _step.value;

                if (!(users[key]._id === this._currentUserId)) {
                  _context5.next = 13;
                  break;
                }

                return _context5.abrupt('return', users[key]);

              case 13:
                _iteratorNormalCompletion = true;
                _context5.next = 9;
                break;

              case 16:
                _context5.next = 22;
                break;

              case 18:
                _context5.prev = 18;
                _context5.t0 = _context5['catch'](7);
                _didIteratorError = true;
                _iteratorError = _context5.t0;

              case 22:
                _context5.prev = 22;
                _context5.prev = 23;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 25:
                _context5.prev = 25;

                if (!_didIteratorError) {
                  _context5.next = 28;
                  break;
                }

                throw _iteratorError;

              case 28:
                return _context5.finish(25);

              case 29:
                return _context5.finish(22);

              case 30:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[7, 18, 22, 30], [23,, 25, 29]]);
      }));

      function getUser() {
        return _ref5.apply(this, arguments);
      }

      return getUser;
    }()

    /**
     * Return the user profile info (private)
     *
     * @returns {Promise<Object>} - The user profile
     *
     */

  }, {
    key: 'getProfile',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                this.checkCurrentUser();
                return _context6.abrupt('return', this.profileStore.dumpStore());

              case 2:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function getProfile() {
        return _ref6.apply(this, arguments);
      }

      return getProfile;
    }()
    /**
     * Update the user profile info (private)
     * @param {object} profile - The username must be the same as during the registration
     * @returns {Promise} - The user profile
     *
     */

  }, {
    key: 'setProfile',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(profile) {
        var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, key;

        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                this.checkCurrentUser();

                if (profile) {
                  _context7.next = 3;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 3:
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context7.prev = 6;
                _iterator2 = Object.keys(profile)[Symbol.iterator]();

              case 8:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  _context7.next = 15;
                  break;
                }

                key = _step2.value;
                _context7.next = 12;
                return this.profileStore.setItem(key, profile[key]);

              case 12:
                _iteratorNormalCompletion2 = true;
                _context7.next = 8;
                break;

              case 15:
                _context7.next = 21;
                break;

              case 17:
                _context7.prev = 17;
                _context7.t0 = _context7['catch'](6);
                _didIteratorError2 = true;
                _iteratorError2 = _context7.t0;

              case 21:
                _context7.prev = 21;
                _context7.prev = 22;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 24:
                _context7.prev = 24;

                if (!_didIteratorError2) {
                  _context7.next = 27;
                  break;
                }

                throw _iteratorError2;

              case 27:
                return _context7.finish(24);

              case 28:
                return _context7.finish(21);

              case 29:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this, [[6, 17, 21, 29], [22,, 24, 28]]);
      }));

      function setProfile(_x4) {
        return _ref7.apply(this, arguments);
      }

      return setProfile;
    }()

    /**
     * Login function, based on the username, the user id is
     * retrieved and stored as the value of key *this._currentUserId*
     *
     * TODO : we need an authentication system based on PBKDF2.
     *
     * @param {string} username - The username must be the same as during the registration
     * @returns {Promise}
     *
     */

  }, {
    key: 'signIn',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(username) {
        var users;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!(!username || username === '')) {
                  _context8.next = 2;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOUSERNAME);

              case 2:
                _context8.next = 4;
                return this.publicStore.getItem('userList');

              case 4:
                users = _context8.sent;

                if (users[username]) {
                  _context8.next = 7;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.USERNAMENOTFOUND);

              case 7:
                this._currentUserId = users[username]._id;
                // Initialise the profile instance

                if (this.profileStore) {
                  _context8.next = 12;
                  break;
                }

                _context8.next = 11;
                return this.initInstance(this._currentUserId);

              case 11:
                this.profileStore = _context8.sent;

              case 12:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function signIn(_x5) {
        return _ref8.apply(this, arguments);
      }

      return signIn;
    }()

    /**
    * Logout function
    *
    */

  }, {
    key: 'signOut',
    value: function signOut() {
      // TODO delete passphrase from memory
      this._currentUserId = null;
      this.profileStore = null;
    }

    /**
     * Init an instance of a store (e.g. 'public', user profile, web app store)
     *
     * @param {string} id
     */

  }, {
    key: 'initInstance',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(id) {
        var instance;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                instance = new _store2.default.Store(id, this.storage);
                _context9.next = 3;
                return instance.init();

              case 3:
                return _context9.abrupt('return', instance);

              case 4:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function initInstance(_x6) {
        return _ref9.apply(this, arguments);
      }

      return initInstance;
    }()

    /**
     * Delete the storage instance
     *
     * @param {string} id
     */

  }, {
    key: 'deleteInstance',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(id) {
        var instance;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                instance = new _store2.default.Store(id, this.storage);
                _context10.next = 3;
                return instance.init();

              case 3:
                return _context10.abrupt('return', instance.clear());

              case 4:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function deleteInstance(_x7) {
        return _ref10.apply(this, arguments);
      }

      return deleteInstance;
    }()

    /**
    * Generate the app uuid based on secret and app url
    * @param {string} url - The app url
    * @returns {string} - The app id
    */

  }, {
    key: 'deriveAppId',
    value: function deriveAppId(url) {
      // TODO
      // return  hash(symmetricKey | url)
      return this.passphrase + url;
    }

    /**
    * Get application ID based on assigned token
    *
    * @param {string} token - The token for the application
    * @returns {Promise}
    */

  }, {
    key: 'getAppIdByToken',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(token) {
        var user;
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                if (token) {
                  _context11.next = 2;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 2:
                this.checkCurrentUser();
                _context11.next = 5;
                return this.getProfile();

              case 5:
                user = _context11.sent;
                return _context11.abrupt('return', user.tokenList[token]);

              case 7:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function getAppIdByToken(_x8) {
        return _ref11.apply(this, arguments);
      }

      return getAppIdByToken;
    }()

    /**
    * Register a new application, add the app meta to the appList.
    * Create an appToken for the web app. Add the token to tokenList.
    *
    * @param {masqApp} appMeta - The application metadata
    * @returns {Promise<string>} - The generated token
    *
    */

  }, {
    key: 'addApp',
    value: function () {
      var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(appMeta) {
        var user, receivedAppId, appToken, appId;
        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                this.checkCurrentUser();
                _masqCommon2.default.checkObject(appMeta, requiredParameterApp);
                _context12.next = 4;
                return this.getProfile();

              case 4:
                user = _context12.sent;


                // Check if the application is already registered
                receivedAppId = this.deriveAppId(appMeta.url);

                // appToken will be sent to the web app.

                appToken = _masqCommon2.default.generateUUID();
                // appId is derived.

                appId = this.deriveAppId(appMeta.url);
                // add token to list of authorized apps.

                user.tokenList[appToken] = appId;
                appMeta.id = appId;
                user.appList[appId] = appMeta;

                _context12.next = 13;
                return this.setProfile(user);

              case 13:
                return _context12.abrupt('return', appToken);

              case 14:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function addApp(_x9) {
        return _ref12.apply(this, arguments);
      }

      return addApp;
    }()

    /**
    * Delete application and all associated data.
    *
    * @param {string} url - The url of the application
    * @returns {Promise}
    */

  }, {
    key: 'deleteApp',
    value: function () {
      var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13(url) {
        var user, appId;
        return _regenerator2.default.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                this.checkCurrentUser();

                if (!(!url || url === '')) {
                  _context13.next = 3;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.WRONGPARAMETER);

              case 3:
                _context13.next = 5;
                return this.getProfile();

              case 5:
                user = _context13.sent;
                appId = this.deriveAppId(url);
                // Remove meta

                delete user.appList[appId];

                // Remove tokens
                Object.keys(user.tokenList).forEach(function (key) {
                  if (user.tokenList[key] === appId) {
                    delete user.tokenList[key];
                  }
                });
                // await this.profileStore.setItem(this._currentUserId, user)
                _context13.next = 11;
                return this.setProfile(user);

              case 11:
                _context13.next = 13;
                return this.deleteInstance(appId);

              case 13:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function deleteApp(_x10) {
        return _ref13.apply(this, arguments);
      }

      return deleteApp;
    }()

    /**
    * Update the received application
    * The url must be unchanged.
    *
    * @param {masqApp} appMeta - The updated appMeta
    * @returns {Promise}
    */

  }, {
    key: 'updateApp',
    value: function () {
      var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14(appMeta) {
        var appId, user;
        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                this.checkCurrentUser();
                _masqCommon2.default.checkObject(appMeta, ['url']);
                appId = this.deriveAppId(appMeta.url);
                _context14.next = 5;
                return this.getProfile();

              case 5:
                user = _context14.sent;

                if (user.appList[appId]) {
                  _context14.next = 8;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOEXISTINGKEY);

              case 8:
                appMeta.id = appId;
                user.appList[appId] = appMeta;
                // await this.profileStore.setItem(this._currentUserId, user)
                _context14.next = 12;
                return this.setProfile(user);

              case 12:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function updateApp(_x11) {
        return _ref14.apply(this, arguments);
      }

      return updateApp;
    }()

    /**
    * Return the list of registered applications for the logged user.
    *
    * @returns {Promise<masqApp>} - The list of applications
    *
    */

  }, {
    key: 'listApps',
    value: function () {
      var _ref15 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15() {
        var user;
        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                this.checkCurrentUser();
                _context15.next = 3;
                return this.getProfile();

              case 3:
                user = _context15.sent;
                return _context15.abrupt('return', user.appList);

              case 5:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function listApps() {
        return _ref15.apply(this, arguments);
      }

      return listApps;
    }()

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

  }]);
  return Masq;
}();

module.exports.Masq = Masq;