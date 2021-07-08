import config from './config/main.js'

import ApiClient from './src/client_v2.js'

setInterval(function() {
  getMatches({offset: 0, limit: 5}, (matches) => {
    matches.filter(item => {
      return item.start > Date.now() && 
      item.start < (Date.now() + 300000)
    }).forEach(match => processMatch(match))
  })
}, 300000)

function getMatches({limit=10, offset=0}, callback) {
  new ApiClient(config.betboom, (client) => {
    client.emmiter.on('socket.opened', () => {
      client.authorize(() => {
        client.getMatchlist({offset: offset, limit: limit}, (response) => {
          client.socket.close()

          const result = response.matches
            .map(item => ({
              _id: undefined,
              id: item.id,
              sport_id: item.sport_id,
              region_id: undefined,
              competition_id: undefined,
              sport_name: item.sport_name,
              region_name: item.region_name,
              competition_name: item.competition_name,
              teams: {
                home: {
                  id: Object.keys(item.teams).find(key => item.teams[key].side == 'home'),
                  name: Object.values(item.teams).find(item => item.side == 'home').name.trim()
                },
                away: {
                  id: Object.keys(item.teams).find(key => item.teams[key].side == 'away'),
                  name: Object.values(item.teams).find(item => item.side == 'away').name.trim()
                }
              },
              start: item.start_time,
              state: item.state.type,
              scores: {
                home: item.scores.total.home,
                away: item.scores.total.away
              }
            }))             
          
          callback(result)
        })
      })  
    })
  })
}

function processMatch(match) {
  new ApiClient(config.betboom, (client) => {
    client.emmiter.on('socket.opened', () => {
      client.authorize(() => {          
        client.subscribeMatch(match, (response) => {
          console.log('Subscribed', response[match.id].teams)
          let matchState = {...match, ...response[match.id], ...{updates: [], events: [], mainEvents: [], betting: {better1: false, better2: false, bets: []}, currentMarkets: {}} }

          client.emmiter.on('api.match.update', (message) => {
            matchState.updates.push({...message[matchState.id], recieved_at: Date.now()})

            if(matchState.betstop != message[matchState.id].betstop) {
              console.log('Betting', message[matchState.id].betstop ? 'disabled' : 'enabled', Date.now())
              matchState.betstop = message[matchState.id].betstop
            }

            /**/if(Object.keys(message[matchState.id]).find(key => !['start_time', 'state', 'scores', 'markets', 'betstop', 'events'].includes(key)) != undefined) {
              console.warn('Update not processed ', Object.keys(message[matchState.id]).find(key => !['start_time', 'state', 'scores', 'markets', 'betstop', 'events'].includes(key)))
            }/**/
          })

          client.emmiter.on('api.match.update.markets', (markets) => {
            matchState.currentMarkets = markets
          })

          client.emmiter.on('api.match.update.events', (events) => {
            let matchEvents = Object.keys(events)
              .map(key => ({...{id: key}, ...events[key]}))
              .sort((el1, el2) => el1.server_time - el2.server_time)

            matchState.events.push(...matchEvents)

            let mainEvent = matchEvents
              .find(item =>
                ['throw-in', 'free-kick', 'goal-kick', 'goal', 'corner-kick', 'offside']
                .includes(item.type))

            if(mainEvent != undefined) {
              console.log(mainEvent.type)

              if(matchState.betting.better2 && mainEvent.type == 'free-kick') {
                console.log('bettor2', '!throw-in')

                let market = {}
                market.type = '!throw-in'
                market.id = Object.keys(matchState.markets).find(key => matchState.markets[key].type == market.type)
                market.price = matchState.currentMarkets[market.id] != undefined ? matchState.currentMarkets[market.id].price : matchState.markets[market.id].price

                console.log('Make Bet', {id: matchState.id}, market, 2000)

                client.makeBet({id: matchState.id}, market, 2000, (response) => {
                  console.log('Bet Response', response)
                  matchState.betting.bets.push({...response, type: 'bettor2'})
                })

              }

              if(matchState.betting.better1 && mainEvent.type == 'throw-in' && matchState.mainEvents[matchState.mainEvents.length - 1].type == 'throw-in') {
                console.log('bettor1', '!throw-in')

                let market = {}
                market.type = '!throw-in'
                market.id = Object.keys(matchState.markets).find(key => matchState.markets[key].type == market.type)
                market.price = matchState.currentMarkets[market.id] != undefined ? matchState.currentMarkets[market.id].price : matchState.markets[market.id].price

                console.log('Make Bet', {id: matchState.id}, market, 2000)

                client.makeBet({id: matchState.id}, market, 2000, (response) => {
                  console.log('Bet Response', response)

                  console.log({...response, type: 'bettor1'})
                  matchState.betting.bets.push({...response, type: 'bettor1'})
                })
              }

              matchState.mainEvents.push(mainEvent)
            }
          })

          client.emmiter.on('api.bet.update', (message) => {
            console.log('Bet Update', message)
            console.log('Bet in pool',
             Object.keys(matchState.betting.bets).find(key => 
              matchState.betting.bets[key].bet_id == message.bet_id)
            )
            console.log('Bets List', matchState.betting.bets)
          })

          client.emmiter.on('api.match.update.state', (state) => {
            console.log('Update State', state)
            matchState.state = state

            // check stats
            if(state.type == 'halftime') {
              let stats1 = {}
              matchState.mainEvents.forEach((item, index, arr) => {
                if(index >= 2 && index < arr.length - 1) {
                  let key = arr[index-2].type+'->'+arr[index-1].type+'->'+item.type
                  if(stats1[key] == undefined) stats1[key] = []
                  stats1[key].push(arr[index+1].type)
                }
              })

              let stats2 = {}
              matchState.mainEvents.forEach((item, index, arr) => {
                if(index >= 1 && index < arr.length - 1) {
                  let key = arr[index-1].type+'->'+item.type

                  if(stats2[key] == undefined) stats2[key] = []
                  stats2[key].push(arr[index+1].type)
                }
              })

              let filtered1 = Object.keys(stats1)
                .sort()
                .filter(key => key.startsWith('throw-in->throw-in')) // < 20% !throw-in

              let filtered2 = Object.keys(stats2)
                .sort()
                .filter(key => key.startsWith('free-kick')) // < 15% !throw-in

              let count1 = filtered1.reduce((sum, key) => sum + stats1[key].length, 0)
              let count2 = filtered2.reduce((sum, key) => sum + stats2[key].length, 0)

              if(stats1['throw-in->throw-in->throw-in'] != undefined) {
                console.log('Statistics1 %', (stats1['throw-in->throw-in->throw-in'].length / count1 * 100).toFixed(1), 20)
              }

              if(stats2['free-kick->throw-in'] != undefined) {
                console.log('Statistics2 %', (stats2['free-kick->throw-in'].length / count2 * 100).toFixed(1), 30)
              }

              if(stats1['throw-in->throw-in->throw-in'] == undefined ||
                (stats1['throw-in->throw-in->throw-in'].length / count1 * 100).toFixed(1) < 20) {
                  console.log('Betting 1', true)
                  matchState.betting.better1 = true
              }

              if(stats2['free-kick->throw-in'] == undefined ||
                (stats2['free-kick->throw-in'].length / count2 * 100).toFixed(1) < 30) {
                  console.log('Betting 2', true)
                  matchState.betting.better2 = true
              }
            }
          })

          client.emmiter.on('api.match.update.scores', (scores) => {
            console.log('Update Scores', scores)
            matchState.scores = scores
          })

          client.emmiter.on('api.match.unsubscribed', (message) => {
            console.log('Unsibscribed', message)

            console.log(matchState)
            client.socket.close()
          })
        })
        
      })
    })
  
    client.emmiter.on('socket.closed', (status) => {
      console.log('Socket Closed', status)
    })
  
    client.emmiter.on('socket.error', (error) => {
      console.error('Socket Error', error)
    })
  })
}