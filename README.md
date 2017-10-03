# ui-speechinput
a re-usable speech input widget encapsulated in a DOM element

uses watson for speech-to-text transcription

## usage

```javascript
const speechinput = require('ui-speechinput')

const s = speechinput()

document.body.appendChild(s.dom)

const id = uuid() // generate a unique uuid for the text we're recording
const transcription = await s.record(id)

// transcription === transcribed final text that the user spoke.
```


todo:
* refactor watson module to use plain websocket internally
* store audio locally
* upload audio to backend opportunistically
