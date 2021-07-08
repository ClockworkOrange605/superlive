import fs from 'fs'
import env from 'dotenv'

const token = fs.readFileSync('./token.json').toString()

env.config()

export default {
    app: {
        port: process.env.PORT || 3005
    },
    betboom: {
        url: process.env.SUPERLIVE_WS || "wss://production.nbaplus.tk:8000/ws",
        auth: { 
            login: process.env.SUPERLIVE_PHONE, 
            password: process.env.SUPERLIVE_PASSWORD ,
            fingerprint: process.env.SUPERLIVE_FINGERPRINT
        },
        token: token
    },
    db: {
        url: process.env.MONGO_URI || 'mongodb://localhost:27017',
        name: process.env.MONGO_COLLECTION || 'superlive',
        collection: 'matches_v2'
    }    
}