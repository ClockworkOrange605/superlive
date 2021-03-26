const config = require('./config/main.js')
config.db.collection = 'matches_v2'

const { MongoClient } = require("mongodb");

getMatches({limit: 100, offset: 0}, (error, result) => {
  if(error !== null) throw error

console.log(result.length)

  result.forEach(item => getMatch(item, (error, result) => {
    if(error !== null) throw error

    let events = result.updates.reduce((arr, item, index) => {
      if(item.events != undefined) {
        let event = Object.values(item.events).find(event => {
          return ['throw-in', 'free-kick', 'corner-kick', 'goal-kick', 'goal', 'offside']
            .includes(event.type)
        })
        if(event != undefined) {
          arr.push(event)
        }
      }
      return arr
    }, [])

    updateMatch({...result, events}, (error, result) => {
      if(error !== null) throw error

      console.log(result)
    })
  }))
})

function updateMatch({_id, events}, callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (error, dbClient) => {
    if(error != null) callback(error, null)

    dbClient
      .db(config.db.name)
      .collection(config.db.collection)
      .updateOne(
        { _id: _id },
        { $set: { events: events } },
        (error, result) => {
          if(error != null) callback(error, null)

          dbClient.close()
          callback(null, result.result.ok)
        }
      )
  })
}

function getMatch({_id}, callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (error, dbClient) => {
    if(error != null) callback(error, null)

    dbClient
      .db(config.db.name)
      .collection(config.db.collection)
      .findOne({_id: _id}, (error, result) => {
        if(error != null) callback(error, null)

        dbClient.close()
        callback(null, result)
      })
  })
}

function getMatches({limit, offset}, callback) {
  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, async (error, dbClient) => {
    if(error != null) callback(error, null)

    dbClient
      .db(config.db.name)
      .collection(config.db.collection)
      .find(
        { state: 'finished', start: { $gte: new Date("2021-03-12T00:00:00Z").getTime() }, events: { $exists: false }},
        { projection: { _id: 1 }, limit: limit, skip: offset, sort: { start: 1 } }
      )
      .toArray((error, result) => {
        if(error != null) callback(error, null)

        dbClient.close()
        callback(null, result)
      })
  })
}

