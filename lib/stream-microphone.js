'use strict'

const getUserMedia = require('get-user-media-promise')
const pubsub       = require('ev-pubsub')


module.exports = function microphoneStream() {
  const { publish, subscribe, unsubscribe } = pubsub()

  let mediaStream, source

  const audioContext = new (window.AudioContext || window.webkitAudioContext)

  // passing 0 or undefined causes the webaudio implementation to choose the best
  // buffer size for the given environment, which will be a constant power of 2
  // throughout the lifetime of the node.
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor
  const bufferSize = undefined
  const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1)

  // https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
  scriptNode.onaudioprocess = function _recorderProcess(e) {
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