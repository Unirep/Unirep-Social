const express = require('express')
const app = express()

app.use(express.static('build'))

app.listen(3000, () => console.log('Listening on port 3000'))
