'use strict'

const speech = require('../index')


const output = document.getElementById('output')

// voiceco api key/secret pair (test credentials)
const key = '5daa5941-e1b6-445f-b4af-d4fb98f6bd8e'
const secret = 'e39a7d2d-fb2f-4f70-aed9-57d7543a7d2d'

const s = speech({ key, secret })
document.body.appendChild(s.dom)

document.querySelector('button').addEventListener('click', async function (ev) {
  output.innerText = ''
  this.setAttribute('disabled', true)
  const result = await s.transcribe({ fun: true, color: 'red', favs: [ '1', 'two', true ] })
  output.innerText = 'You said: "' + result.text + '"  audioId: ' + result.uuid
  this.removeAttribute('disabled')
})
