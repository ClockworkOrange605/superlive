const Database = require("@replit/database")
const WebSocket = require('ws');

const { v4: uuidv4 } = require('uuid');
const atob = require('atob');

const config = {
  url: "wss://production.nbaplus.tk:8000/ws",
  token: "eyJwcm90ZWN0ZWQiOiJleUpoYkdjaU9pSkZRMFJJTFVWVEswRXlOVFpMVnlJc0ltVnVZeUk2SWtFeU5UWkhRMDBpTENKbGNHc2lPbnNpYTNSNUlqb2lSVU1pTENKamNuWWlPaUpRTFRNNE5DSXNJbmdpT2lKWWQzTm1ORWhyU2psVmEwNWlXa3h4YlRZMlRUQkxTV1prTkZjMlp6QkhURmRUZWtVNVFXbzVTM0JzV0RRMFNVOUJjVVIwV1c1VVMxVkVWaTFyT1ZsTklpd2llU0k2SWpKV1lsQnhUblZ3T1dKUGJITldNa281YjJwNVVtWm9iSFZXUTBkd1VtODNSalZaYmxrMldrbEpkbXB5U1ZWcGN6WkNUMkpNYW00MlZVTlRUbUpaTVZBaWZYMCIsInJlY2lwaWVudHMiOlt7ImVuY3J5cHRlZF9rZXkiOiJOb0NfTi1TY2c4VU9waG5zanJXNnNtSXhXZDBSSmc1X2t5SkQyNGZDNmNUNFVweVAtU0dZRlEifV0sImFhZCI6ImV5SndiR0YwWm05eWJWOXBaQ0k2SW1KcGJtZHZZbTl2YlNJc0luVnpaWEpmZEc5clpXNGlPaUptWTJNME4yVTFNQzFqTURZeExUUXdaR1l0WVdVeU5TMWhNMkl5WldRMk9UUm1OakVpZlEiLCJpdiI6IldWY0dVSWJHOVBwY3VnVHMiLCJjaXBoZXJ0ZXh0IjoiTC1XNWxQZEJGLUhiSV9BY0xJY0RlalJUUkZFY2JyTldIVm9NaWkweU1GZC1RTkpOTEgxMnhhNFlDM0N1QmNMQk5UUFM1d2E4Y19zVHF5b1ZzZWdGWjNZaFBfUDBuakZoUHFvalZSVTAxR25MeDN3YXJEa004UXY4Q3p0VklndVotS3ZFTXB6bjlOTktaLXhMNXZ2YXh2dmMxVkRjSFBwZExrT3RlbHZFTS1xRzEwXy0zNG84MGZ5THlHS1U0WlVxeWR0cVBRIiwidGFnIjoiMU4wSTFMQ19hUWFNZ1h3enFEN1lQdyJ9"
}

const eventTypes = ['goal', 'goal-kick', 'offside', 'corner-kick', 'free-kick', 'throw-in']
const betTypes = ['free-kick', 'goal-kick', 'offside', '!goal', 'corner-kick|free-kick', 
    'corner-kick|goal|throw-in',  'corner-kick', 'goal|goal-kick', 'goal', 'offside|throw-in', 
    '!free-kick', 'throw-in', 'free-kick|goal-kick|offside', '!throw-in']

const state = {}

const ws = new WebSocket(config.url)
const db = new Database()

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

  switch(message.type) {
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
      state.markets = message.payload[state.match.id]

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
      let markets = message.payload[state.match.id].events 

      if(markets != undefined) {
        state.match.markets = markets
      }

      if(events != undefined) {
        let eventIndex = Object.keys(events).find(
          index => eventTypes.includes(events[index].type)
        )

        if(eventIndex != undefined) {
          console.log(events[eventIndex].name)

          if(events[eventIndex].type == 'goal') {}

          if(events[eventIndex].type == 'offside') {}

          if(events[eventIndex].type == 'corner-kick') {}

          if(events[eventIndex].type == 'goal-kick') {}

          if(events[eventIndex].type == 'free-kick') {
            let marketId = Object.keys(state.markets).find(
              index => state.markets[index].type == 'goal-kick'
            )

            console.log(
              state.markets[marketId],
              state.match.markets[marketId],
              state.match.markets[marketId].price
            )

            ws.send(
              JSON.stringify(
                {
                  type: 'make-bet',
                  payload: {
                    match_id: state.match.id,
                    market: {
                      id: marketId,
                      type: 'goal-kick',
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

          if(events[eventIndex].type == 'throw-in') {}
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