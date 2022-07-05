// Need to convert modules to commonjs format so Jest can undertstand them.
const isTest = String(process.env.NODE_ENV) === 'test'
const isProd = String(process.env.NODE_ENV) === 'production'

module.exports = {
    // For transformation of TSX and other react related bable plugins
    presets: [
        // Allows smart transpilation according to target environments
        ['@babel/preset-env', { modules: isTest ? 'commonjs' : false }],
        // Enabling Babel to understand TypeScript
        '@babel/preset-typescript',
    ],
}
