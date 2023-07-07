// var exports = module.exports = {};
import * as widgets from "@jupyter-widgets/base";
import {default as ndarray_pack} from "ndarray-pack";
import * as serialize from "./serialize.js";
import {semver_range} from "./utils";
import _ from "underscore";
import * as THREE from "three";

export
class TransferFunctionView extends widgets.DOMWidgetView {
    img: HTMLImageElement;
    render() {
        this.img = document.createElement("img");
        this.img.setAttribute("src", this.model.get("rgba"));
        this.img.setAttribute("style", this.model.get("style"));
        this.model.on("change:rgba", function() {
            this.img.setAttribute("src", this.model.get("rgba"));
        }, this);
        this.model.on("change:style", function() {
            this.img.setAttribute("style", this.model.get("style"));
        }, this);
        this.el.appendChild(this.img);
    }
}

export
class TransferFunctionModel extends widgets.DOMWidgetModel {

    static serializers = {
        ...widgets.WidgetModel.serializers,
        rgba: serialize.ndarray,
    };
    defaults() {
        return  {
            ...super.defaults(),
            _model_name : "TransferFunctionModel",
            _view_name : "TransferFunctionView",
            _model_module : "ipyvolume",
            _view_module : "ipyvolume",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            rgba: null,
        };
    }

    get_data_array() {
        const flat_array = [];
        const rgba = this.get("rgba");
        for (let i = 0; i < rgba.shape[0]; i++) {
            for (let j = 0; j < 4; j++) {
              flat_array.push(rgba.get(i, j) * 255);
            }
        }
        const transfer_function_uint8_array = new Uint8Array(flat_array);
        // REMOVE: for debugging
        // window.transfer_function_uint8_array = transfer_function_uint8_array
        // window.flat_array = flat_array
        return transfer_function_uint8_array;
    }
}

export
class TransferFunctionJsBumpsModel extends TransferFunctionModel {

    constructor(...args) {
        super(...args);
        this.on("change:levels", this.recalculate_rgba, this);
        this.on("change:opacities", this.recalculate_rgba, this);
        this.on("change:widths", this.recalculate_rgba, this);
        this.recalculate_rgba();
    }
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "TransferFunctionJsBumpsModel",
            levels: [0.1, 0.5, 0.8],
            opacities: [0.01, 0.05, 0.1],
            widths: [0.1, 0.1, 0.1],
        };
    }

    recalculate_rgba() {
        const rgba = [];
        const colors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const levels = this.get("levels");
        const widths = this.get("widths");
        const opacities = this.get("opacities");
        (window as any).rgba = rgba;
        (window as any).tfjs = this;
        const N = 256;
        for (let i = 0; i < N; i++) {
            const x = i / (N - 1);
            const color = [0, 0, 0, 0]; // red, green, blue and alpha
            for (let j = 0; j < levels.length; j++) {
                const basecolor = colors[j];
                const intensity = Math.exp(-(Math.pow(x - levels[j], 2) / Math.pow(widths[j], 2)));
                for (let k = 0; k < 3; k++) {
                  color[k] += (basecolor[k] * intensity * opacities[j]);
                }
                color[3] += intensity * opacities[j];
            }
            let max_value = color[0];
            for (let k = 1; k < 3; k++) {
                max_value = Math.max(max_value, color[k]);
            }
            for (let k = 0; k < 3; k++) {
                color[k] = Math.min(1, color[k] / max_value); // normalize and clip to 1
            }
            color[3] = Math.min(1, color[3]); // clip alpha
            rgba.push(color);
        }
        this.set("rgba", rgba);
        this.save_changes();
    }
}

export
class TransferFunctionDiscreteModel extends TransferFunctionModel {

    constructor(...args) {
        super(...args);
        this.on("change:colors", this.recalculate_rgba, this);
        this.on("change:opacities", this.recalculate_rgba, this);
        this.on("change:enabled", this.recalculate_rgba, this);
        this.recalculate_rgba();
    }
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "TransferFunctionDiscreteModel",
            color: ["red", "#0f0"],
            opacities: [0.01, 0.01],
            enabled: [true, true],
        };
    }

    recalculate_rgba() {
        const rgba = [];
        const colors = _.map(this.get("colors"), (color : string) => {
            return (new THREE.Color(color)).toArray();
        });
        const enabled = this.get("enabled");
        const opacities = this.get("opacities");
        (window as any).rgba = rgba;
        (window as any).tfjs = this;
        const N = colors.length;
        for (let i = 0; i < N; i++) {
            const color = [...colors[i], opacities[i]]; // red, green, blue and alpha
            color[3] = Math.min(1, color[3]); // clip alpha
            if(!enabled[i]) {
                color[3] = 0;
            }
            rgba.push(color);
        }
        // because we want the shader to sample the center pixel, if we add one extra pixel in the texture
        // all samples should be shiften by epsilon so the sample the center of the transfer function
        rgba.push([0, 0, 0, 0]);
        const rgba_array = ndarray_pack(rgba);
        this.set("rgba", rgba_array);
        this.save_changes();
    }
}

export
class TransferFunctionWidgetJs3Model extends TransferFunctionModel {

    constructor(...args) {
        super(...args);
        this.on("change:level1", this.recalculate_rgba, this);
        this.on("change:level2", this.recalculate_rgba, this);
        this.on("change:level3", this.recalculate_rgba, this);
        this.on("change:opacity1", this.recalculate_rgba, this);
        this.on("change:opacity2", this.recalculate_rgba, this);
        this.on("change:opacity3", this.recalculate_rgba, this);
        this.on("change:width1", this.recalculate_rgba, this);
        this.on("change:width2", this.recalculate_rgba, this);
        this.on("change:width3", this.recalculate_rgba, this);
        this.recalculate_rgba();
    }
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "TransferFunctionWidgetJs3Model",
            level1: 0.1,
            level2: 0.5,
            level3: 0.8,
            opacity1: 0.01,
            opacity2: 0.05,
            opacity3: 0.1,
            width1: 0.1,
            width2: 0.1,
            width3: 0.1,
        };
    }

    recalculate_rgba() {
        let rgba = [];
        const colors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const levels = [this.get("level1"), this.get("level2"), this.get("level3")];
        const widths = [this.get("width1"), this.get("width2"), this.get("width3")];
        const opacities = [this.get("opacity1"), this.get("opacity2"), this.get("opacity3")];
        const N = 256;
        for (let i = 0; i < N; i++) {
            const x = i / (N - 1);
            const color = [0, 0, 0, 0]; // red, green, blue and alpha
            for (let j = 0; j < 3; j++) {
                const basecolor = colors[j];
                const intensity = Math.exp(-(Math.pow(x - levels[j], 2) / Math.pow(widths[j], 2)));
                for (let k = 0; k < 3; k++) {
                    color[k] += (basecolor[k] * intensity * opacities[j]);
                }
                color[3] += intensity * opacities[j];
            }
            let max_value = color[0];
            for (let k = 1; k < 3; k++) {
                max_value = Math.max(max_value, color[k]);
            }
            for (let k = 0; k < 3; k++) {
                color[k] = Math.min(1, color[k] / max_value); // normalize and clip to 1
            }
            color[3] = Math.min(1, color[3]); // clip alpha
            rgba.push(color);
        }
        rgba = ndarray_pack(rgba);
        this.set("rgba", rgba);
        this.save_changes();
    }
}
