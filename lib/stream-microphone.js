'use strict'

const getUserMedia = require('get-user-media-promise')
const pubsub       = require('ev-pubsub')


// GOTCHA: this object should be constructed as the result of a user gesture.
// in mobile audiocontext and scriptprocessornode must be constructed directly from user gesture.
// something particularly insidious about this issue is it won't throw any visible javascript errors.
// the underlying audiocontext will simply remain in a paused state, and you'll see data flow into the
// scriptprocessor object, but with all 0's for data. brutal!
module.exports = function microphoneStream() {
  const { publish, subscribe, unsubscribe } = pubsub()

  let mediaStream, source, encoderNode

  const audioContext = new (window.AudioContext || window.webkitAudioContext)

  if(!audioContext.audioWorklet) {
    // better to let the browser determine this automatically:
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
    // GOTCHA: Safari webkitAudioContext (safari) requires bufferSize to be set
    // Possible values: null, 256, 512, 1024, 2048, 4096, 8192, 16384
    const bufferSize = (typeof window.AudioContext === 'undefined' ? 4096 : undefined)

    const inputChannels = 1

    // GOTCHA: chrome won't give any audio without an output channel
    const outputChannels = 1

    // GOTCHA: chrome needs the destination set for the script processor or no data will flow
    encoderNode = audioContext.createScriptProcessor(bufferSize, inputChannels, outputChannels)

    // https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
    encoderNode.onaudioprocess = function _recorderProcess(e) {
      // GOTCHA: onaudioprocess can be called at least once after we've stopped.
      //if (!recording) return
      const left = e.inputBuffer.getChannelData(0)
      publish('data', left)
    }
  }


  const getMediaStream = function() {
    return mediaStream
  }


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
    if(mediaStream)
      return

    const opts = {
      audio: {
        mandatory: {
          echoCancellation: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googAutoGainControl2: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false
        },
        optional: []
      },
      video: false
    }
    //const opts = { audio: true, video: false }
    mediaStream = await getUserMedia(opts)
    source = audioContext.createMediaStreamSource(mediaStream)

    if(audioContext.audioWorklet) {
      await audioContext.audioWorklet.addModule('js/mp3-encoder-worklet-bundle.js')
      encoderNode = new AudioWorkletNode(audioContext, 'mp3-encoder-processor')
    }

    source.connect(encoderNode).connect(audioContext.destination)
  }


  const stop = function() {
    if(!mediaStream || audioContext.state === 'closed')
      return

    try {
      // close the audio recording track and hides the recording indicator
      mediaStream.getAudioTracks()[0].stop()
    } catch (ex) {
      // GOTCHA: this fails in some older versions of chrome. Nothing we can do about it.
    }

    encoderNode.disconnect()
    if(source)
      source.disconnect()

    // don't close the audio context, we'll need this when recording multiple times in a session
    /*
    try {
      audioContext.close()  // returns a promise
    } catch (ex) {
      // GOTCHA: this can also fail in older versions of chrome
    }
    */
    mediaStream = undefined
  }


  return Object.freeze({ getMediaStream, pipe, unpipe, start, stop, sampleRate: audioContext.sampleRate })
}
