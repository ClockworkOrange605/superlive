import config from './config/main.js'

import axios from 'axios'
import fs from 'fs'

const params = new URLSearchParams()
params.append('phone', config.betboom.auth.login)
params.append('password', config.betboom.auth.password)
params.append('fingerprint', config.betboom.auth.fingerprint)

axios
    .post('https://betboom.ru/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then((result) => {
        let cookies = result.headers['set-cookie']
        console.log('AUTH', result.data)
        
        axios
            .get('https://betboom.ru/game/superlive', { headers: { 'Cookie': cookies } })
            .then((result) => {
                let token = result.data.match(/[=][A-Za-z0-9]+[=]/)[0].slice(1)

                fs.writeFile('./token.json', token, (err) => {
                    if(err) console.error('ERROR', error)
                })

                console.log('TOKEN', token)
            })
            .catch((error) => {
                console.error(error)
            })
    })
    .catch((error) => {
        console.error(error)
    })