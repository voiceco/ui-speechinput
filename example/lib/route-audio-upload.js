'use strict'

const AWS    = require('aws-sdk')
const fs     = require('fs')
const os     = require('os')
const path   = require('path')


const s3 = new AWS.S3()
const TWO_MONTHS_IN_SECONDS = '5184000'

module.exports = function rawAudioUpload(req, res) {
  const out = fs.createWriteStream('/Users/michaelreinstein/Desktop/tmp/raw-'+ Math.random() +'.mp3', { encoding: 'utf8' })
  req.pipe(out)

  /*
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  const options = {
    ACL: 'public-read',
    Body: fileStream,
    Bucket: process.env.WAV_S3_BUCKET,
    CacheControl: TWO_MONTHS_IN_SECONDS,
    ContentType: 'audio/wav',
    Key: filename
  }
  s3.upload(options, function (err, data) {
    if (err) {
      console.error(err)
      return
    }
  })
  */

  req.on('end', function() {
    out.end()
    console.log('file', filename, 'upload finished')
    //res.status(500).send(err)
    res.send('OK')
  })
}
