const WebSocket = require('ws');

const atob = require('atob');
const { v4: uuidv4 } = require('uuid');

const config = {
  url: "wss://production.nbaplus.tk:8000/ws",
  token: "eyJwcm90ZWN0ZWQiOiJleUpoYkdjaU9pSkZRMFJJTFVWVEswRXlOVFpMVnlJc0ltVnVZeUk2SWtFeU5UWkhRMDBpTENKbGNHc2lPbnNpYTNSNUlqb2lSVU1pTENKamNuWWlPaUpRTFRNNE5DSXNJbmdpT2lKbVRYVlFhM3BXYUVsRFVXOHpiMDF5UmpKelZVbDNiV3hOVEdVdFFWRk5jR1JPZHpsdWRrTTNjakZaYW1GdGFtUnhkRkZJYkRnNFExbDJZMWN4WDJ4UElpd2llU0k2SWtWYU1qVnJNbTQzYTJFMFZqUnpTRzFHT1VWM1RVSmxVMms0UlVsWk56aFZNRzFHWTBaWlNuUTNYMmhRVDBVMFducFFNbVpEVDJKTE1GbE9hSGxaYWpZaWZYMCIsInJlY2lwaWVudHMiOlt7ImVuY3J5cHRlZF9rZXkiOiI2cFlLcl96eHpzSXJSaGlTek5wSWItRE9FR0U5dFNnbzhjOGp2NVZoQ2lRRnFzcXhUWEtnNGcifV0sImFhZCI6ImV5SndiR0YwWm05eWJWOXBaQ0k2SW1KcGJtZHZZbTl2YlNJc0luVnpaWEpmZEc5clpXNGlPaUl3WlRBeVpEazFaaTFtT0dVNUxUUmxZakl0T0RVM09TMWpOR1U1WVdWbVlUQmlOV1VpZlEiLCJpdiI6IjgxbWtaaWUyY0VwT3JUSXciLCJjaXBoZXJ0ZXh0IjoiNDZ3QzZPRVl4dTJWcDlXMU9IcjdfU2tCaGQyeXExcGNKZmZ4SV9KUFZzLTFON1pDZlFXTGtTcE5hYkdhS3VMMXpkLXBRMng2Wmw0Rzg1ZzQyb0RMZElVWjBpaUpmRzluUC1DMXg1RWl0eVlWMGtQejJBQWhTVlJLZTlTS2lmSjI3S2lEX1ZRS3ZabXpwMnBXUkU4MXU0eW14V0RCZ2pWc1RaSjh0dTJoRE53M2lrX0ZBRXhzT0VySHg4ZGRXZzlUdzdwZGJxSmR0MXRZQ3E4X2ZlbmJ1OXAwbnFsbCIsInRhZyI6IkVaRG5hVGUydklPVFROSE9leldpTFEifQ=="
}

const eventTypes = ['goal', 'goal-kick', 'offside', 'corner-kick', 'free-kick', 'throw-in']
const betTypes = ['free-kick', 'goal-kick', 'offside', '!goal', 'corner-kick|free-kick', 'corner-kick|goal|throw-in', 'corner-kick', 'goal|goal-kick', 'goal', 'offside|throw-in', '!free-kick', 'throw-in', 'free-kick|goal-kick|offside', '!throw-in']
const betStakes = [10, 20, 60, 180, 540, 1620, 4860]

const state = {}
const betting = {}
betting.balance = 0
betting.profit = 0

// betting.notThrowIn = false
// betting.throwIn = false

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
      state.auth = message.payload.result

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
      state.balance = message.payload.balance
      console.log(state.balance)
      break

    case 'balance-changed':
      state.balance = message.payload.balance
      break;

    case 'list-matches-v2':
      state.match = {}
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

      if(message.payload[state.match.id].state.type == 'not-started') {
        betting.notThrowIn = true
      }
      break

    case 'autounsubscribe-match':
      console.log('match finished')
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
          console.log(events[eventIndex].name)

          // if (betting.current_bet != undefined) {
          //   betting.profit -= 10
            
          //   if(betting.current_bet == 'throw-in' && events[eventIndex].type == 'throw-in') {
          //     betting.profit += (10 * betting.current_bet_price)
          //   } else if(betting.current_bet == 'throw-in' && events[eventIndex].type != 'throw-in') {
          //     betting.throwIn = false
          //   }

          //   if(betting.current_bet == '!throw-in' && events[eventIndex].type != 'throw-in') {
          //     betting.profit += (10 * betting.current_bet_price)
          //   } else if(betting.current_bet == '!throw-in' && events[eventIndex].type == 'throw-in') {
          //     betting.notThrowIn = false
          //     betting.throwIn = true
          //   }

          //   console.log(betting.profit)            
            
          //   betting.current_bet = undefined
          //   betting.current_bet_price = 0
          // }

          if (events[eventIndex].type == 'goal') { }

          if (events[eventIndex].type == 'offside') { }

          if (events[eventIndex].type == 'corner-kick') { }

          if (events[eventIndex].type == 'goal-kick') { }

          if (events[eventIndex].type == 'free-kick') { }

          if (events[eventIndex].type == 'throw-in') {
            // if(betting.throwIn) {
              // makeBet('throw-in', 100)
            // }
          }

          if (events[eventIndex].type != 'throw-in') {
            // if(betting.notThrowIn) {
              makeBet('!throw-in', 100)
            // }
          }
        }
      }
      break

    case 'make-bet':
      console.log(message.payload.bet_id)
      break

    case 'bet-update':
      if(message.payload.match_id == state.match.id) {
        console.log(message.payload.bet_id, message.payload.status, message.payload.processed_price, message.payload.calculation_event_type)
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
  
  if(state.betting && betting.current_bet_price > 1.5) {
    console.log(
      betting.current_bet,
      betting.current_bet_price
    )
    
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
            amount: 1000,
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