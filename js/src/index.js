// Entry point for the notebook bundle containing custom model definitions.
//
// Setup notebook base URL
//
// Some static assets may be required by the custom widget javascript. The base
// url for the notebook is not known at build time and is therefore computed
// dynamically.
// __webpack_public_path__ = document.querySelector('body').getAttribute('data-base-url') + 'nbextensions/ipyvolume/';

// Export widget models and views, and the npm package version number.
// module.exports = _.extend({}, require('./figure.js'), require('./tf.js'), require('./scatter.js'), require('./volume.js'), require('./mesh.js'), require('./utils.js'));
export * from './figure';
export * from './tf';
export * from './scatter';
export * from './volume';
export * from './mesh';
export * from './utils';
export * from './selectors';
export * from './values';
export
const version = require('../package.json').version;
