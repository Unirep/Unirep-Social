const fs = require('fs')
const path = require('path')

const {
    abi,
} = require('../artifacts/contracts/UnirepSocial.sol/UnirepSocial.json')

fs.writeFileSync(
    path.join(__dirname, '../abi/UnirepSocial.json'),
    JSON.stringify(abi)
)
