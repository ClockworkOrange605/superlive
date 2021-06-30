const config = require('./config/main').betboom.auth

const fs = require('fs')
const axios = require('axios')

const params = new URLSearchParams()
params.append('phone', config.login)
params.append('password', config.password)
params.append('fingerprint', config.fingerprint)

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

                fs.writeFile('./token.json', '"' + token + '"', (error) => {
                    console.error(error)
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