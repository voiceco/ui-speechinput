'use strict'

const speech = require('../index')


const output = document.getElementById('output')
const s = speech()
document.body.appendChild(s.dom)

document.querySelector('button').addEventListener('click', async function(ev) {
  output.innerText = ''
  this.setAttribute('disabled', true)
  const text = await s.transcribe({ fun: true, color: 'red', favs: [ '1', 'two', true ] })
  output.innerText = 'You said:  ' + text
  this.removeAttribute('disabled')
})
