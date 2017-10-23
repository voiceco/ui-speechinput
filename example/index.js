'use strict'

const dotenv  = require('dotenv').config()
const express = require('express')
const fs      = require('fs')
const https   = require('https')


const PORT = 3001
const app = express()

app.use(express.static('public'))

app.post('/audio', require('./lib/route-audio-upload'))
app.get('/token', require('./lib/route-watson-token'))

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

console.log(`test service running at ${protocol}://localhost:${PORT}`)
