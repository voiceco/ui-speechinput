'use strict'

const fsmFactory   = require('./lib/finite-state-machine')
const getToken     = require('./lib/watson-get-token')
const micStream    = require('./lib/stream-microphone')
const mp3Stream    = require('./lib/webaudio-mp3-stream')
const resultStream = require('./lib/watson-stt-result-stream')
const watsonSTT    = require('./lib/watson-stt')


function appendItem() {
  const item = document.createElement('p')
  item.classList.add('me-text')
  return item
}


module.exports = function speechInput(options={}) {
  const watsonTokenURL = options.tokenURL || '/token' //  /speech-to-text/token
  const fsm = fsmFactory()

  const dom = document.createElement('div')
  dom.classList.add('ui-speechinput')
  dom.innerHTML = `<div id="transcription-output"></div>
<button class="record" disabled>record</button>
<button class="pause" disabled>pause</button>
<button class="re-record" disabled>re-record</button>
<button class="done" disabled>done</button>`

  fsm.addState('idle', {
    enter: function() {
      const button = select('button.record')
      button.onclick = function(ev) {
        button.setAttribute('disabled', true)
        fsm.setState('recording')
      }

      setButtonStates({
        'button.pause': true,
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
  const setButtonStates = function(states) {
    Object.keys(states).forEach(function(selector) {
      if(states[selector])
        select(selector).setAttribute('disabled', true)
      else
        select(selector).removeAttribute('disabled')
    })
  }


  const recordingState = function() {
    //const mic = micStream()
    let speech, mp3Encoder, currentItem, mic

    const enter = async function() {
      if(!mic) {
        mic = micStream()
        mp3Encoder = mp3Stream({ sampleRate: mic.sampleRate })
      }

      currentItem = appendItem()
      select('#transcription-output').appendChild(currentItem)

      const sttResultStream = resultStream()
      sttResultStream.subscribe('data', function _receiveSTTResults(data, final) {
        currentItem.innerText = data
      })

      const [ token, status ] = await Promise.all([
        getToken(watsonTokenURL),
        mic.start()
      ])

      // TODO: refactor watsonSTT to use plain websocket and remove auto-reconnect
      speech = watsonSTT({ token, inactivity_timeout: 5 })

      mic
        .pipe(mp3Encoder)
        .pipe(speech)
        .pipe(sttResultStream)

      const pause = select('button.pause')
      pause.onclick = function(ev) {
        fsm.setState('paused')
      }

      const rerecord = select('button.re-record')
      rerecord.onclick = function(ev) {
        fsm.setState('clearing')
      }

      const done = select('button.done')
      done.onclick =  function(ev) {
        fsm.setState('finalizing')
      }

      setButtonStates({
        'button.pause': false,
        'button.re-record': false,
        'button.done': false,
        'button.record': true
      })
    }

    const exit = function() {
      mic.unpipe()
      mp3Encoder.unpipe()
      mic.stop()
      speech.close()
    }

    return Object.freeze({ enter, exit })
  }

  fsm.addState('recording', recordingState())


  fsm.addState('paused', {
    enter: function() {
      select('button.record').onclick = function(ev) {
        fsm.setState('recording')
      }

      select('button.re-record').onclick =  function(ev) {
        fsm.setState('clearing')
      }

      select('button.done').onclick = function(ev) {
        fsm.setState('finalizing')
      }

      setButtonStates({
        'button.pause': true,
        'button.re-record': false,
        'button.done': false,
        'button.record': false,
      })
    }
  })


  fsm.addState('clearing', {
    enter: function() {
      select('#transcription-output').innerText = ''
      fsm.setState('recording')
    }
  })


  fsm.addState('finalizing', {
    enter: function() {
      // TODO: p.resolve()
      fsm.setState('idle')
    }
  })

  fsm.setState('idle')

  const record = async function(uuid) {
    fsm.setState('idle')

    // TODO
  }

  return Object.freeze({ dom, record })
}
