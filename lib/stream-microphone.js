'use strict'

const getUserMedia = require('get-user-media-promise')
const pubsub       = require('ev-pubsub')


module.exports = function microphoneStream() {
  const { publish, subscribe, unsubscribe } = pubsub()

  let mediaStream, source

  const audioContext = new (window.AudioContext || window.webkitAudioContext)

  // "It is recommended for authors to not specify this buffer size and allow the implementation to pick a good
  // buffer size to balance between latency and audio quality."
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
  // however, webkitAudioContext (safari) requires it to be set'
  // Possible values: null, 256, 512, 1024, 2048, 4096, 8192, 16384
  const bufferSize = (typeof window.AudioContext === 'undefined' ? 4096 : undefined)

  // We can only emit one channel's worth of audio, so only one input. (Who has multiple microphones anyways?)
  const inputChannels = 1

  // we shouldn't need any output channels (going back to the browser), but chrome is buggy and won't give us any audio without one
  const outputChannels = 1

  const scriptNode = context.createScriptProcessor(bufferSize, inputChannels, outputChannels)

  // https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
  scriptNode.onaudioprocess = function _recorderProcess(e) {
    // onaudioprocess can be called at least once after we've stopped
    //if (recording)
    const left = e.inputBuffer.getChannelData(0)
    publish('data', left)
  }

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }

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
    //const opts = { audio,: true, video: false }

    mediaStream = await getUserMedia(opts)
    source = audioContext.createMediaStreamSource(mediaStream)

    source.connect(scriptNode)
    scriptNode.connect(audioContext.destination)
  }

  const stop = function() {
    if(!mediaStream)
      return

    // close the audio recording track and hides the recording indicator
    mediaStream.getAudioTracks()[0].stop()

    mediaStream = undefined
    source.disconnect(scriptNode)
    scriptNode.disconnect(audioContext.destination)
  }

  return Object.freeze({ pipe, unpipe, start, stop, sampleRate: audioContext.sampleRate })
}