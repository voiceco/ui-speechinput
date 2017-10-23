'use strict'

const speech = require('../index')


const output = document.getElementById('output')
const s = speech({ key: 'myapi', secret: 'mysuper secret key' })
document.body.appendChild(s.dom)

document.querySelector('button').addEventListener('click', async function(ev) {
  output.innerText = ''
  this.setAttribute('disabled', true)
  const result = await s.transcribe({ fun: true, color: 'red', favs: [ '1', 'two', true ] })
  output.innerText = 'You said: "' + result.text + '"  audioId: ' + result.uuid
  this.removeAttribute('disabled')
})
