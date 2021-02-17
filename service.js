const config = require('./config/main.js')

const { MongoClient } = require("mongodb");
const apiClient = require('./src/client.js')

sync_matches()

// Sync match list 
setInterval(function() {
  sync_matches()
}, 1 * ( /*hour*/ 60 * ( /* minute*/ 60 * /*second*/ 1000  ) ) )

// Watch match
setInterval(function() {
  find_match((result) => {
    console.log(result)
    if(result != undefined) {
      watch_match(result)
    }    
  })
}, 15 * ( /* minute*/ 60 * /*second*/ 1000  ) )

function sync_matches() {
  new apiClient((client) => {
    client.auth((result) => {
      client.match_list(0, 10, (matches) => {

        matches.forEach(match => {
          MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (err, dbClient) => {
            if(err != null) console.error(err)
  
            const db = dbClient.db(config.db.name)
            const collection = db.collection('matches')

            collection.findOne({id: match.id}, (err, result) => {
              if(err != null) console.error(err)

              if(result == null) {
                collection.insertOne(match, (err, result) => {
                  if(err != null) console.error(err)

                  dbClient.close()
                })  
              }            
              
            })            
          })  
        })

        client.socket.close()        
      })
    })  
  })
}

function find_match(callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, (err, dbClient) => {
    if(err != null) console.error(err)

    const db = dbClient.db(config.db.name)
    db.collection('matches')
      .find({"start_time": {
        $gt: Date.now(),
        $lt: (Date.now() + 15 * 60 * 1000)
      }})
      .sort({"start_time": 1})
      .limit(1)
      .toArray((err, result) => {
      if(err != null) console.error(err)

      callback(result[0])

      dbClient.close()
    })
  })
}

function watch_match(match) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, (err, dbClient) => {
    if(err != null) console.error(err)

    const db = dbClient.db(config.db.name)  
    let matchId = match.id

    new apiClient((client) => {
      client.auth((result) => {
        if(result == 'OK') {
          client.match_subscribe(matchId, (match) => {
            console.log(matchId)

            db.collection('matches').updateOne(
              {id: matchId}, {$set: {
                markets: match.markets,
                competition_id: match.competition_id,
                updates: []
            }}, (err, result) => {
              if(err != null) console.error(err)
              console.log(result.result)
            })

            client.emmiter.on('match.update', (state) => {                
              if(state[matchId] != undefined) {
                db.collection('matches').updateOne(
                  {id: matchId}, {$push: {
                    updates: state[matchId]
                }}, (err, result) => {
                  if(err != null) console.error(err)
                  console.log(result.result)
                })
              }
            })
  
            client.emmiter.on('match.unsubscribe', (match) => {
              console.log('unsibscribe', match)
              client.socket.close()
              setTimeout(() => {dbClient.close()}, 5000)
            })
          })
        }
      })
    })
  })
}
