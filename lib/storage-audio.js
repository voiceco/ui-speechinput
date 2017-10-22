'use strict'

const localforage = require('localforage')
const pubsub      = require('ev-pubsub')


/*
const audioBlob = new Blob(recordings[key].segments, { type: recordings[key].meta.type })
const objectURL = URL.createObjectURL(audioBlob)
const a = new Audio(objectURL)
a.play()
*/

module.exports = async function audioStorage(options={}) {
  const { objectPrefix } = options
  const { publish, subscribe, unsubscribe } = pubsub()

  let currentRecording, currentSegment

  const createRecording = async function(uuid) {
    currentRecording = await getRecording(uuid)

    if(currentRecording)
      throw new Error('could not create new recording: ' + uuid + ' already exists in storage')

    currentRecording = {
      uuid,
      meta: {
        created: Date.now(),
        finalized: false,
        syncedToServer: false,
        type: 'audio/mp3'
      },
      segments: [ ]
    }
  }

  // remove all segments from the current recording
  const clearSegments = function() {
    if(!currentRecording)
      return

    currentRecording.segments.length = 0
  }

  const createSegment = function() {
    if(!currentRecording)
      return

    currentSegment = {
      data: [], // arraybuffers constituting audio data
      transcription: ''
    }

    currentRecording.segments.push(currentSegment)
  }

  const finalizeRecording = async function() {
    if(!currentRecording)
      return

    currentRecording.meta.finalized = true

    // TODO: multiple windows doing recording will break things (e.g., record
    //       in this window, it gets saved to indexeddb, the other window now
    //       has an outdated copy of the recording array)
    console.log('finished recording!', currentRecording)
    await localforage.setItem(`${objectPrefix}-${currentRecording.uuid}`, currentRecording)
    currentRecording = undefined
    currentSegment = undefined
  }

  const getRecording = async function(uuid) {
    const key = uuid.indexOf(objectPrefix) === 0 ? uuid : `${objectPrefix}-${uuid}`
    console.log('called getRecording:', uuid)
    return localforage.getItem(key)
  }

  const listRecordings = async function() {
    const keys = await localforage.keys()
    return keys.filter(function(k) {
      return k.indexOf(objectPrefix) === 0
    })
  }

  const markUploaded = async function(audioId) {
    const recording = await getRecording(audioId)
    if(recording) {
      recording.meta.syncedToServer = true
      console.log('marking upploaded:', recording.uuid)
      await localforage.setItem(`${objectPrefix}-${recording.uuid}`, recording)
    }
  }

  const setSegmentTranscription = function(transcription) {
    if(currentSegment)
      currentSegment.transcription = transcription
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
    if(currentSegment && data.byteLength) {
      console.log('writing data:', data instanceof ArrayBuffer, data.byteLength)
      currentSegment.data.push(new Uint8Array(data))
    }
  }

  // https://github.com/voiceco/Boswell.ai/issues/276
  localforage.setDriver(localforage.INDEXEDDB)
  await localforage.ready()

  if(localforage.INDEXEDDB !== localforage.driver())
    throw new Error('failed to run demo. could not use INDEXEDDB driver.')

  //await localforage.clear()

  return Object.freeze({ clearSegments, createRecording, createSegment, finalizeRecording,
    getRecording, listRecordings, setSegmentTranscription, subscribe, markUploaded,
    unsubscribe, write, pipe, unpipe })
}
