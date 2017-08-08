// Entry point for the unpkg bundle containing custom model definitions.
//
// It differs from the notebook bundle in that it does not need to define a
// dynamic baseURL for the static assets and may load some css that would
// already be loaded by the notebook otherwise.

// Export widget models and views, and the npm package version number.
var _ = require('underscore')
// Export widget models and views, and the npm package version number.
module.exports = _.extend({}, require('./figure.js'), require('./tf.js'), require('./scatter.js'),  require('./mesh.js'), require('./utils.js'), require('./media.js'));
module.exports['version'] = require('../package.json').version;
