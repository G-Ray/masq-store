'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _masqCommon = require('masq-common');

var _masqCommon2 = _interopRequireDefault(_masqCommon);

var _masqCrypto = require('masq-crypto');

var _masqCrypto2 = _interopRequireDefault(_masqCrypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
   * Store
   * @constructor
   * @param {string} id - The instance id
   * @param {Object} storage - The storage interface
   * @param {Object} [aesCipher] - The aes instance
   */
var Store = function () {
  function Store(id, storage, aesCipher) {
    (0, _classCallCheck3.default)(this, Store);

    this.id = id;
    this.storage = storage || new this.InMemoryStorage();
    this.aesCipher = aesCipher || null;
  }

  (0, _createClass3.default)(Store, [{
    key: 'init',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var inst;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(this.storage.setItem && this.storage.getItem)) {
                  _context.next = 9;
                  break;
                }

                _context.next = 3;
                return this.storage.getItem(this.id);

              case 3:
                inst = _context.sent;

                if (inst) {
                  _context.next = 7;
                  break;
                }

                _context.next = 7;
                return this.storage.setItem(this.id, {});

              case 7:
                _context.next = 10;
                break;

              case 9:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 10:
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
  }, {
    key: 'InMemoryStorage',
    value: function InMemoryStorage() {
      var userDB = {};
      this.setItem = function (key, value) {
        userDB[key] = value;
        return Promise.resolve(value);
      };
      this.getItem = function (key) {
        return Promise.resolve(userDB[key]);
      };
    }

    /**
     * Set an item with the received key.
     */

  }, {
    key: 'setItem',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(key, value) {
        var inst;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!(!key || key === '')) {
                  _context2.next = 2;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 2:
                if (!(this.storage.setItem && this.storage.getItem)) {
                  _context2.next = 9;
                  break;
                }

                _context2.next = 5;
                return this.getAndDecrypt(this.id);

              case 5:
                inst = _context2.sent;

                inst[key] = value;
                _context2.next = 9;
                return this.encryptAndSet(this.id, inst);

              case 9:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 10:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function setItem(_x, _x2) {
        return _ref2.apply(this, arguments);
      }

      return setItem;
    }()

    /**
     * Encrypt data and set item to store
     */

  }, {
    key: 'encryptAndSet',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(key, value) {
        var ciphertext;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this.aesCipher.encrypt(JSON.stringify(value));

              case 2:
                ciphertext = _context3.sent;
                return _context3.abrupt('return', this.storage.setItem(key, ciphertext));

              case 4:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function encryptAndSet(_x3, _x4) {
        return _ref3.apply(this, arguments);
      }

      return encryptAndSet;
    }()

    /**
     * Get data and decrypt it
     */

  }, {
    key: 'getAndDecrypt',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(key) {
        var inst, plaintext;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this.storage.getItem(key);

              case 2:
                inst = _context4.sent;
                _context4.next = 5;
                return this.aesCipher.decrypt(inst);

              case 5:
                plaintext = _context4.sent;
                return _context4.abrupt('return', JSON.parse(plaintext));

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getAndDecrypt(_x5) {
        return _ref4.apply(this, arguments);
      }

      return getAndDecrypt;
    }()

    /**
     * Return an array of storage keys
     */

  }, {
    key: 'listKeys',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
        var inst;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (!this.storage.getItem) {
                  _context5.next = 5;
                  break;
                }

                _context5.next = 3;
                return this.getAndDecrypt(this.id);

              case 3:
                inst = _context5.sent;
                return _context5.abrupt('return', Object.keys(inst));

              case 5:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 6:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function listKeys() {
        return _ref5.apply(this, arguments);
      }

      return listKeys;
    }()
    /**
     * Get an item with the received key.
     */

  }, {
    key: 'getItem',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(key) {
        var inst;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                if (!(!key || key === '')) {
                  _context6.next = 2;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 2:
                if (!this.storage.getItem) {
                  _context6.next = 7;
                  break;
                }

                _context6.next = 5;
                return this.getAndDecrypt(this.id);

              case 5:
                inst = _context6.sent;
                return _context6.abrupt('return', inst[key]);

              case 7:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 8:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function getItem(_x6) {
        return _ref6.apply(this, arguments);
      }

      return getItem;
    }()
    /**
     * Remove an item corresponding to the received key.
     */

  }, {
    key: 'removeItem',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(key) {
        var inst;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!(!key || key === '')) {
                  _context7.next = 2;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 2:
                if (!(this.storage.setItem && this.storage.getItem)) {
                  _context7.next = 11;
                  break;
                }

                _context7.next = 5;
                return this.getAndDecrypt(this.id);

              case 5:
                inst = _context7.sent;

                if (inst[key]) {
                  _context7.next = 8;
                  break;
                }

                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.NOVALUE);

              case 8:
                delete inst[key];
                _context7.next = 11;
                return this.encryptAndSet(this.id, inst);

              case 11:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 12:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function removeItem(_x7) {
        return _ref7.apply(this, arguments);
      }

      return removeItem;
    }()

    /**
     * Clear the indexedDB.
     *
     */

  }, {
    key: 'clear',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8() {
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!this.storage.setItem) {
                  _context8.next = 3;
                  break;
                }

                _context8.next = 3;
                return this.encryptAndSet(this.id, {});

              case 3:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 4:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function clear() {
        return _ref8.apply(this, arguments);
      }

      return clear;
    }()

    /**
     * Get all storage
     *
     */

  }, {
    key: 'dumpStore',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9() {
        var inst;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                if (!this.storage.getItem) {
                  _context9.next = 5;
                  break;
                }

                _context9.next = 3;
                return this.getAndDecrypt(this.id);

              case 3:
                inst = _context9.sent;
                return _context9.abrupt('return', inst);

              case 5:
                throw _masqCommon2.default.generateError(_masqCommon2.default.ERRORS.FUNCTIONNOTDEFINED);

              case 6:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function dumpStore() {
        return _ref9.apply(this, arguments);
      }

      return dumpStore;
    }()
  }]);
  return Store;
}();

module.exports.Store = Store;