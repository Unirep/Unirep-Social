const HtmlWebpackPlugin = require('html-webpack-plugin')
// const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const webpack = require('webpack')

module.exports = {
    entry: ['./src/index.tsx'],
    mode: 'development',
    devServer: {
        port: 3000,
        // proxy: {
        //     '/api': {
        //         target: 'http://localhost:3000',
        //         router: () => 'http://localhost:3001',
        //     },
        // },
        historyApiFallback: true,
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: '/',
    },
    resolve: {
        extensions: ['*', '.js', '.ts', '.tsx', '.json', '.scss'],
        fallback: {
            crypto: require.resolve('crypto-browserify'),
            assert: require.resolve('assert/'),
            stream: require.resolve('stream-browserify'),
            os: require.resolve('os-browserify/browser'),
            fs: false,
            dotenv: false,
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-react'],
                        },
                    },
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-react'],
                },
            },
            {
                test: /\.(png|jpg|gif|svg|ico)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            esModule: false,
                            limit: 8192,
                        },
                    },
                ],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
            },
            {
                test: /\.(css)$/,
                // exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'public/index.html',
            filename: 'index.html',
            inlineSource: '.(js|css)',
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        }),
        // new HtmlWebpackInlineSourcePlugin(),
        new webpack.DefinePlugin({
            'process.env': {},
            'process.argv': [],
            'process.versions': {},
            'process.versions.node': '"12"',
            process: {
                exit: '(() => {})',
                browser: true,
                versions: {},
                cwd: '(() => "")',
            },
        }),
        new webpack.ProvidePlugin({
            Buffer: path.resolve(__dirname, 'externals', 'buffer.js'),
        }),
        new webpack.ContextReplacementPlugin(/\/keyv\//, (data) => {
            delete data.dependencies[0].critical
            return data
        }),
        new webpack.ContextReplacementPlugin(/\/maci\-crypto\//, (data) => {
            delete data.dependencies[0].critical
            return data
        }),
    ],
    optimization: {
        // minimizer: [
        //   `...`,
        //   new CssMinimizerPlugin(),
        // ],
    },
}
