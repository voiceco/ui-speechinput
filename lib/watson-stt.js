'use strict'

const pick     = require('lodash.pick')
const pubsub   = require('ev-pubsub')
const upsocket = require('upsocket')


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
 * https://www.ibm.com/watson/developercloud/doc/speech-to-text/websockets.shtml
 * https://www.ibm.com/watson/developercloud/doc/speech-to-text/input.shtml
 * https://www.ibm.com/watson/developercloud/doc/speech-to-text/output.shtml
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
  const inactivity_timeout = options.inactivity_timeout || -1

  let stream
  let recognizing = false

  const queryParams = { model: 'en-US_BroadbandModel', 'watson-token': options.token }
  const queryString = stringify(queryParams)

  const socket = upsocket()  // a websocket with buffering and auto-reconnect capabilities

  const wsURI = `wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?${queryString}`

  const close = function() {
    console.log('manually closing watson socket')
    unpipe()
    _recognizeStop()
    socket.close()
  }

  const pipe = function(destination) {
    subscribe('data', destination.write)
    return destination
  }

  const unpipe = function(destination) {
    unsubscribe('data', destination ? destination.write : undefined)
  }

  const write = function(data) {
    // don't send audio data to the backend until the start message has been sent
    if (data.byteLength >= 100 && recognizing)
      _send(data)  // forward audio data to watson stt backend
  }

  const _init = function() {
    socket.connect(wsURI)

    socket.subscribe('close', function(evt) {
      console.log('watson websocket fired close event')
      if (recognizing)
        publish('transcription-end')
      recognizing = false
    })

    socket.subscribe('message', function(data) {
      //console.log(data)
      try {
        const message = JSON.parse(data)
        if (message.state)
          console.log('watson-stt:', message, 'recognizing?', recognizing )
        if (message.error) {
          publish('error', message.error)
          return
        }
        if (message.state === 'listening') {
          recognizing = !recognizing
          if (!recognizing)
            publish('transcription-end')
          return
        }
        publish('data', message)
      } catch (er) {
        publish('error', er)
      }
    })

    socket.subscribe('error', function(err) {
      console.log('socket error:', err)
      publish('error', err)
    })

    _recognizeStart({
      interim_results: true,
      inactivity_timeout  // (in seconds.) setting to -1 means infinity
    })
  }

  const _recognizeStart = function(opts) {
    const openingMessage = pick(opts, OPENING_MESSAGE_PARAMS_ALLOWED)

    console.log('sending start message')
    openingMessage.action = 'start'
    openingMessage['content-type'] = 'audio/mp3'

    _send(JSON.stringify(openingMessage))
  }

  const _recognizeStop = function() {
    if(recognizing === true)
      _send(JSON.stringify({ action: 'stop' }))
  }

  const _send = function(data) {
    if (socket && socket.readyState === socket.OPEN)
      socket.send(data)
  }

  _init()

  return Object.freeze({ subscribe, unsubscribe, write, pipe, unpipe, close })
}
