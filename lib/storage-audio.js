'use strict'

const localforage = require('localforage')


module.exports = function audioStorage(options={}) {
  /*
  API:
  create new recording
  record segment
  clear
  done (save)
  */

  // https://github.com/voiceco/Boswell.ai/issues/276
  const _init = async function() {
    localforage.setDriver(localforage.INDEXEDDB)
    await localforage.ready()

    if(localforage.INDEXEDDB !== localforage.driver())
      throw new Error('failed to run demo. could not use INDEXEDDB driver.')
  }

  // TODO

  return Object.freeze({})
}
