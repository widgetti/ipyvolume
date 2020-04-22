import * as base from "@jupyter-widgets/base";
import * as jupyter_volume from "./index";

const plugin = {
  id: "ipyvolume",
  requires: [base.IJupyterWidgetRegistry],
  activate(app, widgets) {
      widgets.registerWidget({
          name: "ipyvolume",
          version: jupyter_volume.version,
          exports: jupyter_volume,
      });
  },
  autoStart: true,
};

export default plugin;
