'use strict'

const lamejs = require('lamejs')


const MAX_SAMPLES = 1152

class Mp3Encoder extends AudioWorkletProcessor {
  constructor() {
    super()
    const config = {}
    this.encoder = new lamejs.Mp3Encoder(1, config.sampleRate || 44100, config.bitRate || 123)
  }

  floatTo16BitPCM(input, output) {
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]))
      output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF)
    }
  }

  process(inputs, outputs) {
    const data = new Float32Array(inputs[0])
    let out = new Int16Array(arrayBuffer.length)

    let samplesMono = floatTo16BitPCM(data, out)
    let remaining = samplesMono.length
    let dataBuffer = []
    for (let i = 0; remaining >= 0; i += MAX_SAMPLES) {
      let left = samplesMono.subarray(i, i + MAX_SAMPLES)
      let mp3buf = this.encoder.encodeBuffer(left)
      dataBuffer.push(mp3buf)
      remaining -= MAX_SAMPLES
    }

    outputs[0].set(dataBuffer)
    return true
  }
}

registerProcessor('mp3-encoder-processor', Mp3Encoder)
