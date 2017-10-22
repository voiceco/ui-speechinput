'use strict'

const AWS    = require('aws-sdk')
const fs     = require('fs')
const os     = require('os')
const path   = require('path')


const s3 = new AWS.S3()
const TWO_MONTHS_IN_SECONDS = '5184000'


// TODO: trim silence with sox:
//       sox inputfile.mp3 outputfile.mp3 silence 1 0.1 0.1% reverse silence 1 0.1 0.1% reverse
// TODO: detect audio duration:
//       https://www.npmjs.com/package/mp3-duration

// TODO: building sox for aws lambda:
//       https://marcelog.github.io/articles/static_sox_transcoding_lambda_mp3.html

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
    console.log('file upload finished')
    //res.status(500).send(err)
    res.send('OK')
  })
}
