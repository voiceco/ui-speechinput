'use strict'

const speech = require('../index')

const s = speech()
document.body.appendChild(s.dom)

document.querySelector('button').addEventListener('click', async function(ev) {
  this.setAttribute('disabled', true)
  const text = await s.transcribe()
  alert('you said:' + text)
  this.removeAttribute('disabled')
})
