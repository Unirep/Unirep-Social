const path = require('path')

module.exports = {
    mode: 'production',
    target: 'node',
    entry: {
        main: './src/app.ts',
    },
    output: {
        path: path.resolve(__dirname, './build'),
        filename: '[name]-bundle.js', // <--- Will be compiled to this single file
        libraryTarget: 'commonjs',
    },
    externals: {
        sqlite3: 'commonjs sqlite3',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            'pg-native': false,
        },
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                exclude: /node_modules|test|mapbox/,
                loader: 'ts-loader',
            },
        ],
    },
}
