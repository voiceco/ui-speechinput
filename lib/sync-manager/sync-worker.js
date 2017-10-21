'use strict'

const storage = require('../storage-audio')


module.exports = function(self) {
  let s

  const init = async function() {
    if(!s)
      s = await storage({ objectKey: 'boswell-audio' })
    console.log('TODO: start syncing! :) :) :)', s.listRecordings())
  }

  console.log('setting up sync-worker')
  self.addEventListener('message', function(e) {
    if(e.data.topic === 'init')
      init()
  })
}
