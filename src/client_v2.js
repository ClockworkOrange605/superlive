import WebSocket from 'ws'
import EventEmitter from 'events'

import atob from 'atob'
import { v4 as uuidv4 } from 'uuid'

class ApiClient {

  constructor({url, token}, callback) {
    this.token = token

    this.emmiter = new EventEmitter()
    this.socket = new WebSocket(url)

    this.socket.on('open', () => {
      this.emmiter.emit('socket.opened', {})
    })

    this.socket.on('close', (code) => {
      this.emmiter.emit('socket.closed', {statusCode: code})
    })

    this.socket.on('error', (error) => {
      this.emmiter.emit('socket.error', {error: error})
    })

    this.socket.on('message', (data) => {
      let message = JSON.parse(data)

      this.emmiter.emit('socket.data.recieved', message)

      if(message.error) {
        this.emmiter.emit('socket.data.error', {
          type: message.type,
          error: {
            code: message.error.code,
            message: message.error.text
          }          
        })

        throw('WS API ERROR', {type: message.type, error: message.error.text})
      }

      switch(message.type) {
        case 'session-info':
          this.emmiter.emit('api.session', message.payload)
        break

        case 'auth':
          this.emmiter.emit('api.auth', message.payload)
        break

        case 'list-matches-v2':
          this.emmiter.emit('api.matchlist', message.payload)
        break

        case 'subscribe-match':
          this.emmiter.emit('api.match.subscribed', message.payload)
        break

        case 'autounsubscribe-match':
          this.emmiter.emit('api.match.unsubscribed', message.payload)
        break

        case 'match-update':
          this.emmiter.emit('api.match.update', message.payload)
        break

        case 'make-bet':
          this.emmiter.emit('api.bet.new', message.payload)
        break

        case 'bet-update-v2':
          this.emmiter.emit('api.bet.update', message.payload)
        break

        case 'balance-changed':
          this.emmiter.emit('api.user.balance', message.payload)
        break

        default:
          console.warn('Unprocessed Message', message.type, message.payload)
        break
      }
    })

    callback(this)
  }

  authorize(callback) {
    let payload = JSON.parse(atob(this.token))
    let request = prepareRequest('auth', payload)

    this.socket.send(request)
    this.emmiter.once('api.auth', (response) => callback(response))
  }

  getMatchlist({state="all", offset=0, limit=10}, callback) {
    let payload = {
      filters: { match_state: state, sport_ids: ["soccer"] },
      offset: offset, limit: limit
    }
    let request = prepareRequest('list-matches-v2', payload)

    this.socket.send(request)
    this.emmiter.once('api.matchlist', (response) => callback(response))
  }

  subscribeMatch({id}, callback) {
    let request = prepareRequest('subscribe-match', {id: id})

    this.emmiter.on('api.match.update', (response) => {
      if(response[id] != undefined) {

        if(response[id].markets != undefined) {
          this.emmiter.emit('api.match.update.markets', response[id].markets)
        }

        if(response[id].events != undefined) {
          this.emmiter.emit('api.match.update.events', response[id].events)
        }

        if(response[id].state != undefined) {
          this.emmiter.emit('api.match.update.state', response[id].state)
        }

        if(response[id].scores != undefined) {
          this.emmiter.emit('api.match.update.scores', response[id].scores)
        }
      }
    })

    this.socket.send(request)
    this.emmiter.once('api.match.subscribed', (response) => callback(response))
  }

  makeBet(match, market, amount, callback) {
    let request = prepareRequest('make-bet', {
      match_id: match.id,
      market: {
        id: market.id,
        type: market.type,
        price: market.price,
      },
      amount: amount,
      allow_price_change: true,
      is_auto_bet: false,
      is_max_bet: false,
    })

    this.socket.send(request)
    this.emmiter.once('api.bet.new', (response) => callback(response))
  }
}

function prepareRequest(type, payload) {
  return JSON.stringify({
    type: type,
    payload: payload,
    rid: uuidv4()
  })
}

export default ApiClient