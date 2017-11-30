'use strict'

const audioStorage = require('./storage')
const fsmFactory   = require('./lib/finite-state-machine')
const getToken     = require('./lib/watson-get-token')
const micStream    = require('./lib/stream-microphone')
const mp3Stream    = require('./lib/webaudio-mp3-stream')
const press        = require('./lib/press')
const recLabel     = require('./lib/ui-recordinglabel')
const resultStream = require('./lib/watson-stt-result-stream')
const syncManager  = require('./lib/sync-manager')
const uuidV4       = require('uuid/v4')
const watsonSTT    = require('./lib/watson-stt')


/*
finite state machine for speechinput widget. initial state: IDLE

          ┌----┐
┌---┬---> |IDLE├-------┐
|   |     └----┘       |
|   |       ^          v
| ┌-┴-----┐ |  ┌---------------┐
| |OFFLINE| └--┤SETUP-RECORDING| <-┬--------┐
| └---┬---┘    └--┬------------┘   |        |
|     |           |                |        |
|     |           v                |        |
|     |        ┌---------┐     ┌---┴----┐   |
|     └------> |RECORDING├---> |CLEARING| <-┤
|              └--┬----┬-┘     └--------┘   |
|                 |    |                    |
| ┌----------┐    |    |       ┌------┐     |
└-┤FINALIZING| <--┘    └-----> |PAUSED├-----┘
  └----------┘                 └--┬---┘
        ^                         |
        └-------------------------┘
*/

function appendItem() {
  const item = document.createElement('p')
  item.classList.add('me-text')
  return item
}

module.exports = function speechInput(options={}) {
  const { key, secret } = options

  if(!key)
    throw new Error('You must specify an API key')

  if(!secret)
    throw new Error('You must specify an API secret')

  const apiHost = 'https://audio.voiceco.ai'
  const objectPrefix = 'voiceco-' + key
  const sync = syncManager({ objectPrefix, apiHost, apiId: key, apiSecret: secret })
  const fsm = fsmFactory()

  const dom = document.createElement('div')
  // enable fast-tap behavior for all interactables in this widget
  // https://developers.google.com/web/updates/2013/12/300ms-tap-delay-gone-away
  dom.style.touchAction = 'manipulation'
  dom.style.opacity = 0 // hidden by default
  dom.style.display = 'grid'
  dom.style.gridTemplateColumns = '1fr'
  dom.style.gridTemplateRows = '1fr 100px'

  dom.classList.add('ui-speechinput')
  dom.innerHTML = `<div class="transcription-output" style="padding: 10px; overflow-y: scroll"></div>
<div class="control-bar" style="display: grid; grid-template-rows: 1fr; grid-template-columns: 1fr 3fr 1fr; justify-content: space-between; align-items: center">
  <button class="record" disabled style="color:red; height: 50px; width: 50px">●</button>
  <div class="output" style="display: flex; justify-content: center"> </div>
  <div style="display: flex; flex-direction: column; justify-content: space-between">
    <button class="re-record" style="padding: 8px" disabled>redo</button>
    <button class="done" style="padding: 8px" disabled>done</button>
  </div>
</div>`

  const output = dom.querySelector('.transcription-output')
  let recordLabel // = recLabel(dom.querySelector('.output'))

  let mic, mp3Encoder, storage

  const transcriptionPromise = {
    resolve: undefined,
    reject: undefined
  }
  const speech = watsonSTT({ interim_results: true, smart_formatting: true })

  // to circumvent audio autoplay limitations in mobile browsers, we define a
  // temporary click handler, which plays a silent audio file upon first gesture.
  // This enables the audio element to have it's src changed at will and play
  // without any further user gestures.
  //
  // These limitations also affect recording audio, so we set up the audio
  // context and other things needed to record on mobile.
  const recordButton = dom.querySelector('button.record')
  press.once(recordButton, function(ev) {
    recordLabel = recLabel(dom.querySelector('.output'))
    mic = micStream()
    mp3Encoder = mp3Stream({ sampleRate: mic.sampleRate })
  })


  fsm.addState('idle', {
    enter: function(er) {
      if (er)
        recordLabel.error(er)

      output.innerText = ''
      const button = select('button.record')
      button.innerText = '●'
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

      recordLabel.initializing()
      try {
        const token = await getToken(apiHost + '/token')
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
      output.appendChild(currentItem)

      recordButton.innerText = '⏸'

      sttResultStream = resultStream()
      sttResultStream.subscribe('data', function _receiveSTTResults(data) {
        currentItem.innerText = data
        //window.scrollTo(0, document.body.scrollHeight)
        //output.style.height = dom.clientHeight - 100 + 'px'
        output.scrollTop = output.scrollHeight
        //dom.parentNode.scrollTop = dom.parentNode.scrollHeight
      })

      speech.subscribe('error', function(er) {
        fsm.setState('idle', er)
      })

      await mic.start()

      storage.createSegment()
      mp3Encoder.pipe(storage)

      mic
        .pipe(mp3Encoder)
        .pipe(speech)
        .pipe(sttResultStream)

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

      recordLabel.recording(mic.getMediaStream())
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

      // disable done and re-record buttons when there's no transcription output
      const disableDone = output.innerText.trim().length === 0
      const disableReRecord = output.innerText.trim().length === 0

      setButtonDisabledStates({
        'button.re-record': disableReRecord,
        'button.done': disableDone,
        'button.record': false
      })

      recordButton.innerText = '●'
    }
  })

  fsm.addState('clearing', {
    enter: function() {
      setButtonDisabledStates({
        'button.re-record': true,
        'button.done': true,
        'button.record': true
      })
      output.innerText = ''
      storage.clearSegments()
      fsm.setState('setup-recording')
    }
  })

  fsm.addState('finalizing', {
    enter: function() {
      if(transcriptionPromise.resolve)
        transcriptionPromise.resolve(output.innerText)
      fsm.setState('idle')
    }
  })

  window.addEventListener('offline', function offline() {
    fsm.setState('offline')
  })

  window.addEventListener('online', function offline() {
    if(output.innerText.length)
      fsm.setState('paused')
    else
      fsm.setState('idle')
  })

  const cancel = function() {
    pause()
    dom.style.opacity = 0
    transcriptionPromise.resolve = undefined
    transcriptionPromise.rej = undefined
  }

  const pause = function() {
    fsm.setState('paused')
  }

  const transcribe = async function(userMeta={}) {
    if(!storage)
      storage = await audioStorage({ objectPrefix })

    //output.style.height = dom.clientHeight - 100 + 'px'

    if(transcriptionPromise.resolve)
      throw new Error('cannot transcribe more than 1 audio at a time')

    const uuid = uuidV4()
    storage.createRecording(uuid, userMeta)
    fsm.setState('idle')
    dom.style.opacity = 1

    const text = await new Promise(function(res, rej) {
      transcriptionPromise.resolve = res
      transcriptionPromise.rej = rej
    })

    await storage.finalizeRecording()
    dom.style.opacity = 0
    transcriptionPromise.resolve = undefined
    transcriptionPromise.rej = undefined
    return { uuid, text: text.trim() }
  }

  return Object.freeze({ cancel, dom, pause, transcribe })
}
