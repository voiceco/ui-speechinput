'use strict'

const pubsub  = require('ev-pubsub')
//const workify = require('webworkify')


// take in a MediaStreamAudioSourceNode instance and generate mp3 audio,
// downsampling in the process. internally uses a web worker to offload
// CPU intensive work to another thread.
module.exports = function webAudioMp3Stream(options={}) {
  const { sampleRate } = options

  if (!sampleRate)
    throw new Error('couldnt construct mp3 stream; sampleRate undefined')

  const { publish, subscribe, unsubscribe } = pubsub()

  // set up a web worker with logic to encode audio to mp3
  //const encoder = workify(require('./encoder-worker'))
  const encoder = new Worker('/js/encoder-worker.js')

  encoder.addEventListener('message', function (ev) {
    if(ev.data.cmd === 'data')
      publish('data', ev.data.buf)
  })

  encoder.postMessage({ topic: 'init', sampleRate, bitRate: 32 })

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }

  const write = function(buf) {
    encoder.postMessage({ topic: 'data', buf })
  }

  return Object.freeze({ pipe, unpipe, write })
}
