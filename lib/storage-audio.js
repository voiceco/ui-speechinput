'use strict'

const localforage = require('localforage')
const pubsub      = require('ev-pubsub')


module.exports = async function audioStorage(options={}) {
  const { objectKey } = options
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
  */

  const getRecording = function(key) {
    return recordings[key]
  }

  const listRecordings = function() {
    return Object.keys(recordings)
  }

  const uploadRecording = function(key) {
    // TODO: connect to backend and stream the audio up
  }

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

  let recordings = await localforage.getItem(objectKey)
  if(!recordings)
    recordings = {}

  return Object.freeze({ getRecording, listRecordings, uploadRecording, subscribe, unsubscribe, write, pipe, unpipe })
}
