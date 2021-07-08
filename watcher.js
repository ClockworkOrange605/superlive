import config from './config/main.js'

import ApiClient from './src/client.js'

import mongo from 'mongodb'
const { MongoClient } = mongo


setInterval(function() {
  getMatches({offset: 0, limit: 5}, (matches) => {
    updateMatches(matches, (matches) => {
      matches.filter(item => {
        return item.start > Date.now() &&
        item.start < (Date.now() + 300000)
      }).forEach(match => processMatch(match))
    })
  })
}, 300000)

function processMatch(match) {
  console.warn('connect', match.id)
  watchMatch(match, (result) => {
    if(result.status != 'finished' && result.status != 'abandoned') {
      console.warn('reconnect', result.match.id, result.status)
      processMatch(result.match)
    } else {
      console.warn('saving', result.match.id)
      updateMatch(match, (result) => {
        // console.log(result)
      })
    }
  })
}

function updateMatch(match, callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (err, dbClient) => {
    if(err != null) console.error(err)

    const collection = dbClient.db(config.db.name).collection(config.db.collection)
    collection.updateOne(
      {_id: match._id},
      {$set: match},
    (err, result) => {
      if(err != null) console.error(err)
      dbClient.close()
      console.log(result.result, result.modifiedCount)
      callback(result)
    })

  })
}

function watchMatch(match, callback) {
  new ApiClient((client) => {
    client.auth(() => {
      client.match_subscribe(match.id, (response) => {
        match.watcher.push({type: 'subscribed', time: Date.now()})
        match.competition_id = response.competition_id
        match.markets = response.markets

        client.emmiter.on('match.update', (updates) => {
          updates[match.id].recieved_at = Date.now()
          match.updates.push(updates[match.id])

          if(updates[match.id].state != undefined) {
            match.state = updates[match.id].state.type

            if(['first-half', 'second-half'].includes(updates[match.id].state.type)) {
              match.periods.push(updates[match.id].state)
            }
          }

          if(updates[match.id].scores != undefined) {
            match.scores = {
              home: updates[match.id].scores.total.home,
              away: updates[match.id].scores.total.away
            }
          }
        })

        client.socket.on('close', function(code) {
          match.watcher.push({type: 'disconected', time: Date.now()})
          callback({status: match.state, match: match})
        })

        client.emmiter.on('match.unsubscribe', (message) => {
          client.socket.close()
          match.watcher.push({type: 'unsibscribed', time: Date.now()})
        })
      })
    })
  })
}

function updateMatches(matches, callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (err, dbClient) => {
    if(err != null) console.error(err)

    const collection = dbClient.db(config.db.name).collection(config.db.collection)
    const promises = []

    matches
      .forEach((match) => {
        promises.push(
          new Promise((resolve, reject) => {
            collection.findOne({id: match.id}, (err, result) => {
              if(err != null) reject(err)
              if(result == null) {
                collection.insertOne(match, (err, result) => {
                  if(err != null) reject(err)
                  resolve(result.ops[0])
                })
              } else {
                resolve(result)
              }
            })
          })
        )
      })

    Promise.all(promises)
      .then((values) => {
        dbClient.close()
        callback(values)
      }, (errors) => {
        dbClient.close()
        throw(errors)
      })
  })
}

function getMatches({limit=10, offset=0}, callback) {
    new ApiClient((client) => {
      client.auth(() => {
        client.match_list(offset, limit, (matches) => {
          client.socket.close()

          const result = matches
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
              },
              periods: [],
              markets: {},
              updates: [],
              watcher: []
            }))

          callback(result)
        })
      })
    })
  }