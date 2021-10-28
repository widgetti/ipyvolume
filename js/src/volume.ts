import * as widgets from "@jupyter-widgets/base";
import * as d3 from "d3";
import { max } from "lodash";
import * as THREE from "three";
import { FigureView } from "./figure.js";
import { createD3Scale } from "./scales.js";
import * as serialize from "./serialize.js";
import {semver_range} from "./utils";

const shaders = {
    box_fragment: (require("raw-loader!../glsl/box-fragment.glsl") as any).default,
    box_vertex: (require("raw-loader!../glsl/box-vertex.glsl") as any).default,
};

export
class VolumeView extends widgets.WidgetView {
    renderer: FigureView;
    attributes_changed: {};
    data: any[];
    data_shape: any[];
    texture_loader: THREE.TextureLoader;
    volume: any;
    texture_volume: THREE.DataTexture;
    render() {
        this.renderer = this.options.parent;
        this.attributes_changed = {};
        this.data = [];

        // window.last_volume_view = this;

        const render_size = this.renderer.getRenderSize();

        // this.box_material = new THREE.MeshLambertMaterial({color: 0xCC0000});

        this.texture_loader = new THREE.TextureLoader();

        // var update_volr_defines = () => {
        //     if(this.model.get('rendering_method') )
        //     this.box_material_volr.defines = {USE_LIGHTING: this.model.get('rendering_lighting')}
        //     //this.box_material_volr.defines['METHOD_' + this.model.get('rendering_method')] = true;
        //     //this.box_material_volr.defines['VOLUME_COUNT'] = 1
        //     this.box_material_volr.needsUpdate = true
        //     this.box_material_volr_depth.defines = {COORDINATE: true, USE_LIGHTING: this.model.get('rendering_lighting')}
        //     //this.box_material_volr_depth.defines['METHOD_' + this.model.get('rendering_method')] = true;
        //     this.box_material_volr_depth.needsUpdate = true;
        //     //this.box_material_volr_depth.defines['VOLUME_COUNT'] = 1
        // }

        this.tf_set();
        this.data_set();
        const update_rendering_method = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        this.model.on("change:rendering_method", update_rendering_method);
        // this.model.on('change:rendering_method change:rendering_lighting', update_volr_defines)
        update_rendering_method();

        this.model.on("change:data", this.data_set, this);

        const update_minmax = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        this.model.on("change:data_min change:data_max change:show_min change:show_max", update_minmax, this);
        update_minmax();

        const update_clamp = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        this.model.on("change:clamp_min change:clamp_max", update_clamp, this);
        update_clamp();

        const update_opacity_scale = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        update_opacity_scale();
        this.model.on("change:opacity_scale", update_opacity_scale);

        const update_lighting = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        update_lighting();
        this.model.on("change:lighting", update_lighting);

        const update_ray_steps = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        update_ray_steps();
        this.model.on("change:ray_steps", update_ray_steps);

        const update_brightness = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        update_brightness();
        this.model.on("change:brightness", update_brightness);

        this.model.on("change:tf", this.tf_set, this);

        this.model.on("change:extent", () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        });

        const on_change_material = () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        on_change_material();
        this.model.get('material').on("change", on_change_material);

        this.model.on("change:visible", () => {
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        });

        (window as any).last_volume = this; // for debugging purposes

    }

    get_ray_steps() {
        let ray_steps = this.model.get("ray_steps");
        if (ray_steps == null) {
            ray_steps = max(this.data_shape);
        }
        return ray_steps;
    }

    data_set() {
        this.volume = (this.model as VolumeModel).volume;
        this.texture_volume = (this.model as VolumeModel).texture_volume;
        this.data_shape = [this.volume.slice_shape[0], this.volume.slice_shape[1], this.volume.slices];
        this.renderer.rebuild_multivolume_rendering_material();
        this.renderer.update();
    }

    tf_set() {
        // TODO: remove listeners from previous
        if (this.model.get("tf")) {
            this.model.get("tf").on("change:rgba", this.tf_changed, this);
            this.tf_changed();
        }
    }

    tf_changed() {
        this.renderer.rebuild_multivolume_rendering_material();
        this.renderer.update();
    }

    set_scales(scales) {
        (this.model as VolumeModel).set_scales(scales);
    }

}

export
class VolumeModel extends widgets.WidgetModel {
    static serializers = {
        ...widgets.WidgetModel.serializers,
        tf: { deserialize: widgets.unpack_models },
        data: { serialize: (x) => x},
        material: { deserialize: widgets.unpack_models },
    };

    volume: any;
    texture_volume: THREE.DataTexture;
    uniform_volumes_values: {
        data_range?: any,
        show_range?: any,
        clamp_min?: any,
        clamp_max?: any,
        opacity_scale?: any,
        lighting?: any,
        brightness?: any,
        rows?: any,
        columns?: any,
        slices?: any,
        size?: any,
        slice_size?: any,
        scale?: any,
        offset?: any,
        diffuseColor?: any,
        specular?: any,
        shininess?: any,
        emissive?: any;
    };
    uniform_data: { type: string; value: any[]; };
    box_geo: THREE.BoxBufferGeometry;
    vol_box_mesh: THREE.Mesh;
    vol_box_geo: THREE.BoxBufferGeometry;
    box_material: THREE.ShaderMaterial;
    texture_tf: any;
    uniform_transfer_function: { type: string; value: any[]; };

    initialize(attributes: any, options: any) {
        super.initialize(attributes, options);
        const update_texture = () => {
            this.volume = this.get("data");
            if(!this.volume)
                return;
            const data = new Uint8Array(this.volume.tiles.buffer);
            this.texture_volume = new THREE.DataTexture(data, this.volume.image_shape[0], this.volume.image_shape[1],
                                                        THREE.RGBAFormat, THREE.UnsignedByteType);
            this.texture_volume.magFilter = THREE.LinearFilter;
            this.texture_volume.minFilter = THREE.LinearFilter;
            this.uniform_volumes_values.rows = this.volume.rows;
            this.uniform_volumes_values.columns = this.volume.columns;
            this.uniform_volumes_values.slices = this.volume.slices;
            this.uniform_volumes_values.size = this.volume.image_shape;
            this.uniform_volumes_values.slice_size = this.volume.slice_shape;
            this.uniform_volumes_values.data_range = [this.get("data_min"), this.get("data_max")];
            this.uniform_volumes_values.show_range = [this.get("show_min"), this.get("show_max")];
            this.texture_volume.needsUpdate = true; // without this it doesn't seem to work

            this.uniform_data.value = [this.texture_volume];
            this.uniform_data.value = [this.texture_volume];
        }
        this.on("change:data", () => {
            update_texture();
        })
        this.uniform_volumes_values = {};
        this.uniform_data = {type: "tv", value: []};
        update_texture();

        const update_minmax = () => {
            this.uniform_volumes_values.data_range = [this.get("data_min"), this.get("data_max")];
            this.uniform_volumes_values.show_range = [this.get("show_min"), this.get("show_max")];
        };
        this.on("change:data_min change:data_max change:show_min change:show_max", update_minmax, this);
        const update_clamp = () => {
            this.uniform_volumes_values.clamp_min = this.get("clamp_min");
            this.uniform_volumes_values.clamp_max = this.get("clamp_max");
        };
        this.on("change:clamp_min change:clamp_max", update_clamp, this);
        update_clamp();
        const update_opacity_scale = () => {
            this.uniform_volumes_values.opacity_scale = this.get("opacity_scale");
        };
        update_opacity_scale();
        this.on("change:opacity_scale", update_opacity_scale);
        const update_lighting = () => {
            this.uniform_volumes_values.lighting = this.get("lighting");
        };
        update_lighting();
        this.on("change:lighting", update_lighting);
        const update_brightness = () => {
            this.uniform_volumes_values.brightness = this.get("brightness");
        };
        update_brightness();
        this.on("change:brightness", update_brightness);
        const on_change_material = () => {
            const material = this.get('material').obj;
            const white = new THREE.Color('white');
            this.uniform_volumes_values.diffuseColor = material.color || white;
            this.uniform_volumes_values.specular = material.specular || white;
            this.uniform_volumes_values.shininess = material.shininess || white;
            this.uniform_volumes_values.emissive = material.emissive || white;
        };
        on_change_material();
        this.get('material').on("change", on_change_material);

        this.box_material = new THREE.ShaderMaterial({
            uniforms: {
                offset: { type: "3f", value: [0, 0, 0] },
                scale : { type: "3f", value: [1, 1, 1] },
            },
            fragmentShader: shaders.box_fragment,
            vertexShader: shaders.box_vertex,
            side: THREE.BackSide,
        });
        this.vol_box_mesh = new THREE.Mesh(this.vol_box_geo, this.box_material);
        this.vol_box_geo = new THREE.BoxBufferGeometry(1, 1, 1);
        //@ts-ignore
        this.vol_box_mesh.isVolume = true;
        // this.vol_box_mesh.position.z = -5;
        this.vol_box_mesh.updateMatrix();
        this.vol_box_mesh.matrixAutoUpdate = true;

        this.uniform_transfer_function = {type: "tv", value: []};
        this.on("change:tf", this.tf_set, this);
        this.tf_set();

    }
    tf_set() {
        // TODO: remove listeners from previous
        if (this.get("tf")) {
            this.get("tf").on("change:rgba", this.tf_changed, this);
            this.tf_changed();
        }
    }

    tf_changed() {
        const tf = this.get("tf");
        if (tf) {
            /*if(!this.texture_tf) {
                this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
            } else {
                this.texture_tf.image.data = tf.get_data_array()
                this.texture_tf.needsUpdate = true
            }*/
            this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").shape[0], 1, THREE.RGBAFormat, THREE.UnsignedByteType);
            this.texture_tf.needsUpdate = true; // without this it doesn't seem to work
            // this.box_material_volr.uniforms.transfer_function.value = [this.texture_tf]
            this.uniform_transfer_function.value = [this.texture_tf];
        }
    }
    is_max_intensity() {
        return this.get("rendering_method") === "MAX_INTENSITY";
    }

    is_normal() {
        return this.get("rendering_method") === "NORMAL";
    }
    set_scales(scales) {
        const sx = createD3Scale(scales.x).range([0, 1]);
        const sy = createD3Scale(scales.y).range([0, 1]);
        const sz = createD3Scale(scales.z).range([0, 1]);

        const extent = this.get("extent");

       // normalized coordinates of the corners of the box
        const x0n = sx(extent[0][0]);
        const x1n = sx(extent[0][1]);
        const y0n = sy(extent[1][0]);
        const y1n = sy(extent[1][1]);
        const z0n = sz(extent[2][0]);
        const z1n = sz(extent[2][1]);

        // clipped coordinates
        const cx0 = Math.max(x0n,  0);
        const cx1 = Math.min(x1n,  1);
        const cy0 = Math.max(y0n,  0);
        const cy1 = Math.min(y1n,  1);
        const cz0 = Math.max(z0n,  0);
        const cz1 = Math.min(z1n,  1);

        // the clipped coordinates back to world space, then normalized to extend
        // these are example calculations, the transform goes into scale and offset uniforms below
        // var cwx0 = (cx0 * dx + xlim[0] - extent[0][0])/(extent[0][1] - extent[0][0])
        // var cwx1 = (cx1 * dx + xlim[0] - extent[0][0])/(extent[0][1] - extent[0][0])

        // this.box_geo = new THREE.BoxBufferGeometry(cx1-cx0, cy1-cy0, cz1-cz0)
        // this.box_geo.translate((cx1-x0)/2, (cy1-cy0)/2, (cz1-cz0)/2)
        // this.box_geo.translate(cx0, cy0, cz0)
        // this.box_geo.translate(-0.5, -0.5, -0.5)
        this.box_geo = new THREE.BoxBufferGeometry(1, 1, 1);
        this.box_geo.translate(0.5, 0.5, 0.5);
        this.box_geo.scale((cx1 - cx0), (cy1 - cy0), (cz1 - cz0));
        this.box_geo.translate(cx0, cy0, cz0);
        this.box_geo.translate(-0.5, -0.5, -0.5);
        this.vol_box_mesh.geometry = this.box_geo;

        this.uniform_volumes_values.scale = [1 / (x1n - x0n), 1 / (y1n - y0n), 1 / (z1n - z0n)];
        this.uniform_volumes_values.offset = [-x0n, -y0n, -z0n];

    }
    add_to_scene(parent) {
        parent.add(this.vol_box_mesh);
    }

    remove_from_scene(parent) {
        parent.remove(this.vol_box_mesh);
    }
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "VolumeModel",
            _view_name : "VolumeView",
            _model_module : "ipyvolume",
            _view_module : "ipyvolume",
            _model_module_version: semver_range,
             _view_module_version: semver_range,
            sequence_index: 0,
            step_size: 0.01,
            opacity_scale: 1.0,
            brightness: 1.0,
            extent: null,
            lighting: true,
            rendering_method: "NORMAL",
            clamp_min: false,
            clamp_max: false,
            data_range: null,
            show_range: null,
            show_min: 0,
            show_max: 1,
            data_min: 0,
            data_max: 1,
            ray_steps: null,
            material: null, // TODO: this default does not match the one from the Python side
            visible: true,
        };
    }
}
