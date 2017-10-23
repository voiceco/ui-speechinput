'use strict'

const storage = require('../storage-audio')


module.exports = function(self) {
  let s

  const upload = async function (audioId, apiHost) {
    return new Promise(async function(resolve, reject) {

      const recording = await s.getRecording(audioId)
      const request = new XMLHttpRequest()
      request.open('PUT', apiHost + '/audio/' + audioId + '?encoding=mp3&meta='+JSON.stringify(recording.meta.custom), true)

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

  const init = async function(apiHost) {
    if(!s)
      s = await storage({ objectPrefix: 'boswell-audio' })

    // pick a random story which is finalized but not uploaded
    const id = await chooseRandomId()

    try {
      if(id)
        await upload(id, apiHost)
      self.postMessage({ cmd: 'done' })
    } catch(er) {
      self.postMessage({ cmd: 'done', er })
    }
  }

  console.log('setting up sync-worker')
  self.addEventListener('message', function(e) {
    if(e.data.topic === 'init')
      init(e.data.apiHost)
  })
}
