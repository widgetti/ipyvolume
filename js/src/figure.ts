import * as widgets from "@jupyter-widgets/base";
import * as d3 from "d3";
import * as glm from "gl-matrix";
import * as Mustache from "mustache";
import * as screenfull from "screenfull";
import * as THREE from "three";
import * as THREEtext2d from "three-text2d";
import { MeshModel, MeshView} from "./mesh";
import { ScatterModel, ScatterView} from "./scatter";
import { copy_image_to_clipboard, download_image, select_text} from "./utils";
import { semver_range} from "./utils";
import { VolumeModel, VolumeView } from "./volume.js";

import { mapValues, range } from "lodash";
import { selectors } from "./selectors";
import { Transition } from "./transition";

// tslint:disable-next-line: no-var-requires
require("../css/style.css");
// tslint:disable-next-line: no-var-requires
const styles = require("../data/style.json");

const axis_names = ["x", "y", "z"];

(window as any).THREE = THREE;

import { RenderTarget, ShaderMaterial } from "three";
import { createD3Scale, patchShader } from "./scales";
import "./three/CombinedCamera.js";
import "./three/DeviceOrientationControls.js";
import "./three/OrbitControls.js";
import "./three/StereoEffect.js";
import "./three/THREEx.FullScreen.js";
import "./three/TrackballControls.js";
import {createButton} from "./ar";

const shaders = {
    "screen-fragment": (require("raw-loader!../glsl/screen-fragment.glsl") as any).default,
    "screen-vertex": (require("raw-loader!../glsl/screen-vertex.glsl") as any).default,
    "volr-fragment": (require("raw-loader!../glsl/volr-fragment.glsl") as any).default,
    "volr-vertex": (require("raw-loader!../glsl/volr-vertex.glsl") as any).default,
    "shadow-fragment": (require("raw-loader!../glsl/shadow-fragment.glsl") as any).default,
    "shadow-vertex": (require("raw-loader!../glsl/shadow-vertex.glsl") as any).default,
    "box-fragment": (require("raw-loader!../glsl/box-fragment.glsl") as any).default,
    "box-vertex": (require("raw-loader!../glsl/box-vertex.glsl") as any).default,
};

// similar to _.bind, except it
// puts this as first argument to f, followed be other arguments, and make context f's this
function bind_d3(f, context) {
    return function() {
        const args = [this].concat([].slice.call(arguments)); // convert argument to array
        f.apply(context, args);
    };
}

class ToolIcon {
    a: HTMLAnchorElement;
    li: HTMLLIElement;
    sub: HTMLDivElement;
    constructor(className, parent) {
        this.a = document.createElement("a");
        this.a.className = "ipyvolume-toolicon";
        this.a.setAttribute("href", "javascript:void(0)");
        this.li = document.createElement("li");
        this.li.className = "fa " + className;
        this.sub = document.createElement("div");
        this.sub.className = "ipyvolume-toolicon-dropdown-container";
        this.a.appendChild(this.li);
        this.a.appendChild(this.sub);
        parent.appendChild(this.a);
    }
    active(state) {
        if (state) {
            this.li.classList.remove("fa-inactive");
        } else {
            this.li.classList.add("fa-inactive");
        }
    }
}

class ToolIconDropdown {
    a: HTMLAnchorElement;
    li: HTMLLIElement;
    span_text: HTMLSpanElement;
    constructor(className, parent, text) {
        this.a = document.createElement("a");
        this.a.className = "ipyvolume-toolicon-dropdown";
        this.a.setAttribute("href", "javascript:void(0)");
        this.li = document.createElement("li");
        this.li.className = "fa " + className;
        this.span_text = document.createElement("span");
        this.span_text.innerText = text;
        this.a.appendChild(this.li);
        this.li.appendChild(this.span_text);
        parent.appendChild(this.a);
    }
    active(state) {
        if (state) {
            this.a.classList.remove("ipyvolume-toolicon-inactive");
        } else {
            this.a.classList.add("ipyvolume-toolicon-inactive");
        }
    }
}

export
class FigureModel extends widgets.DOMWidgetModel {

    static serializers = {...widgets.DOMWidgetModel.serializers,
        scatters: { deserialize: widgets.unpack_models },
        meshes: { deserialize: widgets.unpack_models },
        lights: { deserialize: widgets.unpack_models },
        volumes: { deserialize: widgets.unpack_models },
        camera: { deserialize: widgets.unpack_models },
        scene: { deserialize: widgets.unpack_models },
        controls: { deserialize: widgets.unpack_models },
        scales: { deserialize: widgets.unpack_models },
    };
    defaults() {
        return {...super.defaults(),
            _model_name: "FigureModel",
            _view_name: "FigureView",
            _model_module: "ipyvolume",
            _view_module: "ipyvolume",
            _model_module_version: semver_range,
            _view_module_version: semver_range,
            eye_separation: 6.4,
            stereo: false,
            camera_control: "trackball",
            camera_fov: 45,
            camera_center: [0., 0., 0.],
            ambient_coefficient: 0.5,
            diffuse_coefficient: 0.8,
            specular_coefficient: 0.5,
            specular_exponent: 5,
            width: 500,
            height: 400,
            pixel_ratio: null,
            displayscale: 1,
            scatters: null,
            meshes: null,
            lights: [],
            volumes: null,
            show: "render",
            scales: {},
            xlabel: "x",
            ylabel: "y",
            zlabel: "z",
            animation: 1000,
            animation_exponent: 1.0,
            style: styles.light,
            render_continuous: false,
            selector: "lasso",
            selection_mode: "replace",
            mouse_mode: "normal",
            panorama_mode: "no",
            capture_fps: null,
            cube_resolution: 512,
            box_center: [0.5, 0.5, 0.5],
            box_size: [1, 1, 1],
            popup_debouce: 100,
            slice_x: 0,
            slice_y: 0,
            slice_z: 0,
            _shaders: {},  // override shaders / hot reload
        };
    }
}

export
class FigureView extends widgets.DOMWidgetView {
    renderer: any;
    transitions: any[];
    _update_requested: boolean;
    update_counter: number;
    toolbar_div: HTMLDivElement;
    fullscreen_icon: any;
    stereo_icon: any;
    screenshot_icon: any;
    camera_control_icon: any;
    select_icon: any;
    select_icon_lasso: any;
    select_icon_circle: any;
    select_icon_rectangle: any;
    zoom_icon: any;
    quick_mouse_mode_change: boolean;
    quick_mouse_previous_mode: any;
    reset_icon: any;
    camera: any;
    setting_icon: any;
    setting_icon_180: any;
    setting_icon_360: any;
    popup_container: HTMLDivElement;
    canvas_container: HTMLDivElement;
    canvas_overlay_container: HTMLDivElement;
    canvas_overlay: HTMLCanvasElement;
    canvas_renderer_container: HTMLDivElement;
    el_mirror: HTMLDivElement;
    el_axes: HTMLDivElement;
    control_trackball: any;
    cube_camera: THREE.CubeCamera;
    camera_stereo: THREE.StereoCamera;
    renderer_stereo: any;
    renderer_selected: any;
    axes_material: THREE.LineBasicMaterial;
    xaxes_material: THREE.LineBasicMaterial;
    yaxes_material: THREE.LineBasicMaterial;
    zaxes_material: THREE.LineBasicMaterial;
    x_axis: THREE.Line;
    y_axis: THREE.Line;
    z_axis: THREE.Line;
    axes: THREE.Object3D;
    wire_box: THREE.Object3D;
    wire_box_x_line: THREE.Line;
    wire_box_y_line: THREE.Line;
    wire_box_z_line: THREE.Line;
    axes_data: Array<{ name: string; label: string; object: any; object_label: any; translate: number[];
        rotate: number[]; rotation_order: string; fillStyle: string; }>;
    ticks: number;
    scene: THREE.Scene;
    scene_opaque: THREE.Scene;
    mesh_views: { [key: string]: MeshView };
    scatter_views: { [key: string]: ScatterView };
    volume_views: { [key: string]: VolumeView };
    lights: { [key: string]: THREE.Light };
    volume_back_target: THREE.WebGLRenderTarget;
    volume_front_target: THREE.WebGLRenderTarget;
    geometry_depth_target: THREE.WebGLRenderTarget;
    color_pass_target: THREE.WebGLRenderTarget;
    screen_pass_target: THREE.WebGLRenderTarget;
    coordinate_target: THREE.WebGLRenderTarget;
    screen_scene: THREE.Scene;
    screen_scene_cube: THREE.Scene;
    screen_plane: THREE.PlaneBufferGeometry;
    screen_material: THREE.ShaderMaterial;
    screen_material_cube: THREE.ShaderMaterial;
    screen_mesh: THREE.Mesh;
    screen_mesh_cube: THREE.Mesh;
    screen_texture: THREE.Texture;
    screen_camera: THREE.OrthographicCamera;
    mouse_inside: boolean;
    mouse_trail: any[];
    select_overlay: any;
    control_orbit: any;
    material_multivolume: THREE.ShaderMaterial;
    material_multivolume_depth: THREE.ShaderMaterial;
    hover: boolean;
    last_zoom_coordinate: any;
    rrenderer: any;
    mouse_down_position: { x: any; y: any; };
    mouse_down_domain: { x: any; y: any; z: any; };
    last_pan_coordinate: THREE.Vector3;
    selector: any;
    last_tick_selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>;
    model: FigureModel;
    control_external: any = null;
    // all plot objects are children of this object, such that we can transform the matrix
    // without affecting the scene (and thus the camera controls)
    rootObject: THREE.Object3D = null;
    id_pass_target: THREE.WebGLRenderTarget;
    lastId: number;
    _wantsPopup: boolean;
    controller: any = null;

    // rendered to get the front coordinate
    front_box_mesh: THREE.Mesh;
    front_box_geo: THREE.BoxBufferGeometry;
    front_box_material: THREE.ShaderMaterial;
    slice_icon: ToolIcon;
    arRenderLoop: (time: any, frame: any) => void;

    readPixel(x, y) {
        return this.readPixelFrom(this.screen_texture, x, y);
    }

    readId(x, y) {
        const [red, green, blue, alpha] = this.readPixelFrom(this.id_pass_target, x, y)
        return red + green*256 + blue*256*256;
    }

    readPixelFrom(target: RenderTarget, x, y) {
        const buffer = new Uint8Array(4);
        const height = this.renderer.domElement.clientHeight;
        const pixel_ratio = this.model.get("pixel_ratio") || window.devicePixelRatio;
        this.renderer.readRenderTargetPixels(target, x * pixel_ratio, (height - y) * pixel_ratio, 1, 1, buffer);
        return buffer;
    }

    render() {
        this.transitions = [];
        this._update_requested = false;
        this.update_counter = 0;
        const width = this.model.get("width");
        const height = this.model.get("height");

        this.toolbar_div = document.createElement("div");
        this.el.appendChild(this.toolbar_div);

        const keydown = this._special_keys_down.bind(this);
        const keyup = this._special_keys_up.bind(this);
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
        this.once("remove", () => {
                // console.log('remove key listeners')
                document.removeEventListener("keydown", keydown);
                document.removeEventListener("keyup", keyup);
            });
            // set up fullscreen button
            // this is per view, so it's not exposed on the python side
            // which is ok, since it can only be triggered from a UI action
        this.fullscreen_icon = new ToolIcon("fa-arrows-alt", this.toolbar_div);
        this.fullscreen_icon.a.title = "Fullscreen";
        this.fullscreen_icon.a.onclick = () => {
            const el = this.renderer.domElement;
            const old_width = el.style.width;
            const old_height = el.style.height;
            const restore = () => {
                if (!screenfull.isFullscreen) {
                    el.style.width = old_width;
                    el.style.height = old_height;
                    screenfull.off("change", restore);
                } else {
                    el.style.width = "100vw";
                    el.style.height = "100vh";
                }
                this.update_size();
            };
            screenfull.onchange(restore);
            screenfull.request(el);
        };

        this.stereo_icon = new ToolIcon("fa-eye", this.toolbar_div);
        this.stereo_icon.a.title = "Stereoscopic view";
        this.stereo_icon.a.onclick = () => {
            this.model.set("stereo", !this.model.get("stereo"));
            this.model.save_changes();
        };
        this.stereo_icon.active(this.model.get("stereo"));
        this.model.on("change:stereo", () => {
            this.stereo_icon.active(this.model.get("stereo"));
        });

        this.screenshot_icon = new ToolIcon("fa-picture-o", this.toolbar_div);
        this.screenshot_icon.a.title = "Take a screenshot (hold shift to copy to clipboard)";
        this.screenshot_icon.a.onclick = (event) => {
            try {
                const data = this.screenshot();
                if (event.shiftKey) {
                    copy_image_to_clipboard(data);
                } else {
                    download_image(data);
                }
            } finally { // make sure we don't open a new window when we hold shift
                event.preventDefault();
            }
            return false;
        };
        // for headless support
        (window as any).ipvss = () => {
            const data = this.screenshot();
            return data;
        };

        this.camera_control_icon = new ToolIcon("fa-arrow-up", this.toolbar_div);
        this.camera_control_icon.a.title = "Camera locked to 'up' axis (orbit), instead of trackball mode";
        this.camera_control_icon.a.onclick = () => {
            const mode = this.model.get("camera_control");
            if (mode === "trackball") {
                this.model.set("camera_control", "orbit");
                this.camera_control_icon.active(true);
            } else {
                this.model.set("camera_control", "trackball");
                this.camera_control_icon.active(false);
            }
            this.touch();
        };
        this.camera_control_icon.active(false);

        this.select_icon = new ToolIcon("fa-pencil-square-o", this.toolbar_div);
        this.select_icon.a.title = "Select mode (auto when control key is pressed)";
        this.select_icon.a.onclick = () => {
            if (this.model.get("mouse_mode") === "select") {
                this.model.set("mouse_mode", "normal");
            } else {
                this.model.set("mouse_mode", "select");
            }
            this.update_icons();
            this.touch();
        };
        this.select_icon.active(false);

        this.select_icon_lasso = new ToolIconDropdown("fa-vine", this.select_icon.sub, "Lasso selector");
        this.select_icon_circle = new ToolIconDropdown("fa-circle", this.select_icon.sub, "Circle selector");
        this.select_icon_rectangle = new ToolIconDropdown("fa-square", this.select_icon.sub, "Rectangle selector");
        this.select_icon_lasso.a.onclick = (event) => {
            event.stopPropagation();
            this.model.set("mouse_mode", "select");
            this.model.set("selector", "lasso");
            this.touch();
        };
        this.select_icon_circle.a.onclick = (event) => {
            event.stopPropagation();
            this.model.set("mouse_mode", "select");
            this.model.set("selector", "circle");
            this.touch();
        };
        this.select_icon_rectangle.a.onclick = (event) => {
            event.stopPropagation();
            this.model.set("mouse_mode", "select");
            this.model.set("selector", "rectangle");
            this.touch();
        };

        this.zoom_icon = new ToolIcon("fa-search-plus", this.toolbar_div);
        this.zoom_icon.a.title = "Zoom mode (auto when control key is pressed, use scrolling)";
        this.zoom_icon.a.onclick = () => {
                if (this.model.get("mouse_mode") === "zoom") {
                    this.model.set("mouse_mode", "normal");
                } else {
                    this.model.set("mouse_mode", "zoom");
                }
                this.touch();
            };

        this.slice_icon = new ToolIcon("fa-cut", this.toolbar_div);
        this.slice_icon.a.title = "Set slice coordinate by hovering or clicking the edges of the bounding box";
        this.slice_icon.a.onclick = () => {
                if (this.model.get("mouse_mode") === "slice") {
                    this.model.set("mouse_mode", "normal");
                } else {
                    this.model.set("mouse_mode", "slice");
                }
                this.touch();
            };

        // this.zoom_icon.active(false)
        // using ctrl and shift, you can quickly change mode
        // remember the previous mode so we can restore it
        this.quick_mouse_mode_change = false;
        this.quick_mouse_previous_mode = this.model.get("mouse_mode");

        this.update_icons();
        this.model.on("change:mouse_mode change:selector", this.update_icons, this);
        this.model.on("change:mouse_mode change:selector", this.update_mouse_mode, this);

        this.reset_icon = new ToolIcon("fa-home", this.toolbar_div);
        this.reset_icon.a.title = "Reset view";
        const initial_fov = this.model.get("camera_fov");
        this.reset_icon.a.onclick = () => {
            this.camera.copy(this.camera_initial);
            if (this.camera.ipymodel) {
                this.camera.ipymodel.syncToModel(true);
            }
        };

        this.setting_icon = new ToolIcon("fa-cog", this.toolbar_div);
        this.setting_icon_180 = new ToolIconDropdown("fa-circle", this.setting_icon.sub, "180 degrees");
        this.setting_icon_360 = new ToolIconDropdown("fa-circle", this.setting_icon.sub, "360 degrees");
        const add_resolution = (name, x, y) => {
            const tool = new ToolIconDropdown("fa-cogs", this.setting_icon.sub, name + " (" + x + "x" + y + ")");
            tool.a.onclick = (event) => {
                this.model.set("width", x);
                this.model.set("height", y);
                this.touch();
            };
        };
        add_resolution("default", this.model.get("width"), this.model.get("height"));
        add_resolution("small", 500, 400);
        add_resolution("medium", 640, 480);
        add_resolution("large", 800, 600);
        add_resolution("HD 720", 1280, 720);
        add_resolution("HD", 1920, 1080);
        add_resolution("2k", 2048, 1080);
        add_resolution("2k x 2k", 2048, 2048);
        add_resolution("4k UHD ", 3840, 2160);
        add_resolution("4k", 4096, 2160);
        add_resolution("4k x 4k", 4096, 4096);
        // add_resolution('8k UHD', 7680, 4320)
        const add_scaling = (x) => {
            const tool = new ToolIconDropdown("fa-compress", this.setting_icon.sub, "Scale canvas (down) by " + x);
            tool.a.onclick = (event) => {
                this.model.set("displayscale", 1 / x);
                this.touch();
            };
        };
        add_scaling(1);
        add_scaling(2);
        add_scaling(4);
        add_scaling(8);
        this.setting_icon_180.a.onclick = (event) => {
            event.stopPropagation();
            if (this.model.get("panorama_mode") === "180") {
                this.model.set("panorama_mode", "no");
            } else {
                this.model.set("panorama_mode", "180");
            }
            this.touch();
        };
        this.setting_icon_360.a.onclick = (event) => {
            event.stopPropagation();
            if (this.model.get("panorama_mode") === "360") {
                this.model.set("panorama_mode", "no");
            } else {
                this.model.set("panorama_mode", "360");
            }
            this.touch();
        };
        this.setting_icon_360.active(this.model.get("panorama_mode") === "360");
        this.setting_icon_180.active(this.model.get("panorama_mode") === "180");
        this.model.on("change:panorama_mode", () => {
            this.setting_icon_360.active(this.model.get("panorama_mode") === "360");
            this.setting_icon_180.active(this.model.get("panorama_mode") === "180");
            this.update_panorama();
        });

        this.el.classList.add("jupyter-widgets");
        // set up WebGL using threejs, with an overlay canvas for 2d drawing
        this.canvas_container = document.createElement("div");
        this.canvas_overlay_container = document.createElement("div");
        this.canvas_overlay = document.createElement("canvas");
        this.canvas_overlay_container.appendChild(this.canvas_overlay);
        this.canvas_container.appendChild(this.canvas_overlay_container);

        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        const update_pixel_ratio = () => {
            this.renderer.setPixelRatio(this.model.get("pixel_ratio") || window.devicePixelRatio);
            this._update_size();
        };
        this.renderer.setPixelRatio(this.model.get("pixel_ratio") || window.devicePixelRatio);
        this.listenTo(this.model, "change:pixel_ratio", update_pixel_ratio);

        this.canvas_renderer_container = document.createElement("div");
        this.canvas_renderer_container.appendChild(this.renderer.domElement);

        this.popup_container = document.createElement("div");
        this.popup_container.classList.add('ipyvolume-popup-container')

        this.canvas_container.appendChild(this.canvas_renderer_container);
        this.canvas_container.appendChild(this.canvas_overlay_container);
        this.canvas_container.appendChild(this.popup_container);

        this.canvas_overlay_container.style.position = "absolute";
        this.canvas_overlay_container.style.zIndex = "2";
        this.canvas_overlay_container.style.pointerEvents = "none";
        this.canvas_renderer_container.style.position = "absolute";
        this.canvas_renderer_container.style.zIndex = "1";
        this.canvas_container.classList.add("ipyvolume-canvas-container")
        this.el.appendChild(this.canvas_container);
        this.el.setAttribute("tabindex", "1"); // make sure we can have focus

        // el_mirror is a 'mirror' dom tree that d3 needs
        // we use it to attach axes and tickmarks to the dom
        // which reflect the objects in the scene
        this.el_mirror = document.createElement("div");
        this.el.appendChild(this.el_mirror);
        this.el_axes = document.createElement("div");
        this.el_mirror.appendChild(this.el_axes);

        this.renderer.domElement.addEventListener("wheel", this.mousewheel.bind(this), false);

        // const VIEW_ANGLE = this.model.get("camera_fov");
        // const aspect = width / height;
        const NEAR = 0.01;
        const FAR = 10000;
        const orthoNEAR = -500;
        const orthoFAR = 1000;

        if (this.model.get("camera")) {
            this.camera = this.model.get("camera").obj;
            this.model.get("camera").on("change", () => {
                // the threejs' lookAt ignore the quaternion, and uses the up vector
                // we manually set it ourselve
                if (!this.control_external) {
                    const up = new THREE.Vector3(0, 1, 0);
                    up.applyQuaternion(this.camera.quaternion);
                    this.camera.up = up;
                    this.camera.lookAt(0, 0, 0);
                    // TODO: shouldn't we do the same with the orbit control?
                    this.control_trackball.position0 = this.camera.position.clone();
                    this.control_trackball.up0 = this.camera.up.clone();
                    // TODO: if we implement figure.look_at, we should update control's target as well
                    this.update();
                }
            });
        } else {
            this.camera = new THREE.PerspectiveCamera(46, 1, NEAR, FAR);
            // same default as the Python version
            const z = 2 * Math.tan(45. / 2. * Math.PI / 180.) / Math.tan(this.model.get("camera_fov") / 2. * Math.PI / 180.);
            this.camera.position.z = z;
        }

        this.camera_initial = this.camera.clone();
        this.cube_camera = new THREE.CubeCamera(this.camera.near, this.camera.far, this.model.get("cube_resolution"));

        this.camera_stereo = new THREE.StereoCamera();
        this.renderer.setSize(width, height);

        this.renderer_stereo = new THREE.StereoEffect(this.renderer);
        this.renderer_selected = this.renderer_stereo;

        const make_line = (x1, y1, z1, x2, y2, z2, material) => {
            const geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
            return new THREE.Line(geometry, material);
        };

        const make_axis = (x, y, z, material) => {
            return make_line(-0.5, -0.5, -0.5, -0.5 + x, -0.5 + y, -0.5 + z, material);
        };

        const linewidth = 1;
        this.axes_material = new THREE.LineBasicMaterial({
            color: "cyan",
            linewidth,
        });
        this.xaxes_material = new THREE.LineBasicMaterial({
            color: "red",
            linewidth,
        });
        this.yaxes_material = new THREE.LineBasicMaterial({
            color: "green",
            linewidth,
        });
        this.zaxes_material = new THREE.LineBasicMaterial({
            color: "blue",
            linewidth,
        });

        this.x_axis = make_axis(1, 0, 0, this.xaxes_material);
        this.y_axis = make_axis(0, 1, 0, this.yaxes_material);
        this.z_axis = make_axis(0, 0, 1, this.zaxes_material);

        this.axes = new THREE.Object3D();
        this.axes.add(this.x_axis);
        this.axes.add(this.y_axis);
        this.axes.add(this.z_axis);

        this.wire_box = new THREE.Object3D();
        this.wire_box_x_line = make_line(-0.5, -0.5, -0.5, -0.5 + 1, -0.5, -0.5, this.axes_material);
        this.wire_box.add(this.wire_box_x_line);
        this.wire_box.add(make_line(-0.5, -0.5 + 1, -0.5, -0.5 + 1, -0.5 + 1, -0.5, this.axes_material));
        this.wire_box.add(make_line(-0.5, -0.5, -0.5 + 1, -0.5 + 1, -0.5, -0.5 + 1, this.axes_material));
        this.wire_box.add(make_line(-0.5, -0.5 + 1, -0.5 + 1, -0.5 + 1, -0.5 + 1, -0.5 + 1, this.axes_material));

        this.wire_box_y_line = make_line(-0.5, -0.5, -0.5, -0.5, -0.5 + 1, -0.5, this.axes_material);
        this.wire_box.add(this.wire_box_y_line);
        this.wire_box.add(make_line(-0.5 + 1, -0.5, -0.5, -0.5 + 1, -0.5 + 1, -0.5, this.axes_material));
        this.wire_box.add(make_line(-0.5, -0.5, -0.5 + 1, -0.5, -0.5 + 1, -0.5 + 1, this.axes_material));
        this.wire_box.add(make_line(-0.5 + 1, -0.5, -0.5 + 1, -0.5 + 1, -0.5 + 1, -0.5 + 1, this.axes_material));

        this.wire_box_z_line = make_line(-0.5, -0.5, -0.5, -0.5, -0.5, -0.5 + 1, this.axes_material);
        this.wire_box.add(this.wire_box_z_line);
        this.wire_box.add(make_line(-0.5 + 1, -0.5, -0.5, -0.5 + 1, -0.5, -0.5 + 1, this.axes_material));
        this.wire_box.add(make_line(-0.5, -0.5 + 1, -0.5, -0.5, -0.5 + 1, -0.5 + 1, this.axes_material));
        this.wire_box.add(make_line(-0.5 + 1, -0.5 + 1, -0.5, -0.5 + 1, -0.5 + 1, -0.5 + 1, this.axes_material));

        // d3 data
        this.axes_data = [{
            name: "x",
            label: "x",
            object: null,
            object_label: null,
            translate: [0.0, -0.5, -0.5],
            rotate: [Math.PI / 4., 0, 0],
            rotation_order: "XYZ",
            fillStyle: "#00FF00",
        }, {
            name: "y",
            label: "y",
            object: null,
            object_label: null,
            translate: [-0.5, 0.0, -0.5],
            rotate: [Math.PI * 3. / 4., 0, Math.PI / 2.],
            rotation_order: "ZXY",
            fillStyle: "#00FF00",
        }, {
            name: "z",
            label: "z",
            object: null,
            object_label: null,
            translate: [-0.5, -0.5, 0.0],
            rotate: [-Math.PI / 8., -Math.PI / 2., 0],
            rotation_order: "YZX",
            fillStyle: "#00FF00",
        }];

        this.ticks = 5; // hardcoded for now

        if(this.model.get("scene")) // null in testing
            this.scene = this.model.get("scene").obj;
        else
            this.scene = new THREE.Scene();
        // // we have our 'private' scene, if we use the real scene, it gives buggy
        // // results in the volume rendering when we have two views
        // this.scene_volume = new THREE.Scene();
        // could be removed when https://github.com/jovyan/pythreejs/issues/176 is solved
        // the default for pythreejs is white, which leads the volume rendering pass to make everything white
        this.scene.background = null;
        if(this.model.get("scene"))
            this.model.get("scene").on("rerender", () => this.update());
        this.rootObject = new THREE.Object3D();
        this.rootObject.name = "rootObject"
        this.scene.add(this.rootObject);

        // if (this.model.get("scene")) {
        //     this.shared_scene = this.model.get("scene").obj;
        //     this.model.get("scene").on("rerender", () => this.update());
        // } else {
        //     this.shared_scene = new THREE.Scene();
        // }

        this.scene.add(this.camera);
        // the threejs animation system looks at the parent of the camera and sends rerender msg'es
        // this.shared_scene.add(this.camera);

        const onSelect = () =>  {
            if(lastXrTransform) {
                // this.rootObject.matrixAutoUpdate = false;

                // this ignores the box_center/scale, but does rotation
                // this.rootObject.matrix.fromArray(lastXrTransform.matrix);
                // const matrixTrans = new THREE.Matrix4();
                // matrixTrans.makeTranslation(0.5, 0.5, 0.5);
                // this.rootObject.matrix.multiply(matrixTrans);

                const pos = lastXrTransform.position;
                this.model.set('box_center', [pos.x + 0.5, pos.y + 0.5, pos.z + 0.5]);
                this.model.save_changes();
            }
        }

        this.controller = this.renderer.xr.getController( 0 );
        this.controller.addEventListener( 'select', onSelect );
        this.scene.add( this.controller );
        let hitTestSourceRequested = false;
        let hitTestSource = null;
        let lastXrTransform = null;

        this.arRenderLoop = (time, frame) => {

            if (frame) {
                // based on https://threejs.org/examples/webxr_ar_hittest.html
                const renderer = this.renderer;
                const referenceSpace = renderer.xr.getReferenceSpace();
                const session = renderer.xr.getSession();

                if (hitTestSourceRequested === false) {
                    session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
                        session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {
                            hitTestSource = source;
                        } );
                    });
                    session.addEventListener( 'end', function () {
                        hitTestSourceRequested = false;
                        hitTestSource = null;
                    } );
                    hitTestSourceRequested = true;
                }
                if (hitTestSource) {
                    const hitTestResults = frame.getHitTestResults( hitTestSource );
                    if(hitTestResults.length) {
                        const hit = hitTestResults[ 0 ];
                        const pose = hit.getPose( referenceSpace )
                        lastXrTransform = pose.transform;
                    }
                }
            }
            this._real_update();
        }

        // TODO: should only be set in AR mode
        this.renderer.setAnimationLoop(this.arRenderLoop);

        // this.scene_scatter = new THREE.Scene();
        this.scene_opaque = new THREE.Scene();

        this.rootObject.add(this.wire_box);
        this.rootObject.add(this.axes);
        this.rootObject.add( this.controller );

        this.scene_opaque.add(this.wire_box);
        this.scene_opaque.add(this.axes);

        const update_box = () => {
            const box_position = new THREE.Vector3();
            box_position.fromArray(this.model.get('box_center'));
            box_position.sub(new THREE.Vector3(0.5, 0.5, 0.5));

            const box_scale = new THREE.Vector3();
            box_scale.fromArray(this.model.get('box_size'));

            this.scene_opaque.scale.copy(box_scale);
            this.scene_opaque.position.copy(box_position);

            this.rootObject.scale.copy(box_scale);
            this.rootObject.position.copy(box_position);
            this.update();
        }
        this.model.on("change:box_center change:box_size", update_box);
        update_box();

        this.front_box_material = new THREE.ShaderMaterial({
            uniforms: {
                offset: { type: "3f", value: [0, 0, 0] },
                scale : { type: "3f", value: [1, 1, 1] },
            },
            fragmentShader: shaders["box-fragment"],
            vertexShader: shaders["box-vertex"],
            side: THREE.BackSide,
        });
        this.front_box_geo = new THREE.BoxBufferGeometry(1, 1, 1);
        this.front_box_mesh = new THREE.Mesh(this.front_box_geo, this.front_box_material);
        this.front_box_mesh.name = "Front object"
        this.rootObject.add(this.front_box_mesh);

        this.mesh_views = {};
        this.scatter_views = {};
        this.volume_views = {};

        let render_width = width;
        const render_height = height;

        if (this.model.get("stereo")) {
            render_width /= 2;
        }

        // Render pass targets
        // float texture for better depth data, prev name back_texture
        this.volume_back_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            type: THREE.FloatType,
            format: THREE.RGBAFormat,
            generateMipmaps: false,
        });

        this.volume_front_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
        });

        this.geometry_depth_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            generateMipmaps: false,
        });
        this.geometry_depth_target.depthTexture = new THREE.DepthTexture(1, 1);
        this.geometry_depth_target.depthTexture.type = THREE.UnsignedShortType;

        this.id_pass_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
        });

        this.color_pass_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
        });

        this.screen_pass_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
        });

        this.coordinate_target = new THREE.WebGLRenderTarget(render_width, render_height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.NearestFilter,
        });

        this.screen_texture = this.color_pass_target.texture;
        this.screen_scene = new THREE.Scene();
        this.screen_scene_cube = new THREE.Scene();
        this.screen_plane = new THREE.PlaneBufferGeometry(1.0, 1.0);

        this.screen_material = new THREE.ShaderMaterial({
            uniforms: {
                tex: {
                    type: "t",
                    value: this.screen_pass_target.texture,
                },
            },
            vertexShader: shaders["screen-vertex"],
            fragmentShader: shaders["screen-fragment"],
            depthWrite: false,
        });

        this.screen_material_cube = new THREE.ShaderMaterial({
            uniforms: {
                tex: {
                    type: "t",
                    value: this.cube_camera.renderTarget.texture,
                },
            },
            vertexShader: shaders["screen-vertex"],
            fragmentShader: shaders["screen-fragment"],
            defines: {},
            depthWrite: false,
        });

        this.screen_mesh = new THREE.Mesh(this.screen_plane, this.screen_material);
        this.screen_mesh_cube = new THREE.Mesh(this.screen_plane, this.screen_material_cube);
        this.screen_scene.add(this.screen_mesh);
        this.screen_scene_cube.add(this.screen_mesh_cube);
        this.screen_camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000., 10000.);
        this.screen_camera.position.z = 10;
        this.update_panorama();
        this.on("change:panorama_mode", this.update_panorama, this);

        // we rely here on these events listeners to be executed before those of the controls
        // since we disable the controls, seems to work on chrome
        this.renderer.domElement.addEventListener("mousedown", this._mouse_down.bind(this), false);
        this.renderer.domElement.addEventListener("mousemove", this._mouse_move.bind(this), false);
        this.renderer.domElement.addEventListener("dblclick", this._mouse_dbl_click.bind(this), false);
        this.renderer.domElement.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
        }, false);

        window.addEventListener("mouseup", this._mouse_up.bind(this), false);
        this.mouse_inside = false;
        this.mouse_trail = []; // list of x, y positions
        this.select_overlay = null; // lasso or sth else?

        // setup controls, 2 builtin custom controls, or an external
        // pythreejs control

        this.control_trackball = new THREE.TrackballControls(this.camera, this.renderer.domElement);
        this.control_orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.control_trackball.dynamicDampingFactor = 1.;
        this.control_trackball.noPan = true;
        this.control_orbit.enablePan = false;
        this.control_orbit.dampingFactor = 1.;
        this.update_mouse_mode();

        this.control_orbit.rotateSpeed = 0.5;
        this.control_trackball.rotateSpeed = 0.5;
        this.control_trackball.zoomSpeed = 3.;

        const update_angles_bound = this.update_angles.bind(this);
        const update_bound = this.update.bind(this);

        this.control_trackball.addEventListener("end", update_angles_bound);
        this.control_orbit.addEventListener("end", update_angles_bound);
        this.control_trackball.addEventListener("change", update_bound);
        this.control_orbit.addEventListener("change", update_bound);

        const sync_controls_external = () => {
            const controls = this.model.get("controls");
            const controls_previous  = (this.model.previousAttributes as any).controls;
            // first remove previous event handlers
            if (controls_previous) {
                const control_external = controls_previous.obj;
                control_external.removeEventListener("end", update_angles_bound);
                control_external.removeEventListener("change", update_bound);
                control_external.dispose();
            }
            // and add new event handlers
            if (controls) {
                // get the threejs object
                this.control_external = controls.obj;
                this.control_external.addEventListener("end", update_angles_bound);
                this.control_external.addEventListener("change", update_bound);
                this.control_external.connectEvents(this.el); // custom pythreejs method
            } else {
                this.control_external = null;
            }
            this.update_mouse_mode();
        };

        sync_controls_external();
        this.model.on("change:controls", () => {
            sync_controls_external();
        });

        // window.addEventListener("deviceorientation", this.on_orientationchange.bind(this), false);

        const render_size = this.getRenderSize();

        this.material_multivolume = new THREE.ShaderMaterial({
            uniforms: {
                back_tex: {
                    type: "t",
                    value: this.volume_back_target.texture,
                },
                geometry_depth_tex: {
                    type: "t",
                    value: this.geometry_depth_target.depthTexture,
                },

                volumes: {
                    type: "tv",
                    value: [{}],
                },
                data: {
                    type: "tv",
                    value: [],
                },
                transfer_function: {
                    type: "tv",
                    value: [],
                },

                volumes_max_int: {
                    type: "tv",
                    value: [{}],
                },
                data_max_int: {
                    type: "tv",
                    value: [],
                },
                transfer_function_max_int: {
                    type: "tv",
                    value: [],
                },

                ambient_coefficient: {
                    type: "f",
                    value: this.model.get("ambient_coefficient"),
                },
                diffuse_coefficient: {
                    type: "f",
                    value: this.model.get("diffuse_coefficient"),
                },
                specular_coefficient: {
                    type: "f",
                    value: this.model.get("specular_coefficient"),
                },
                specular_exponent: {
                    type: "f",
                    value: this.model.get("specular_exponent"),
                },

                brightness: {
                    type: "f",
                    value: 2.,
                },
                render_size: {
                    type: "2f",
                    value: render_size,
                },

                steps: {
                    type: "f",
                    value: 10,
                },
            },
            blending: THREE.CustomBlending,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquation: THREE.AddEquation,
            transparent: true,
            defines: {},
            side: THREE.FrontSide,
        });

        // make the material behave as phong
        this.material_multivolume.uniforms = {...THREE.UniformsUtils.merge( [
			THREE.UniformsLib.common,
			THREE.UniformsLib.specularmap,
			THREE.UniformsLib.envmap,
			THREE.UniformsLib.aomap,
			THREE.UniformsLib.lightmap,
			THREE.UniformsLib.emissivemap,
			THREE.UniformsLib.bumpmap,
			THREE.UniformsLib.normalmap,
			THREE.UniformsLib.displacementmap,
			THREE.UniformsLib.gradientmap,
			THREE.UniformsLib.fog,
			THREE.UniformsLib.lights,
			{
                // there are not used, since they are defined per volume in volr-fragment Volume struct
				emissive: { value: new THREE.Color( 0x000000 ) },
				specular: { value: new THREE.Color( 0x111111 ) },
				shininess: { value: 30 }
			},
		]), ...this.material_multivolume.uniforms}
        // make sure we don't pass our uniforms to THREE, we don't want a deep clone

        // a clone of the box_material_volr, with a different define (faster to render)
        this.material_multivolume_depth = new THREE.ShaderMaterial({
            uniforms: this.material_multivolume.uniforms,
            blending: THREE.NoBlending,
            defines: {
                COORDINATE: true,
            },
            side: THREE.FrontSide,
        });

        this.model.on("change:scatters", this.update_scatters, this);
        this.update_scatters();
        this.model.on("change:meshes", this.update_meshes, this);
        this.update_meshes();
        this.model.on("change:volumes", this.update_volumes, this);
        this.update_volumes();
        this.model.on("change:lights", this.update_lights, this);
        this.update_lights();

        this.update_size();

        const that = this;

        this.el.addEventListener("change", this.update.bind(this)); // remove when using animation loop

        // TODO: remove this when we fully depend on the camera worldMatrix
        const update_matrix_world_scale = () => {
            this.model.set("matrix_world", this._get_view_matrix().elements.slice());
            this.touch();
        };

        this.model.on("change:xlim change:ylim change:zlim", () => {
            update_matrix_world_scale();
        });

        if (this.model.get("camera")) {
            this.model.get("camera").on("change:matrixWorld", () => {
                update_matrix_world_scale();
            });
            update_matrix_world_scale();

            const update_matrix_projection = () => {
                this.model.set("matrix_projection", this.camera.projectionMatrix.elements.slice());
            };
            update_matrix_projection();
            this.model.get("camera").on("change:projectionMatrix", () => {
                update_matrix_projection();
            });
            update_matrix_projection();
        }

        this.model.on("change:camera_control", this.update_mouse_mode, this);
        this.model.on("change:xlabel change:ylabel change:zlabel", this.update, this);
        this.model.on("change:render_continuous", this.update, this);
        this.model.on("change:style", this.update, this);
        const scales = this.model.get("scales");
        for (const coordinate of ["x", "y", "z"]) {
            scales[coordinate].on("change", this.update, this);
        }
        this.model.on("change:xlim change:ylim change:zlim ", this.update, this);
        this.model.on("change:stereo", this.update_size, this);

        this.model.on("change:eye_separation", this.update, this);

        this.model.on("change:camera_fov", this.update_current_control, this);

        this.model.on("change:width", this.update_size, this);
        this.model.on("change:height", this.update_size, this);
        this.model.on("change:displayscale", this.update_size, this);

        this.model.on("change:ambient_coefficient", this.update_light, this);
        this.model.on("change:diffuse_coefficient", this.update_light, this);
        this.model.on("change:specular_coefficient", this.update_light, this);
        this.model.on("change:specular_exponent", this.update_light, this);

        const hot_reload_shaders = () => {
            this.rebuild_multivolume_rendering_material();
            this.update();
        }
        this.model.on("change:_shaders", hot_reload_shaders, this);

        const update_center = () => {
            // WARNING: we cheat a little by setting the scene positions (hence the minus) since it is
            // easier, might get us in trouble later?
            for (const scene of [this.scene, this.scene_opaque]) {
                const pos = this.model.get("camera_center");
                scene.position.set(-pos[0], -pos[1], -pos[2]);
            }
            this.update();
        };

        this.model.on("change:camera_center", update_center);
        update_center();

        this.model.on("change:tf", this.tf_set, this);
        this.listenTo(this.model, "msg:custom", this.custom_msg.bind(this));


        this.renderer.domElement.addEventListener("resize", this.on_canvas_resize.bind(this), false);
        this.update();

        // ensure initial sync of view with figure model
        this.update_current_control();
        this.update_light();

        let stream;
        if (this.model.get("capture_fps")) {
            stream = this.renderer.domElement.captureStream(this.model.get("capture_fps"));
        } else {
            stream = this.renderer.domElement.captureStream();
        }

        (this.model as any).stream = Promise.resolve(stream);
        (window as any).last_figure_stream = (stream);
        (window as any).last_figure = this;

        // keep track over hover status manually
        this.renderer.domElement.onmouseover = () => {
            this.hover = true;
        };

        this.renderer.domElement.onmouseleave = () => {
            this.hover = false;
        };

        this.renderer.xr.enabled = true;
        document.getElementById('bliep').appendChild(createButton(this.renderer,
            () => {this.model.set("camera_control", "xr")},
            () => this.model.set("render_continuous", false)
            /*{domOverlay: document.getElementById('bliep')}*/));

    }

    get in_ar_mode(): boolean {
        return this.model.get("camera_control") == "xr";
    }

    camera_initial(camera_initial: any) {
        throw new Error("Method not implemented.");
    }
    _save_matrices(arg0: string, _save_matrices: any, arg2: this) {
        throw new Error("Method not implemented.");
    }
    tf_set(arg0: string, tf_set: any, arg2: this) {
        throw new Error("Method not implemented.");
    }

    setStyle() {
        // ignore original style setting, our style !== a style widget
    }

    update_icons() {
        const select_mode = this.model.get("mouse_mode") === "select";
        this.select_icon_lasso.active(this.model.get("selector") === "lasso" && select_mode);
        this.select_icon_circle.active(this.model.get("selector") === "circle" && select_mode);
        this.select_icon_rectangle.active(this.model.get("selector") === "rectangle" && select_mode);
        this.select_icon.active(select_mode);
        const zoom_mode = this.model.get("mouse_mode") === "zoom";
        this.zoom_icon.active(zoom_mode);
        const slice_mode = this.model.get("mouse_mode") === "slice";
        this.slice_icon.active(slice_mode);
    }

    update_mouse_mode() {
        const normal_mode = this.model.get("mouse_mode") === "normal";
        if (this.model.get("controls")) {
            this.control_trackball.enabled = false;
            this.control_orbit.enabled = false;
        } else {
            this.control_trackball.enabled = this.model.get("camera_control") === "trackball" && normal_mode;
            this.control_orbit.enabled = this.model.get("camera_control") === "orbit" && normal_mode;
        }
    }

    mousewheel(e) {
        if (this.model.get("mouse_mode") !== "zoom") { return; }
        e.preventDefault();
        e.stopPropagation();
        let amount = e.deltaY * 0.00025;
        if (e.deltaMode === 2) { // pages
            amount = e.deltaY * 0.025;
        }
        if (e.deltaMode === 1) { // lines
            amount -= e.deltaY * 0.01;
        }
        let mouseX;
        let mouseY;
        if (e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        } else if (e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        }
        amount *= 10;
        const factor = Math.pow(10, amount);
        const height = this.renderer.domElement.clientHeight;
        if (!this.last_zoom_coordinate) {
            const [red, green, blue, alpha] = this.readPixelFrom(this.coordinate_target, mouseX, mouseY);

            if (alpha > 1) {
                // at least something got drawn
                const center = new THREE.Vector3(red, green, blue);
                center.multiplyScalar(1. / 255.); // normalize
                this.last_zoom_coordinate = center;
            }
        }

        if (this.last_zoom_coordinate) { // at least something got drawn
            // clear it so that we don't use it again
            this.renderer.setRenderTarget(this.coordinate_target);
            this.renderer.clear(true, true, true);

            const center = this.last_zoom_coordinate;

            // work in normalized coordinates
            const np1 = center.clone().sub(center.clone().multiplyScalar(factor));
            const np2 = center.clone().add(center.clone().negate().addScalar(1).multiplyScalar(factor));

            // and rescale to x/y/z lim
            const scales = this.model.get("scales");
            const scales_d3 = mapValues(scales, createD3Scale);
            scales_d3.x.range([0, 1]);
            scales_d3.y.range([0, 1]);
            scales_d3.z.range([0, 1]);

            scales.x.set("min", scales_d3.x.invert(np1.x));
            scales.x.set("max", scales_d3.x.invert(np2.x));
            scales.y.set("min", scales_d3.y.invert(np1.y));
            scales.y.set("max", scales_d3.y.invert(np2.y));
            scales.z.set("min", scales_d3.z.invert(np1.z));
            scales.z.set("max", scales_d3.z.invert(np2.z));

            scales.x.save_changes();
            scales.y.save_changes();
            scales.z.save_changes();
        }
        return false;
    }

    _mouse_down(e) {
        // console.log('mouse down', e)
        (window as any).last_event = e;
        let mouseX;
        let mouseY;
        if (e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        } else if (e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        }
        this.mouseDown(mouseX, mouseY);
    }

    mouseDown(mouseX, mouseY, e?) {
        this.mouse_down_position = {
            x: mouseX,
            y: mouseY,
        };
        const scales = this.model.get("scales");
        this.mouse_down_domain = {
            x: scales.x.domain.slice(),
            y: scales.y.domain.slice(),
            z: scales.z.domain.slice(),
        };
        const height = this.renderer.domElement.clientHeight;
        const [red, green, blue, alpha] = this.readPixelFrom(this.coordinate_target, mouseX, mouseY);
        if (alpha > 1) { // at least something got drawn
            const center = new THREE.Vector3(red, green, blue);
            center.multiplyScalar(1 / 255.); // normalize
            this.last_pan_coordinate = center;
        }

        if (this.model.get("mouse_mode") === "select") {
            const cls = selectors[this.model.get("selector")];
            this.selector = new cls(this.canvas_overlay);
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        if (this.model.get("mouse_mode") === "slice") {
            let [xn, yn, zn, alpha] = this.readPixelFrom(this.volume_front_target, mouseX, mouseY);
            if(alpha > 0) {
                xn /= 255.;
                yn /= 255.;
                zn /= 255.;
                this._set_slice(xn, yn, zn);
            }
        }
        const id = this.readId(mouseX, mouseY);
        this.on_id_click(id, mouseX, mouseY);
    }

    _mouse_move(e) {
        let mouseX;
        let mouseY;
        if (!e) {
            e = event;
        }

        if (e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        } else if (e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        }
        const mouse_position = {
            x: mouseX,
            y: mouseY,
        };

        // console.log(this.readPixelFrom(this.volume_front_target, mouseX, mouseY), mouseX, mouseY)
        // normalized xyz coordinate of the mouse

        const id = this.readId(mouseX, mouseY);
        this.on_id_hover(id, mouseX, mouseY);

        this.last_zoom_coordinate = null;
        if (this.selector) {
            this.mouse_trail.push([mouseX, mouseY]);
            this.selector.mouseMove(mouseX, mouseY);
            this.selector.draw();
        }

        if (this.model.get("mouse_mode") === "zoom" && this.last_pan_coordinate) {
            if (e.buttons === 1) {
                const pixels_right = mouse_position.x - this.mouse_down_position.x;
                const pixels_up = -(mouse_position.y - this.mouse_down_position.y);
                this.mouseDrag(pixels_right, pixels_up);
            }
        }
        if (this.model.get("mouse_mode") === "slice") {
            let [xn, yn, zn, alpha] = this.readPixelFrom(this.volume_front_target, mouseX, mouseY);
            if(alpha > 0) {
                xn /= 255.;
                yn /= 255.;
                zn /= 255.;
                this._set_slice(xn, yn, zn);
            }
        }
    }

    _set_slice(xn, yn, zn) {
        const scales = this.model.get("scales");
        const scales_d3 = mapValues(scales, createD3Scale);
        const x = scales_d3.x.range([0, 1]).invert(xn);
        const y = scales_d3.y.range([0, 1]).invert(yn);
        const z = scales_d3.z.range([0, 1]).invert(zn);
        // console.log(x, y, z);
        const [xmin, xmax] = scales_d3.x.domain();
        const [ymin, ymax] = scales_d3.y.domain();
        const [zmin, zmax] = scales_d3.z.domain();
        const dx = Math.abs(xmin - xmax);
        const dy = Math.abs(ymin - ymax);
        const dz = Math.abs(zmin - zmax);
        const on_x = (Math.abs(x - xmin)/dx < 1e-3) || (Math.abs(x - xmax)/dx < 1e-3);
        const on_y = (Math.abs(y - ymin)/dy < 1e-3) || (Math.abs(y - ymax)/dy < 1e-3);
        const on_z = (Math.abs(z - zmin)/dz < 1e-3) || (Math.abs(z - zmax)/dz < 1e-3);
        if(on_x || on_y) {
            this.model.set("slice_z", z);
        }
        if(on_x || on_z) {
            this.model.set("slice_y", y);
        }
        if(on_y || on_z) {
            this.model.set("slice_x", x);
        }
        if(on_x || on_y || on_z) {
            this.model.save_changes();
        }

    }

    on_id_click(id, mouseX, mouseY) {
        Object.values(this.scatter_views).forEach((scatter_view) => {
            scatter_view.onClick(id);
            scatter_view.popup(id, mouseX, mouseY, this.popup_container);
        })
        Object.values(this.mesh_views).forEach((mesh_view) => {
            mesh_view.onClick(id);
            mesh_view.popup(id, mouseX, mouseY, this.popup_container);
        })
    }

    on_id_hover(id, mouseX, mouseY) {
        this._wantsPopup = true;
        const check_popup = () => {
            if(this._wantsPopup) {
                if(id == this.lastId) {
                    this._wantsPopup = false;
                    this._on_id_hover(id, mouseX, mouseY);

                }
            }
        };
        this.lastId = id; // this will avoid 'old' timeouts to show up
        setTimeout(check_popup, this.model.get('popup_debouce'))
    }

    _on_id_hover(id, mouseX, mouseY) {
        Object.values(this.scatter_views).forEach((scatter_view) => {
            scatter_view.onHover(id);
            this.popup_container.style.left = `${mouseX}px`
            const height = this.renderer.domElement.clientHeight;
            this.popup_container.style.bottom = `${height-mouseY}px`
            scatter_view.popup(id, mouseX, mouseY, this.popup_container);
        })
        Object.values(this.mesh_views).forEach((mesh_view) => {
            mesh_view.onHover(id);
            this.popup_container.style.left = `${mouseX}px`
            const height = this.renderer.domElement.clientHeight;
            this.popup_container.style.bottom = `${height-mouseY}px`
            mesh_view.popup(id, mouseX, mouseY, this.popup_container);
        })
    }

    mouseDrag(pixels_right, pixels_up) {
        const canvas = this.renderer.domElement;
        // normalized GL screen coordinates
        const right = (pixels_right / canvas.clientWidth) * 2;
        const up = (pixels_up / canvas.clientHeight) * 2;
        const P = this.camera.projectionMatrix;
        const W = this.camera.matrixWorldInverse;
        // M goes from world to screen
        const M = P.clone().multiply(W);

        // correct for the aspect of the bounding box
        const A = new THREE.Matrix4();
        const box_size = this.model.get('box_size');
        A.makeScale(box_size[0], box_size[1], box_size[2]);
        // console.log(A.toArray())
        M.multiply(A);

        const Mi = M.clone().getInverse(M);


        const scales = this.model.get("scales");

        const scales_d3 = mapValues(scales, createD3Scale);
        scales_d3.x.domain(this.mouse_down_domain.x).range([0, 1]);
        scales_d3.y.domain(this.mouse_down_domain.y).range([0, 1]);
        scales_d3.z.domain(this.mouse_down_domain.z).range([0, 1]);

        // start with normalized coordinate
        let n1 = this.last_pan_coordinate.clone();
        // project to screen coordinates
        const sn1 = n1.clone().applyMatrix4(M);
        const sn2 = sn1.clone();
        sn2.x += right;
        sn2.y += up;

        // move them back to world coordinates
        n1 = sn1.clone().applyMatrix4(Mi);
        const n2 = sn2.clone().applyMatrix4(Mi);
        const delta = n2.clone().sub(n1);

        const l1 = new THREE.Vector3(0, 0, 0);
        const l2 = new THREE.Vector3(1, 1, 1);

        l1.sub(delta);
        l2.sub(delta);
        scales.x.set("min", scales_d3.x.invert(l1.x));
        scales.x.set("max", scales_d3.x.invert(l2.x));
        scales.y.set("min", scales_d3.y.invert(l1.y));
        scales.y.set("max", scales_d3.y.invert(l2.y));
        scales.z.set("min", scales_d3.z.invert(l1.z));
        scales.z.set("max", scales_d3.z.invert(l2.z));
        scales.x.save_changes();
        scales.y.save_changes();
        scales.z.save_changes();
    }

    _mouse_dbl_click(e) {
        if (this.model.get("mouse_mode") === "zoom" && this.last_pan_coordinate) {
            const xlim = this.mouse_down_domain.x;
            const ylim = this.mouse_down_domain.y;
            const zlim = this.mouse_down_domain.z;
            let l1 = new THREE.Vector3(xlim[0], ylim[0], zlim[0]);
            let l2 = new THREE.Vector3(xlim[1], ylim[1], zlim[1]);
            const scale = l2.clone().sub(l1);

            const center = this.last_pan_coordinate.clone().multiply(scale).add(l1);
            const half_scale = scale.clone().multiplyScalar(0.5);
            l1 = center.clone().sub(half_scale);
            l2 = center.clone().add(half_scale);
            const scales = this.model.get("scales");
            scales.x.set("min", l1.x);
            scales.x.set("max", l2.x);
            scales.y.set("min", l1.y);
            scales.y.set("max", l2.y);
            scales.z.set("min", l1.z);
            scales.z.set("max", l2.z);
            scales.x.save_changes();
            scales.y.save_changes();
            scales.z.save_changes();
        }
    }

    _mouse_up(e) {
        if (this.selector) {
            const canvas = this.renderer.domElement;
            this.send({
                    event: "selection",
                    data: this.selector.getData(canvas.clientWidth, canvas.clientHeight),
                });
                // send event..
            this.mouse_trail = [];
            this.selector.close();
            this.selector = null;
            e.preventDefault();
            e.stopPropagation();
        }
    }

    _special_keys_down(e) {
        if (!this.hover) { return; }
        const evtobj = window.event ? event : e;
        if (evtobj.altKey) {
            // console.log('pressed alt', this.hover)
        }
        let handled = false;
        if (evtobj.key === "=") { // '='
            this.model.set("selection_mode", "replace");
            handled = true;
        }
        if (evtobj.key === "|") { // '='
            this.model.set("selection_mode", "or");
            handled = true;
        }
        if (evtobj.key === "&") { // '='
            this.model.set("selection_mode", "and");
            handled = true;
        }
        if (evtobj.key === "-") { // '='
            this.model.set("selection_mode", "subtract");
            handled = true;
        }
        if (evtobj.keyCode === 76) { // 'l'
            this.model.set("selector", "lasso");
            handled = true;
        }
        if (evtobj.keyCode === 67) { // 'c'
            this.model.set("selector", "circle");
            handled = true;
        }
        if (evtobj.keyCode === 82) { // 'r'
            this.model.set("selector", "rectangle");
            handled = true;
        }
        if (evtobj.keyCode === 16) { // shift
            // avoid ctrl and shift
            if (!this.quick_mouse_mode_change) {
                this.quick_mouse_mode_change = true;
                this.quick_mouse_previous_mode = this.model.get("mouse_mode");
                this.model.set("mouse_mode", "slice");
                handled = true;
            }
        }
        if (evtobj.keyCode === 18) { // alt
            // avoid ctrl and shift
            if (!this.quick_mouse_mode_change) {
                this.quick_mouse_mode_change = true;
                this.quick_mouse_previous_mode = this.model.get("mouse_mode");
                this.model.set("mouse_mode", "zoom");
                handled = true;
            }
        }
        if (evtobj.keyCode === 17) { // ctrl
            if (!this.quick_mouse_mode_change) {
                this.quick_mouse_mode_change = true;
                this.quick_mouse_previous_mode = this.model.get("mouse_mode");
                this.model.set("mouse_mode", "select");
                handled = true;
            }
        }
        if (handled) {
            this.touch();
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    _special_keys_up(e) {
        const evtobj = window.event ? event : e;
        if (evtobj.altKey) {
            // console.log('released alt', this.hover)
        }
        if ((evtobj.keyCode === 16) || (evtobj.keyCode === 17) || (evtobj.keyCode === 18)) { // ctrl or shift
            if (this.quick_mouse_mode_change) {
                this.quick_mouse_mode_change = false;
                this.model.set("mouse_mode", this.quick_mouse_previous_mode);
                this.touch();
            }
        }
    }

    custom_msg(content) {
        if (content.msg === "screenshot") {
            const data = this.screenshot(undefined, content.width, content.height);
            this.send({
                event: "screenshot",
                data,
            });
        }
    }

    screenshot(mime_type = "image/png", width?, height?) {
        const resize = width && height;
        try {
            if (resize) {
                this._update_size(true, width, height);
            }
            this._real_update();
            const data = this.renderer.domElement.toDataURL(mime_type);
            console.info("captured screenshot");
            return data;
        } finally {
            if (resize) {
                this._update_size(false);
            }
        }
    }

    _d3_add_axis(node, d, i) {
        const axis = new THREE.Object3D();

        axis.matrixAutoUpdate = false;
        const matrixTrans = new THREE.Matrix4();
        matrixTrans.makeTranslation(d.translate[0], d.translate[1], d.translate[2]);

        d3.select(node).attr("translate-x", d.translate[0]);
        d3.select(node).attr("translate-y", d.translate[1]);
        d3.select(node).attr("translate-z", d.translate[2]);

        const matrixRot = new THREE.Matrix4();
        matrixRot.makeRotationFromEuler(new THREE.Euler(d.rotate[0], d.rotate[1], d.rotate[2], d.rotation_order));

        // TODO: puzzled by the align not working as expected..
        const aligns = {
            x: THREEtext2d.textAlign.topRight,
            y: THREEtext2d.textAlign.topRight,
            z: THREEtext2d.textAlign.center,
        };
        const label = new THREEtext2d.SpriteText2D(d.label, {
            align: aligns[d.name],
            font: "100px Arial",
            fillStyle: "#00FF00",
            antialias: true,
        });
        label.material.transparent = true;
        label.material.alphaTest = 0.3;

        axis.matrix.multiply(matrixTrans);
        axis.matrix.multiply(matrixRot);

        this.axes.add(axis);
        axis.add(label);
        d.object_label = label;
        d.object = axis;
        const scale = this.model.get("scales")[d.name];
        d.scale = createD3Scale(scale).range([-0.5, 0.5]);
        d.ticks = null;
        this._d3_update_axis(node, d, i);
    }

    _d3_update_axis(node, d, i) {
        d.object_label.text = d.label;
        d.object_label.fillStyle = d.fillStyle;
        const n = d.name; // x, y or z
        const scale = this.model.get("scales")[d.name];
        d.scale = createD3Scale(scale).range([-0.5, 0.5]);
        d.object_label.fillStyle = this.get_style("axes." + n + ".label.color axes." + n + ".color axes.label.color axes.color");
        d.object_label.visible = this.get_style("axes." + n + ".label.visible axes." + n + ".visible axes.label.visible axes.visible");

        // since the axes/box are scales, we need to do a correction in the unrotated frame for the label to show in aspect=1
        const matrixRot = new THREE.Matrix4();
        matrixRot.makeRotationFromEuler(new THREE.Euler(d.rotate[0], d.rotate[1], d.rotate[2], d.rotation_order));

        const matrixRotInv = new THREE.Matrix4();
        matrixRotInv.getInverse(matrixRot);

        const box_scale = new THREE.Vector3();
        box_scale.fromArray(this.model.get('box_size'));
        const vectorScale = new THREE.Vector3(1, 1, 1);
        vectorScale.divide(box_scale);

        const matrixScale = new THREE.Matrix4();
        matrixScale.makeScale(vectorScale.x, vectorScale.y, vectorScale.z);

        const s = 0.01 * 0.4 / 3;
        const matrixScaleSize = new THREE.Matrix4();
        matrixScaleSize.makeScale(s, s, s);
        matrixScale.multiply(matrixScaleSize);

        const label = d.object_label;
        label.matrixAutoUpdate = false;
        label.matrix.identity();
        label.matrix.multiply(matrixRotInv);
        label.matrix.multiply(matrixScale);
        label.matrix.multiply(matrixRot);
    }

    _d3_add_axis_tick(node, d, i) {
        // console.log("add tick", d, node, d3.select(d3.select(node).node().parentNode))
        const parent_data : any = d3.select(d3.select(node).node().parentNode).datum(); // TODO: find the proper way to do so
        const scale = (parent_data as any).scale;

        const tick_format = scale.tickFormat(this.ticks, ".1f");
        const tick_text = tick_format(d.value);

        // TODO: puzzled by the align not working as expected..
        const aligns = {
            x: THREEtext2d.textAlign.topRight,
            y: THREEtext2d.textAlign.topRight,
            z: THREEtext2d.textAlign.center,
        };
        const sprite = new THREEtext2d.SpriteText2D(tick_text, {
            align: aligns[(parent_data as any).name],
            font: "100px Arial",
            fillStyle: "#00FF00",
            antialias: true,
        });
        sprite.material.transparent = true;
        sprite.material.alphaTest = 0.3;
        // there were assigned to sprite, instead of material
        // sprite.material.blending = THREE.CustomBlending;
        // sprite.material.blendSrc = THREE.SrcAlphaFactor;
        // sprite.material.blendDst = THREE.OneMinusSrcAlphaFactor;
        // sprite.material.blendEquation = THREE.AddEquation;

        const n = (parent_data as any).name; // x, y or z

        sprite.fillStyle = this.get_style("axes." + n + ".ticklabel.color axes.ticklabel.color axes." + n + ".color axes.color");
        if (tick_text) {
            (parent_data as any).object.add(sprite);
        }
        d.object_ticklabel = sprite;
        this._d3_update_axis_tick(node, d, i);
        return sprite;
    }

    _d3_update_axis_tick(node, d, i) {
        // TODO: find the proper way to do so
        const parent_data : any = d3.select(d3.select(node).node().parentNode).datum();
        const scale = (parent_data as any).scale;
        const tick_format = scale.tickFormat(this.ticks, ".1f");
        const tick_text = tick_format(d.value);
        // if we have text, but didn't have it before
        if (tick_text && !d.object_ticklabel.text) {
            (parent_data as any).object.add(d.object_ticklabel);
        }
        // if we don't have text, but had it before
        if (!tick_text && d.object_ticklabel.text) {
            (parent_data as any).object.remove(d.object_ticklabel);
        }
        d.object_ticklabel.text = tick_text;
        const n = (parent_data as any).name; // x, y or z
        d.object_ticklabel.fillStyle = this.get_style("axes." + n + ".ticklabel.color axes.ticklabel.color axes." + n + ".color axes.color");
        d.object_ticklabel.visible = this.get_style("axes." + n + ".ticklabel.visible axes." + n + ".visible axes.visible");

        const matrixRot = new THREE.Matrix4();
        matrixRot.makeRotationFromEuler(new THREE.Euler(parent_data.rotate[0], parent_data.rotate[1], parent_data.rotate[2], parent_data.rotation_order));

        const matrixRotInv = new THREE.Matrix4();
        matrixRotInv.getInverse(matrixRot);

        const box_scale = new THREE.Vector3();
        box_scale.fromArray(this.model.get('box_size'));
        const vectorScale = new THREE.Vector3(1, 1, 1);
        vectorScale.divide(box_scale);

        const matrixScale = new THREE.Matrix4();
        matrixScale.makeScale(vectorScale.x, vectorScale.y, vectorScale.z);

        const s = 0.01 * 0.4 * 0.5 * 0.5 / 3;
        const matrixScaleSize = new THREE.Matrix4();
        matrixScaleSize.makeScale(s, s, s);
        matrixScale.multiply(matrixScaleSize);

        const matrixTranslate = new THREE.Matrix4();
        matrixTranslate.makeTranslation(scale(d.value), 0, 0)

        const label = d.object_ticklabel;
        label.matrixAutoUpdate = false;
        label.matrix.identity();
        label.matrix.multiply(matrixTranslate);
        label.matrix.multiply(matrixRotInv);
        label.matrix.multiply(matrixScale);
        label.matrix.multiply(matrixRot);
    }

    _d3_remove_axis_tick(node, d, i) {
        if (d.object_ticklabel.text) {
            d.object_ticklabel.parent.remove(d.object_ticklabel);
        }
    }

    update_scatters() {
        const scatters = this.model.get("scatters") as ScatterModel[];
        if (scatters.length !== 0) { // So now check if list has length 0
            const current_scatter_cids = [];
            // Add new scatter if not already as scatter view in figure
            // _.each(scatters, (scatter_model) => {
            scatters.forEach((scatter_model: ScatterModel) => {
                current_scatter_cids.push(scatter_model.cid);
                if (!(scatter_model.cid in this.scatter_views)) {
                    const options = {
                        parent: this,
                    };
                    const scatter_view = new ScatterView({
                        options,
                        model: scatter_model,
                    });
                    scatter_view.render();
                    this.scatter_views[scatter_model.cid] = scatter_view;
                }

            });

            // Remove old scatters not contained in scatters
            for (const cid of Object.keys(this.scatter_views)) {
                const scatter_view = this.scatter_views[cid];
                if (current_scatter_cids.indexOf(cid) === -1) {
                    scatter_view.remove_from_scene();
                    delete this.scatter_views[cid];
                }
            }
        } else {
            this.scatter_views = {};
        }
        this._update_id_offsets()
    }

    update_meshes() {
        const meshes = this.model.get("meshes") as MeshModel[];
        if (meshes.length !== 0) { // So now check if list has length 0
            const current_meshes_cids = [];
                // Add new meshes if not already as mesh view in figure
            // _.each(meshes, (mesh_model) => {
            meshes.forEach((mesh_model) => {
                current_meshes_cids.push(mesh_model.cid);
                if (!(mesh_model.cid in this.mesh_views)) {
                    const options = {
                        parent: this,
                    };
                    const mesh_view = new MeshView({
                        options,
                        model: mesh_model,
                    });
                    mesh_view.render();
                    this.mesh_views[mesh_model.cid] = mesh_view;
                }
            });

            // Remove old meshes not contained in meshes
            for (const cid of Object.keys(this.mesh_views)) {
                const mesh_view = this.mesh_views[cid];
                if (current_meshes_cids.indexOf(cid) === -1) {
                    mesh_view.remove_from_scene();
                    delete this.mesh_views[cid];
                }
            }
        } else {
            this.mesh_views = {};
        }
        this._update_id_offsets()
    }

    update_volumes() {
        const volumes = this.model.get("volumes") as VolumeModel[]; // This is always a list?
        const previous = this.model.previous("volumes") as VolumeModel[]; // This is always a list?
        if (volumes.length !== 0) { // So now check if list has length 0
            const current_volume_cids = [];
                // Add new volumes if not already as volume view in figure
            // _.each(volumes, (vol_model) => {
            volumes.forEach((volume_model) => {
                current_volume_cids.push(volume_model.cid);
                if (!(volume_model.cid in this.volume_views)) {
                    const options = {
                        parent: this,
                    };
                    const volume_view = new VolumeView({
                        options,
                        model: volume_model,
                    });
                    volume_model.add_to_scene(this.rootObject);
                    this.volume_views[volume_model.cid] = volume_view;
                    volume_view.render();
                }
            });

            // Remove old volumes
            for (const cid of Object.keys(this.volume_views)) {
                const volume_view = this.volume_views[cid];
                if (current_volume_cids.indexOf(cid) === -1) {
                    // volume_view.remove_from_scene();
                    delete this.volume_views[cid];
                }
            }
        } else {
            this.volume_views = {};
        }
        if(previous) {
            for(let prev of previous) {
                if(!volumes.includes(prev)) {
                    prev.remove_from_scene(this.rootObject);
                }
            }
        }
        this._update_id_offsets();
    }

    _update_id_offsets() {
        let offset = 1; // start at 1, 0 is reserved for nothing selected
        for (const scatterView of Object.values(this.scatter_views)) {
            scatterView.uniforms.id_offset['value'] = offset;
            offset += scatterView.length;
        }
        for (const meshView of Object.values(this.mesh_views)) {
            meshView.uniforms.id_offset['value'] = offset;
            offset += meshView.length;
        }
    }

    async update_lights() {
        if(this.model.previous('lights')) {
            // Remove previous lights
            this.model.previous('lights').forEach(light_model => {
                const light = light_model.obj;
                this.scene.remove(light);
            });
        }
        
        const lights = this.model.get("lights");
        lights.forEach(light_model => {
            const light = light_model.obj;
            if (light.castShadow) {
                this.update_shadows();
            }

            const on_light_change = () => {
                if (light.castShadow) {
                    this.update_shadows();
                }
                this.update();
            }
            if(light.target) {
                this.scene.add(light.target)
            }
            light_model.on("change", on_light_change);
            light_model.on("childchange", on_light_change);
            this.scene.add(light);
        });
        // if we update the lights, we need to force all materials to update/
        // see https://stackoverflow.com/questions/16879378/adding-and-removing-three-js-lights-at-run-time
        const children = [
            ...Object.values(this.mesh_views),
            ...Object.values(this.scatter_views),
        ]
        for(const child of children) {
            child._update_materials();
        }
        this.update();
    }



    update_shadows() {
        // Activate shadow mapping
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // TODO: when do we disable shadow mapping?
    }

    transition(f, on_done, context) {
        const that = this;
        const exp = that.model.get("animation_exponent");
        that.transitions.push(new Transition(f, on_done, that.model.get("animation"), exp));
    }

    on_orientationchange(e) {
        if(!this.model.get("orientation_control"))
            return;
        for (const scene of [this.scene, this.scene_opaque]) {
            scene.rotation.reorder("XYZ");
            scene.rotation.x = (e.gamma * Math.PI / 180 + Math.PI * 2);
            scene.rotation.y = -(e.beta * Math.PI / 180 + Math.PI * 2);
            scene.rotation.z = -((e.alpha) * Math.PI / 180);
        }
        this.update();

    }

    // tslint:disable-next-line: no-empty
    on_canvas_resize(event) {
    }

    keypress(event) {
        // const code = event.keyCode || event.which;
        // if (event.keyCode === 27) {}
        // if (event.key === "f") {}
    }

    update_angles() {
        if (this.camera.ipymodel) {
            this.camera.ipymodel.syncToModel(true);
        }
        this.update();
    }

    _get_scale_matrix() {
        // go from [0, 1] to [-0.5, 0.5]
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(-0.5, -0.5, -0.5);

        const matrix_scale = new THREE.Matrix4();
        const scales = this.model.get("scales");
        const x = scales.x.domain;
        const y = scales.y.domain;
        const z = scales.z.domain;
        const sx = 1 / (x[1] - x[0]);
        const sy = 1 / (y[1] - y[0]);
        const sz = 1 / (z[1] - z[0]);
        matrix_scale.makeScale(sx, sy, sz);
        const translation = new THREE.Matrix4();
        translation.makeTranslation(-x[0], -y[0], -z[0]);
        matrix.multiply(matrix_scale);
        matrix.multiply(translation);
        return matrix;
    }

    _get_view_matrix() {
        // make sure the camera's inverse is up to date, normally the renderer would do this
        // but this also gets called before the first render
        this.camera.updateMatrixWorld();
        this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
        // we don't really properly use the worldmatrix, rendering threejs's frustum culling
        // useless, we maybe should change this
        // https://github.com/mrdoob/three.js/issues/78#issuecomment-846917
        const view_matrix = this.camera.matrixWorldInverse.clone();
        view_matrix.multiply(this._get_scale_matrix().clone());
        return view_matrix;
    }

    update_current_control() {
        if (this.camera.ipymodel) {
            this.camera.ipymodel.syncToModel(true);
        }
        this.control_trackball.position0 = this.camera.position.clone();
        this.control_trackball.up0 = this.camera.up.clone();
    }

    update_panorama() {
        const material = this.screen_material_cube;
        if (this.model.get("panorama_mode") === "360") {
            material.defines = {
                PANORAMA_360: true,
            };
        }
        if (this.model.get("panorama_mode") === "180") {
            material.defines = {
                PANORAMA_180: true,
            };
        }
        material.needsUpdate = true;
        this.update();
    }

    update() {
        if(this.in_ar_mode) {
            // xr will render continious (via XR api), so ignore
        } else {
            // requestAnimationFrame stacks, so make sure multiple update calls only lead to 1 _real_update call
            if (!this._update_requested) {
                    this._update_requested = true;
                    requestAnimationFrame(this._real_update.bind(this));
            }
        }
    }

    _real_update() {
        this.control_trackball.handleResize();
        if (this.control_external) {
            this.control_external.update();
            // it's very likely the controller will update the camera, so we sync it to the kernel
            this.camera.ipymodel.syncToModel(true);
        }

        this._update_requested = false;
        // since the threejs animation system can update the camera,
        // make sure we keep looking at the center (only for ipyvolume's own control)
        if (!this.control_external) {
            this.camera.lookAt(0, 0, 0);
        }
        for (const scatter_view of Object.values(this.scatter_views)) {
            scatter_view.uniforms.aspect.value = this.model.get('box_size');
        }

        this.renderer.setClearColor(this.get_style_color("background-color"), this.get_style("background-opacity"));
        this.x_axis.visible = this.get_style("axes.x.visible axes.visible");
        this.y_axis.visible = this.get_style("axes.y.visible axes.visible");
        this.z_axis.visible = this.get_style("axes.z.visible axes.visible");
        this.axes_material.color = this.get_style_color("axes.color");
        this.xaxes_material.color = this.get_style_color("axes.x.color axes.color");
        this.yaxes_material.color = this.get_style_color("axes.y.color axes.color");
        this.zaxes_material.color = this.get_style_color("axes.z.color axes.color");

        this.axes_data[0].fillStyle = this.get_style("axes.x.color axes.color");
        this.axes_data[1].fillStyle = this.get_style("axes.y.color axes.color");
        this.axes_data[2].fillStyle = this.get_style("axes.z.color axes.color");

        this.axes_data[0].label = this.model.get("xlabel");
        this.axes_data[1].label = this.model.get("ylabel");
        this.axes_data[2].label = this.model.get("zlabel");

        this.wire_box.visible = this.get_style("box.visible");
        this.wire_box_x_line.visible = !this.x_axis.visible && this.wire_box.visible;
        this.wire_box_y_line.visible = !this.y_axis.visible && this.wire_box.visible;
        this.wire_box_z_line.visible = !this.z_axis.visible && this.wire_box.visible;

        d3.select(this.el_axes).selectAll(".ipyvol-axis")
            .data(this.axes_data)
            .each(bind_d3(this._d3_update_axis, this))
            .enter()
            .append("div")
            .attr("class", "ipyvol-axis")
            .each(bind_d3(this._d3_add_axis, this));

        const that = this;
        this.ticks = 5;

        function last_tick_selection_data(d, i, node) {
            let child_data = d.ticks;
            if (child_data) {
                child_data = d.ticks = child_data.slice();
                const ticks = d.scale.ticks(that.ticks);

                // ticks may return a larger array, so grow child data
                while (child_data.length < ticks.length) {
                    child_data.push({});
                }
                // ticks may return a smaller array, so pop child data
                while (child_data.length > ticks.length) {
                    child_data.pop();
                }

                // _.each(ticks, (tick, i) => {
                for (let j = 0; j < ticks.length; j++) {
                    child_data[j].value = ticks[j];
                }
                return child_data;
            } else {
                const scale = d.scale;
                const ticks = scale.ticks(that.ticks);
                child_data = ticks.map((value) => ({value}));
                d.ticks = child_data;
                return child_data;
            }
        }

        this.last_tick_selection = d3.select(this.el_axes)
            .selectAll(".ipyvol-axis")
            .data(this.axes_data)
            .selectAll(".ipyvol-tick")
            .data(last_tick_selection_data);

        this.last_tick_selection
            .each(bind_d3(this._d3_update_axis_tick, this))
            .enter()
            .append("div")
            .attr("class", "ipyvol-tick")
            .each(bind_d3(this._d3_add_axis_tick, this));

        this.last_tick_selection
            .exit()
            .remove()
            .each(bind_d3(this._d3_remove_axis_tick, this));

        const transitions_todo = [];
        for (const t of this.transitions) {
            if (!t.is_done()) {
                transitions_todo.push(t);
            }
            t.update();
        }

        this.renderer.clear();
        if (!this.model.get("stereo")) {
            this._render_eye(this.camera);
        } else {
            const size = this.renderer.getSize();
            if (this.camera.parent === null) { this.camera.updateMatrixWorld(); }
            this.camera_stereo.eyeSep = this.model.get("eye_separation") / 100.;
            this.camera.focus = this.camera.focus;
            this.camera_stereo.update(this.camera);

            // the 360 rendering uses the position and quaternion, not the matrices
            this.camera_stereo.cameraL.position.copy(this.camera.position);
            this.camera_stereo.cameraR.position.copy(this.camera.position);
            this.camera_stereo.cameraL.quaternion.copy(this.camera.quaternion);
            this.camera_stereo.cameraR.quaternion.copy(this.camera.quaternion);
            // and up is used for lookAt
            this.camera_stereo.cameraL.up.copy(this.camera.up);
            this.camera_stereo.cameraR.up.copy(this.camera.up);

            // default is to render left left, and right right
            // in 360 mode, left is rendered top, right bottom
            const panorama = this.model.get("panorama_mode") !== "no";
            // left eye
            this.renderer.setScissorTest(true);
            if (panorama) {
                this.renderer.setScissor(0, 0, size.width, size.height / 2);
                this.renderer.setViewport(0, 0, size.width, size.height / 2);
            } else {
                this.renderer.setScissor(0, 0, size.width / 2, size.height);
                this.renderer.setViewport(0, 0, size.width / 2, size.height);
            }

            this._render_eye(this.camera_stereo.cameraL);

            // right eye
            if (panorama) {
                this.renderer.setScissor(0, size.height / 2, size.width, size.height / 2);
                this.renderer.setViewport(0, size.height / 2, size.width, size.height / 2);
            } else {
                this.renderer.setScissor(size.width / 2, 0, size.width / 2, size.height);
                this.renderer.setViewport(size.width / 2, 0, size.width / 2, size.height);
            }

            this._render_eye(this.camera_stereo.cameraR);

            this.renderer.setScissorTest(false);
            this.renderer.setViewport(0, 0, size.width, size.height);
        }
        if (this.selector) {
            this.selector.draw();
        } // TODO: what to do with stereo rendering?
        this.transitions = transitions_todo;
        if (this.transitions.length > 0) {
            this.update();
        }
        if (this.model.get("render_continuous")) {
            this.update();
        }
        if (this.model.get("scene")) {
            this.model.get("scene").trigger("afterRender", this.scene, this.renderer, this.camera);
        }
    }

    get_style_color(name) {
        const style = this.get_style(name);
        if (style) {
            return new THREE.Color(style);
        } else {
            console.error("could not find color for", name);
        }
    }

    get_style(name: string) {
        const value = [null];
        const sep = " ";
        name.split(sep).forEach((property_string) => {
            const value_found = property_string.split(".").reduce((object, property) => {
                if (object !== null && object[property] !== undefined) {
                    return object[property];
                } else {
                    return null;
                }
            }, this.model.get("style"));
            if (value_found !== null && value[0] === null) {
                value[0] = value_found;
            }
        }, this);

        return value[0];
    }

    _render_eye(camera) {
        this.camera.updateMatrixWorld();
        let volumes = this.model.get("volumes") as VolumeModel[];
        volumes = volumes.filter((volume) => volume.get("visible"))
        const has_volumes = volumes.length !== 0;
        const panorama = this.model.get("panorama_mode") !== "no";
        // record who is visible
        const wasVisible = this.rootObject.children.reduce((map, o) => {
            map[o.id] = o.visible
            return map;
        }, {});
        const setVisible = ({volumes}) => {
            this.rootObject.children.forEach((o) => {
                if(volumes) {
                    //@ts-ignore
                    o.visible = Boolean(o.isVolume) || Boolean(o.isLight) || Boolean(o.isCamera)
                } else {
                   //@ts-ignore
                   o.visible = !Boolean(o.isVolume)
                }
                if(o === this.front_box_mesh)
                    this.front_box_mesh.visible = false;
            })
        };
        const restoreVisible = () => {
            this.rootObject.children.forEach((o) => {
                o.visible = wasVisible[o.id];
            });
        };

        // set material to rgb
        for (const scatter_view of Object.values(this.scatter_views)) {
            scatter_view.set_scales(this.model.get("scales"));
        }
        for (const mesh_view of Object.values(this.mesh_views)) {
            mesh_view.set_scales(this.model.get("scales"));
        }

        if (panorama) {
            (this.cube_camera as any).clear(this.renderer, true, true, true);
            this.renderer.autoClear = false;
            this.cube_camera.position.copy(camera.position);
            this.cube_camera.rotation.copy(camera.rotation);
            this.cube_camera.quaternion.copy(this.camera.quaternion);

            if (this.model.get("stereo")) {
                // we do 'toe in' http://paulbourke.net/papers/vsmm2006/vsmm2006.pdf
                // which should be fine with spherical screens or projections right?
                // as opposed to what is described here http://paulbourke.net/stereographics/stereorender/
                const displacement = new THREE.Vector3(0.0, 0, 0);
                if (camera === this.camera_stereo.cameraR) {
                    displacement.x += 0.032;
                }
                if (camera === this.camera_stereo.cameraL) {
                    displacement.x -= 0.032;
                }
                displacement.applyQuaternion(camera.quaternion);
                this.cube_camera.position.add(displacement);
                const focal_point = new THREE.Vector3(0, 0, 1 * this.camera.focus); // neg z points in screen
                focal_point.applyQuaternion(camera.quaternion);
                this.cube_camera.lookAt(focal_point);
            }

            this.cube_camera.update(this.renderer, this.scene); // TODO: but do we render volumes?
            this.cube_camera.update(this.renderer, this.scene_opaque);
            // TODO: typescript seems to disagree with types here
            (this.screen_texture as any) = this.cube_camera.renderTarget;
            this.renderer.render(this.screen_scene_cube, this.screen_camera);
            return;
        }

        // we always render the front
        this.rootObject.children.forEach((o) => {
            o.visible = false;
        })
        this.front_box_mesh.visible = true;
        (this.front_box_mesh.material as THREE.ShaderMaterial).side  = THREE.FrontSide;
        this.renderer.setRenderTarget(this.volume_front_target);
        this.renderer.clear(true, true, true);
        this.renderer.render(this.scene, camera);
        this.front_box_mesh.visible = false;


        // render the back coordinates of the box
        if (has_volumes) {
            // to render the back sides of the boxes, we need to invert the z buffer value
            // and invert the test
            this.renderer.state.buffers.depth.setClear(0);
            for (const volume_model of volumes) {
                volume_model.box_material.side = THREE.BackSide;
                volume_model.box_material.depthFunc = THREE.GreaterDepth;
                volume_model.vol_box_mesh.material = volume_model.box_material;
                volume_model.set_scales(this.model.get("scales"));
            }
            this.renderer.setRenderTarget(this.volume_back_target);
            this.renderer.clear(true, true, true);
            setVisible({volumes: true});
            this.renderer.render(this.scene, camera);
            this.renderer.state.buffers.depth.setClear(1);

            // Color and depth render pass for volume rendering
            this.renderer.autoClear = false;
            this.renderer.setRenderTarget(this.geometry_depth_target);
            this.renderer.clear(true, true, true);
            setVisible({volumes: false});
            this.renderer.render(this.scene, camera);
            this.renderer.render(this.scene_opaque, camera);
            this.renderer.autoClear = true;
        }

        // Normal color pass of geometry for final screen pass
        this.renderer.autoClear = false;
        // in AR mode we directly need to render to the screen
        this.renderer.setRenderTarget(this.in_ar_mode ? null : this.color_pass_target);
        this.renderer.clear(true, true, true);
        setVisible({volumes: false});
        this.renderer.render(this.scene, camera);
        this.renderer.render(this.scene_opaque, camera);
        this.renderer.autoClear = true;

        if (has_volumes) {
            // render the box front once, without writing the colors
            // so that once we render the box again, each fragment will be processed
            // once.
            this.renderer.context.colorMask(0, 0, 0, 0);
            for (const volume_model of volumes) {
                volume_model.box_material.side = THREE.FrontSide;
                volume_model.box_material.depthFunc = THREE.LessEqualDepth;
            }
            this.renderer.autoClear = false;
            this.renderer.setRenderTarget(this.color_pass_target);
            this.renderer.clear(false, true, false);
            setVisible({volumes: true});
            this.renderer.render(this.scene, camera);
            this.renderer.autoClear = true;
            this.renderer.context.colorMask(true, true, true, true);

            // TODO: if volume perfectly overlap, we render it twice, use polygonoffset and LESS z test?
            for (const volume_model of volumes) {
                volume_model.vol_box_mesh.material = this.material_multivolume;
                // volume_view.set_geometry_depth_tex(this.geometry_depth_target.depthTexture)
            }
            this.renderer.autoClear = false;
            // we want to keep the colors and z-buffer as they are
            this.renderer.setRenderTarget(this.color_pass_target);
            // threejs does not want to be called with all three false
            // this.renderer.clear(false, false, false);
            setVisible({volumes: true});
            this.renderer.render(this.scene, camera);
            this.renderer.autoClear = true;
        }

        // set RGB material for coordinate texture render
        for (const scatter_view of Object.values(this.scatter_views)) {
            scatter_view.mesh.material = scatter_view.mesh.material_rgb;
        }
        for (const mesh_view of Object.values(this.mesh_views)) {
            mesh_view.meshes.forEach((threejs_mesh) => {
                threejs_mesh.material = threejs_mesh.material_rgb;
            });
        }

        // we also render this for the zoom coordinate
        this.renderer.autoClear = false;
        this.renderer.setClearAlpha(0);
        this.renderer.setRenderTarget(this.coordinate_target);
        this.renderer.clear(true, true, true);
        setVisible({volumes: false});
        this.renderer.render(this.scene, camera);
        this.renderer.autoClear = true;

        // id pass
        // set ID material for coordinate texture render
        for (const scatter_view of Object.values(this.scatter_views)) {
            scatter_view.mesh.material = scatter_view.mesh.material_id;
        }
        for (const mesh_view of Object.values(this.mesh_views)) {
            mesh_view.meshes.forEach((threejs_mesh) => {
                threejs_mesh.material = threejs_mesh.material_id;
            });
        }

        // we also render this for the ids
        this.renderer.autoClear = false;
        this.renderer.setClearAlpha(0);
        this.renderer.setRenderTarget(this.id_pass_target);
        this.renderer.clear(true, true, true);
        setVisible({volumes: false});
        this.renderer.render(this.scene, camera);
        this.renderer.autoClear = true;

        // now we render the weighted coordinate for the volumetric data
        // make sure where we don't render, alpha = 0
        if (has_volumes) {
            // render again, but now with depth material
            // TODO: this render pass is only needed when the coordinate is required
            // we slow down by a factor of 2 by always doing this
            this.renderer.context.colorMask(0, 0, 0, 0);
            for (const volume_model of volumes) {
                volume_model.box_material.side = THREE.FrontSide;
                volume_model.box_material.depthFunc = THREE.LessEqualDepth;
            }
            this.renderer.autoClear = false;
            this.renderer.setRenderTarget(this.color_pass_target);
            this.renderer.clear(false, true, false);
            setVisible({volumes: true});
            this.renderer.render(this.scene, camera);
            this.renderer.autoClear = true;
            this.renderer.context.colorMask(true, true, true, true);

            // TODO: if volume perfectly overlap, we render it twice, use polygonoffset and LESS z test?
            for (const volume_model of volumes) {
                volume_model.vol_box_mesh.material = this.material_multivolume_depth;
                // volume_view.set_geometry_depth_tex(this.geometry_depth_target.depthTexture)
            }
            this.renderer.autoClear = false;
            // we want to keep the colors and z-buffer as they are
            this.renderer.setRenderTarget(this.color_pass_target);
            // threejs does not want to be called with all three false
            // this.renderer.clear(false, false, false);
            setVisible({volumes: true});
            this.renderer.render(this.scene, camera);
            this.renderer.autoClear = true;

        }

        // restore materials
        for (const scatter_view of Object.values(this.scatter_views)) {
            scatter_view.mesh.material = scatter_view.mesh.material_normal;
        }
        for (const mesh_view of Object.values(this.mesh_views)) {
            mesh_view.meshes.forEach((threejs_mesh) => {
                threejs_mesh.material = threejs_mesh.material_normal;
            });
        }

        if(!this.in_ar_mode) {
            if(this.model.get("show") == "Shadow") {
                this._render_shadow();
            } else {
                // render to screen
                this.screen_texture = {
                    render: this.color_pass_target,
                    front: this.volume_front_target,
                    back: this.volume_back_target,
                    // Geometry_back: this.geometry_depth_target,
                    coordinate: this.coordinate_target,
                    id: this.id_pass_target,
                }[this.model.get("show")];
                // TODO: remove any
                this.screen_material.uniforms.tex.value = (this.screen_texture as any).texture;

                this.renderer.setRenderTarget(null);
                this.renderer.clear(true, true, true);
                this.renderer.render(this.screen_scene, this.screen_camera);
            }
        }
        restoreVisible();
    }

    _render_shadow() {
        const lights =  this.model.get('lights').map((model) => model.obj).filter((light) => {
            return Boolean(light.shadow) && Boolean(light.shadow.map);
        });
        if(lights.length == 0) {
            throw "No light with a shadow map found."
        }
        const light = lights[0];
        const target = light.shadow.map.texture;
        const textureWidth = target.width;
        const textureHeight = target.height;
        const quadCamera = new THREE.OrthographicCamera (textureWidth / - 2, textureHeight / 2, textureWidth / 2, textureHeight / - 2, -1000, 1000);
        quadCamera.position.z = 100;
        var quadScene = new THREE.Scene();

        const _shaders = this.model.get("_shaders");
        const fragmentShader = _shaders["shadow-fragment"] || shaders["shadow-fragment"];
        const vertexShader = _shaders["shadow-vertex"] || shaders["shadow-vertex"];

        const quadMaterial = new THREE.ShaderMaterial ({
            uniforms: {
                map: { type: "t", value: null },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthTest: false,
            depthWrite: false,
        });

        quadScene.add(new THREE.Mesh (new THREE.PlaneGeometry (textureWidth, textureHeight), quadMaterial));
        quadMaterial.uniforms.map.value = target;
        this.renderer.render(quadScene, quadCamera);
    }

    rebuild_multivolume_rendering_material() {
        let volumes = this.model.get("volumes") as VolumeModel[];
        volumes = volumes.filter((volume) => volume.get("visible"))

        const material = this.material_multivolume;
        const material_depth = this.material_multivolume_depth;
        let count_normal = 0;
        let count_max_int = 0;
        material.uniforms.volumes.value = [];
        material.uniforms.volumes_max_int.value = [];
        material.uniforms.data.value = [];
        material.uniforms.data_max_int.value = [];
        material.uniforms.transfer_function.value = [];
        material.uniforms.transfer_function_max_int.value = [];
        material.uniforms.steps.value = volumes.map((volume) => {
            const volume_view = this.volume_views[volume.cid];
            return volume_view ? volume_view.get_ray_steps() : 0;
        });

        if (volumes.length === 0) {
            return;
        }

        for (const volume_model of volumes) {
            if (volume_model.is_normal()) {
                count_normal++;
                material.uniforms.volumes.value.push(volume_model.uniform_volumes_values);
                material.uniforms.data.value.push(volume_model.uniform_data.value[0]);
                material.uniforms.transfer_function.value.push(volume_model.uniform_transfer_function.value[0]);
            } else {
                count_max_int++;
                material.uniforms.volumes_max_int.value.push(volume_model.uniform_volumes_values);
                material.uniforms.data_max_int.value.push(volume_model.uniform_data.value[0]);
                material.uniforms.transfer_function_max_int.value.push(volume_model.uniform_transfer_function.value[0]);
            }
        }
        material.defines.VOLUME_COUNT = count_normal;
        material.defines.VOLUME_COUNT_MAX_INT = count_max_int;
        material.lights = true;
        material_depth.defines.VOLUME_COUNT = count_normal;
        material_depth.defines.VOLUME_COUNT_MAX_INT = count_max_int;

        const mustache_render = (template_shader) => {
            const view = {
                volumes: range(count_normal),
                volumes_max_int: range(count_max_int),
            };
            return Mustache.render(template_shader, view);
        };
        const _shaders = this.model.get("_shaders");
        material_depth.fragmentShader = material.fragmentShader = patchShader(mustache_render(_shaders["volr-fragment"] || shaders["volr-fragment"]));
        material_depth.vertexShader = material.vertexShader = patchShader(_shaders["volr-vertex"] || shaders["volr-vertex"]);
        material_depth.needsUpdate = material.needsUpdate = true;
    }

    update_light() {
        this.material_multivolume.uniforms.ambient_coefficient.value = this.model.get("ambient_coefficient");
        this.material_multivolume.uniforms.diffuse_coefficient.value = this.model.get("diffuse_coefficient");
        this.material_multivolume.uniforms.specular_coefficient.value = this.model.get("specular_coefficient");
        this.material_multivolume.uniforms.specular_exponent.value = this.model.get("specular_exponent");
        this.update();
    }

    update_size() {
        this._update_size();
    }

    _update_size(skip_update?, custom_width?, custom_height?) {
        let width;
        let height;
        const el = this.renderer.domElement;
        if (this.is_fullscreen()) {
            width = custom_width || el.clientWidth;
            height = custom_height || el.clientHeight;
        } else {
            width = custom_width || this.model.get("width");
            height = custom_height || this.model.get("height");
        }

        // the offscreen rendering can be of lower resolution
        let render_width = width * this.renderer.getPixelRatio();
        let render_height = height * this.renderer.getPixelRatio();
        const display_width = width * this.model.get("displayscale");
        const display_height = height * this.model.get("displayscale");
        if (this.is_fullscreen() && this.model.get("volumes") !== 0) {
            // fullscreen volume rendering is slow, respect width and height
            render_width = custom_width || this.model.get("width");
            render_height = custom_height || this.model.get("height");
        }
        this.renderer.setSize(width, height, false);
        const buffer_width = this.renderer.context.drawingBufferWidth;
        const buffer_height = this.renderer.context.drawingBufferHeight;
        if ((buffer_width < width) || (buffer_height < height)) {
            console.info("could not set resolution to", width, height, ", resolution is", buffer_width, buffer_height);
        }

        this.renderer.domElement.style.width = display_width + "px";
        this.renderer.domElement.style.height = display_height + "px";
        this.canvas_container.style.width = display_width + "px";
        this.canvas_container.style.height = display_height + "px";
        this.canvas_overlay.style.width = display_width + "px";
        this.canvas_overlay.style.height = display_height + "px";
        this.canvas_overlay.width = width;
        this.canvas_overlay.height = height;

        if (this.model.get("stereo")) {
            render_width /= 2;
        }
        const aspect = render_width / render_height;
        this.camera.aspect = aspect;
        // TODO: should we now update the camera object?
        // this.camera.width = render_width
        // this.camera.height = render_height
        this.camera.updateProjectionMatrix();

        this.material_multivolume.uniforms.render_size.value = [render_width, render_height];

        this.volume_back_target.setSize(render_width, render_height);
        this.volume_front_target.setSize(render_width, render_height);
        this.geometry_depth_target.setSize(render_width, render_height);
        this.color_pass_target.setSize(render_width, render_height);
        this.screen_pass_target.setSize(render_width, render_height);
        this.coordinate_target.setSize(render_width, render_height);
        this.id_pass_target.setSize(render_width, render_height);

        this.screen_texture = this.color_pass_target.texture;
        if (!skip_update) {
            this.update();
        }
    }

    getRenderSize() {
        const render_size = this.renderer.getSize();
        return [render_size.width, render_size.width];
    }

    fullscreen() {
        screenfull.request(this.el);
    }

    is_fullscreen() {
        return screenfull.element === this.renderer.domElement;
    }
}

export
class WidgetManagerHackModel extends widgets.WidgetModel {
    static __super__: any;
    defaults() {
        return {...super.defaults(),
            _model_name: "WidgetManagerHackModel",
            _model_module: "ipyvolume",
            _model_module_version: semver_range,
        };
    }

    initialize(attributes, options) {
        console.log(this);
        super.initialize(attributes, options);
        console.info("get reference to widget manager");
        (window as any).jupyter_widget_manager = this.widget_manager;
        (window as any).jupyter_widgets = widgets;
    }
}

//////////////////
// WEBPACK FOOTER
// ./src/volume.js
// module id = 1
// module chunks = 0
