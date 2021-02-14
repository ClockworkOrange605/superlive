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
  bet_stop: 1500,
  bank: 10000
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
    country: undefined,
    league_id: undefined,
    league: undefined,
    status: undefined,
    start: undefined,
    markets: undefined,
    events: [],

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

      console.log('balance', state.balance)
      break;

    case 'list-matches-v2':
      var match = message.payload.matches[0]

      state.match.id = match.id
      state.match.start = match.start_time
      state.match.country = match.region_name
      state.match.league = match.competition_name

      state.match.status = match.state.type
      //TODO: status change times
      console.log('status', match.state)

      // TODO: refactor
      state.match.scores = match.scores.total

      // TODO: refactor
      state.match.teams = Object.values(match.teams)
        .map((item, index) => ({
          id: Object.keys(match.teams)[index], 
          side: item.side, name: item.name
        }))

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
      var match = message.payload[state.match.id]

      state.match.league_id = match.competition_id
      
      //TODO: refacor
      state.markets = match.markets
      
      //TODO: make processing
      // match.events

      console.log(state.match)
      break

    case 'autounsubscribe-match':
      console.log(state.match)
      ws.close()
      break

    case 'match-update':
      state.betting = !message.payload[state.match.id].betstop      

      let status = message.payload[state.match.id].state
      let scores = message.payload[state.match.id].scores

      let markets = message.payload[state.match.id].markets
      let events = message.payload[state.match.id].events

      if(status != undefined) {
        console.log('status', status)
        state.match.status = status.type
        // settings.betting = true
      }

      if(scores != undefined) {
        state.match.scores = scores.total
      }

      if (markets != undefined) {
        state.match.markets = markets
      }

      if (events != undefined) {
        let mainEvent = Object.values(events)
          .find(
            item => eventTypes.includes(item.type)
          )

        let otherEvents = Object.values(events)
          .filter(
            item => ['ball-safe', 'attack', 'dangerous-attack'].includes(item.type)
          )

        if(mainEvent != undefined) {
          state.match.events.push(mainEvent)

          console.log(
            mainEvent.match_time, 
            mainEvent.name, 
            (mainEvent.server_time - state.match.start) / 1000,
            (Date.now() - state.match.start) / 1000
          )

          // TODO: refactor
          counter.danger = 0
        }

        if(otherEvents.length > 0) {
          if(
            Object.values(otherEvents)
              .filter(item => item.type == 'dangerous-attack')
              .length
          ) {
            counter.danger += Object.values(otherEvents)
              .filter(item => item.type == 'dangerous-attack')
              .length
          } else {
            counter.danger = 0
          }

          console.log(
            counter.danger,
            Object.values(otherEvents)
              .map(item => item.type),
              (Date.now() - state.match.start) / 1000
          )

          if(counter.danger) {
            if(state.bets.pending == undefined) {
              if(state.match.events.length > 0) {
                if(state.match.events[state.match.events.length - 1].type == 'free-kick') {
                  // if(state.match.events[state.match.events.length - 1].match_time > 1800) {
                    makeBet('!throw-in', 1000)
                  // }
                }
              }
            }
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
        if(state.bets.pending != undefined) {
          if(message.payload.bet_id == state.bets.pending.id) {
            switch(message.payload.status) {
              case 'received':
                state.bets.pending.status = 'received'
                state.bets.pending.amount = message.payload.amount
                break

              case 'accepted':
                state.bets.pending.status = 'accepted'
                state.bets.pending.price = message.payload.processed_price
                console.log(state.bets.pending)
                break

              case 'lost':
                if(state.balance.current < state.balance.initial) {
                  console.log('stop autobeting')
                  settings.betting = false
                }

                if(state.balance.current < state.balance.max) {
                  console.log('stop autobeting')
                  settings.betting = false
                }

                if((state.balance.max - state.balance.current) > settings.bet_stop ) {
                  console.log('stop autobeting')
                  settings.betting = false
                }

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
    amount,
    (Date.now() - state.match.start) / 1000
  )

  if(settings.betting) {
    if(state.betting) {
      if(state.bets.pending == undefined) {

        setTimeout(function () {
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