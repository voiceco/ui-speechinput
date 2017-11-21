'use strict'

module.exports = function convertCachedAudioToEntry (entry) {
  const parts = []
  const transcriptions = []
  entry.segments.forEach(function(s) {
    transcriptions.push(s.transcription)
    s.data.forEach(function(s2) {
      parts.push(s2)
    })
  })

  const audioBlob = new Blob(parts, { type: entry.meta.type })

  return {
    created: entry.meta.created,
    custom: entry.meta.custom,
    fileURL: URL.createObjectURL(audioBlob),
    id: entry.uuid,
    transcriptions,
    type: entry.meta.type
  }
}
