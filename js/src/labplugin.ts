import * as base from "@jupyter-widgets/base";
import * as jupyter_volume from "./index";
import {semver_range} from "./utils";

const plugin = {
  id: "ipyvolume",
  requires: [base.IJupyterWidgetRegistry as any],
  activate(app, widgets) {
      widgets.registerWidget({
          name: "ipyvolume",
          version: semver_range,
          exports: jupyter_volume,
      });
  },
  autoStart: true,
};

export default plugin;
