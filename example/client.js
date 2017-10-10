'use strict'

const speech = require('../index')
const uuidV4 = require('uuid/v4')

const s = speech()
document.body.appendChild(s.dom)

document.querySelector('button').addEventListener('click', async function(ev) {
  this.setAttribute('disabled', true)
  const uuid = uuidV4()
  const text = await s.transcribe(uuid)
  alert('you said:' + text)
  this.removeAttribute('disabled')
})
