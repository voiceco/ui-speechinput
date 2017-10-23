'use strict'

const AWS         = require('aws-sdk')
const mp3Duration = require('mp3-duration')
const fs          = require('fs')
const os          = require('os')
const path        = require('path')
const validator   = require('validator')


const s3 = new AWS.S3()
const TWO_MONTHS_IN_SECONDS = '5184000'
const UUID_VERSION = 4

// TODO: trim silence with sox:
//         sox inputfile.mp3 outputfile.mp3 silence 1 0.1 0.1% reverse silence 1 0.1 0.1% reverse
//       https://marcelog.github.io/articles/static_sox_transcoding_lambda_mp3.html

module.exports = function audioUpload(req, res) {
  // TODO: support custom metadata
  const audioId = req.query.audioId
  const encoding = req.query.encoding

  if(encoding !== 'mp3')
    return res.status(400).send('encoding must be mp3')

  if(!validator.isUUID(audioId, UUID_VERSION))
    return res.status(400).send('invalid audioID')

  const tmpFile = path.join(os.tmpdir(), audioId + '.' + encoding)
  console.log('tmpFile:', tmpFile)
  const out = fs.createWriteStream(tmpFile, { encoding: 'utf8' })
  req.pipe(out)

  /*
  // TODO: upload to S3
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  const options = {
    ACL: 'public-read',
    Body: fileStream,
    Bucket: process.env.AUDIO_S3_BUCKET,
    CacheControl: TWO_MONTHS_IN_SECONDS,
    ContentType: `audio/${encoding}`,
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
    mp3Duration(tmpFile, function (err, duration) {
      if(err)
        return res.status(500).send(err)
      console.log('audio duration: ', duration) // e.g. 9.561 (in seconds)
      res.send('OK')
    })
  })
}
