'use strict'

const storage = require('../../storage')


module.exports = function(self) {
  let s

  const upload = async function (audioId, apiHost, apiId, apiSecret) {
    return new Promise(async function(resolve, reject) {

      const recording = await s.getRecording(audioId)
      const request = new XMLHttpRequest()
      // pull transcription text from each segment
      const result = {
        meta: recording.meta,
        segments: []
      }

      recording.segments.forEach(function(segment) {
        result.segments.push(segment.transcription)
      })

      request.open('PUT', apiHost + '/audio/' + audioId + '?encoding=mp3&apiId=' + apiId + '&apiSecret=' + apiSecret + '&meta='+JSON.stringify(result), true)

      let progress = 0
      request.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          progress = (e.loaded / e.total) * 100
          console.log('progress:', progress)
          // indicate the upload process is still active
          self.postMessage({ cmd: 'ping' })
        }
      }

      request.onload = async function() {
        const resp = this.response
        if (this.status >= 200 && this.status < 400) {
          // TODO: read duration, other meta data out of response object
          await s.markUploaded(audioId)
          resolve(resp)
        } else {
          // reached target server, but it returned an error
          reject(resp)
        }
      }

      request.onerror = function() {
        // There was a connection error of some sort
        console.log('connection error of some sort')
        reject()
      }

      const parts = []
      recording.segments.forEach(function(s) {
        s.data.forEach(function(s2) {
          parts.push(s2)
        })
      })

      //console.log('constructed blob', audioBlob, 'type', recording.meta.type)
      const audioBlob = new Blob(parts, { type: recording.meta.type })
      request.send(audioBlob)

      // an alternative method to send the audio blob:
      // sends as multipart/form-data by default, which is what we want, because
      // application/x-www-form-urlencoded is URL encoded and wastes bandwidth
      //const formData = new FormData()
      //formData.append('rawAudio', audioBlob, audioId)
      //request.send(formData)
    })
  }

  const chooseRandomId = async function() {
    const recordings = await s.listRecordings()
    const readyToSend = []
    for(let i=0; i < recordings.length; i++) {
      let audioId = recordings[i]
      let r = await s.getRecording(audioId)
      if(r.meta.finalized && !r.meta.syncedToServer)
        readyToSend.push(r)
    }

    if(readyToSend.length) {
      const idx = Math.floor(Math.random() * readyToSend.length)
      return readyToSend[idx].uuid
    }
  }

  const init = async function(options) {
    const { apiHost, objectPrefix, apiId, apiSecret } = options
    if(!s)
      s = await storage({ objectPrefix })

    // pick a random story which is finalized but not uploaded
    const id = await chooseRandomId()

    if(!id)
      return self.postMessage({ cmd: 'done' })

    try {
      let response = await upload(id, apiHost, apiId, apiSecret)
      response = JSON.parse(response)
      // TODO: update duration value in audio storage
      self.postMessage({ cmd: 'done', response })
    } catch(er) {
      self.postMessage({ cmd: 'done', er })
    }
  }

  self.addEventListener('message', function(e) {
    if(e.data.topic === 'init')
      init(e.data)
  })
}
