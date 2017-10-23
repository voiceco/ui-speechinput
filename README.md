# ui-speechinput
a re-usable speech input widget encapsulated in a DOM element

uses watson for speech-to-text transcription


## usage

```javascript
const speechinput = require('ui-speechinput')

const s = speechinput()

document.body.appendChild(s.dom)

const userText = await s.transcribe() // transcription === transcribed final text that the user spoke.
```

You may also provide an object containing any meta data you wish to store with the audio object:

```javascript
const meta = {
  myid: uuid(),
  color: 'green',
  favorited: true
}
const userText = await s.transcribe(meta)
```
