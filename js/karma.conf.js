// Karma configuration
// Generated on Wed Jun 20 2018 16:46:14 GMT+0200 (CEST)
var webpackConfig = require('./webpack.config.js');
var webpack = require('webpack');
webpackConfig[1].module.rules.push(
    { test: /\.(ts)?$/, use: [ { loader: "ts-loader", options: { transpileOnly: true, } } ] }
)

// console.log(webpackConfig[1].module.rules)


module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'chai', 'sinon'],
        files: [
            // we use 1 bundle for testing
            { pattern: 'test/index.ts' },
        ],
        exclude: ['**/embed.js'],
        preprocessors: {
            // the bundle goes through webpack, and will emit (inline) source maps, which karma needs to read again
            'test/index.ts': ['webpack', 'sourcemap'],
        },
        webpack: {
            module: {
                rules: webpackConfig[1].module.rules
            },
            // source mapping without inline does not seem to work
            devtool: 'inline-source-map',
            mode: 'development',
            resolve: {
                extensions: ['.ts', '.js']
            },
        },
        reporters: ['progress', 'mocha'],
        port: 9876,
        colors: true,
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,
        autoWatch: true,
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['HeadlessChrome'],
        customLaunchers: {
            HeadlessChrome: {
                base: 'Chrome',
                flags: ['--headless', '--disable-gpu', '--remote-debugging-port=9222']
            }
        },
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,
        // how many browser should be started simultaneous
        concurrency: Infinity
    })
}
