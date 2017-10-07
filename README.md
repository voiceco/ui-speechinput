# ui-speechinput
a re-usable speech input widget encapsulated in a DOM element

uses watson for speech-to-text transcription

## usage

```javascript
const speechinput = require('ui-speechinput')

const s = speechinput()

document.body.appendChild(s.dom)

const id = uuid() // generate a unique uuid for the audio/text we're recording

const userText = await s.transcribe(id) // transcription === transcribed final text that the user spoke.
```

todo:
* expiriment with push-to-talk interaction
* load lamejs independently to reduce bundle size
* store audio locally
* upload audio to backend opportunistically
