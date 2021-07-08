import config from './config/main.js'

import express from 'express'
import mongo from 'mongodb'
import path from 'path'

const { MongoClient } = mongo
const app = express()

app.use(
  express.static(path.resolve('./web/build'))
)

app.get('/api/status/', (req, res) => {
  res.json({status: 'ok', time: Date.now()})
})

app.get('/api/match/', (req, res) => {
  console.log('GET', 'match', 'list')

  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, (err, dbClient) => {
    if(err != null) console.error(err)

    const db = dbClient.db(config.db.name)
    const collection = db.collection(config.db.collection)

    collection
      .find({}, {
        projection: {
          id: 1,
          start: 1,
          state: 1,
          region_name: 1,
          competition_name: 1,
          teams: 1,
          scores: 1,
          events: 1
        },
        sort: {start: -1},
        limit: 100,
      })
      .toArray((err, result) => {
        if(err != null) console.error(err)

        dbClient.close()
        res.json(result)
    })
  })
})

app.get('/api/match/:id/', (req, res) => {
  console.log('GET', 'match', req.params.id)

  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, (err, dbClient) => {
    if(err != null) console.error(err)

    const db = dbClient.db(config.db.name)
    const collection = db.collection(config.db.collection)

    collection
      .findOne({id: req.params.id}, (err, result) => {
        if(err != null) console.error(err)

        dbClient.close()
        res.json(result)
    })
  })
})

app.get('*', (req, res) => {
  res.sendFile(path.resolve('./web/build', 'index.html'))
})

app.listen(config.app.port, () => {
  console.log(`App listening at http://localhost:${config.app.port}`)
})