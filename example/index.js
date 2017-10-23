'use strict'

const cors    = require('cors')
const dotenv  = require('dotenv').config()
const express = require('express')
const helmet  = require('helmet')
const fs      = require('fs')
const https   = require('https')


const PORT = 3001
const app = express()

app.use(cors())   // allow invoking this service from anywhere
app.use(helmet()) // various security protections

app.use(express.static('public'))

app.put('/audio/:audioId', require('./lib/route-audio-upload'))
app.get('/token', require('./lib/route-watson-token'))

// TODO: implement these routes
//  app.get('/audio', require('./lib/list-audio'))
//  app.get('/audio/:audioId', require('./lib/get-audio'))
//  app.post('/audio/:audioId/meta', require('./lib/update-audio-metadata'))

const protocol = process.argv[2] === '--https' ? 'https' : 'http'

if(protocol === 'https') {
  const selfSigned = require('openssl-self-signed-certificate')

  const options = {
    key: selfSigned.key,
    cert: selfSigned.cert
  }
  const address = undefined // force binding to all interfaces by leaving address blank
  https.createServer(options, app).listen(PORT, address)
} else {
  app.listen(PORT)
}

console.log(`voiceco audio service running at ${protocol}://localhost:${PORT}`)
