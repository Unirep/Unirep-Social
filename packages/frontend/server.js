const path = require('path')
const fs = require('fs')
const express = require('express')

const app = express()

app.get('*', async (req, res, next) => {
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
        return next()
    }
    const index = (
        await fs.promises.readFile(path.join(__dirname, 'build', 'index.html'))
    ).toString()
    const config = {
        SERVER: process.env.SERVER,
        DEFAULT_ETH_PROVIDER_URL: process.env.DEFAULT_ETH_PROVIDER_URL,
    }
    res.setHeader('content-type', 'text/html')
    res.end(index.replace(`'__DEV_CONFIG__'`, JSON.stringify(config)))
})
app.use(express.static('build'))

app.listen(3000, () => console.log('Listening on port 3000'))
