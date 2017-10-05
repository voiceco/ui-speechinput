'use strict'

const fsmFactory   = require('./lib/finite-state-machine')
const getToken     = require('./lib/watson-get-token')
const micStream    = require('./lib/stream-microphone')
const mp3Stream    = require('./lib/webaudio-mp3-stream')
const press        = require('./lib/press')
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
  // enable fast-tap behavior everything in this widget
  // https://developers.google.com/web/updates/2013/12/300ms-tap-delay-gone-away
  dom.style.touchAction = 'manipulation'
  dom.classList.add('ui-speechinput')
  dom.innerHTML = `<div id="transcription-output"></div>
<div class="control-bar" style="display: flex; flex-direction: row">
  <div class="record-container recording">
    <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
       width="30px" height="30px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve">
      <rect x="0" y="10" width="4" height="10" fill="#fff" opacity="0.2">
        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0s" dur="1s" repeatCount="indefinite" />
      </rect>
      <rect x="8" y="10" width="4" height="10" fill="#fff"  opacity="0.2">
        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.15s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.15s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.15s" dur="1s" repeatCount="indefinite" />
      </rect>
      <rect x="16" y="10" width="4" height="10" fill="#fff"  opacity="0.2">
        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.3s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.3s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.3s" dur="1s" repeatCount="indefinite" />
      </rect>
    <rect x="24" y="10" width="4" height="10" fill="#fff"  opacity="0.2">
        <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.45s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.45s" dur="1s" repeatCount="indefinite" />
        <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.45s" dur="1s" repeatCount="indefinite" />
      </rect>
    </svg>
    <span style="padding-left:8px">recording</span>
  </div>
  <button class="record" disabled>record</button>
  <button class="pause" disabled>pause</button>
  <button class="re-record" disabled>re-record</button>
  <button class="done" disabled>done</button>
</div>`

  const recordLabel = dom.querySelector('.record-container')
  recordLabel.style.color = 'white'
  recordLabel.style.display = 'flex'
  recordLabel.style.justifyContent = 'center'
  recordLabel.style.alignItems = 'center'
  recordLabel.style.backgroundColor = 'rgba(255, 0, 0, 0.92)'
  recordLabel.style.minWidth = '120px'
  recordLabel.style.marginRight = '10px'
  recordLabel.style.padding = '4px'
  //recordLabel.style.position = 'relative'
  //recordLabel.style.bottom ='0px'
  //recordLabel.style.right = '8px'
  //recordLabel.style.left = '8px'
  recordLabel.style.transitionDuration = '0.2s'
  recordLabel.style.opacity = 0

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

  let mic, mp3Encoder

  const recordButton = dom.querySelector('button.record')
  press.once(recordButton, function(ev) {
    mic = micStream()
    mp3Encoder = mp3Stream({ sampleRate: mic.sampleRate })
  })

  const recordingState = function() {
    let speech, currentItem

    const enter = async function() {
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

      recordLabel.style.opacity = 1
    }

    const exit = function() {
      recordLabel.style.opacity = 0
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
