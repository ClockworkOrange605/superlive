require('dotenv').config()

module.exports = {
    app:{
        port: process.env.PORT || 3005
    },
    betboom: {
        url: process.env.SUPERLIVE_WS || "wss://production.nbaplus.tk:8000/ws",
        token: require('../token.json')
    },
    db: {
        url: process.env.MONGO_URI || 'mongodb://localhost:27017',
        name: process.env.MONGO_COLLECTION || 'superlive'
    }    
}