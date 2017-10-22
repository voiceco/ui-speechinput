'use strict'

const storage = require('../storage-audio')


module.exports = function(self) {
  let s

  const init = async function() {
    if(!s)
      s = await storage({ objectKey: 'boswell-audio' })
    console.log('current recordings:', s.listRecordings())
  }

  console.log('setting up sync-worker')
  self.addEventListener('message', function(e) {
    if(e.data.topic === 'init')
      init()
  })
}
