'use strict'

const storage = require('../storage-audio')


let t= 14
let b=16
module.exports = function(self) {
  let s

  const upload = async function (audioId) {
    //console.log('uploading audioId:', audioId)
    return new Promise(async function(resolve, reject) {
      const request = new XMLHttpRequest()
      console.log('opening /raw_upload ?')
      request.open('POST', 'https://localhost:3001/raw_upload', true)

      let progress = 0

      request.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          progress = (e.loaded / e.total) * 100
          console.log('progress:', progress)
          // indicate the upload process is still active
          self.postMessage({ cmd: 'ping' })
        }
      }

      request.onerror = reject
      request.onload = async function() {
        console.log('huh', audioId)
        await s.markUploaded(audioId)
        resolve()
      }

      // sends as multipart/form-data by default, which is what we want, because
      // application/x-www-form-urlencoded is URL encoded and wastes bandwidth
      const formData = new FormData()

      const recording = await s.getRecording(audioId)
      const parts = []
      recording.segments.forEach(function(s) {
        parts.push(s.data)
      })

      const audioBlob = new Blob(parts, { type: recording.meta.type })

      console.log('constructed blob', audioBlob, 'type', recording.meta.type)

      formData.append('rawAudio', audioBlob, audioId)
      request.send(formData)
      //request.send(audioBlob)
    })
  }

  const chooseRandomId = async function() {
    const recordings = await s.listRecordings()
    const readyToSend = []
    for(let i=0; i < recordings.length; i++) {
      let audioId = recordings[i]
      let r = await s.getRecording(audioId)
      console.log('rando id:', audioId, 'r:', r)
      if(r.meta.finalized && !r.meta.syncedToServer)
        readyToSend.push(r)
    }

    if(readyToSend.length) {
      const idx = Math.floor(Math.random() * readyToSend.length)
      return readyToSend[idx].uuid
    }
  }

  const init = async function() {
    if(!s)
      s = await storage({ objectPrefix: 'boswell-audio' })

    console.log('attempting sync')
    // pick a random story which is finalized but not uploaded
    const id = await chooseRandomId()
    console.log('oyyyy id:', id)
    if(id)
      await upload(id)

    self.postMessage({ cmd: 'done' })
  }

  console.log('setting up sync-worker')
  self.addEventListener('message', function(e) {
    if(e.data.topic === 'init')
      init()
  })
}
