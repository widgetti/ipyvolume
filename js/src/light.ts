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
    color2: any;
    intensity: any;
    light_type: any;
    cast_shadow: any;
    position: any;
    target: any;
    
    render() {

        this.LIGHT_TYPES = {
            AMBIENT: 'AMBIENT',
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
        //no shadow support
        if(this.light_type === this.LIGHT_TYPES.AMBIENT){
            console.log("Create Ambient Light w color " + this.color + " intensity : " + this.intensity);
            this.current_light = new THREE.AmbientLight(this.color, this.intensity);
            this.lights.push(this.current_light);
        }
        else{
            this.position = new THREE.Vector3(this.model.get("position_x"), this.model.get("position_y"), this.model.get("position_z"));
            
            //no shadow support
            if(this.light_type === this.LIGHT_TYPES.HEMISPHERE) {
                this.color2 = this.model.get("color2");
                console.log("Create Hemisphere Light w color " + this.color + " color2 " + this.color2 +" "+ " intensity : " + this.intensity);

                this.current_light = new THREE.HemisphereLight(this.color, this.color2, this.intensity);
                this.current_light.position.set(this.position.x, this.position.y, this.position.z);
                this.lights.push(this.current_light);
            }
            else {
                //with shadow support
                this.cast_shadow = this.model.get("cast_shadow");

                //this.target = new THREE.Vector3(this.model.get("target_x"), this.model.get("target_y"), this.model.get("target_z"));

                if(this.light_type === this.LIGHT_TYPES.DIRECTIONAL){
                    console.log("Create Directional Light w color " + this.color + " intensity : " + this.intensity + " position :"+ this.position + " cast_shadow: " + this.cast_shadow);
                    this.current_light = new THREE.DirectionalLight(this.color, this.intensity);
                
                    this.current_light.position.set(this.position.x, this.position.y, this.position.z);
                    this.current_light.cast_shadow = this.cast_shadow;
                    this.lights.push(this.current_light);
                }
            }
        } 

        
    }
}

export
class LightModel extends widgets.WidgetModel {
    static serializers = {
        ...widgets.WidgetModel.serializers,
        color: serialize.color_or_json,
        color2: serialize.color_or_json,
        intensity: serialize.array_or_json,
        position_x: serialize.array_or_json,
        position_y: serialize.array_or_json,
        position_z: serialize.array_or_json,
        //target_x: serialize.array_or_json,
        //target_y: serialize.array_or_json,
        //target_z: serialize.array_or_json,
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
            color2: "white",
            intensity: 1,
            light_type: 'AMBIENT',
            cast_shadow: false,
            position_x: 0,
            position_y: 1,
            position_z: 0,
            //target_x: 0,
            //target_y: 0,
            //target_z: 0,
        };
    }
}
