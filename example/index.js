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

let protocol = 'http'

if(process.argv[2] === '--https') {
    const options = {
    key: fs.readFileSync('/etc/ssl/certs/saymosaic.key'),
    cert: fs.readFileSync('/etc/ssl/certs/saymosaic.crt')
  }
  const address = undefined
  https.createServer(options, app).listen(PORT, address)
  protocol = 'https'
} else {
  app.listen(PORT)
}

console.log(`voiceco audio service running at ${protocol}://localhost:${PORT}`)
