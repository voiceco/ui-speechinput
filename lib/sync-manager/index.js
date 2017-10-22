'use strict'

const fsmFactory = require('../finite-state-machine')
const lock       = require('lockable-storage').lock
const uuid       = require('lockable-storage').uniqueId
const workify    = require('webworkify')


/*
finite state machine for sync-manager
initial state: IDLE

┌----┐     ┌-------┐
|IDLE|<--->|SYNCING|
└----┘     └-------┘
*/
module.exports = function syncManager(options={}) {
  const uid = uuid()  // unique id of the sync manager

  const fsm = fsmFactory()

  function idleState() {
    let _interval
    const waitTime = 10000

    const _checkIfCanRun = function() {
      lock('sync-owner-availability', function() {
        // if sync owner is unset or there's been no sync activity for 30
        // seconds, become the sync owner
        const lastSyncTime = sessionStorage.getItem('sync-last-ping') || 0
        const delta = Date.now() - lastSyncTime
        if(!sessionStorage.getItem('sync-owner') || delta > 30000) {
          sessionStorage.setItem('sync-owner', uid)
          fsm.setState('SYNCING')
        } else {
          _interval = setTimeout(_checkIfCanRun, waitTime)
        }
      })
    }

    const enter = function() {
      _interval = setTimeout(_checkIfCanRun, waitTime)
    }

    const exit = function() {
      clearInterval(_interval)
      _interval = undefined
    }

    return Object.freeze({ enter, exit })
  }

  fsm.addState('IDLE', idleState())

  fsm.addState('SYNCING', {
    enter: function() {
      syncer.postMessage({ topic: 'init' })
    },
    exit: function() {
      sessionStorage.removeItem('sync-owner')
    }
  })

  const syncer = workify(require('./sync-worker'))

  syncer.addEventListener('message', function (ev) {
    // fired when the worker has finished uploading a file to the backend, or there was an error
    if(ev.data.cmd === 'done') {
      fsm.setState('IDLE')
    } else if(ev.data.cmd === 'ping') {
      sessionStorage.setItem('sync-last-ping', Date.now())
    }
  })

  fsm.setState('IDLE')
}
