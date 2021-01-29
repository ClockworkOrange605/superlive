const WebSocket = require('ws');

const atob = require('atob');
const { v4: uuidv4 } = require('uuid');

const config = {
  url: "wss://production.nbaplus.tk:8000/ws",
  token: require('./token.json')
}

const eventTypes = ['goal', 'goal-kick', 'offside', 'corner-kick', 'free-kick', 'throw-in']

const settings = {
  betting: true,
  bet_amount: 1000,
  bet_stop: 2500,
}

const state = {
  session: undefined,
  betting: undefined,
  
  balance: {
    initial: undefined,
    current: undefined,
    max: undefined,
    min: undefined
  },

  markets: undefined,

  match: {
    id: undefined,
    markets: undefined
  },

  bets: {
    pending: undefined
  }
}

const betting = {
  current_bet: undefined,
  current_bet_price: 0,
  raise: false,
}

const counter = {
  safe: 0,
  attack: 0,
  danger: 0,
  won: 0,
  lost: 0
}

const ws = new WebSocket(config.url)

ws.on('open', function open() {
  ws.send(
    JSON.stringify(
      {
        type: 'auth',
        payload: JSON.parse(
          atob(config.token)
        ),
        rid: uuidv4()
      }
    )
  )
})

ws.on('message', function read(data) {
  let message = JSON.parse(data)

  switch (message.type) {
    case 'session-info':
      state.session = message.payload.session
      state.betting = !message.payload.betstop
      break

    case 'auth':
      ws.send(
        JSON.stringify(
          {
            type: "get-user-data",
            payload: {},
            rid: uuidv4()
          }
        )
      )

      ws.send(
        JSON.stringify(
          {
            type: "list-matches-v2",
            payload: {
              filters: {
                match_state: "all",
                sport_ids: ["soccer"]
              },
              offset: 0,
              limit: 100
            },
            rid: uuidv4()
          }
        )
      )
      break

    case 'get-user-data':
      state.balance.initial = state.balance.current = message.payload.balance
      state.balance.max = state.balance.min = message.payload.balance
      break

    case 'balance-changed':
      state.balance.current = message.payload.balance

      state.balance.max = Math.max(state.balance.current, state.balance.max)
      state.balance.min = Math.min(state.balance.current, state.balance.min)

      if(state.balance.max - state.balance.current > settings.bet_stop) {
        settings.betting = false
        console.log('STOP BETTING')
      }

      console.log('BALANCE changed', state.balance)
      break;

    case 'list-matches-v2':
      // console.log(message.payload.matches)
      state.match.id = message.payload.matches[0].id

      ws.send(
        JSON.stringify(
          {
            type: "subscribe-match",
            payload: {
              id: state.match.id
            },
            rid: uuidv4()
          }
        )
      )
      break

    case 'subscribe-match':
      state.markets = message.payload[state.match.id].markets

      console.log(message.payload[state.match.id].teams)
      console.log(message.payload[state.match.id].state)
      break

    case 'autounsubscribe-match':
      console.log('MATCH finished')
      ws.close()
      break

    case 'match-update':
      state.betting = !message.payload[state.match.id].betstop

      let events = message.payload[state.match.id].events
      let markets = message.payload[state.match.id].markets

      if (markets != undefined) {
        state.match.markets = markets
      }

      if (events != undefined) {
        let eventIndex = Object.keys(events).find(
          index => eventTypes.includes(events[index].type)
        )

        if (eventIndex != undefined) {
          console.log(Date.now()/1000)
          console.log(events[eventIndex].name)

          if (events[eventIndex].type == 'goal') { }

          if (events[eventIndex].type == 'offside') { }

          if (events[eventIndex].type == 'corner-kick') { }

          if (events[eventIndex].type == 'goal-kick') { }

          if (events[eventIndex].type == 'free-kick') {
            // makeBet('!throw-in', 1000)
          }

          if (events[eventIndex].type == 'throw-in') { }

          if (events[eventIndex].type != 'throw-in') { }

          counter.danger = 0

        } else {
          if(
            Object.values(events)
              .sort((e1, e2) => e1.match_time > e2.match_time)
              .filter(e => e.type == 'dangerous-attack').length
          ) {
            counter.danger += Object.values(events)
            .sort((e1, e2) => e1.match_time > e2.match_time)
            .filter(e => e.type == 'dangerous-attack').length
          } else {
            counter.danger = 0
          }

          console.log(
            counter.danger,
            Object.values(events)
              .sort((e1, e2) => e1.match_time > e2.match_time)
              .map(e => e.type),            
          )
        }

        if(counter.danger == 1) {
          console.log(Date.now()/1000)
        }

        if(counter.danger == 2) {
          console.log(Date.now()/1000)
          if (betting.raise) {
            console.log('raise bet')
            makeBet('!throw-in', 1000)
            betting.raise = false
          } else {
            makeBet('!throw-in', 1000)
          }          
        }
      }
      break

    case 'make-bet':
      state.bets.pending = {}
      state.bets.pending.id = message.payload.bet_id
      break

    case 'bet-update':
      if(message.payload.match_id == state.match.id) {
        if(message.payload.bet_id == state.bets.pending.id) {
          switch(message.payload.status) {
            case 'received':
              state.bets.pending.status = 'received'
              state.bets.pending.amount = message.payload.amount
              break

            case 'accepted':
              state.bets.pending.status = 'accepted'
              state.bets.pending.price = message.payload.processed_price
              console.log(Date.now()/1000)
              console.log(state.bets.pending)
              break

            case 'won':
            case 'lost':
            case 'betstop':
              state.bets.pending = undefined
              break

            default:
              console.log(message.payload)
              break
          }
        }


        if(message.payload.status == 'won' || message.payload.status == 'lost') {
          console.log(message.payload.bet_id, message.payload.status, message.payload.processed_price, message.payload.calculation_event_type, state.balance.current)

          if(message.payload.status == 'won') {
            counter.won++
            counter.lost = 0

            if (counter.won == 1) {
              betting.raise = true
            }
            
          } else if (message.payload.status == 'lost') {
            counter.lost++
            counter.won = 0

            betting.raise = false
          }

          console.log(counter.won, counter.lost)
        } else if(message.payload.status == 'acepted') {
          console.log(message.payload.bet_id, message.payload.status, message.payload.processed_price)
        }
      }      
      break

    default:
      console.log(message)
      break
  }
})

ws.on('close', function close() {
  console.log('disconeted')
})

function makeBet(betType, amount) {
  let marketId = Object.keys(state.markets).find(
    index => state.markets[index].type == betType
  )

  betting.current_bet = state.markets[marketId].type
  betting.current_bet_price = state.match.markets[marketId].price
    
  console.log(
    betting.current_bet,
    betting.current_bet_price,
    amount
  )

  if(settings.betting) {
    if(state.betting) {
      if(state.bets.pending == undefined) {
        console.log(Date.now()/1000)
        
        setTimeout(function () {
          console.log(Date.now()/1000)
          console.log('bet accepted')
        }, 10000)

        ws.send(
          JSON.stringify(
            {
              type: 'make-bet',
              payload: {
                match_id: state.match.id,
                market: {
                  id: marketId,
                  type: state.markets[marketId].type,
                  price: state.match.markets[marketId].price,
                },
                amount: amount,
                allow_price_change: true,
                is_auto_bet: false,
                is_max_bet: false,
              },
              rid: uuidv4()
            }
          )
        )
      }
    }
  }
}