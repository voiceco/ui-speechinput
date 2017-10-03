'use strict'

const pubsub = require('ev-pubsub')


// read intermediate watson speech-to-text data and emit events
module.exports = function watsonSTTResultStream(options={}) {
  const { publish, subscribe, unsubscribe } = pubsub()

  let index = 0  // store the last "finished" transcription entry
  const transcriptions = []

  // remove all contents from the result stream
  const clear = function() {
    index = 0
    transcriptions.length = 0
  }

  const markBoundary = function(clearData=false) {
    if (clearData) {
      // when clearData is true, empty out all of the text so that it's not saved
      for (let i=index; i >= 0 && i < transcriptions.length; i++) {
        transcriptions[i].results.length = 0
      }
    }
    index = transcriptions.length
  }

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }

  const write = function(data) {
    if (!data.results)
      return

    transcriptions[data.result_index] = data

    let text = ''

    const current = _getTranscriptions()
    for(let k=0; k < current.length; k++) {
      let next = current[k]
      for(let i=0; i < next.results.length; i++) {
        for(let j=0; j < next.results[i].alternatives.length; j++) {
          let tt = next.results[i].alternatives[j].transcript.replace('%HESITATION', '').trim()
          if (text.length === 0)
            text = tt.charAt(0).toUpperCase() + tt.slice(1)
          else
            text += tt
        }
      }

      // only punctuate multiple sentences
      if (current.length > 1) text += '. '
    }

    publish('data', text, data.results[0].final)
  }

  const _getTranscriptions = function() {
    // return a copy of all new transcriptions from the boundary position onwards
    return (index >= 0 && index < transcriptions.length) ? transcriptions.slice(index) : []
  }

  return Object.freeze({ clear, subscribe, unsubscribe, write, pipe, unpipe, markBoundary })
}
