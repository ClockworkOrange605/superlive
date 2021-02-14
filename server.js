const express = require('express')
const path = require('path')

const app = express();
const port = 3005

const { MongoClient } = require("mongodb")
const config = {
  db: {
    url: "mongodb://localhost:27017",
    name: "superlive"
  }
}

app.use(
  express.static(path.resolve(__dirname, './web/build'))
)

app.get('/api/status/', (req, res) => {
  res.json({status: 'ok', time: Date.now()})
})

app.get('/api/match/', (req, res) => {
  console.log('GET', 'match', 'list')

  MongoClient.connect(config.db.url, { useUnifiedTopology: true }, (err, dbClient) => {
    if(err != null) console.error(err)

    const db = dbClient.db(config.db.name)
    const collection = db.collection('matches')

    collection
      .find({}, {
        projection: {
          id: 1,
          start_time: 1,
          state: 1,
          region_name: 1,
          competition_id: 1, 
          competition_name: 1, 
          teams: 1,
          scores: 1,
        },
        sort: {start_time: -1},
        // limit: 10,
      })
      // .sort({start_time: -1})
      // .limit(10)
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
    const collection = db.collection('matches')

    collection
      .findOne({id: req.params.id}, (err, result) => {
        if(err != null) console.error(err)

        dbClient.close()
        res.json(result)
    })
  })
})

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './web/build', 'index.html'));
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})