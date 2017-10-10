'use strict'

const FIFTY_MINUTES_IN_MILLISECONDS = 50 * 60 * 1000

// get a Watson speech to text token, either from the cache or from the Watson API
module.exports = async function getToken(url='/token') {
  let token = localStorage.getItem('watson-stt-token')

  if(token) {
    token = JSON.parse(token)
    if (Date.now() < token.expiresAt) {
      // there is at least 10 minutes remaining on the token, it's valid
      return token.value
    }
  }

  token = await fetch(url)
  token = await token.text()

  localStorage.setItem('watson-stt-token', JSON.stringify({
    value: token,
    // watson STT tokens last for an hour. Don't use a token with less than 10 minutes remaining
    expiresAt: Date.now() + FIFTY_MINUTES_IN_MILLISECONDS
  }))

  return token
}
