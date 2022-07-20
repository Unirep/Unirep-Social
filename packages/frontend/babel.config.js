module.exports = {
    // For transformation of TSX and other react related bable plugins
    presets: [
        [
            '@babel/preset-env',
            {
                targets: { esmodules: false, node: 'current' },
            },
        ],
        ['@babel/preset-react', { runtime: 'automatic' }],
        // Enabling Babel to understand TypeScript
        '@babel/preset-typescript',
    ],
}
