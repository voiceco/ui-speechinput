'use strict'

const localforage = require('localforage')
const pubsub      = require('ev-pubsub')


module.exports = async function audioStorage(options={}) {
  const { objectKey } = options
  const { publish, subscribe, unsubscribe } = pubsub()

  let currentRecording, currentSegment

  const createRecording = async function(uuid) {
    if(recordings[uuid])
      throw new Error('could not create new recording: ' + uuid + ' already exists in storage')

    recordings[uuid] = currentRecording = {
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

    console.log('finished recording!', currentRecording)
    await localforage.setItem(objectKey, recordings)
    currentRecording = undefined
    currentSegment = undefined
  }

  const getRecording = function(key) {
    return recordings[key]
  }

  const listRecordings = function() {
    return Object.keys(recordings)
  }

  const setSegmentTranscription = function(transcription) {
    if(currentSegment)
      currentSegment.transcription = transcription
  }

  const uploadRecording = function(key) {
    if(!recordings[key])
      return

    // TODO: upload audio file to backend
    /*
    const audioBlob = new Blob(recordings[key].segments, { type: recordings[key].meta.type })
    const objectURL = URL.createObjectURL(audioBlob)
    const a = new Audio(objectURL)
    a.play()
    */
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
    if(currentSegment)
      currentSegment.data.push(data)
  }

  // https://github.com/voiceco/Boswell.ai/issues/276
  localforage.setDriver(localforage.INDEXEDDB)
  await localforage.ready()

  if(localforage.INDEXEDDB !== localforage.driver())
    throw new Error('failed to run demo. could not use INDEXEDDB driver.')

  let recordings = await localforage.getItem(objectKey)
  console.log('sa weeeee:', recordings)
  if(!recordings)
    recordings = {}

  return Object.freeze({ clearSegments, createRecording, createSegment, finalizeRecording,
    getRecording, listRecordings, setSegmentTranscription, uploadRecording, subscribe,
    unsubscribe, write, pipe, unpipe })
}
