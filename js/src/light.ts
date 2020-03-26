import * as widgets from "@jupyter-widgets/base";
import { isArray, isNumber } from "lodash";
import * as THREE from "three";
import { FigureView } from "./figure";
import * as serialize from "./serialize.js";
import { semver_range } from "./utils";
import * as values from "./values.js";
import { randomBates } from "d3";


export
class LightView extends widgets.WidgetView {

    LIGHT_TYPES: any;
    renderer: FigureView;
    lights: any;
    current_light: any;
    color: any;
    intensity: any;
    light_type: any;
    
    render() {

        this.LIGHT_TYPES = {
            AMBIENTAL: 'AMBIENTAL',
            DIRECTIONAL: 'DIRECTIONAL',
            SPOT: 'SPOT',
            POINT: 'POINT',
            HEMISPHERE: 'HEMISPHERE'
        };
        this.renderer = this.options.parent;

        this.model.on("change:color",
        this.on_change, this);

        console.log(this.LIGHT_TYPES);
        this.create_light();
        this.add_to_scene();
    }

    on_change(attribute) {
        for (const key of this.model.changedAttributes()) {
            console.log("changed " +key);
        }
    }

    add_to_scene() {
        this.lights.forEach((light) => {
            this.renderer.scene_scatter.add(light);
        });
        
    }

    remove_from_scene() {
        this.lights.forEach((light) => {
            this.renderer.scene_scatter.remove(light);
        });
        
    }

    create_light() {
        this.lights = [];

        this.color = this.model.get("color");
        this.intensity = this.model.get("intensity");
        this.light_type = this.model.get("light_type");
        
        if(this.light_type === this.LIGHT_TYPES.AMBIENTAL){
            console.log("Create Ambient Light w color " + this.color + " intensity : " + this.intensity);
            this.current_light = new THREE.AmbientLight(this.color, this.intensity);
            this.lights.push(this.current_light);
        }
        
    }
}

export
class LightModel extends widgets.WidgetModel {
    static serializers = {
        ...widgets.WidgetModel.serializers,
        color: serialize.color_or_json,
        intensity: serialize.array_or_json,
    };
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "LightModel",
            _view_name : "LightView",
            _model_module : "ipyvolume",
            _view_module : "ipyvolume",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            color: "red",
            intensity: 1,
            light_type: 'AMBIENTAL',
        };
    }
}
