module.exports = {
    target: 'electron-renderer',
    output: {
        globalObject: 'globalThis'
    },
    externals: {
        'express-pouchdb': 'commonjs express-pouchdb',
        'sharp': 'commonjs sharp'
    },
    resolve: {
        fallback: {
            buffer: require.resolve('buffer'),
            querystring: require.resolve('querystring-es3'),
            url: require.resolve('url')
        }
    }
};
