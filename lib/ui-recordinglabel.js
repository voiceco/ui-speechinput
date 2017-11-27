'use strict'

const clamp = require('clamp')
const raf   = require('raf')


module.exports = function recordingLabel(dom) {
  dom.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
   width="30px" height="30px" viewBox="0 0 24 30" style="enable-background:new 0 0 50 50;" xml:space="preserve">
  <rect x="0" y="10" width="4" height="10" fill="#f00" opacity="0.2">
    <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0s" dur="1s" repeatCount="indefinite" />
  </rect>
  <rect x="8" y="10" width="4" height="10" fill="#f00"  opacity="0.2">
    <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.15s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.15s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.15s" dur="1s" repeatCount="indefinite" />
  </rect>
  <rect x="16" y="10" width="4" height="10" fill="#f00"  opacity="0.2">
    <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.3s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.3s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.3s" dur="1s" repeatCount="indefinite" />
  </rect>
<rect x="24" y="10" width="4" height="10" fill="#f00"  opacity="0.2">
    <animate attributeName="opacity" attributeType="XML" values="0.2; 1; .2" begin="0.45s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="height" attributeType="XML" values="10; 20; 10" begin="0.45s" dur="1s" repeatCount="indefinite" />
    <animate attributeName="y" attributeType="XML" values="10; 5; 10" begin="0.45s" dur="1s" repeatCount="indefinite" />
  </rect>
</svg>
<span style="padding-left:8px">recording</span>
<canvas style="display:none"></canvas>
`

  const canvas = dom.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  const fftSize = 256

  // although the actual spectrum size is half the FFT size,
  // the highest frequencies aren't really important here
  const bandCount = Math.round(fftSize / 3)

  let audioCtx, analyser, spectrum


  dom.style.color = 'rgba(255, 0, 0, 0.92)'
  dom.style.display = 'flex'
  dom.style.justifyContent = 'center'
  dom.style.alignItems = 'center'
  dom.style.transitionDuration = '0.2s'
  dom.style.opacity = 0


  const error = function(er) {
    analyser = undefined
    dom.querySelector('svg').style.display = 'none'
    canvas.style.display = 'none'
    dom.querySelector('span').style.display = ''
    dom.querySelector('span').innerText = er
    dom.style.display = 'flex'
    dom.style.opacity = 1
  }


  const initializing = function() {
    analyser = undefined
    canvas.style.display = 'none'
    dom.querySelector('svg').style.display = ''
    dom.querySelector('span').style.display = ''
    dom.querySelector('span').innerText = 'initializing'
    dom.style.display = 'flex'
    dom.style.opacity = 1
  }


  const hide = function() {
    analyser = undefined
    dom.style.opacity = 0
    //dom.style.display = 'none'
  }


  const recording = function(stream) {
    dom.querySelector('svg').style.display = 'none'
    dom.querySelector('span').style.display = 'none'

    canvas.style.width = dom.clientWidth + 'px'
    canvas.style.height = dom.parentNode.clientHeight / 2 + 'px'
    canvas.style.display = ''

    _setMediaStream(stream)
  }


  const _setMediaStream = function(stream) {
    if(!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()

    const source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()

    // set node properties and connect
    analyser.smoothingTimeConstant = 0.2
    analyser.fftSize = fftSize

    spectrum = new Uint8Array(analyser.frequencyBinCount)
    source.connect(analyser)
  }


  // called each audio frame, manages rendering of visualization
  const _visualize = function() {
    if(analyser) {
      analyser.getByteFrequencyData(spectrum)
      _draw()
    }
    raf(_visualize)
  }


  const _draw = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(230,0,60,0.9)'
    let barWidth = canvas.width / bandCount
    //let fade = true

    for (let i = 0; i < bandCount; i++) {
      //let brightness = fade ? clamp(Math.floor(spectrum[i] / 1.5), 25, 99) : 99
      let barHeight = canvas.height * (spectrum[i] / 255)
      ctx.fillRect(i * barWidth, (canvas.height - barHeight) / 2, barWidth, barHeight)
    }
  }

  _visualize()


  return Object.freeze({ dom, error, initializing, hide, recording })
}
