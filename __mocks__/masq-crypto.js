
const MasqCrypto = jest.genMockFromModule('masq-crypto')
const toArray = (str = '') => {
  let chars = []
  for (let i = 0; i < str.length; ++i) {
    chars.push(str.charCodeAt(i))
  }
  return new Uint8Array(chars)
}

const bufferToHexString = (bytes) => {
  if (!bytes) {
    return null
  }
  let hexBytes = []

  for (let i = 0; i < bytes.length; ++i) {
    let byteString = bytes[i].toString(16)
    if (byteString.length < 2) {
      byteString = '0' + byteString
    }
    hexBytes.push(byteString)
  }

  return hexBytes.join('')
}

/**
 * Convert ArrayBufffer to ascii
 * ex : Uint8Array [ 98, 111, 110, 106, 111, 117, 114 ] -> "bonjour"
 *
 * @param {ArrayBuffer} bytes
 * @returns {String}
 */
const toString = (bytes) => {
  return String.fromCharCode.apply(null, new Uint8Array(bytes))
}

/**
 * Convert hex String to ArrayBufffer
 * ex : '11a1b2' -> Uint8Array [ 17, 161, 178 ]
 *
 * @param {String} hexString
 * @returns {ArrayBuffer}
 */
const hexStringToBuffer = (hexString) => {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hexString')
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2)

  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substr(i, 2), 16)
    if (isNaN(byteValue)) {
      throw new Error('Invalid hexString')
    }
    arrayBuffer[i / 2] = byteValue
  }

  return arrayBuffer
}

export default class AES {
  constructor (params) {
    this.mode = params.mode || 'aes-gcm'
    this.keySize = params.keySize || 128
    this.IV = params.iv || null
    this.key = params.key || null
    this.length = params.length || 128
    this.additionalData = params.additionalData || ''
  }

  encrypt (input) {
    // console.log('encrypt receive', input)
    let enc = {
      ciphertext: bufferToHexString(toArray(input)),
      iv: bufferToHexString([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    }
    return Promise.resolve(enc)
  }

  decrypt (input) {
    // console.log('decrypt receive', input)
    return Promise.resolve(toString(hexStringToBuffer(input.ciphertext)))
  }
}

function randomString () {
  return 'veryRandom'
}
function deriveKey (passphrase) {
  return Promise.resolve('veryRandom' + passphrase)
}

MasqCrypto.AES = AES
MasqCrypto.utils.randomString = randomString
MasqCrypto.utils.deriveKey = deriveKey
module.exports = MasqCrypto
