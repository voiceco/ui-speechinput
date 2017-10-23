# ui-speechinput
a re-usable speech input widget encapsulated in a DOM element

uses watson for speech-to-text transcription


## usage

```javascript
const speechinput = require('ui-speechinput')

const s = speechinput({
  key: 'myapi',
  secret: '*************' // replace with your secret key
})

document.body.appendChild(s.dom)

const transcription = await s.transcribe() // transcription.text === transcribed final text that the user spoke.
```

You may also provide an object containing any meta data you wish to store with the audio object:

```javascript
const meta = {
  myid: uuid(),
  color: 'green',
  favorited: true
}
const transcription = await s.transcribe(meta)
```
