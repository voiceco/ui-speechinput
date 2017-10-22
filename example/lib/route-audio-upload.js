'use strict'

const AWS    = require('aws-sdk')
const Busboy = require('busboy')
const fs     = require('fs')
const os     = require('os')
const path   = require('path')


const s3 = new AWS.S3()
const TWO_MONTHS_IN_SECONDS = '5184000'

module.exports = function rawAudioUpload(req, res) {
  const busboy = new Busboy({ headers: req.headers })

  busboy.on('file', function(fieldname, fileStream, filename, encoding, mimetype) {

    console.log('input:', fieldname, filename, encoding, mimetype)
    // filename has the audio id

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

    /*
    fileStream.on('data', function(dat) {
      console.log('incoming data:', dat)
    }) */

    const out = fs.createWriteStream('/Users/michaelreinstein/Desktop/tmp/raw-'+ Math.random() +'.mp3', { encoding: 'binary' })
    fileStream.pipe(out)

    /*
    fileStream.on('data', function(data) {
      console.log('File [' + fieldname + '] got ' + data.length + ' bytes')
    })
    */
    fileStream.on('end', function() {
      out.end()
      console.log('file', filename, 'upload finished')
      //res.status(500).send(err)
    })

    out.on('end', function() {
      console.log('write stream finisehd ok!')
    })
  })

  /*
  busboy.on('finish', function() {
    console.log('busboy finished')
  })
  */

  req.pipe(busboy)
}
