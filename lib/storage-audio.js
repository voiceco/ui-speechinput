'use strict'

const localforage = require('localforage')
const pubsub      = require('ev-pubsub')


module.exports = async function audioStorage(options={}) {
  const { objectPrefix } = options
  const { publish, subscribe, unsubscribe } = pubsub()

  let currentRecording, currentSegment

  // @param uuid  v4 uuid of recording
  // @param meta  optional object containing custom metadata
  const createRecording = async function(uuid, meta={}) {
    currentRecording = await getRecording(uuid)

    if(currentRecording)
      throw new Error('could not create new recording: ' + uuid + ' already exists in storage')

    currentRecording = {
      uuid,
      meta: {
        created: Date.now(),
        finalized: false,
        syncedToServer: false,
        type: 'audio/mp3',
        custom: meta
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

    // TODO: approximate duration from byte length
    // (will be updated to more accurate duration once sync'd to backend)

    currentRecording.meta.finalized = true
    await localforage.setItem(`${objectPrefix}-${currentRecording.uuid}`, currentRecording)
    currentRecording = undefined
    currentSegment = undefined
  }

  const getAllRecordings = async function() {
    const list = await listRecordings()
    const pile = []
    list.forEach(function(audioId) {
      pile.push(getRecording(audioId))
    })
    return Promise.all(pile)
  }

  const getRecording = async function(uuid) {
    const key = uuid.indexOf(objectPrefix) === 0 ? uuid : `${objectPrefix}-${uuid}`
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
      await localforage.setItem(`${objectPrefix}-${recording.uuid}`, recording)
    }
  }

  // removes recording from local cache
  const removeRecording = async function(audioId) {
    return localforage.removeItem(`${objectPrefix}-${audioId}`)
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
    if(currentSegment && data.byteLength)
      currentSegment.data.push(data)
  }

  localforage.setDriver(localforage.INDEXEDDB)
  await localforage.ready()

  if(localforage.INDEXEDDB !== localforage.driver())
    throw new Error('failed to run demo. could not use INDEXEDDB driver.')

  //await localforage.clear()

  return Object.freeze({ clearSegments, createRecording, createSegment,
    finalizeRecording, getAllRecordings, getRecording, listRecordings,
    setSegmentTranscription, subscribe, markUploaded, removeRecording,
    unsubscribe, write, pipe, unpipe })
}
