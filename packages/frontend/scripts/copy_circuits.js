const fs = require('fs')
const path = require('path')

const keyDir = path.join(__dirname, '../node_modules/@unirep/circuits/build')
const destDir = path.join(__dirname, '../public/build')

if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true })
}

fs.mkdirSync(destDir)

const files = fs.readdirSync(keyDir)
for (const file of files) {
    fs.copyFileSync(path.join(keyDir, file), path.join(destDir, file))
}
