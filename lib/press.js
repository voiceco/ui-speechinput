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
