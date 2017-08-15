var version = require('./package.json').version;

// Custom webpack loaders are generally the same for all webpack bundles, hence
// stored in a separate local variable.
var loaders = [
    { test: /\.css$/, loaders: ['style-loader', 'css-loader']},
    { test: /\.json$/, loader: 'json-loader' },
    {test: /\.png$/,loader: 'url-loader?limit=10000000'}
];


module.exports = [
    {// Notebook extension
     //
     // This bundle only contains the part of the JavaScript that is run on
     // load of the notebook. This section generally only performs
     // some configuration for requirejs, and provides the legacy
     // "load_ipython_extension" function which is required for any notebook
     // extension.
     //
        entry: './src/extension.js',
        output: {
            filename: 'extension.js',
            path: '../ipyvolume/static',
            libraryTarget: 'amd'
        }
    },
    {// Bundle for the notebook containing the custom widget views and models
     //
     // This bundle contains the implementation for the custom widget views and
     // custom widget.
     // It must be an amd module
     //
        entry: './src/index.js',
        output: {
            filename: 'index.js',
            path: '../ipyvolume/static',
            libraryTarget: 'amd'
        },
        devtool: 'source-map',
        module: {
            loaders: loaders
        },
        externals: ['three', 'jupyter-js-widgets', '@jupyter-widgets/base', '@jupyter-widgets/controls']
    },
    {// Embeddable ipyvolume bundle
     //
     // This bundle is generally almost identical to the notebook bundle
     // containing the custom widget views and models.
     //
     // The only difference is in the configuration of the webpack public path
     // for the static assets.
     //
     // It will be automatically distributed by unpkg to work with the static
     // widget embedder.
     //
     // The target bundle is always `dist/index.js`, which is the path required
     // by the custom widget embedder.
     //
        entry: './src/embed.js',
        output: {
            filename: 'index.js',
            path: './dist/',
            libraryTarget: 'amd',
            publicPath: 'https://unpkg.com/ipyvolume@' + version + '/dist/'
        },
        devtool: 'source-map',
        module: {
            loaders: loaders
        },
        externals: ['jupyter-js-widgets', '@jupyter-widgets/base', '@jupyter-widgets/controls']
    },
    {
        entry: 'three',
        output: {
            filename: 'three.js',
            path: '../ipyvolume/static',
            libraryTarget: 'amd'
        },
        devtool: 'source-map',
        module: {
            loaders: loaders
        }
    },
];
