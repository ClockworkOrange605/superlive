const WebSocket = require('ws');

const atob = require('atob');
const { v4: uuidv4 } = require('uuid');

const config = {
  url: "wss://production.nbaplus.tk:8000/ws",
  token: 
  "eyJwcm90ZWN0ZWQiOiJleUpoYkdjaU9pSkZRMFJJTFVWVEswRXlOVFpMVnlJc0ltVnVZeUk2SWtFeU5UWkhRMDBpTENKbGNHc2lPbnNpYTNSNUlqb2lSVU1pTENKamNuWWlPaUpRTFRNNE5DSXNJbmdpT2lKeExUTmZlWGR4Y0dab1JsRmFjMkZDVUhkSlJ6TkJRelpUYjFKWVpsbFVkMW8xWWxjNWEwbFBhRWQyWkdFeFNYZEVSSEI2VFZSc1RrUm1kRE5PY2pWTElpd2llU0k2SWs5VmJYaGhjbWh5TFRSdWRIVlBNbkozTFhCM1p6TklVUzFRYkhsTmMzUnFOUzEzZEc4MVVXTklSbGhMUjA5WFoyVmFWbU5vZVZOa1V6Z3hWVTVGV1dnaWZYMCIsInJlY2lwaWVudHMiOlt7ImVuY3J5cHRlZF9rZXkiOiJXc3dXZWU5ZHBEQnpwWXhYUVpKRF9GSkNEQmpfaUVVZ0VkcUo1dTVteFhxS1hjamwtWUh3bHcifV0sImFhZCI6ImV5SndiR0YwWm05eWJWOXBaQ0k2SW1KcGJtZHZZbTl2YlNJc0luVnpaWEpmZEc5clpXNGlPaUkxTmpCak4yTXlOaTA1TWpCakxUUTROV1V0T1dSaVpTMWhaak14TXpNeU1XRTRNR0VpZlEiLCJpdiI6Im5CN1o4NWxLaEoyOWxPc04iLCJjaXBoZXJ0ZXh0IjoiZzhMeTdlR0owY3RaZVdJa3hfQ29sY3FSZ3k4T2ZaVVdpYlFhYVUwRXZ3Z2sxOFlPdW1jaG1Ja1RVX3JiSnFkVFgtU00wWVRZX0R6UHc0am9VTVZNWDJxQ3J4eUlMNmtDYnhkQ2ljMTVEWG9aWFZDd19nVjRWanEzSnRZYUlXTjAwbmdvU3BFUFh6Q1JSUW5oaGh2NGp3cWpMeDRsTFFzY3ZNX0JaaTVCMjRtWkxqWDBGMGt0bjJVTEZITmdfVmUyN0JVRUt3IiwidGFnIjoibjNGSzJYSUVSTnN2TDZwVVUyTlc1USJ9=="
}

const eventTypes = ['goal', 'goal-kick', 'offside', 'corner-kick', 'free-kick', 'throw-in']
const betTypes = ['free-kick', 'goal-kick', 'offside', '!goal', 'corner-kick|free-kick', 'corner-kick|goal|throw-in', 'corner-kick', 'goal|goal-kick', 'goal', 'offside|throw-in', '!free-kick', 'throw-in', 'free-kick|goal-kick|offside', '!throw-in']

const state = {}
const betting = {}
betting.profit = 0

const ws = new WebSocket(config.url)

ws.on('open', function open() {
  console.log(JSON.stringify(
      {
        type: 'auth',
        payload: JSON.parse(
          atob(config.token)
        ),
        rid: uuidv4()
      }
    ))

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
      break

    // case 'balance-changed':
    //   break;

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

          if (betting.current_bet != undefined) {
            betting.profit -= 10
            
            if(events[eventIndex].type == betting.current_bet) {
              betting.profit += (10 * betting.current_bet_price)
            }

            if(betting.current_bet == '!throw-in' && events[eventIndex].type != 'throw-in') {
              betting.profit += (10 * betting.current_bet_price)
            }

            console.log(betting.profit)            
            
            betting.current_bet = undefined
            betting.current_bet_price = 0
          }

          if (events[eventIndex].type == 'goal') { }

          if (events[eventIndex].type == 'offside') { }

          if (events[eventIndex].type == 'corner-kick') { }

          if (events[eventIndex].type == 'goal-kick') { }

          if (events[eventIndex].type == 'free-kick') { }

          if (events[eventIndex].type == 'throw-in') { }

          if (events[eventIndex].type != 'throw-in') {
            makeBet('!throw-in', 100)
          }
        }
      }
      break

    // case 'make-bet':
    //   break

    // case 'bet-update':
    //   break

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
    betting.current_bet_price
  )

  // ws.send(
  //   JSON.stringify(
  //     {
  //       type: 'make-bet',
  //       payload: {
  //         match_id: state.match.id,
  //         market: {
  //           id: marketId,
  //           type: state.markets[marketId].type,
  //           price: state.match.markets[marketId].price,
  //         },
  //         amount: 100,
  //         allow_price_change: true,
  //         is_auto_bet: false,
  //         is_max_bet: false,
  //       },
  //       rid: uuidv4()
  //     }
  //   )
  // )
}