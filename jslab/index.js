var jupyter_volume = require('ipyvolume');
var jupyterlab_widgets = require('@jupyter-widgets/jupyterlab-manager');

module.exports = {
  id: 'jupyter.extensions.jupyter-volume',
  requires: [jupyterlab_widgets.INBWidgetExtension],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'ipyvolume',
          version: jupyter_volume.version,
          exports: jupyter_volume
      });
  },
  autoStart: true
};
