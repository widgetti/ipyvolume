import * as widgets from "@jupyter-widgets/base";
import { isArray, isNumber } from "lodash";
import * as THREE from "three";
import { FigureView } from "./figure";
import * as serialize from "./serialize.js";
import { semver_range } from "./utils";
import * as values from "./values.js";

export
class MeshView extends widgets.WidgetView {
    renderer: FigureView;
    previous_values: any;
    attributes_changed: any;
    meshes: any;

    uniforms: any;
    surface_mesh: any;
    line_segments: any;

    material: any;
    material_rgb: any;
    line_material: any;
    line_material_rgb: any;
    materials: any;

    texture_loader: any;
    textures: any;
    texture_video: any;

    LIGHTING_MODELS: any;

    lighting_model: any;
    diffuse_color : any;
    opacity : any;
    specular_color : any;
    shininess : any;
    emissive_color : any;
    emissive_intensity : any;
    roughness : any;
    metalness : any;
    cast_shadow : any;
    receive_shadow : any;

    render() {
        // console.log("created mesh view, parent is")
        // console.log(this.options.parent)

        this.LIGHTING_MODELS = {
            DEFAULT: 'DEFAULT',
            LAMBERT: 'LAMBERT',
            PHONG: 'PHONG',
            PHYSICAL : 'PHYSICAL'
        };

        this.renderer = this.options.parent;
        this.previous_values = {};
        this.attributes_changed = {};
        (window as any).last_mesh_view = this;
        this.meshes = [];
        this.texture_loader = new THREE.TextureLoader();
        this.textures = null;
        if (this.model.get("texture")) {
            this._load_textures();
        }

        this.uniforms = THREE.UniformsUtils.merge( [
            {
                xlim : { type: "2f", value: [0., 1.] },
                ylim : { type: "2f", value: [0., 1.] },
                zlim : { type: "2f", value: [0., 1.] },
                // tslint:disable-next-line: object-literal-sort-keys
                animation_time_x : { type: "f", value: 1. },
                animation_time_y : { type: "f", value: 1. },
                animation_time_z : { type: "f", value: 1. },
                animation_time_u : { type: "f", value: 1. },
                animation_time_v : { type: "f", value: 1. },
                animation_time_color : { type: "f", value: 1. },
                animation_time_texture : { type: "f", value: 1. },
                texture: { type: "t", value: null },
                texture_previous: { type: "t", value: null },
            },
            THREE.UniformsLib[ "common" ],
            THREE.UniformsLib[ "lights" ],
            {
                emissive: { value: new THREE.Color( 0x000000 ) },
                emissiveIntensity: { value: 1 },
                specular: { value: new THREE.Color( 0xffffff ) },
                shininess: { value: 0 },
                roughness: { value: 0.0 },
                metalness: { value: 0.0 },
            },
            
        ] );

        const get_material = (name)  => {
            if (this.model.get(name)) {
                return this.model.get(name).obj.clone();
            } else {
                const mat = new THREE.ShaderMaterial();
                mat.side = THREE.DoubleSide;
                mat.needsUpdate = true;

                return mat;
            }

        };
        this.material = get_material("material");
        this.material_rgb = get_material("material");
        this.line_material = get_material("line_material");
        this.material.polygonOffset = true;
        this.material.polygonOffsetFactor = 1;
        this.material.polygonOffsetUnits = 0.1;
        // this.material.depthFunc = THREE.LessEqualDepth
        this.line_material_rgb = get_material("line_material");
        this.materials = [this.material, this.material_rgb, this.line_material, this.line_material_rgb];
        this._update_materials();
        if (this.model.get("material")) {
            this.model.get("material").on("change", () => {
                this._update_materials();
            });
        }
        if (this.model.get("line_material")) {
            this.model.get("line_material").on("change", () => {
                this._update_materials();
            });
        }

        this.create_mesh();
        this.add_to_scene();
        
        this.model.on("change:color change:sequence_index change:x change:y change:z change:v change:u change:triangles change:lines",
            this.on_change, this);
        this.model.on("change:geo change:connected", this.update_, this);
        this.model.on("change:texture", this._load_textures, this);
        this.model.on("change:visible", this._update_materials, this);
        this.model.on("change:lighting_model change:opacity change:specular_color change:shininess change:emissive_color change:emissive_intensity change:roughness change:metalness change:cast_shadow change:receive_shadow", 
        this._update_materials, this);
    }

    public force_lighting_model() {
        if(this.lighting_model === this.LIGHTING_MODELS.DEFAULT){
            this.model.set("lighting_model", this.LIGHTING_MODELS.PHYSICAL);
            this._update_materials();
        }
    }

    public _load_textures() {
        const texture = this.model.get("texture");
        if (texture.stream) { // instanceof media.MediaStreamModel) {
            this.textures = null;
            this.texture_video = document.createElement("video");
            texture.stream.then((stream) => {
                this.texture_video.srcObject = stream;
                this.texture_video.play();
                const threejs_texture = new THREE.VideoTexture(this.texture_video);
                // texture.wrapS = THREE.RepeatWrapping;
                // texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                // texture.wrapT = THREE.RepeatWrapping;
                this.textures = [texture];
                this._update_materials();
                this.update_();
            });
        } else {
            this.textures = this.model.get("texture").map((texture_url) =>
                this.texture_loader.load(texture_url, (threejs_texture) => {
                    threejs_texture.wrapS = THREE.RepeatWrapping;
                    threejs_texture.wrapT = THREE.RepeatWrapping;
                    this._update_materials();
                    this.update_();
                }),
            );
        }
    }

    set_limits(limits) {
        for (const key of Object.keys(limits)) {
            this.material.uniforms[key].value = limits[key];
        }
    }

    add_to_scene() {
        this.cast_shadow = this.model.get("cast_shadow");
        this.receive_shadow = this.model.get("receive_shadow");

        this.meshes.forEach((mesh) => {
            mesh.castShadow = this.cast_shadow;
            mesh.receiveShadow = this.receive_shadow;
            this.renderer.scene_scatter.add(mesh);
        });
    }

    update_shadow() {
        this.cast_shadow = this.model.get("cast_shadow");
        this.receive_shadow = this.model.get("receive_shadow");
        this.meshes.forEach((mesh) => {
            mesh.castShadow = this.cast_shadow;
            mesh.receiveShadow = this.receive_shadow;
        });
    }

    remove_from_scene() {
        this.meshes.forEach((mesh) => {
            this.renderer.scene_scatter.remove(mesh);
            mesh.geometry.dispose();
        });
    }

    on_change(attribute) {
        for (const key of this.model.changedAttributes()) {
            // console.log("changed " +key)
            this.previous_values[key] = this.model.previous(key);
            // attributes_changed keys will say what needs to be animated, it's values are the properties in
            // this.previous_values that need to be removed when the animation is done
            // we treat changes in _selected attributes the same
            const key_animation = key.replace("_selected", "");
            if (key_animation === "sequence_index") {
                const animated_by_sequence = ["x", "y", "z", "u", "v", "color"];
                animated_by_sequence.forEach((name) => {
                    if (isArray(this.model.get(name)) && this.model.get(name).length > 1) {
                        this.attributes_changed[name] = [name, "sequence_index"];
                    }
                });
                this.attributes_changed.texture = ["texture", "sequence_index"];
            } else if (key_animation === "triangles") {
                // direct change, no animation
            } else if (key_animation === "lines") {
                // direct change, no animation
            } else if (key_animation === "selected") { // and no explicit animation on this one
                this.attributes_changed.color = [key];
            } else {
                this.attributes_changed[key_animation] = [key];
                // animate the size as well on x y z changes
                if (["x", "y", "z", "u", "v", "color"].indexOf(key_animation) !== -1) {
                    // console.log("adding size to list of changed attributes")
                    // this.attributes_changed["size"] = []
                }

            }
        }
        this.update_();
    }

    update_() {
        this.remove_from_scene();
        this.create_mesh();
        this.add_to_scene();
        this.renderer.update();
    }

    _get_value(value, index, default_value) {
        if (!value) {
            return default_value;
        }
        // it is either an array of typed arrays, or a list of numbers coming from the javascript world
        if (isArray(value) && !isNumber(value[0])) {
            // check whether alpha component was provided or not
            const out_index = index % value.length;
            const rows = (value as any).original_data[out_index].shape[0];
            const cols = (value as any).original_data[out_index].shape[1];

            if ((cols === 3) && isNumber(value[out_index][0])) {
                // for rbg colors add alphas
                const out_length = rows * 4;
                const out_value = new Float32Array(out_length);
                const temp_value = value[out_index];

                for (let i = 0; i < rows; i++) {
                    out_value[i * 4] = temp_value[i * 3];
                    out_value[i * 4 + 1] = temp_value[i * 3 + 1];
                    out_value[i * 4 + 2] = temp_value[i * 3 + 2];
                    out_value[i * 4 + 3] = 1.0;
                }

                return out_value;
            } else {
                // either we have color with alpha or a different format, not the rgb
                return value[out_index];
            }
        } else {
            return value;
        }
    }

    get_current(name, index, default_value) {
        return this._get_value(this.model.get(name), index, default_value);
    }

    get_previous(name, index, default_value) {
        return this._get_value(this.previous_values[name] || this.model.get(name), index, default_value);
    }

    _get_value_vec3(value, index, default_value) {
        if (!value) {
            return default_value;
        }
        if (isArray(value)) {
            return value[index % value.length];
        } else {
            return value;
        }
    }

    get_current_vec3(name, index, default_value) {
        return this._get_value_vec3(this.model.get(name), index, default_value);
    }

    get_previous_vec3(name, index, default_value) {
        return this._get_value_vec3(this.previous_values[name] || this.model.get(name), index, default_value);
    }

    _update_materials() {
        if (this.model.get("material")) {
            this.material.copy(this.model.get("material").obj);
        }
        if (this.model.get("material")) {
            this.material_rgb.copy(this.model.get("material").obj);
        }
        if (this.model.get("line_material")) {
            this.line_material.copy(this.model.get("line_material").obj);
        }
        if (this.model.get("line_material")) {
            this.line_material_rgb.copy(this.model.get("line_material").obj);
        }

        // update material defines in order to run correct shader code
        this.material.defines = {USE_COLOR: true, DEFAULT_SHADING:true, LAMBERT_SHADING:false, PHONG_SHADING:false, PHYSICAL_SHADING:false};
        this.material_rgb.defines = {USE_RGB: true, USE_COLOR: true, DEFAULT_SHADING:true, LAMBERT_SHADING:false, PHONG_SHADING:false, PHYSICAL_SHADING:false};
        this.line_material.defines = {AS_LINE: true, DEFAULT_SHADING:true, LAMBERT_SHADING:false, PHONG_SHADING:false, PHYSICAL_SHADING:false};
        this.line_material_rgb.defines = {AS_LINE: true, USE_RGB: true, USE_COLOR: true, DEFAULT_SHADING:true, LAMBERT_SHADING:false, PHONG_SHADING:false, PHYSICAL_SHADING:false};
        this.material.extensions = {derivatives: true};

        // locally and the visible with this object's visible trait
        this.material.visible = this.material.visible && this.model.get("visible");
        this.material_rgb.visible = this.material.visible && this.model.get("visible");
        this.line_material.visible = this.line_material.visible && this.model.get("visible");
        this.line_material_rgb.visible = this.line_material.visible && this.model.get("visible");

        this.lighting_model = this.model.get("lighting_model");
        this.materials.forEach((material) => {
            material.uniforms = this.uniforms;
            material.vertexShader = require("raw-loader!../glsl/mesh-vertex.glsl");
            material.fragmentShader = require("raw-loader!../glsl/mesh-fragment.glsl");
            material.defines.DEFAULT_SHADING = false;
            material.defines.LAMBERT_SHADING = false;
            material.defines.PHONG_SHADING = false;
            material.defines.PHYSICAL_SHADING = false;

            if(this.lighting_model === this.LIGHTING_MODELS.DEFAULT) {
                material.defines.DEFAULT_SHADING = true;
            }
            else if(this.lighting_model === this.LIGHTING_MODELS.LAMBERT) {
                material.defines.LAMBERT_SHADING = true;
            }
            else if(this.lighting_model === this.LIGHTING_MODELS.PHONG) {
                material.defines.PHONG_SHADING = true;
            }
            else if(this.lighting_model === this.LIGHTING_MODELS.PHYSICAL) {
                material.defines.PHYSICAL_SHADING = true;
            }
            material.depthWrite = true;
            material.transparent = true;
            material.depthTest = true;
            // use lighting
            material.lights = true;
        });

        this.diffuse_color = this.model.get("diffuse_color");
        this.opacity = this.model.get("opacity");
        this.specular_color = this.model.get("specular_color");
        this.shininess = this.model.get("shininess");
        this.emissive_color = this.model.get("emissive_color");
        this.emissive_intensity = this.model.get("emissive_intensity");
        this.roughness = this.model.get("roughness");
        this.metalness = this.model.get("metalness");

        this.material.uniforms.diffuse.value = new THREE.Color(1, 1, 1);// keep hardcoded
        this.material.uniforms.opacity.value = this.opacity;
        this.material.uniforms.specular.value = new THREE.Color(this.specular_color);
        this.material.uniforms.shininess.value = this.shininess;
        this.material.uniforms.emissive.value = new THREE.Color(this.emissive_color);
        this.material.uniforms.emissiveIntensity.value = this.emissive_intensity; 
        this.material.uniforms.roughness.value = this.roughness;
        this.material.uniforms.metalness.value = this.metalness;

        this.update_shadow();

        const texture = this.model.get("texture");
        if (texture && this.textures) {
            this.material.defines.USE_TEXTURE = true;
        }
        this.material.needsUpdate = true;
        this.material_rgb.needsUpdate = true;
        this.line_material.needsUpdate = true;
        this.line_material_rgb.needsUpdate = true;

        this.renderer.update();
    }

    create_mesh() {
        /*console.log("previous values: ")
        console.log(this.previous_values)
        console.log("attributes changed: ")
        console.log(this.attributes_changed)*/
        this.meshes = [];
        let sequence_index_original;
        let sequence_index_previous_original;

        let sequence_index = sequence_index_original = this.model.get("sequence_index");
        let sequence_index_previous = sequence_index_previous_original = sequence_index;

        if (typeof this.previous_values.sequence_index !== "undefined") {
            sequence_index_previous = sequence_index_previous_original = this.previous_values.sequence_index;
        }

        let time_offset;
        let time_delta;

        if (sequence_index >= sequence_index_previous) {
            time_offset = sequence_index_previous - Math.floor(sequence_index_previous);
            time_delta = sequence_index - sequence_index_previous;
            sequence_index = Math.ceil(sequence_index);
            sequence_index_previous = Math.floor(sequence_index_previous);
            // if we are at integer sequence frame, we can simply interpolate
            if ((sequence_index_previous !== sequence_index_previous_original) || (sequence_index !== sequence_index_original)) {
                // but when we are not, we should interpolate from the nearest sequence frame to get a proper animation
                if ((sequence_index - sequence_index_previous) > 1) {
                    sequence_index_previous = sequence_index - 1;
                    time_delta = sequence_index_original - sequence_index_previous;
                    time_offset = 0;
                }
            }
        } else {
            time_offset = Math.ceil(sequence_index_previous) - sequence_index_previous;
            time_delta = sequence_index_previous - sequence_index;
            sequence_index = Math.floor(sequence_index);
            sequence_index_previous = Math.ceil(sequence_index_previous);
            if ((sequence_index_previous !== sequence_index_previous_original) || (sequence_index !== sequence_index_original)) {
                if ((sequence_index_previous - sequence_index) > 1) {
                    sequence_index_previous = sequence_index + 1;
                    time_offset = 0;
                    time_delta = sequence_index_previous - sequence_index_original;
                }
            }
        }

        if (time_delta > 1) { // we're going over a 'keyframe' border
            time_delta = time_delta % 1;

            if (time_delta === 0) {
                // special case
                time_delta = 1.;
            }
        }

        if (time_delta === 0) {
            // occurs when we don't change keyframes, but just a property
            time_delta = 1;
        }
        // console.log('>>>', sequence_index, sequence_index_previous, time_offset, time_delta)

        const scalar_names = ["x", "y", "z", "u", "v"];
        const vector4_names = ["color"];

        const current  = new values.Values(scalar_names,
                                        [],
                                        this.get_current.bind(this),
                                        sequence_index,
                                        vector4_names);
        const previous = new values.Values(scalar_names,
                                        [],
                                        this.get_previous.bind(this),
                                        sequence_index_previous,
                                        vector4_names);

        const length = Math.max(current.length, previous.length);
        if (length === 0) {
            // tslint:disable-next-line: no-console
            console.error("no single member is an array, not supported (yet?)");
        }

        current.trim(current.length); // make sure all arrays are of equal length
        previous.trim(previous.length);
        const previous_length = previous.length;
        const current_length = current.length;

        if (current.length > previous.length) { // grow..
            previous.pad(current);
        } else if (current.length < previous.length) { // shrink..
            current.pad(previous);
        }

        current.merge_to_vec3(["x", "y", "z"], "vertices");
        previous.merge_to_vec3(["x", "y", "z"], "vertices");
        current.ensure_array(["color"]);
        previous.ensure_array(["color"]);
        let triangles = this.model.get("triangles");
        if (triangles) {
            triangles = triangles[0];
            const geometry = new THREE.BufferGeometry();
            geometry.addAttribute("position", new THREE.BufferAttribute(current.array_vec3.vertices, 3));
            geometry.addAttribute("position_previous", new THREE.BufferAttribute(previous.array_vec3.vertices, 3));
            geometry.addAttribute("color_current", new THREE.BufferAttribute(current.array_vec4.color, 4));
            geometry.addAttribute("color_previous", new THREE.BufferAttribute(previous.array_vec4.color, 4));
            geometry.setIndex(new THREE.BufferAttribute(triangles, 1));
            const texture = this.model.get("texture");
            const u = current.array.u;
            const v = current.array.v;
            if (texture && u && v && this.textures) {
                const sequence_index_texture = sequence_index;
                this.material.uniforms.texture.value = this.textures[sequence_index_texture % this.textures.length]; // TODO/BUG: there could
                // be a situation where texture property is modified, but this.textures isn't done yet..
                this.material.uniforms.texture_previous.value = this.textures[sequence_index_previous % this.textures.length];
                geometry.addAttribute("u", new THREE.BufferAttribute(u, 1));
                geometry.addAttribute("v", new THREE.BufferAttribute(v, 1));
                const u_previous = previous.array.u;
                const v_previous = previous.array.v;
                geometry.addAttribute("u_previous", new THREE.BufferAttribute(u_previous, 1));
                geometry.addAttribute("v_previous", new THREE.BufferAttribute(v_previous, 1));
            }
            geometry.computeVertexNormals();

            this.surface_mesh = new THREE.Mesh(geometry, this.material);
            // BUG? because of our custom shader threejs thinks our object if out
            // of the frustum

            this.surface_mesh.frustumCulled = false;
            this.surface_mesh.material_rgb = this.material_rgb;
            this.surface_mesh.material_normal = this.material;

            this.meshes.push(this.surface_mesh);
        }

        const lines = this.model.get("lines");
        if (lines) {
            const geometry = new THREE.BufferGeometry();

            geometry.addAttribute("position", new THREE.BufferAttribute(current.array_vec3.vertices, 3));
            geometry.addAttribute("position_previous", new THREE.BufferAttribute(previous.array_vec3.vertices, 3));
            const color = new THREE.BufferAttribute(current.array_vec4.color, 4);
            color.normalized = true;
            geometry.addAttribute("color_current", color);
            const color_previous = new THREE.BufferAttribute(previous.array_vec4.color, 4);
            color_previous.normalized = true;
            geometry.addAttribute("color_previous", color_previous);
            const indices = new Uint32Array(lines[0]);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            this.line_segments = new THREE.LineSegments(geometry, this.line_material);
            this.line_segments.frustumCulled = false;
            // TODO: check lines with volume rendering, also in scatter
            this.line_segments.material_rgb = this.line_material_rgb;
            this.line_segments.material_normal = this.line_material;
            this.meshes.push(this.line_segments);
        } else {
            this.line_segments = null;
        }

        for (const key of Object.keys(this.attributes_changed)) {
            const changed_properties = this.attributes_changed[key];
            const property = "animation_time_" + key;
            // console.log("animating", key)
            const done = () => {
                changed_properties.forEach((prop) => {
                    delete this.previous_values[prop]; // may happen multiple times, that is ok
                });
            };
            // uniforms of material_rgb has a reference to these same object
            // this.renderer.transition(this.material.uniforms[property], "value", done, this)
            this.renderer.transition(function(value) {
                this.material.uniforms[property].value = time_offset + time_delta * value;
            }, done, this);
        }
        this.attributes_changed = {};
    }
}

export
class MeshModel extends widgets.WidgetModel {
    static serializers = {
        ...widgets.WidgetModel.serializers,
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        z: serialize.array_or_json,
        u: serialize.array_or_json,
        v: serialize.array_or_json,
        triangles: serialize.array_or_json,
        lines: serialize.array_or_json,
        color: serialize.color_or_json,
        texture: serialize.texture,
        material: { deserialize: widgets.unpack_models },
        line_material: { deserialize: widgets.unpack_models },
        diffuse_color : serialize.color_or_json,
        opacity : serialize.array_or_json,
        specular_color : serialize.color_or_json,
        shininess : serialize.array_or_json,
        emissive_color : serialize.color_or_json,
        emissive_intensity : serialize.array_or_json,
        roughness : serialize.array_or_json,
        metalness : serialize.array_or_json,
    };
    defaults() {
        return {
            ...super.defaults(),
            _model_name : "MeshModel",
            _view_name : "MeshView",
            _model_module : "ipyvolume",
            _view_module : "ipyvolume",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            color: "red",
            sequence_index: 0,
            connected: false,
            visible: true,
            visible_lines: true,
            visible_faces: true,
            lighting_model: "DEFAULT",
            diffuse_color : "white",
            opacity : 1,
            specular_color : "white",
            shininess : 1,
            emissive_color : "black",
            emissive_intensity : 1,
            roughness : 0,
            metalness : 0,
            cast_shadow : false,
            receive_shadow : false,
        };
    }
}
