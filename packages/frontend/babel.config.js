// //Need to convert modules to commonjs format so Jest can undertstand them.
// const isTest = String(process.env.NODE_ENV) === 'test'
// const isProd = String(process.env.NODE_ENV) === 'production'

module.exports = {
    // For transformation of TSX and other react related bable plugins
    presets: [
        ['@babel/preset-env', {
            targets: { esmodules: false, node: "current" }
        }], '@babel/preset-react',
        // Enabling Babel to understand TypeScript
        '@babel/preset-typescript'
    ],
}
