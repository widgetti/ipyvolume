import * as widgets from "@jupyter-widgets/base";
import { max } from "lodash";
import * as THREE from "three";
import { FigureView } from "./figure.js";
import * as serialize from "./serialize.js";
import {semver_range} from "./utils";

const shaders = {
    box_fragment: require("raw-loader!../glsl/box-fragment.glsl"),
    box_vertex: require("raw-loader!../glsl/box-vertex.glsl"),
};

export
class VolumeView extends widgets.WidgetView {
    renderer: FigureView;
    attributes_changed: {};
    data: any[];
    data_shape: any[];
    vol_box_geo: THREE.BoxBufferGeometry;
    box_material: THREE.ShaderMaterial;
    vol_box_mesh: THREE.Mesh;
    texture_loader: THREE.TextureLoader;
    texture_tf: any;
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
    };
    uniform_data: { type: string; value: any[]; };
    uniform_transfer_function: { type: string; value: any[]; };
    volume: any;
    texture_volume: THREE.DataTexture;
    box_geo: THREE.BoxBufferGeometry;
    render() {
        this.renderer = this.options.parent;
        this.attributes_changed = {};
        this.data = [];

        // window.last_volume_view = this;

        const render_size = this.renderer.getRenderSize();

        this.vol_box_geo = new THREE.BoxBufferGeometry(1, 1, 1);
        // this.box_material = new THREE.MeshLambertMaterial({color: 0xCC0000});
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
        // this.vol_box_mesh.position.z = -5;
        this.vol_box_mesh.updateMatrix();
        this.vol_box_mesh.matrixAutoUpdate = true;

        this.texture_loader = new THREE.TextureLoader();

        this.texture_tf = null; // new THREE.DataTexture(null, this.model.get("tf").get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)

        this.uniform_volumes_values = {};
        this.uniform_data = {type: "tv", value: []};
        this.uniform_transfer_function = {type: "tv", value: []};

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

        this.add_to_scene();

        this.model.on("change:data", this.data_set, this);

        const update_minmax = () => {
            this.uniform_volumes_values.data_range = [this.model.get("data_min"), this.model.get("data_max")];
            this.uniform_volumes_values.show_range = [this.model.get("show_min"), this.model.get("show_max")];
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        this.model.on("change:data_min change:data_max change:show_min change:show_max", update_minmax, this);
        update_minmax();

        const update_clamp = () => {
            this.uniform_volumes_values.clamp_min = this.model.get("clamp_min");
            this.uniform_volumes_values.clamp_max = this.model.get("clamp_max");
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        this.model.on("change:clamp_min change:clamp_max", update_clamp, this);
        update_clamp();

        const update_opacity_scale = () => {
            this.uniform_volumes_values.opacity_scale = this.model.get("opacity_scale");
            this.renderer.rebuild_multivolume_rendering_material();
            this.renderer.update();
        };
        update_opacity_scale();
        this.model.on("change:opacity_scale", update_opacity_scale);

        const update_lighting = () => {
            this.uniform_volumes_values.lighting = this.model.get("lighting");
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
            this.uniform_volumes_values.brightness = this.model.get("brightness");
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

        (window as any).last_volume = this; // for debugging purposes

    }

    get_ray_steps() {
        let ray_steps = this.model.get("ray_steps");
        if (ray_steps == null) {
            ray_steps = max(this.data_shape);
        }
        return ray_steps;
    }

    is_max_intensity() {
        return this.model.get("rendering_method") === "MAX_INTENSITY";
    }

    is_normal() {
        return this.model.get("rendering_method") === "NORMAL";
    }

    data_set() {
        this.volume = this.model.get("data");
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
        this.uniform_data.value = [this.texture_volume];
        this.uniform_data.value = [this.texture_volume];
        this.uniform_volumes_values.data_range = [this.model.get("data_min"), this.model.get("data_max")];
        this.uniform_volumes_values.show_range = [this.model.get("show_min"), this.model.get("show_max")];
        this.texture_volume.needsUpdate = true; // without this it doesn't seem to work
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
        const tf = this.model.get("tf");
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
        this.renderer.rebuild_multivolume_rendering_material();
        this.renderer.update();
    }

    set_limits(limits) {
        const xlim = limits.xlim;
        const ylim = limits.ylim;
        const zlim = limits.zlim;
        const dx = (xlim[1] - xlim[0]);
        const dy = (ylim[1] - ylim[0]);
        const dz = (zlim[1] - zlim[0]);

        const extent = this.model.get("extent");

       // normalized coordinates of the corners of the box
        const x0n = (extent[0][0] - xlim[0]) / dx;
        const x1n = (extent[0][1] - xlim[0]) / dx;
        const y0n = (extent[1][0] - ylim[0]) / dy;
        const y1n = (extent[1][1] - ylim[0]) / dy;
        const z0n = (extent[2][0] - zlim[0]) / dz;
        const z1n = (extent[2][1] - zlim[0]) / dz;

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

    add_to_scene() {
        this.renderer.scene_volume.add(this.vol_box_mesh);
    }

    remove_from_scene() {
        this.renderer.scene_volume.remove(this.vol_box_mesh);
    }
}

export
class VolumeModel extends widgets.WidgetModel {
    static serializers = {
        ...widgets.WidgetModel.serializers,
        tf: { deserialize: widgets.unpack_models },
        data: { serialize: (x) => x},
    };
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
        };
    }
}
