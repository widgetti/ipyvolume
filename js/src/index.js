// Entry point for the notebook bundle containing custom model definitions.
//
// Setup notebook base URL
//
// Some static assets may be required by the custom widget javascript. The base
// url for the notebook is not known at build time and is therefore computed
// dynamically.
__webpack_public_path__ = document.querySelector('body').getAttribute('data-base-url') + 'nbextensions/ipyvolume/';

var _ = require('underscore')
// Export widget models and views, and the npm package version number.
module.exports = _.extend({}, require('./figure.js'), require('./tf.js'), require('./scatter.js'), require('./mesh.js'), require('./utils.js'));
module.exports['version'] = require('../package.json').version;
module.exports.mqtt = require('mqtt')
