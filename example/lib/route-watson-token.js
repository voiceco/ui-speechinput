'use strict'

const express = require('express'),
      router = express.Router(),
      watson = require('watson-developer-cloud')


const sttConfig = {
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: process.env.WATSON_SPEECH_TO_TEXT_USERNAME,
  password: process.env.WATSON_SPEECH_TO_TEXT_PASSWORD
}

const sttAuthService = watson.authorization(sttConfig)

// serve watson speech-to-text auth tokens
module.exports = function getToken(req, res) {
  sttAuthService.getToken({ url: sttConfig.url }, function(err, token) {
    if (err) {
      res.status(500).send('Error retrieving token')
      return
    }
    res.send(token)
  })
}