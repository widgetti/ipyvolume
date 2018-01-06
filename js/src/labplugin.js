var jupyter_volume = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'ipyvolume',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'ipyvolume',
          version: jupyter_volume.version,
          exports: jupyter_volume
      });
  },
  autoStart: true
};

