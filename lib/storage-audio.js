'use strict'

const localforage = require('localforage')
const pubsub      = require('ev-pubsub')


module.exports = async function audioStorage(options={}) {
  const { publish, subscribe, unsubscribe } = pubsub()

  /*
  data structure:
    recordings: {
      name1: {
        meta: {
          created: 12223232,
          finalized: true,
          ...
        },
        segments: [
          {
            data: [ ... ],
            transcription: "...."
          }
        ]
      }
    }

  methods:
    create recording
    create segment
    clear (delete all segments)
    finalize recording

    list recordings
    get recording
    upload recording
  */

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }

  // send audio data to the current segement
  const write = function(data) {
    // TODO
  }

  // https://github.com/voiceco/Boswell.ai/issues/276
  localforage.setDriver(localforage.INDEXEDDB)
  await localforage.ready()

  if(localforage.INDEXEDDB !== localforage.driver())
    throw new Error('failed to run demo. could not use INDEXEDDB driver.')

  return Object.freeze({ subscribe, unsubscribe, write, pipe, unpipe })
}
