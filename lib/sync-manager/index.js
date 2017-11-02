'use strict'

const fsmFactory = require('../finite-state-machine')
const lock       = require('lockable-storage').lock
const workify    = require('webworkify')


/*
finite state machine for sync-manager
initial state: IDLE

┌----┐     ┌-------┐
|IDLE|<--->|SYNCING|
└----┘     └-------┘
*/

function uuid() {
  return '' + Math.floor(Number.MAX_SAFE_INTEGER * Math.random())
}

module.exports = function syncManager (options={}) {
  const { objectPrefix, apiHost, apiId, apiSecret } = options
  const uid = uuid()  // unique id of the sync manager

  const fsm = fsmFactory()

  function idleState () {
    let _interval
    const WAIT_TIME      = 10000 // milliseconds
    const WORKER_TIMEOUT = 30000 // milliseconds

    const _startSync = function() {
      //console.log('sync-manager', uid, 'is running sync')
      sessionStorage.setItem('sync-owner', uid)
      sessionStorage.setItem('sync-last-ping', Date.now())
      fsm.setState('SYNCING')
    }

    const _checkIfCanRun = function () {
      lock('sync-owner-availability', function() {
        // if sync owner is unset or there's been no sync activity for WORKER_TIMEOUT
        // milliseconds, become the sync owner
        const lastSyncTime = sessionStorage.getItem('sync-last-ping') || 0
        const delta = Date.now() - lastSyncTime

        //console.log('owner', sessionStorage.getItem('sync-owner'), 'delta', delta)
        if (!sessionStorage.getItem('sync-owner') || delta > WORKER_TIMEOUT)
          _startSync()
        else if (sessionStorage.getItem('sync-owner') === uid && delta <= WORKER_TIMEOUT)
          _startSync()
        else
          _interval = setTimeout(_checkIfCanRun, WAIT_TIME)
      })
    }

    const enter = function () {
      _interval = setTimeout(_checkIfCanRun, WAIT_TIME)
    }

    const exit = function () {
      clearInterval(_interval)
      _interval = undefined
    }

    return Object.freeze({ enter, exit })
  }

  fsm.addState('IDLE', idleState())

  fsm.addState('SYNCING', {
    enter: function() {
      syncer.postMessage({ topic: 'init', apiHost, objectPrefix, apiId, apiSecret })
    }
  })

  const syncer = workify(require('./sync-worker'))

  syncer.addEventListener('message', function (ev) {
    // received a message from the worker backend so update the ping timestamp
    sessionStorage.setItem('sync-last-ping', Date.now())

    // fired when the worker has finished uploading a file to the backend, or there was an error
    if(ev.data.cmd === 'done')
      fsm.setState('IDLE')
  })

  fsm.setState('IDLE')
}
