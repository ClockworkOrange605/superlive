const WebSocket = require('ws');
const EventEmitter = require('events');

const atob = require('atob');
const { v4: uuidv4 } = require('uuid');

const config = {  
    url: "wss://production.nbaplus.tk:8000/ws",
    token: require('../token.json')
}

class ApiClient {

    constructor(callback) {
        const self = this

        this.socket = new WebSocket(config.url)
        this.emmiter = new EventEmitter()

        this.socket.on('open', function() {
            callback(self)
        })

        this.socket.on('message', function(data) {
            let message = JSON.parse(data)

            switch(message.type) {
                case 'session-info':
                    self.session = message.payload.session
                    break

                case 'auth':
                    self.emmiter.emit('auth', message.payload.result)
                    break

                case 'get-user-data':
                    self.emmiter.emit('user', message.payload)
                    break

                case 'balance-changed':
                    self.emmiter.emit('user.balance', message.payload.balance)
                    break

                case 'list-matches-v2':
                    self.emmiter.emit('match.list', message.payload.matches)
                    break

                case 'subscribe-match':
                    self.emmiter.emit('match.subscribe', message.payload)
                    break

                case 'autounsubscribe-match':
                    self.emmiter.emit('match.unsubscribe', message.payload)
                    break

                case 'match-update':
                    self.emmiter.emit('match.update', message.payload)
                    break

                case 'make-bet':
                    self.emmiter.emit('bet.new', message.payload)
                    break

                case 'bet-update':
                    self.emmiter.emit('bet.update', message.payload)
                    break

                default:
                    console.log(message.type, message.payload)
                    break
            }
        })

        this.socket.on('close', function(code, message) {
            console.log('exit', code, message)
        })
    }

    auth(callback) {
        let payload = JSON.parse(atob(config.token))
        let request = prepareRequest('auth', payload)

        this.socket.send(request)
        this.emmiter.on('auth', (response) => callback(response))
    }

    user(callback) {
        let request = prepareRequest('get-user-data', {})

        this.socket.send(request)
        this.emmiter.on('user', (response) => callback(response))
    }

    match_list(offset, limit, callback) {
        let payload = {
            filters: {
                match_state: "all",
                sport_ids: ["soccer"]
            },
            offset: offset,
            limit: limit
        }
        let request = prepareRequest('list-matches-v2', payload)

        this.socket.send(request)
        this.emmiter.on('match.list', (response) => callback(response))
    }

    match_subscribe(matchId, callback) {
        let payload = {id: matchId}
        let request = prepareRequest('subscribe-match', payload)

        this.socket.send(request)
        this.emmiter.on('match.subscribe', (response) => callback(response[matchId]))
    }

    bet(matchId, marketId, marketType, marketPrice, amount) {
        let request = prepareRequest('make-bet', {
            match_id: matchId,
            market: {
              id: marketId,
              type: marketType,
              price: marketPrice,
            },
            amount: amount,
            allow_price_change: true,
            is_auto_bet: false,
            is_max_bet: false,
        })

        this.socket.send(request)
    }
}

function prepareRequest(type, payload) {
    return JSON.stringify({
        type: type,
        payload: payload,
        rid: uuidv4()
    })
}

module.exports = ApiClient