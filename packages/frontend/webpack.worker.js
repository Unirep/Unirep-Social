const path = require('path')

module.exports = {
    entry: './worker/index.js',
    // use production to avoid eval()
    mode: 'production',
    target: 'webworker',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        publicPath: '/',
    },
    resolve: {},
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
            },
        ],
    },
    optimization: {},
}
