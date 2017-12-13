'use strict'

const fsmFactory = require('./finite-state-machine')
const pick       = require('lodash.pick')
const pubsub     = require('ev-pubsub')


/*
finite state machine for Watson speech-to-text socket
initial state: STOPPED

              ┌-------┐
     ┌------->|STOPPED├----┐
     |        └-------┘    |
┌----┴---┐      ^  ^       v
|STOPPING|<-┐   |  |  ┌--------┐
└--------┘  |   |  └--┤STARTING|
            |   |     └--------┘
            | ┌-┴-----┐
            └-┤STARTED|
              └-------┘
*/

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
        openingMessage['content-type'] = 'audio/ogg;codecs=opus'
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
      //console.log('token:', token)
      const queryString = stringify({ model: 'en-US_BroadbandModel', 'watson-token': token })
      const wsURI = `wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?${queryString}`
      try {
        socket = new WebSocket(wsURI)
        socket.onopen = resolve
        socket.onerror = reject

        socket.onmessage = function(data) {
          const state = fsm.getCurrentState()
          const message = JSON.parse(data.data)
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
