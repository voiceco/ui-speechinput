'use strict'

const Recorder = require('opus-recorder')
const pubsub   = require('ev-pubsub')


// GOTCHA: this object should be constructed as the result of a user gesture.
// in mobile audiocontext and scriptprocessornode must be constructed directly from user gesture.
// something particularly insidious about this issue is it won't throw any visible javascript errors.
// the underlying audiocontext will simply remain in a paused state, and you'll see data flow into the
// scriptprocessor object, but with all 0's for data. brutal!
module.exports = function microphoneStream() {
  const { publish, subscribe, unsubscribe } = pubsub()

  let encoder
  const audioContext = new (window.AudioContext || window.webkitAudioContext)


  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }


  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }


  // you don't need to call this from a user gesture; it will work fine in mobile contexts
  // as long as this object was constructed from a user gesture
  const start = async function() {
    if(encoder)
      return

    // set up a web worker with logic to encode audio to opus
    encoder = new Recorder({
      //encoderBitRate: 2560000,
      encoderApplication: 2048, // voice
      encoderPath: '/js/encoderWorker.min.js',

      //encoderSampleRate: 48000,

      monitorGain: 0,
      numberOfChannels: 1,
      maxBuffersPerPage: 10, // defaults to 40
      originalSampleRateOverride: 16000,
      streamPages: true
    })

    encoder.addEventListener('dataAvailable', function (ev) {
      // ev.detail is a Uint8Array
      //const dataBlob = new Blob( [ev.detail], { type: 'audio/ogg' })
      publish('data', ev.detail.buffer)
    })

    // request the user for permission to access the the audio stream and raise
    // streamReady or streamError. Returns a Promise which resolves the audio
    // stream when it is ready.
    await encoder.initStream()

    // initalize the worker and begin capturing audio if the audio stream is ready.
    // Will raise the start event when started.
    encoder.start()
  }


  const stop = function() {
    if(encoder)
      encoder.stop()
    encoder = undefined
  }


  return Object.freeze({ pipe, unpipe, start, stop, sampleRate: audioContext.sampleRate })
}
