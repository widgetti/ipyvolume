// Karma configuration
// Generated on Wed Jun 20 2018 16:46:14 GMT+0200 (CEST)
var webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'sinon'],
    files: [
        {pattern: 'test/**/*.ts'},
    ],
    exclude: ['**/embed.js'],
    preprocessors: {
        'test/**/*.ts': [ 'webpack']
    },
    webpack: {
      module: webpackConfig[1].module,
      resolve: webpackConfig[1].resolve,
    },
    mime: {
      'text/x-typescript':  ['ts']
    },
    reporters: ['progress'],
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