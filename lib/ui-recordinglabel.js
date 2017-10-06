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