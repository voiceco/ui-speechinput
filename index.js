'use strict'

const audioStorage = require('./lib/storage-audio')
const fsmFactory   = require('./lib/finite-state-machine')
const getToken     = require('./lib/watson-get-token')
const micStream    = require('./lib/stream-microphone')
const mp3Stream    = require('./lib/webaudio-mp3-stream')
const press        = require('./lib/press')
const recLabel     = require('./lib/ui-recordinglabel')
const resultStream = require('./lib/watson-stt-result-stream')
const uuidV4       = require('uuid/v4')
const watsonSTT    = require('./lib/watson-stt')


/*
finite state machine for speechinput widget
initial state: IDLE

            ┌----┐
┌--->-┬---> |IDLE├--------------┐
|     |     └----┘              |
|     |        ^                v
|     |        |      ┌---------------┐
|   ┌-┴-----┐  └------┤SETUP-RECORDING| <---┬-<----------┐
|   |OFFLINE|         └--┬------------┘     |            |
|   └---┬---┘            |                  |            |
|       |                |                  |            |
|       |                v                  |            |
|       |          ┌---------┐          ┌---┴----┐       |
|       └--------> |RECORDING├--------> |CLEARING| <-┐   |
|                  └--┬----┬-┘          └--------┘   |   |
|                     |    |                         |   |
|   ┌----------┐      |    |             ┌------┐    |   |
└---┤FINALIZING| <----┘    └-----------> |PAUSED├----┴---┘
    └----------┘                         └--┬---┘
          ^                                 |
          |                                 |
          └---------------------------------┘
*/

function appendItem() {
  const item = document.createElement('p')
  item.classList.add('me-text')
  return item
}

module.exports = function speechInput(options={}) {
  const watsonTokenURL = options.tokenURL || '/token' //  /speech-to-text/token
  const fsm = fsmFactory()

  const dom = document.createElement('div')
  // enable fast-tap behavior for all interactables in this widget
  // https://developers.google.com/web/updates/2013/12/300ms-tap-delay-gone-away
  dom.style.touchAction = 'manipulation'
  dom.style.opacity = 0 // hidden by default
  dom.classList.add('ui-speechinput')
  dom.innerHTML = `<div id="transcription-output"></div>
<div class="control-bar" style="display: flex; flex-direction: row">
  <div class="record-container recording"></div>
  <button class="record" disabled>record</button>
  <button class="re-record" disabled>re-record</button>
  <button class="done" disabled>done</button>
</div>`

  const recordLabel = recLabel(dom.querySelector('.record-container'))

  fsm.addState('idle', {
    enter: function(er) {
      if (er)
        console.error('TODO: display a UI error for:', er)

      select('#transcription-output').innerText = ''
      const button = select('button.record')
      button.innerText = 'record'
      button.onclick = function(ev) {
        button.setAttribute('disabled', true)
        fsm.setState('setup-recording')
      }

      setButtonDisabledStates({
        'button.re-record': true,
        'button.done': true,
        'button.record': false
      })
    }
  })

  const select = function(str) {
    return dom.querySelector(str)
  }

  // key is button selector, value is disabled bool
  const setButtonDisabledStates = function(states) {
    Object.keys(states).forEach(function(selector) {
      if(states[selector])
        select(selector).setAttribute('disabled', true)
      else
        select(selector).removeAttribute('disabled')
    })
  }

  let mic, mp3Encoder, storage
  const transcriptionPromise = {
    resolve: undefined,
    reject: undefined
  }
  const speech = watsonSTT({ interim_results: true, smart_formatting: true })

  const recordButton = dom.querySelector('button.record')
  press.once(recordButton, function(ev) {
    mic = micStream()
    mp3Encoder = mp3Stream({ sampleRate: mic.sampleRate })
  })

  fsm.addState('offline', {
    enter: function() {
      setButtonDisabledStates({
        'button.re-record': true,
        'button.done': true,
        'button.record': true,
      })
    }
  })

  fsm.addState('setup-recording', {
    enter: async function() {
      setButtonDisabledStates({
        'button.re-record': true,
        'button.done': true,
        'button.record': true,
      })

      try {
        const token = await getToken(watsonTokenURL)
        speech.recognizeStart(token)
        fsm.setState('recording')
      } catch(er) {
        fsm.setState('idle', er)
      }
    }
  })

  const recordingState = function() {
    let sttResultStream, currentItem

    const _visibilityChanged = function() {
      // when the page is hidden, pause recording
      if(document.hidden)
        fsm.setState('paused')
    }

    const enter = async function() {
      document.addEventListener('visibilitychange', _visibilityChanged)

      currentItem = appendItem()
      select('#transcription-output').appendChild(currentItem)

      recordButton.innerText = 'pause'

      sttResultStream = resultStream()
      sttResultStream.subscribe('data', function _receiveSTTResults(data) {
        currentItem.innerText = data
      })

      speech.subscribe('error', function(er) {
        fsm.setState('idle', er)
      })

      await mic.start()

      mic
        .pipe(mp3Encoder)
        .pipe(speech)
        .pipe(sttResultStream)

      storage.createSegment()
      mp3Encoder.pipe(storage)

      select('button.record').onclick = function(ev) {
        fsm.setState('paused')
      }

      select('button.re-record').onclick = function(ev) {
        fsm.setState('clearing')
      }

      select('button.done').onclick = function(ev) {
        fsm.setState('finalizing')
      }

      setButtonDisabledStates({
        'button.re-record': false,
        'button.done': false,
        'button.record': false
      })

      recordLabel.show()
    }

    const exit = function() {
      storage.setSegmentTranscription(currentItem.innerText)
      document.removeEventListener('visibilitychange', _visibilityChanged)
      sttResultStream.unsubscribe('data')
      speech.unsubscribe('error')
      recordLabel.hide()
      speech.recognizeStop()
      mic.unpipe()
      mp3Encoder.unpipe()
      mic.stop()
      speech.unpipe()
      currentItem = undefined
    }

    return Object.freeze({ enter, exit })
  }

  fsm.addState('recording', recordingState())

  fsm.addState('paused', {
    enter: function() {
      select('button.record').onclick = function(ev) {
        fsm.setState('setup-recording')
      }

      select('button.re-record').onclick =  function(ev) {
        fsm.setState('clearing')
      }

      select('button.done').onclick = function(ev) {
        fsm.setState('finalizing')
      }

      setButtonDisabledStates({
        'button.re-record': false,
        'button.done': false,
        'button.record': false
      })

      recordButton.innerText = 'record'
    }
  })

  fsm.addState('clearing', {
    enter: function() {
      setButtonDisabledStates({
        'button.re-record': true,
        'button.done': true,
        'button.record': true
      })
      select('#transcription-output').innerText = ''
      storage.clearSegments()
      fsm.setState('setup-recording')
    }
  })

  fsm.addState('finalizing', {
    enter: function() {
      if(transcriptionPromise.resolve)
        transcriptionPromise.resolve(select('#transcription-output').innerText)
      fsm.setState('idle')
    }
  })

  window.addEventListener('offline', function offline() {
    fsm.setState('offline')
  })

  window.addEventListener('online', function offline() {
    if(select('#transcription-output').innerText.length)
      fsm.setState('paused')
    else
      fsm.setState('idle')
  })

  const transcribe = async function(uuid=uuidV4()) {
    if(!storage)
      storage = await audioStorage({ objectKey: 'boswell-audio' })

    if(transcriptionPromise.resolve)
      throw new Error('cannot transcribe more than 1 audio at a time')

    storage.createRecording(uuid)
    fsm.setState('idle')
    dom.style.opacity = 1

    const transcription = await new Promise(function(res, rej) {
      transcriptionPromise.resolve = res
      transcriptionPromise.rej = rej
    })

    await storage.finalizeRecording()
    dom.style.opacity = 0
    transcriptionPromise.resolve = undefined
    transcriptionPromise.rej = undefined
    return transcription
  }

  return Object.freeze({ dom, transcribe })
}
