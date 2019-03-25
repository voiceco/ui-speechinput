'use strict'

//const lamejs = require('lamejs')


// downsample audio to mp3 and post back
module.exports = function(self) {
  let mp3Encoder, maxSamples = 1152, samplesMono, config, dataBuffer

  const clearBuffer = function() {
    dataBuffer = []
  }

  const appendToBuffer = function (mp3Buf) {
    const buf = new Int8Array(mp3Buf)
    //dataBuffer.push(buf)
    self.postMessage({ cmd: 'data', buf: buf.buffer }, [ buf.buffer ])
  }

  const init = function (prefConfig) {
    config = prefConfig || { debug: true }
    config.sampleRate = config.sampleRate || 44100

    importScripts(config.lameUrl)
    mp3Encoder = new lamejs.Mp3Encoder(1, config.sampleRate, config.bitRate || 123)
    clearBuffer()
  }

  const floatTo16BitPCM = function floatTo16BitPCM (input, output) {
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]))
      output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF)
    }
  }

  const convertBuffer = function (arrayBuffer) {
    const data = new Float32Array(arrayBuffer)
    let out = new Int16Array(arrayBuffer.length)
    floatTo16BitPCM(data, out)
    return out
  }

  const encode = function (arrayBuffer) {
    samplesMono = convertBuffer(arrayBuffer)
    let remaining = samplesMono.length
    for (let i = 0; remaining >= 0; i += maxSamples) {
      let left = samplesMono.subarray(i, i + maxSamples)
      let mp3buf = mp3Encoder.encodeBuffer(left)
      appendToBuffer(mp3buf)
      remaining -= maxSamples
    }
  }

  const finish = function () {
    appendToBuffer(mp3Encoder.flush())
    self.postMessage({ cmd: 'end', buf: dataBuffer })
    if (config.debug)
      console.log('Sending finished command')
    clearBuffer()
  }

  self.addEventListener('message', function (e) {
    if (e.data.topic === 'data')
      encode(e.data.buf)
    else if (e.data.topic === 'init')
      init({ sampleRate: e.data.sampleRate, bitRate: e.data.bitRate, lameUrl: e.data.lameUrl })
    else if (e.data.topic === 'finish')
      finish()
  })
}
