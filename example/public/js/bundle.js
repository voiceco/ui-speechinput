(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

const speech = require('../index')

const s = speech()
document.body.appendChild(s.dom)

},{"../index":3}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
'use strict'

const fsmFactory   = require('./lib/finite-state-machine')
const getToken     = require('./lib/watson-get-token')
const micStream    = require('./lib/stream-microphone')
const mp3Stream    = require('./lib/webaudio-mp3-stream')
const press        = require('./lib/press')
const recLabel     = require('./lib/ui-recordinglabel')
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
  // enable fast-tap behavior for all interactables in this widget
  // https://developers.google.com/web/updates/2013/12/300ms-tap-delay-gone-away
  dom.style.touchAction = 'manipulation'
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
      const button = select('button.record')
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

  let mic, mp3Encoder, transcriptionPromise
  const speech = watsonSTT({ interim_results: true })

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
    let sttResultStream

    const _visibilityChanged = function() {
      // when the page is hidden, pause recording
      if(document.hidden)
        fsm.setState('paused')
    }

    const enter = async function() {
      document.addEventListener('visibilitychange', _visibilityChanged)

      const currentItem = appendItem()
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
      document.removeEventListener('visibilitychange', _visibilityChanged)
      sttResultStream.unsubscribe('data')
      speech.unsubscribe('error')
      recordLabel.hide()
      speech.recognizeStop()
      mic.unpipe()
      mp3Encoder.unpipe()
      mic.stop()
      speech.unpipe()
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
      fsm.setState('setup-recording')
    }
  })

  fsm.addState('finalizing', {
    enter: function() {
      if(transcriptionPromise)
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

  fsm.setState('idle')

  const transcribe = async function(uuid) {
    fsm.setState('idle')
    transcriptionPromise = new Promise()
    return await transcriptionPromise
  }

  return Object.freeze({ dom, transcribe })
}

},{"./lib/finite-state-machine":4,"./lib/press":5,"./lib/stream-microphone":6,"./lib/ui-recordinglabel":7,"./lib/watson-get-token":8,"./lib/watson-stt":10,"./lib/watson-stt-result-stream":9,"./lib/webaudio-mp3-stream":12}],4:[function(require,module,exports){
'use strict'

module.exports = function fsm() {
  const states = {}
  let currentState

  const addState = function(stateName, state) {
    states[stateName] = state
  }

  const getCurrentState = function() {
    return states[currentState]
  }

  const setState = async function(stateName, ...args) {
    if (stateName === currentState)
      return // already in the state

    if (!states[stateName])
      return // new state doesn't exist

    if (currentState) {
      console.log('exiting state', currentState)
      if(states[currentState].exit)
        await states[currentState].exit()
    }

    console.log('entering state', stateName)
    currentState = stateName
    if(states[currentState].enter)
      await states[currentState].enter(...args)
  }

  return Object.freeze({ addState, getCurrentState, setState })
}

},{}],5:[function(require,module,exports){
'use strict'

const isTouch = require('is-touch')

/*
let passiveSupported = false

try {
  const options = Object.defineProperty({}, "passive", {
    get: function() {
      passiveSupported = true
    }
  })

  window.addEventListener("test", null, options)
} catch(err) {}
*/

const event = 'click' //isTouch ? 'touchstart' : 'click'

// encapsulates mobile touchstarts and desktop clicks
module.exports = {
  on: function(el, handler) {
    // a workaround for ios safari
    if(isTouch)
      el.style.cursor = 'pointer'

    //el.addEventListener(event, handler, passiveSupported ? { passive: true } : false)
    el.addEventListener(event, handler)//, passiveSupported)
  },
  once: function(el, handler) {
    // a workaround for ios safari
    if(isTouch)
      el.style.cursor = 'pointer'

    const _tmp = function(ev) {
      el.removeEventListener(event, _tmp)
      handler(ev)
    }
    el.addEventListener(event, _tmp)//, passiveSupported)
  },
  off: function(el, handler) {
    el.removeEventListener(event, handler)
  }
}

},{"is-touch":16}],6:[function(require,module,exports){
'use strict'

const getUserMedia = require('get-user-media-promise')
const pubsub       = require('ev-pubsub')


// GOTCHA: this object should be constructed as the result of a user gesture.
// in mobile audiocontext and scriptprocessornode must be constructed directly from user gesture.
// something particularly insidious about this issue is it won't throw any visible javascript errors.
// the underlying audiocontext will simply remain in a paused state, and you'll see data flow into the
// scriptprocessor object, but with all 0's for data. brutal!
module.exports = function microphoneStream() {
  const { publish, subscribe, unsubscribe } = pubsub()

  let mediaStream, source

  const audioContext = new (window.AudioContext || window.webkitAudioContext)

  // better to let the browser determine this automatically:
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor

  // GOTCHA: Safari webkitAudioContext (safari) requires bufferSize to be set
  // Possible values: null, 256, 512, 1024, 2048, 4096, 8192, 16384
  const bufferSize = (typeof window.AudioContext === 'undefined' ? 4096 : undefined)

  const inputChannels = 1

  // GOTCHA: chrome won't give any audio without an output channel
  const outputChannels = 1

  // GOTCHA: chrome needs the destination set for the script processor or no data will flow
  const scriptNode = audioContext.createScriptProcessor(bufferSize, inputChannels, outputChannels)

  // https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
  scriptNode.onaudioprocess = function _recorderProcess(e) {
    // GOTCHA: onaudioprocess can be called at least once after we've stopped.
    //if (!recording) return

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

  // you don't need to call this from a user gesture; it will work fine in mobile contexts
  // as long as this object was constructed from a user gesture
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
    if(!mediaStream || audioContext.state === 'closed')
      return

    try {
      // close the audio recording track and hides the recording indicator
      mediaStream.getAudioTracks()[0].stop()
    } catch (ex) {
      // GOTCHA: this fails in some older versions of chrome. Nothing we can do about it.
    }

    scriptNode.disconnect()
    if(source)
      source.disconnect()

    // don't close the audio context, we'll need this when recording multiple times in a session
    /*
    try {
      audioContext.close()  // returns a promise
    } catch (ex) {
      // GOTCHA: this can also fail in older versions of chrome
    }
    */
    mediaStream = undefined
  }

  return Object.freeze({ pipe, unpipe, start, stop, sampleRate: audioContext.sampleRate })
}

},{"ev-pubsub":13,"get-user-media-promise":14}],7:[function(require,module,exports){
'use strict'

module.exports = function recordingLabel(dom) {
  dom.innerHTML = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
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
`

  dom.style.color = 'white'
  dom.style.display = 'flex'
  dom.style.justifyContent = 'center'
  dom.style.alignItems = 'center'
  dom.style.backgroundColor = 'rgba(255, 0, 0, 0.92)'
  dom.style.minWidth = '120px'
  dom.style.marginRight = '10px'
  dom.style.padding = '4px'
  //dom.style.position = 'relative'
  //dom.style.bottom ='0px'
  //dom.style.right = '8px'
  //dom.style.left = '8px'
  dom.style.transitionDuration = '0.2s'
  dom.style.opacity = 0

  const show = function() {
    dom.style.opacity = 1
  }

  const hide = function() {
    dom.style.opacity = 0
  }

  return Object.freeze({ dom, show, hide })
}

},{}],8:[function(require,module,exports){
'use strict'

const FIFTY_MINUTES_IN_MILLISECONDS = 50 * 60 * 1000

// get a Watson speech to text token, either from the cache or from the Watson API
module.exports = async function getToken(url='/token') {
  let token = localStorage.getItem('watson-stt-token')
  if(token) {
    token = JSON.parse(token)
    if (Date.now() < token.expiresAt) {
      // there is at least 10 minutes remaining on the token, it's valid
      return token.value
    }
  }

  token = await fetch(url)
  token = await token.text()

  localStorage.setItem('watson-stt-token', JSON.stringify({
    value: token,
    // watson STT tokens last for an hour. Don't use a token with less than 10 minutes remaining
    expiresAt: Date.now() + FIFTY_MINUTES_IN_MILLISECONDS
  }))

  return token
}

},{}],9:[function(require,module,exports){
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

    let next, text = ''

    const current = _getTranscriptions()
    for(let k=0; k < current.length; k++) {
      next = current[k]
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

    publish('data', text)
  }

  const _getTranscriptions = function() {
    // return a copy of all new transcriptions from the boundary position onwards
    return (index >= 0 && index < transcriptions.length) ? transcriptions.slice(index) : []
  }

  return Object.freeze({ clear, subscribe, unsubscribe, write, pipe, unpipe, markBoundary })
}

},{"ev-pubsub":13}],10:[function(require,module,exports){
'use strict'

const fsmFactory = require('./finite-state-machine')
const pick       = require('lodash.pick')
const pubsub     = require('ev-pubsub')


const OPENING_MESSAGE_PARAMS_ALLOWED = [
  'inactivity_timeout',
  'timestamps',
  'word_confidence',
  'content-type',
  'interim_results',
  'keywords',
  'keywords_threshold',
  'max_alternatives',
  'word_alternatives_threshold',
  'profanity_filter',
  'smart_formatting',
  'speaker_labels'
]

/**
 * Stringify query params, Watson-style
 *
 * Why? The server that processes auth tokens currently only accepts the *exact* string, even if it's invalid for a URL.
 * Properly url-encoding percent characters causes it to reject the token.
 * So, this is a custom qs.stringify function that properly encodes everything except watson-token, passing it along verbatim
 *
 * @param {Object} queryParams
 * @return {String}
 */
function stringify(queryParams) {
  return Object.keys(queryParams)
    .map(function(key) {
      return key + '=' + (key === 'watson-token' ? queryParams[key] : encodeURIComponent(queryParams[key])) // the server chokes if the token is correctly url-encoded
    })
    .join('&')
}

/**
 * accepts binary audio and emits objects in it's `data` events.
 *
 * Uses WebSockets under the hood. For audio with no recognizable speech, no `data` events are emitted.
 *
 * By default, only finalized text is emitted in the data events, however when `interim_results` are enabled, both interim and final results objects are emitted.
 * WriteableElementStream uses this, for example, to live-update the DOM with word-by-word transcriptions.
 *
 * https://console.bluemix.net/docs/services/speech-to-text/websockets.html#websockets
 * https://console.bluemix.net/docs/services/speech-to-text/input.html#input
 * https://console.bluemix.net/docs/services/speech-to-text/output.html#output
 *
 * @param {Object} options
 * @param {String} [options.token] - Auth token
 * @param {Boolean} [options.interim_results=true] - Send back non-final previews of each "sentence" as it is being processed. These results are ignored in text mode.
 * @param {Boolean} [options.word_confidence=false] - include confidence scores with results. Defaults to true when in objectMode.
 * @param {Boolean} [options.timestamps=false] - include timestamps with results. Defaults to true when in objectMode.
 * @param {Number} [options.max_alternatives=1] - maximum number of alternative transcriptions to include. Defaults to 3 when in objectMode.
 * @param {Array<String>} [options.keywords] - a list of keywords to search for in the audio
 * @param {Number} [options.keywords_threshold] - Number between 0 and 1 representing the minimum confidence before including a keyword in the results. Required when options.keywords is set
 * @param {Number} [options.word_alternatives_threshold] - Number between 0 and 1 representing the minimum confidence before including an alternative word in the results. Must be set to enable word alternatives,
 * @param {Boolean} [options.profanity_filter=false] - set to true to filter out profanity and replace the words with *'s
 * @param {Number} [options.inactivity_timeout=30] - how many seconds of silence before automatically closing the stream. use -1 for infinity
 * @param {Number} [options.X-Watson-Learning-Opt-Out=false] - set to true to opt-out of allowing Watson to use this request to improve it's services
 * @param {Boolean} [options.smart_formatting=false] - formats numeric values such as dates, times, currency, etc.
 */
module.exports = function watsonSpeechToText(options={}) {
  const { publish, subscribe, unsubscribe } = pubsub()
  //if (options.inactivity_timeout === undefined)
  //  options.inactivity_timeout = -1

  const fsm = fsmFactory()

  let socket

  fsm.addState('stopped', {
    enter: function(token) {
      if(token)
        fsm.setState('starting', token)
    },
    recognizeStart: function(token) {
      fsm.setState('starting', token)
    }
  })

  fsm.addState('stopping', {
    enter: function() {
      this.token = undefined
      _send(JSON.stringify({ action: 'stop' }))
    },
    onmessage: function(message) {
      // when listen message is received, ready for new recognition request.
      if (message.state === 'listening') {
        fsm.setState('stopped', this.token)
      }
    },
    recognizeStart: function(token) {
      // if a recognition start is attempted while in stopping state, store the
      // token so that it may be passed to stopped state later. Effectively
      // queues the recognizeStart action until reaching stopped state
      this.token = token
    }
  })

  fsm.addState('starting', {
    enter: async function(token) {
      try {
        if(!_isOpen())
          await _initSocket(token)

        const openingMessage = pick(options, OPENING_MESSAGE_PARAMS_ALLOWED)
        openingMessage.action = 'start'
        openingMessage['content-type'] = 'audio/mp3'
        console.log('sending watson header message', openingMessage)
        _send(JSON.stringify(openingMessage))
      } catch(er) {
        fsm.setState('stopped')
      }
    },
    onmessage: function(message) {
      // when listen message is received, we are in a new recognition request
      if (message.state === 'listening') {
        fsm.setState('started')
      } else if (message.error) {
        fsm.setState('stopped')
        publish('error', message.error)
      } else {
        publish('data', message)
      }
    },
    write: function(data) {
      _send(data)
    }
  })

  fsm.addState('started', {
    onmessage: function(message) {
      if (message.state === 'listening') {
        fsm.setState('started')
      } else if (message.error) {
        fsm.setState('stopped')
        publish('error', message.error)
      } else {
        publish('data', message)
      }
    },
    recognizeStop: function() {
      fsm.setState('stopping')
    },
    write: function(data) {
      _send(data)
    }
  })

  const close = function() {
    console.log('manually closing watson socket')
    unpipe()
    socket.close()
  }

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }


  const recognizeStop = function() {
    const state = fsm.getCurrentState()
    if(state && state.recognizeStop)
      state.recognizeStop()
  }

  const recognizeStart = function(token) {
    const state = fsm.getCurrentState()
    if(state && state.recognizeStart)
      state.recognizeStart(token)
  }

  // forward audio data to the watson stt backend
  const write = function(data) {
    // if watson receives a 0 length message the recognize event is stopped, so
    // ensure we're sending at least some data to prevent accidental closure if
    // data source stalls or fully drains.
    if(data.byteLength === 0)
      return

    const state = fsm.getCurrentState()
    if(state && state.write)
      state.write(data)
  }

  const _initSocket = async function(token) {
    return new Promise(function(resolve, reject) {
      const queryString = stringify({ model: 'en-US_BroadbandModel', 'watson-token': token })
      const wsURI = `wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?${queryString}`
      try {
        socket = new WebSocket(wsURI)
        socket.onopen = resolve
        socket.onerror = reject

        socket.onmessage = function(data) {
          const state = fsm.getCurrentState()
          const message = JSON.parse(data.data)
          //console.log('W:', message)
          if(state && state.onmessage) {
            state.onmessage(message)
          }
        }
        socket.onclose = function(code) {
          fsm.setState('stopped')
          socket = undefined
        }
      } catch(er) {
        reject(er)
      }
    })
  }

  const _isOpen = function() {
    return socket && socket.readyState === socket.OPEN
  }

  const _send = function(data) {
    if (_isOpen())
      socket.send(data)
  }

  fsm.setState('stopped')

  return Object.freeze({ close, pipe, recognizeStart, recognizeStop, unpipe, subscribe, unsubscribe, write })
}

},{"./finite-state-machine":4,"ev-pubsub":13,"lodash.pick":17}],11:[function(require,module,exports){
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

  const floatTo16BitPCM = function floatTo16BitPCM(input, output) {
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]))
      output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF)
    }
  }

  const convertBuffer = function(arrayBuffer) {
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

  self.addEventListener('message', function(e) {
    if (e.data.topic === 'data')
      encode(e.data.buf)
    else if(e.data.topic === 'init')
      init({ sampleRate: e.data.sampleRate, bitRate: e.data.bitRate, lameUrl: e.data.lameUrl })
    else if (e.data.topic === 'finish')
      finish()
  })
}

},{}],12:[function(require,module,exports){
'use strict'

const pubsub  = require('ev-pubsub')
const workify = require('webworkify')


// take in a MediaStreamAudioSourceNode instance and generate mp3 audio,
// downsampling in the process. internally uses a web worker to offload
// CPU intensive work to another thread.
module.exports = function webAudioMp3Stream(options={}) {
  const { sampleRate } = options

  const lameUrl = options.lameUrl || (document.location.origin + '/js/lame.min.js')

  if (!sampleRate)
    throw new Error('couldnt construct mp3 stream; sampleRate undefined')

  const { publish, subscribe, unsubscribe } = pubsub()

  // set up a web worker with logic to encode audio to mp3
  const encoder = workify(require('./encoder-worker'))
  //const encoder = new Worker('/js/encoder-worker.js')

  encoder.addEventListener('message', function (ev) {
    if(ev.data.cmd === 'data')
      publish('data', ev.data.buf)
  })

  // < 32 kbps mp3 encoding doesn't seem to encode properly on android or ios
  encoder.postMessage({ topic: 'init', sampleRate, bitRate: 64, lameUrl })

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

},{"./encoder-worker":11,"ev-pubsub":13,"webworkify":20}],13:[function(require,module,exports){
'use strict'

const nextTick    = require('next-tick-2')
const removeItems = require('remove-array-items')


// very simple publish/subcribe system
module.exports = function pubsub() {
  const _listeners = {}

  const _onceListeners = {}

  let once = function(topic, handler) {
    if (!_onceListeners[topic]) _onceListeners[topic] = []

    _onceListeners[topic].push(handler)
  }

  let publish = function(topic, ...args) {
    // execute these in the next process tick rather than synchronously. this
    // enables subscribing to topics after publishing and not missing events
    // that are published before subscribing in the same event loop
    nextTick(function() {
      if(_listeners[topic]) {
        for(let i=0; i < _listeners[topic].length; i++) {
          _listeners[topic][i](...args)
        }
      }

      if(_onceListeners[topic]) {
        for(let i=_onceListeners[topic].length-1; i >= 0; i--) {
          _onceListeners[topic][i](...args)
          removeItems(_onceListeners[topic], i, 1)
        }
      }
    })
  }

  let subscribe = function(topic, handler) {
    if (!_listeners[topic]) _listeners[topic] = []

    // if a function is registered for a topic more than once, likely a bug
    if(_alreadySubscribed(topic, handler)) {
      console.warn('double adding handler for topic:', topic, ' handler:', handler, 'perhaps this is a bug?')
    }

    _listeners[topic].push(handler)
  }

  // @param function handler if ommitted, remove all handlers for this topic
  let unsubscribe = function(topic, handler) {
    if (_listeners[topic]) {
      if (!handler) {
        _listeners[topic] = []
        return
      }
      for(let i=0; i < _listeners[topic].length; i++) {
        if (_listeners[topic][i] === handler) {
          removeItems(_listeners[topic], i, 1)
          return
        }
      }
    }
  }

  let _alreadySubscribed = function(topic, handler) {
    if (!_listeners[topic]) return false

    for(let i=0; i < _listeners[topic].length; i++) {
      if (_listeners[topic][i] === handler)
      {
        return true
      }
    }

    return false
  }

  return Object.freeze({ publish, subscribe, unsubscribe, once })
}

},{"next-tick-2":18,"remove-array-items":19}],14:[function(require,module,exports){
// loosely based on example code at https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
(function (root) {
  'use strict';

  /**
   * Error thrown when any required feature is missing (Promises, navigator, getUserMedia)
   * @constructor
   */
  function NotSupportedError() {
    this.name = 'NotSupportedError';
    this.message = 'getUserMedia is not implemented in this browser';
  }
  NotSupportedError.prototype = Error.prototype;

  /**
   * Fake Promise instance that behaves like a Promise except that it always rejects with a NotSupportedError.
   * Used for situations where there is no global Promise constructor.
   *
   * The message will report that the getUserMedia API is not available.
   * This is technically true because every browser that supports getUserMedia also supports promises.
   **
   * @see http://caniuse.com/#feat=stream
   * @see http://caniuse.com/#feat=promises
   * @constructor
   */
  function FakePromise() {
    // make it chainable like a real promise
    this.then = function() {
      return this;
    };

    // but always reject with an error
    var err = new NotSupportedError();
    this.catch = function(cb) {
      setTimeout(function () {
        cb(err);
      });
    }
  }

  var isPromiseSupported = typeof Promise !== 'undefined';

  // checks for root.navigator to enable server-side rendering of things that depend on this
  // (will need to be updated on client, but at least doesn't throw this way)
  var navigatorExists = typeof navigator !== "undefined";
  // gump = mondern promise-based interface
  // gum = old callback-based interface
  var gump = navigatorExists && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  var gum = navigatorExists && (navigator.getUserMedia || navigator.webkitGetUserMedia ||  navigator.mozGetUserMedia || navigator.msGetUserMedia);

  /**
   * Wrapper for navigator.mediaDevices.getUserMedia.
   * Always returns a Promise or Promise-like object, even in environments without a global Promise constructor
   *
   * @stream https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
   *
   * @param {Object} constraints - must include one or both of audio/video along with optional details for video
   * @param {Boolean} [constraints.audio] - include audio data in the stream
   * @param {Boolean|Object} [constraints.video] - include video data in the stream. May be a boolean or an object with additional constraints, see
   * @returns {Promise<MediaStream>} a promise that resolves to a MediaStream object
     */
  function getUserMedia(constraints) {
    // ensure that Promises are supported and we have a navigator object
    if (!isPromiseSupported) {
      return new FakePromise();
    }

    // Try the more modern, promise-based MediaDevices API first
    //https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    if(gump) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    // fall back to the older method second, wrap it in a promise.
    return new Promise(function(resolve, reject) {
      // if navigator doesn't exist, then we can't use the getUserMedia API. (And probably aren't even in a browser.)
      // assuming it does, try getUserMedia and then all of the prefixed versions

      if (!gum) {
        return reject(new NotSupportedError())
      }
      gum.call(navigator, constraints, resolve, reject);
    });
  }

  getUserMedia.NotSupportedError = NotSupportedError;

  // eslint-disable-next-line no-implicit-coercion
  getUserMedia.isSupported = !!(isPromiseSupported && (gump || gum));

  // UMD, loosely based on https://github.com/umdjs/umd/blob/master/templates/returnExportsGlobal.js
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      return getUserMedia;
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = getUserMedia;
  } else {
    // Browser globals
    // polyfill the MediaDevices API if it does not exist.
    root.navigator = root.navigator || {};
    root.nagivator.mediaDevices = root.navigator.mediaDevices || {};
    root.nagivator.mediaDevices.getUserMedia = root.nagivator.mediaDevices.getUserMedia || getUserMedia;
  }
}(this));

},{}],15:[function(require,module,exports){
(function (process){
// Coding standard for this project defined @ https://github.com/MatthewSH/standards/blob/master/JavaScript.md
'use strict';

exports = module.exports = !!(typeof process !== 'undefined' && process.versions && process.versions.node);

}).call(this,require('_process'))
},{"_process":2}],16:[function(require,module,exports){
(function (global){
'use strict'
var isNode = require('is-node')
/**
 * @id isTouch
 * `true` if we're in a touch-enabled context, `false` otherwise
 */
module.exports = isNode
  ? false
  : (('ontouchstart' in global) ||
    global.DocumentTouch &&
    document instanceof global.DocumentTouch) ||
    navigator.msMaxTouchPoints ||
    false

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"is-node":15}],17:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    symbolTag = '[object Symbol]';

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array ? array.length : 0,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var Symbol = root.Symbol,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.pick` without support for individual
 * property identifiers.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property identifiers to pick.
 * @returns {Object} Returns the new object.
 */
function basePick(object, props) {
  object = Object(object);
  return basePickBy(object, props, function(value, key) {
    return key in object;
  });
}

/**
 * The base implementation of  `_.pickBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property identifiers to pick from.
 * @param {Function} predicate The function invoked per property.
 * @returns {Object} Returns the new object.
 */
function basePickBy(object, props, predicate) {
  var index = -1,
      length = props.length,
      result = {};

  while (++index < length) {
    var key = props[index],
        value = object[key];

    if (predicate(value, key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = array;
    return apply(func, this, otherArgs);
  };
}

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Creates an object composed of the picked `object` properties.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {...(string|string[])} [props] The property identifiers to pick.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.pick(object, ['a', 'c']);
 * // => { 'a': 1, 'c': 3 }
 */
var pick = baseRest(function(object, props) {
  return object == null ? {} : basePick(object, arrayMap(baseFlatten(props, 1), toKey));
});

module.exports = pick;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
'use strict'

var ensureCallable = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function")
	return fn
}

var byObserver = function (Observer) {
	var node = document.createTextNode(''), queue, currentQueue, i = 0
	new Observer(function () {
		var callback
		if (!queue) {
			if (!currentQueue) return
			queue = currentQueue
		} else if (currentQueue) {
			queue = currentQueue.concat(queue)
		}
		currentQueue = queue
		queue = undefined
		if (typeof currentQueue === 'function') {
			callback = currentQueue
			currentQueue = undefined
			callback()
			return
		}
		node.data = (i = ++i % 2) // Invoke other batch, to handle leftover callbacks in case of crash
		while (currentQueue) {
			callback = currentQueue.shift()
			if (!currentQueue.length) currentQueue = undefined
			callback()
		}
	}).observe(node, { characterData: true })
	return function (fn) {
		ensureCallable(fn)
		if (queue) {
			if (typeof queue === 'function') queue = [queue, fn]
			else queue.push(fn)
			return
		}
		queue = fn
		node.data = (i = ++i % 2)
	}
}

module.exports = (function () {
	// MutationObserver
	if ((typeof document === 'object') && document) {
		if (typeof MutationObserver === 'function') return byObserver(MutationObserver)
		if (typeof WebKitMutationObserver === 'function') return byObserver(WebKitMutationObserver)
	}

	// W3C Draft
	// http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html
	if (typeof setImmediate === 'function') {
		return function (cb) { setImmediate(ensureCallable(cb)) }
	}

	// Wide available standard
	if ((typeof setTimeout === 'function') || (typeof setTimeout === 'object')) {
		return function (cb) { setTimeout(ensureCallable(cb), 0) }
	}
}())

},{}],19:[function(require,module,exports){
'use strict'

/**
 * Remove a range of items from an array
 *
 * @function removeItems
 * @param {Array<*>} arr The target array
 * @param {number} startIdx The index to begin removing from (inclusive)
 * @param {number} removeCount How many items to remove
 */
module.exports = function removeItems(arr, startIdx, removeCount)
{
  var i, length = arr.length

  if (startIdx >= length || removeCount === 0) {
    return
  }

  removeCount = (startIdx + removeCount > length ? length - startIdx : removeCount)

  var len = length - removeCount

  for (i = startIdx; i < len; ++i) {
    arr[i] = arr[i + removeCount]
  }

  arr.length = len
}

},{}],20:[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn, options) {
    var wkey;
    var cacheKeys = Object.keys(cache);

    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        var exp = cache[key].exports;
        // Using babel as a transpiler to use esmodule, the export will always
        // be an object with the default export as a property of it. To ensure
        // the existing api and babel esmodule exports are both supported we
        // check for both
        if (exp === fn || exp && exp.default === fn) {
            wkey = key;
            break;
        }
    }

    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);

    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'], (
            // try to call default if defined to also support babel esmodule
            // exports
            'var f = require(' + stringify(wkey) + ');' +
            '(f.default ? f.default : f)(self);'
        )),
        scache
    ];

    var workerSources = {};
    resolveSources(skey);

    function resolveSources(key) {
        workerSources[key] = true;

        for (var depPath in sources[key][1]) {
            var depKey = sources[key][1][depPath];
            if (!workerSources[depKey]) {
                resolveSources(depKey);
            }
        }
    }

    var src = '(' + bundleFn + ')({'
        + Object.keys(workerSources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;

    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    var blob = new Blob([src], { type: 'text/javascript' });
    if (options && options.bare) { return blob; }
    var workerUrl = URL.createObjectURL(blob);
    var worker = new Worker(workerUrl);
    worker.objectURL = workerUrl;
    return worker;
};

},{}]},{},[1]);
