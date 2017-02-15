define(["jupyter-js-widgets", "underscore", "three", "gl-matrix"],
        function(widgets, _, THREE, glm) {

// same strategy as: ipywidgets/jupyter-js-widgets/src/widget_core.ts, except we use ~
// so that N.M.x is allowed (we don't care about x, but we assume 0.2.x is not compatible with 0.3.x
var semver_range = `~${require('../package.json').version}`

//
window.THREE = THREE;
//window.THREEx = {};
require("./three/OrbitControls.js")
require("./three/DeviceOrientationControls.js")
require("./three/StereoEffect.js")
require("./three/THREEx.FullScreen.js")

var shaders = {}
shaders["cube_fragment"] = require('../glsl/cube-fragment.glsl');
shaders["cube_vertex"] = require('../glsl/cube-vertex.glsl');
shaders["box_fragment"] = require('../glsl/box-fragment.glsl');
shaders["box_vertex"] = require('../glsl/box-vertex.glsl');
shaders["texture_fragment"] = require('../glsl/texture-fragment.glsl');
shaders["texture_vertex"] = require('../glsl/texture-vertex.glsl');
shaders["volr_fragment"] = require('../glsl/volr-fragment.glsl');
shaders["volr_vertex"] = require('../glsl/volr-vertex.glsl');
shaders["screen_fragment"] = require('../glsl/screen-fragment.glsl');
shaders["screen_vertex"] = require('../glsl/screen-vertex.glsl');

var TransferFunctionView = widgets.DOMWidgetView.extend( {
    render: function() {
        this.img = document.createElement('img');
        this.img.setAttribute('src', this.model.get('rgba'));
        this.img.setAttribute('style', this.model.get('style'));
        this.model.on('change:rgba', function() {
            console.log("set src")
            console.log(this.model.get('rgba'))
            this.img.setAttribute('src', this.model.get('rgba'));
        }, this);
        this.model.on('change:style', function() {
            this.img.setAttribute('style', this.model.get('style'));
        }, this);
        this.el.appendChild(this.img);
        console.log(this.model.get('r'))
    },
});

var TransferFunctionModel = widgets.DOMWidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name : 'TransferFunctionModel',
            _view_name : 'TransferFunctionView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            _model_module_version: semver_range,
            _view_module_version: semver_range,
        })
    }
});


var TransferFunctionJsBumpsModel  = TransferFunctionModel.extend({
    defaults: function() {
        return _.extend(TransferFunctionModel.prototype.defaults(), {
            _model_name : 'TransferFunctionJsBumpsModel',
            levels: [0.1, 0.5, 0.8],
            opacities: [0.01, 0.05, 0.1],
            widths: [0.1, 0.1, 0.1]
        })
    },
    initialize: function() {
        TransferFunctionJsBumpsModel.__super__.initialize.apply(this, arguments);
        this.on("change:levels", this.recalculate_rgba, this);
        this.on("change:opacities", this.recalculate_rgba, this);
        this.on("change:widths", this.recalculate_rgba, this);
        this.recalculate_rgba()
    },
    recalculate_rgba: function() {
        console.log("recalc rgba")
        var rgba = []
        var colors = [[1,0,0], [0,1,0], [0,0,1]]
        var levels = this.get("levels")
        var widths = this.get("widths")
        var opacities = this.get("opacities")
        window.rgba = rgba
        window.tfjs = this
        var N = 256
        for(var i = 0; i < N; i++) {
            var x = i/(N-1);
			var color = [0, 0, 0, 0]; // red, green, blue and alpha
            for(var j = 0; j < levels.length; j++) {
                var basecolor = colors[j]
				var intensity = Math.exp(-(Math.pow(x-levels[j],2) / Math.pow(widths[j], 2)))
				for(var k = 0; k < 3; k++) {
				    color[k] += (basecolor[k] * intensity * opacities[j])
				}
                color[3] += intensity * opacities[j]
            }
            var max_value = color[0];
            for(var k = 1; k < 3; k++) {
                max_value = Math.max(max_value, color[k])
            }
            for(var k = 0; k < 3; k++) {
                color[k] = Math.min(1, color[k]/max_value); // normalize and clip to 1
            }
            color[3] = Math.min(1, color[3]); // clip alpha
            rgba.push(color)
        }
        this.set("rgba", rgba)
    }
});

var TransferFunctionWidgetJs3Model  = TransferFunctionModel.extend({
    defaults: function() {
        return _.extend(TransferFunctionModel.prototype.defaults(), {
            _model_name : 'TransferFunctionWidgetJs3Model',
            level1: 0.1,
            level2: 0.5,
            level3: 0.8,
            opacity1: 0.01,
            opacity2: 0.05,
            opacity3: 0.1,
            width1: 0.1,
            width2: 0.1,
            width3: 0.1
        })
    },
    initialize: function() {
        TransferFunctionWidgetJs3Model.__super__.initialize.apply(this, arguments);
        this.on("change:level1", this.recalculate_rgba, this);
        this.on("change:level2", this.recalculate_rgba, this);
        this.on("change:level3", this.recalculate_rgba, this);
        this.on("change:opacity1", this.recalculate_rgba, this);
        this.on("change:opacity2", this.recalculate_rgba, this);
        this.on("change:opacity3", this.recalculate_rgba, this);
        this.on("change:width1", this.recalculate_rgba, this);
        this.on("change:width2", this.recalculate_rgba, this);
        this.on("change:width3", this.recalculate_rgba, this);
        this.recalculate_rgba()
    },
    recalculate_rgba: function() {
        var rgba = []
        var colors = [[1,0,0], [0,1,0], [0,0,1]]
        var levels = [this.get("level1"), this.get("level2"), this.get("level3")]
        var widths = [this.get("width1"), this.get("width2"), this.get("width3")]
        var opacities = [this.get("opacity1"), this.get("opacity2"), this.get("opacity3")]
        var N = 256
        for(var i = 0; i < N; i++) {
            var x = i/(N-1);
			var color = [0, 0, 0, 0]; // red, green, blue and alpha
            for(var j = 0; j < 3; j++) {
                var basecolor = colors[j]
				var intensity = Math.exp(-(Math.pow(x-levels[j],2) / Math.pow(widths[j], 2)))
				for(var k = 0; k < 3; k++) {
				    color[k] += (basecolor[k] * intensity * opacities[j])
				}
                color[3] += intensity * opacities[j]
            }
            var max_value = color[0];
            for(var k = 1; k < 3; k++) {
                max_value = Math.max(max_value, color[k])
            }
            for(var k = 0; k < 3; k++) {
                color[k] = Math.min(1, color[k]/max_value); // normalize and clip to 1
            }
            color[3] = Math.min(1, color[3]); // clip alpha
            rgba.push(color)
        }
        this.set("rgba", rgba)
    },
    get_data_array: function() {
        var flat_array = [];
        var rgba = this.get("rgba")
        for(var i = 0; i < rgba.length; i++) {
            for(var j = 0; j < 4; j++) {
              flat_array.push(rgba[i][j]*255)
            }
        }
        var transfer_function_uint8_array = new Uint8Array(flat_array);
        // REMOVE: for debugging
        //window.transfer_function_uint8_array = transfer_function_uint8_array
        //window.flat_array = flat_array
        return transfer_function_uint8_array
    },

});


var ScatterView = widgets.WidgetView.extend( {
    render: function() {
        console.log("created scatter view, parent is")
        console.log(this.options.parent)
        this.renderer = this.options.parent;
        this.previous_values = {}
        this.attributes_changed = {}

        console.log("create scatter")

        this.geo_diamond = new THREE.SphereGeometry(1, 2, 2)
        this.geo_sphere = new THREE.SphereGeometry(1, 12, 12)
        this.geo_box = new THREE.BoxGeometry(1, 1, 1)
        //this.geo = new THREE.ConeGeometry(0.2, 1)
        this.geo_arrow = new THREE.CylinderGeometry(0, 0.2, 1)
        this.geos = {
            diamond: this.geo_diamond,
            box: this.geo_box,
            arrow: this.geo_arrow,
            sphere: this.geo_sphere,
        }

        this.material = new THREE.RawShaderMaterial({
            uniforms: {
                xlim : { type: "2f", value: [0., 1.] },
                ylim : { type: "2f", value: [0., 1.] },
                zlim : { type: "2f", value: [0., 1.] },
                animation_time_x : { type: "f", value: 1. },
                animation_time_y : { type: "f", value: 1. },
                animation_time_z : { type: "f", value: 1. },
                animation_time_vx : { type: "f", value: 1. },
                animation_time_vy : { type: "f", value: 1. },
                animation_time_vz : { type: "f", value: 1. },
                animation_time_size : { type: "f", value: 1. },
                animation_time_color : { type: "f", value: 1. },
            },
            vertexShader: require('../glsl/scatter-vertex.glsl'),
            fragmentShader: require('../glsl/scatter-fragment.glsl')
            })

        this.material_rgb = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader: "#define USE_RGB\n"+require('../glsl/scatter-vertex.glsl'),
            fragmentShader: "#define USE_RGB\n"+require('../glsl/scatter-fragment.glsl')
            })
        this.create_mesh()
        this.add_to_scene()
        this.model.on("change:size change:size_selected change:color change:color_selected change:x change:y change:z change:selected change:vx change:vy change:vz",   this.on_change, this)
        this.model.on("change:geo", this.update, this)
    },
    set_limits: function(limits) {
        _.mapObject(limits, function(value, key) {
            this.material.uniforms[key].value = value
        }, this)
    },
    add_to_scene: function() {
        console.log("add")
        console.log(this.mesh)
        //console.log(this.mesh instanceof THREE.Object3D)
        this.renderer.scene_scatter.add(this.mesh)
    },
    remove_from_scene: function() {
        this.renderer.scene_scatter.remove(this.mesh)
    },
    on_change: function(attribute) {
        _.mapObject(this.model.changedAttributes(), function(val, key){
            console.log("changed " +key)
            this.previous_values[key] = this.model.previous(key)
            // we treat changes in _selected attributes the same
            var key_animation = key.replace("_selected", "")
            if(key_animation == "geo") {
                // direct change, no animation
            } if(key_animation == "selected") { // and no explicit animation on this one
                this.attributes_changed["color"] = [key]
                this.attributes_changed["size"] = []
            } else {
                this.attributes_changed[key_animation] = [key]
                // animate the size as well on x y z changes
                if(["x", "y", "z", "vx", "vy", "vz"].indexOf(key) != -1) {
                    //console.log("adding size to list of changed attributes")
                    this.attributes_changed["size"] = []
                }
            }
        }, this)
        this.update()
    },
    update: function() {
        console.log("update scatter")
        this.remove_from_scene()
        this.create_mesh()
        this.add_to_scene()
        this.renderer.update()
    },
    create_mesh: function() {
        console.log("previous values: ")
        console.log(this.previous_values)
        var geo = this.model.get("geo")
        console.log(geo)
        if(!geo)
            geo = "diamond"
        var buffer_geo = new THREE.BufferGeometry().fromGeometry(this.geos[geo]);
        var instanced_geo = new THREE.InstancedBufferGeometry();

        var vertices = buffer_geo.attributes.position.clone();
        instanced_geo.addAttribute( 'position', vertices );

        var x = this.model.get("x");
        var y = this.model.get("y");
        var z = this.model.get("z");
        var vx = this.model.get("vx");
        var vy = this.model.get("vy");
        var vz = this.model.get("vz");
        //var has_previous_xyz = this.previous_values["x"] && this.previous_values["y"] && this.previous_values["z"]
        var count = Math.min(x.length, y.length, z.length);
        var vcount = 0
        if(vx && vy && vz) {
            vcount = Math.min(vx.length, vy.length, vz.length)
            count = Math.min(count, vcount)
        }
        vx = vx || [];
        vy = vy || [];
        vz = vz || [];

        var count_previous = count;
        console.log("count: " +count)
        if(this.previous_values["x"])
            count_previous = Math.min(this.previous_values["x"].length, count_previous)
        if(this.previous_values["y"])
            count_previous = Math.min(this.previous_values["y"].length, count_previous)
        if(this.previous_values["z"])
            count_previous = Math.min(this.previous_values["z"].length, count_previous)
        console.log("count_previous: " +count_previous)
        var max_count = Math.max(count, count_previous);
        console.log("max_count: " +max_count)

        //previous offsets
        var x_previous = this.previous_values["x"] || x;
        var y_previous = this.previous_values["y"] || y;
        var z_previous = this.previous_values["z"] || z;

        var vcount_previous = vcount;
        console.log("vcount: " +vcount)
        if(this.previous_values["vx"])
            count_previous = Math.min(this.previous_values["vx"].length, vcount_previous)
        if(this.previous_values["vy"])
            count_previous = Math.min(this.previous_values["vy"].length, vcount_previous)
        if(this.previous_values["vz"])
            count_previous = Math.min(this.previous_values["vz"].length, vcount_previous)
        console.log("vcount_previous: " +vcount_previous)
        var vmax_count = Math.max(vcount, vcount_previous);
        console.log("vmax_count: " +vmax_count)

        //previous offsets
        var vx_previous = this.previous_values["vx"] || vx;
        var vy_previous = this.previous_values["vy"] || vy;
        var vz_previous = this.previous_values["vz"] || vz;


        // offsets
        var offsets = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var offsets_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
	    for(var i = 0; i < max_count; i++) {
	        if(i < count)
	            offsets.setXYZ(i, x[i], y[i], z[i]);
	        else
	            offsets.setXYZ(i, x_previous[i], y_previous[i], z_previous[i]);
	        if(i < count_previous)
	            offsets_previous.setXYZ(i, x_previous[i], y_previous[i], z_previous[i]);
	        else
	            offsets_previous.setXYZ(i, x[i], y[i], z[i]);
	    }
        instanced_geo.addAttribute( 'position_offset', offsets );
        instanced_geo.addAttribute( 'position_offset_previous', offsets_previous );

        // vectors
        var vector = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var vector_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        for(var i = 0; i < max_count; i++) {
            if(i < vcount)
                vector.setXYZ(i, vx[i], vy[i], vz[i]);
            else
                vector.setXYZ(i, 0, 1, 0);
            if(i < vcount_previous)
                vector_previous.setXYZ(i, vx_previous[i], vy_previous[i], vz_previous[i]);
            else
                vector_previous.setXYZ(i, 0, 1, 0);
        }
        instanced_geo.addAttribute( 'vector', vector );
        instanced_geo.addAttribute( 'vector_previous', vector_previous );

        var selected = this.model.get("selected") || []
        var selected_previous = "selected" in this.previous_values ? this.previous_values["selected"] : selected;

        var scales = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var scales_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var size = this.model.get("size")
        var size_selected = this.model.get("size_selected")
        var size_previous = "size" in this.previous_values ? this.previous_values["size"] : size;
        var size_selected_previous = "size_selected" in this.previous_values ? this.previous_values["size_selected"] : size_selected;
        if(size_previous  == undefined)
            size_previous  = size;
        if(size_selected_previous  == undefined)
            size_selected_previous  = size_selected;
	    for(var i = 0; i < max_count; i++) {
	        var cur_size = size;
	        var cur_size_previous = size_previous;
	        if(selected.indexOf(i) != -1)
	            cur_size = size_selected
	        if(selected_previous.indexOf(i) != -1)
	            cur_size_previous = size_selected_previous
	        if(i < count)
    	        scales.setX(i, cur_size);
    	    else
    	        scales.setX(i, 0.);
	        if(i < count_previous)
    	        scales_previous.setX(i, cur_size_previous);
    	    else
    	        scales_previous.setX(i, 0.);
	    }
        instanced_geo.addAttribute( 'scale', scales);
        instanced_geo.addAttribute( 'scale_previous', scales_previous);

        // colors
        var colors = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var colors_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);

        function to_rgb(color) {
            color = new THREE.Color(color)
            return [color.r, color.g, color.b]
        }
        var color = to_rgb(this.model.get("color"))
        var color_previous = "color" in this.previous_values ? to_rgb(this.previous_values["color"]) : color;
        if(!color_previous)
            color_previous = color;

        var color_selected = to_rgb(this.model.get("color_selected"))
        var color_selected_previous = "color_selected" in this.previous_values ? to_rgb(this.previous_values["color_selected"]) : color_selected;
        if(!color_selected_previous)
            color_selected_previous = color_selected;

	    for(var i = 0; i < max_count; i++) {
	        var cur_color = color;
	        if(selected.indexOf(i) != -1)
	            cur_color = color_selected
   	        colors.setXYZ(i, cur_color[0], cur_color[1], cur_color[2]);

	        var cur_color_previous = color_previous;
	        if(selected_previous.indexOf(i) != -1)
	            cur_color_previous = color_selected_previous
   	        colors_previous.setXYZ(i, cur_color_previous[0], cur_color_previous[1], cur_color_previous[2]);
	    }

        instanced_geo.addAttribute( 'color', colors );
        instanced_geo.addAttribute( 'color_previous', colors_previous );
	    this.mesh = new THREE.Mesh( instanced_geo, this.material );
	    this.mesh.material_rgb = this.material_rgb
	    this.mesh.material_normal = this.material

        _.mapObject(this.attributes_changed, function(changed_properties, key){
            var property = "animation_time_" + key
            console.log("transition for " +property + " / " +changed_properties)
            var done = function done() {
                console.log("transition done for " +property + " / " +changed_properties)
                _.each(changed_properties, function clear(prop) {
                    console.log("remove previous value " +prop)
                    delete this.previous_values[prop]
                }, this)
            }
            this.renderer.transition(this.material    .uniforms[property], "value", done, this)
            // no need anymore, uniforms of rgb has a reference too material's
            //this.renderer.transition(this.material_rgb.uniforms[property], "value", done, this)
        }, this)
        this.attributes_changed = {}
    }
});


var VolumeRendererThreeView = widgets.DOMWidgetView.extend( {
    render: function() {
        this.transitions = []
        this._update_requested = false
        this.update_counter = 0
        var width = this.model.get("width");
        var height = this.model.get("height");
        this.renderer = new THREE.WebGLRenderer();
        this.el.appendChild(this.renderer.domElement);
        const VIEW_ANGLE = 45;
        const aspect = width / height;
        const NEAR = 0.1;
        const FAR = 10000;
        this.camera = new THREE.PerspectiveCamera(
            VIEW_ANGLE,
            aspect,
            NEAR,
            FAR
        );
        this.camera_stereo = new THREE.StereoCamera()
        this.renderer.setSize(width, height);

        this.renderer_stereo = new THREE.StereoEffect(this.renderer);
        this.renderer_selected = this.renderer_stereo;

        this.box_geo = new THREE.BoxBufferGeometry(1, 1, 1)
        //this.box_material = new THREE.MeshLambertMaterial({color: 0xCC0000});
        this.box_material = new THREE.ShaderMaterial({
            fragmentShader: shaders["box_fragment"],
            vertexShader: shaders["box_vertex"],
            side: THREE.BackSide
        });
        this.box_mesh = new THREE.Mesh(this.box_geo, this.box_material)
        //this.box_mesh.position.z = -5;
        this.box_mesh.updateMatrix()
        this.box_mesh.matrixAutoUpdate = true

        this.box_geo_edges = new THREE.EdgesGeometry( this.box_geo )
        this.box_material_wire = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
        this.box_mesh_wire = new THREE.LineSegments(this.box_geo, this.box_material)

        var make_line = function(x1, y1, z1, x2, y2, z2, color) {
            var linewidth = 2;
            var material = new THREE.LineBasicMaterial({color: color, linewidth: linewidth});
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3( x1, y1, z1 ), new THREE.Vector3( x2, y2, z2));
            return new THREE.Line( geometry, material );
        }
        var make_axis = function(x, y, z, color) {
            return make_line(-0.5, -0.5, -0.5 ,  -0.5+x, -0.5+y, -0.5+z, color)
        }
        this.x_axis = make_axis(1, 0, 0, 0xff0000)
        this.y_axis = make_axis(0, 1, 0, 0x00ff00)
        this.z_axis = make_axis(0, 0, 1, 0x0000ff)
        this.axes = new THREE.Object3D()
        this.axes.add(this.x_axis)
        this.axes.add(this.y_axis)
        this.axes.add(this.z_axis)

        this.wire_box = new THREE.Object3D()
        var grey = 0xCCccCC;
        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5+1, -0.5, -0.5, grey))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5, -0.5+1, -0.5+1, -0.5, grey))
        this.wire_box.add(make_line(-0.5, -0.5, -0.5+1, -0.5+1, -0.5, -0.5+1, grey))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5+1, -0.5+1, -0.5+1, -0.5+1, grey))

        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5, -0.5+1, -0.5, grey))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5, -0.5+1, -0.5+1, -0.5, grey))
        this.wire_box.add(make_line(-0.5, -0.5, -0.5+1, -0.5, -0.5+1, -0.5+1, grey))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5+1, -0.5+1, -0.5+1, -0.5+1, grey))

        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5, -0.5, -0.5+1, grey))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5, -0.5+1, -0.5, -0.5+1, grey))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5, -0.5, -0.5+1, -0.5+1, grey))
        this.wire_box.add(make_line(-0.5+1, -0.5+1, -0.5, -0.5+1, -0.5+1, -0.5+1, grey))

        this.camera.position.z = 2

        // add to the scene

        this.scene = new THREE.Scene();
        //this.scene.add(this.camera);
        this.scene.add(this.box_mesh)

        this.scene_scatter = new THREE.Scene();
        //this.scene_scatter.add(this.camera);

        this.scene_opaque = new THREE.Scene();
        //this.scene_opaque.add(this.camera);
        this.scene_opaque.add(this.wire_box)
        this.scene_opaque.add(this.axes)

        var render_width = width;
        var render_height = height;
        if(this.model.get("stereo"))
            render_width /= 2;
        render_width /= this.model.get("downscale")
        render_height /= this.model.get("downscale")

        this.back_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
        this.front_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
        this.volr_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

        this.screen_texture = this.volr_texture
        this.screen_scene = new THREE.Scene();
        this.screen_plane = new THREE.PlaneBufferGeometry( 1.0, 1.0 );
        this.screen_material = new THREE.ShaderMaterial( {
					uniforms: { tex: { type: 't', value: this.front_texture.texture } },
					vertexShader: shaders["screen_vertex"],
					fragmentShader: shaders["screen_fragment"],
					depthWrite: false

				} );

        this.screen_mesh = new THREE.Mesh(this.screen_plane, this.screen_material );
        this.screen_scene.add(this.screen_mesh)
        this.screen_camera = new THREE.OrthographicCamera( 1 / - 2, 1 / 2, 1 / 2, 1 / - 2, -10000, 10000 );
        this.screen_camera.position.z = 10;

        this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
        this.controls.enablePan = false;

        //this.controls_device = controls = new THREE.DeviceOrientationControls( this.box_mesh );
		window.addEventListener( 'deviceorientation', _.bind(this.on_orientationchange, this), false );
		//window.addEventListener( 'deviceorientation', _.bind(this.update, this), false );
        //this.controls.


        this.texture_loader = new THREE.TextureLoader()

        this.texture_tf = null;//new THREE.DataTexture(null, this.model.get("tf").get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)

        this.box_material_volr = new THREE.ShaderMaterial({
            uniforms: {
                front: { type: 't', value: null },
                back : { type: 't', value: null },
                volume : { type: 't', value: null },
                transfer_function : { type: 't', value: this.texture_tf },
                brightness : { type: "f", value: 2. },
                data_min : { type: "f", value: 0. },
                data_max : { type: "f", value: 1. },
                volume_rows : { type: "f", value: 8. },
                volume_columns : { type: "f", value: 16. },
                volume_slices : { type: "f", value: 128. },
                volume_size : { type: "2f", value: [2048., 1024.] },
                volume_slice_size : { type: "2f", value: [128., 128.] },
                ambient_coefficient : { type: "f", value: this.model.get("ambient_coefficient") },
                diffuse_coefficient : { type: "f", value: this.model.get("diffuse_coefficient") },
                specular_coefficient : { type: "f", value: this.model.get("specular_coefficient") },
                specular_exponent : { type: "f", value: this.model.get("specular_exponent") },
                render_size : { type: "2f", value: [render_width, render_height] },
            },
            blending: THREE.CustomBlending,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquation: THREE.AddEquation,
            transparent: true,
            fragmentShader: shaders["volr_fragment"],
            vertexShader: shaders["volr_vertex"],
            side: THREE.BackSide
        });
        //this.volume_changed()
        this.update_size()
        this.tf_set()
        this.data_set()

        var that = this;
        //*
        this.el.addEventListener( 'change', _.bind(this.update, this) ); // remove when using animation loop

        this.model.on('change:xlim change:ylim change:zlim ', this.update, this);
        this.model.on('change:downscale', this.update_size, this);
        this.model.on('change:stereo', this.update_size, this);
        this.model.on('change:angle1', this.update_scene, this);
        this.model.on('change:angle2', this.update_scene, this);
        this.model.on('change:data', this.data_set, this);

        this.model.on('change:width', this.update_size, this);
        this.model.on('change:height', this.update_size, this);
        this.model.on('change:fullscreen', this.update_fullscreen, this);

        this.model.on('change:ambient_coefficient', this.update_light, this);
        this.model.on('change:diffuse_coefficient', this.update_light, this);
        this.model.on('change:specular_coefficient', this.update_light, this);
        this.model.on('change:specular_exponent', this.update_light, this);

        this.model.on('change:tf', this.tf_set, this)

        this.controls.addEventListener( 'change', _.bind(this.update, this) );

        this.renderer.domElement.addEventListener( 'resize', _.bind(this.on_canvas_resize, this), false );
        THREEx.FullScreen.addFullScreenChangeListener(_.bind(this.on_fullscreen_change, this))
        this.update()

        console.log(this.model.get("scatters"))
        this.scatters = [] /*new widgets.ViewList(_.bind(function add(model) {
                console.log("adding")
                console.log(model)
                scatter_view = new ScatterView()
                scatter_view.model = model
                scatter_view.options = _.pick(this.options, 'register_update', 'renderer_id')
                scatter_view.initialize({options:scatter_view.options})
                scatter_view.render()
                return scatter_view
                //this.model.widget_manager.
                var view_promise = this.create_child_view(model, _.pick(this.options, 'register_update', 'renderer_id'))
                console.log("view promise" +view_promise)
                return Promose.resolve()
                /*return view_promise.then(_.bind(function(view) {
                            console.log("added view")
                            console.log(view)
                            this.update();
                            return view;
                        }, this));
            }, this),
            _.bind(function remove(view) {
                console.log("removing scatter from scene")
                view.remove_from_scene()
                view.remove()
            }, this)

        )*/
         this.model.on('change:scatters', this.update_scatters, this)
         this.update_scatters()


        function onWindowResize(){

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        window.last_volume = this;
        //navigator.wakeLock.request("display")
        return
    },
    update_scatters: function() {
        var scatters = this.model.get('scatters');
        console.log("update scatters")
        console.log(scatters)
        if(scatters) {
            //this.scatters.update(scatters);
            this.scatter_views = _.map(scatters, function(model) {
                var options = {parent: this}
                var scatter_view = new ScatterView({options: options, model: model})
                scatter_view.render()
                return scatter_view
            }, this)
         } else {
            scatter_views = []
         }
    },
    transition: function(obj, prop, on_done, context) {
        var that = this;
        var object = obj;
        var property = prop;
        console.log("transition")
        console.log(obj)
        console.log(property)
        var Transition = function() {
            //this.objects = []
            this.time_start = (new Date()).getTime();
            this.duration = that.model.get("animation");
            this.cancelled = false;
            this.called_on_done = false
            this.set = function(obj) {
                this.objects.push(obj)
            }
            this.is_done = function() {
                var dt = (new Date()).getTime() - this.time_start;
                return (dt >= this.duration) || this.cancelled
            }
            this.cancel = function() {
                this.cancelled = true;
            },
            this.update = function() {
                if(this.cancelled)
                    return
                var dt = ((new Date()).getTime() - this.time_start)/this.duration;

                var u = Math.min(1, dt);
                u = Math.pow(u, 0.5)
                object[property] = u;
                if(dt >= 1 && !this.called_on_done) {
                    this.called_on_done = true
                    on_done.apply(context)
                }
            }
            that.transitions.push(this)
        }
        return new Transition()
    },
    on_orientationchange: function(e) {
        /*this.box_mesh.rotation.reorder( "ZXY" );
        this.box_mesh.rotation.y = -e.alpha * Math.PI / 180;
        this.box_mesh.rotation.x = -(e.gamma * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.z = -(e.beta * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.z = -((e.alpha-180) * Math.PI / 180);
        this.box_mesh.rotation.x = -(e.beta * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.y = -(e.gamma * Math.PI / 180 + Math.PI*2);*/

        _.each([this.scene, this.scene_opaque, this.scene_scatter], function(scene){
            scene.rotation.reorder( "XYZ" );
            scene.rotation.x = (e.gamma * Math.PI / 180 + Math.PI*2);
            scene.rotation.y = -(e.beta * Math.PI / 180 + Math.PI*2);
            scene.rotation.z = -((e.alpha) * Math.PI / 180);
        }, this)
        this.update()

    },
    on_canvas_resize: function(event) {
        console.log(event)
    },
    keypress: function(event) {
        console.log("key press")
        console.log(event)
        var code = event.keyCode || event.which;
        if (event.keyCode == 27) {
            console.log("exit fullscreen")
            this.model.set("fullscreen", false)
        }
        if (event.key == 'f') {
            console.log("toggle fullscreen")
            this.model.set("fullscreen", !this.model.get("fullscreen"))
        }
    },
    on_fullscreen_change: function() {
        var elem = THREEx.FullScreen.element()
        console.log("fullscreen event")
        if(elem == this.renderer.domElement) {
            console.log("fullscreen")
            // TODO: we should actually reflect the fullscreen, since if it fails, we still have the fullscreen model var
            // set to true
            this.update_size()
        } else {
            if(this.model.get("fullscreen")) {
                console.log("left fullscreen")
                this.model.set("fullscreen", false)
                this.model.save()
            }
        }
    },
    update_fullscreen: function() {
        if(this.model.get("fullscreen")) {
            console.log("request fullscreen for:")
            console.log(this.renderer.domElement)
            THREEx.FullScreen.request(this.renderer.domElement)
        } else {
            console.log("cancel fullscreen for:")
            console.log(this.renderer.domElement)
            // make sure we exit fullscreen
            var elem = THREEx.FullScreen.element()
            if(elem == this.renderer.domElement)
                THREEx.FullScreen.cancel();
            this.update_size()
        }
    },
    update: function() {
        // requestAnimationFrame stacks, so make sure multiple update calls only lead to 1 _real_update call
        if(!this._update_requested) {
           this._update_requested = true
            requestAnimationFrame(_.bind(this._real_update, this))
        }
    },
    _real_update: function() {
        //this.controls_device.update()
        this._update_requested = false
        var transitions_todo = []
        for(var i = 0; i < this.transitions.length; i++) {
            var t = this.transitions[i];
            if(!t.is_done())
                transitions_todo.push(t)
            t.update()
        }


        this.renderer.clear()
        if(!this.model.get("stereo")) {
            this._render_eye(this.camera);
        } else {
            var size = this.renderer.getSize();
            if (this.camera.parent === null ) this.camera.updateMatrixWorld();
            this.camera_stereo.update(this.camera)

            // left eye
            this.renderer.setScissorTest( true );
            this.renderer.setScissor( 0, 0, size.width / 2, size.height );
            this.renderer.setViewport( 0, 0, size.width / 2, size.height );
            //this.renderer.render(this.scene, this.camera_stereo.cameraL );
            this._render_eye(this.camera_stereo.cameraL);

            // right eye
            this.renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
            this.renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );
            //this.renderer.render(this.scene, this.camera_stereo.cameraR );
            this._render_eye(this.camera_stereo.cameraR);

            this.renderer.setScissorTest( false );
            this.renderer.setViewport( 0, 0, size.width, size.height );
        }
        this.transitions = transitions_todo;
        if(this.transitions.length > 0) {
            this.update()
        }
    },
    _render_eye: function(camera) {
        if(this.model.get("data")) {
            this.camera.updateMatrixWorld();
            // render the back coordinates
            // render the back coordinates of the box
            //camera.updateMatrixWorld();
            this.box_mesh.material = this.box_material;
            this.box_material.side = THREE.BackSide;
            this.renderer.clearTarget(this.back_texture, true, true, true)
            this.renderer.render(this.scene, camera, this.back_texture);

            // now render the opaque object, such that we limit the rays
            // set material to rgb
            _.each(this.scatter_views, function(scatter) {
                scatter.mesh.material = scatter.mesh.material_rgb
                scatter.set_limits(_.pick(this.model.attributes, 'xlim', 'ylim', 'zlim'))
            }, this)
            this.renderer.autoClear = false;
            this.scene_opaque.overrideMaterial = this.box_material;
            this.renderer.render(this.scene_scatter, camera, this.back_texture);
            this.renderer.render(this.scene_opaque, camera, this.back_texture);
            this.renderer.autoClear = true;

            // restore materials
            _.each(this.scatter_views, function(scatter) {
                scatter.mesh.material = scatter.mesh.material_normal
            }, this)


            // render the front coordinates
            this.box_material.side = THREE.FrontSide;
            this.renderer.autoClear = false;
            this.renderer.clearTarget(this.front_texture, true, true, true)
            this.renderer.render(this.scene, camera, this.front_texture);
            this.renderer.autoClear = true;

            // render the opaque objects with normal materials
            this.scene_opaque.overrideMaterial = null;
            this.renderer.autoClear = false;
            this.renderer.clearTarget(this.volr_texture, true, true, true)
            this.renderer.render(this.scene_opaque, camera, this.volr_texture);
            this.renderer.render(this.scene_scatter, camera, this.volr_texture);
            this.renderer.autoClear = true;

            // last pass, render the volume
            this.box_mesh.material = this.box_material_volr;
            this.renderer.autoClear = false;
            // clear depth buffer only
            this.renderer.clearTarget(this.volr_texture, false, true, false)
            this.renderer.render(this.scene, camera, this.volr_texture);
            this.renderer.autoClear = true;

            // render to screen
            this.screen_texture = {Volume:this.volr_texture, Back:this.back_texture, Front:this.front_texture}[this.model.get("show")]
            this.screen_material.uniforms.tex.value = this.screen_texture.texture
            //this.renderer.clearTarget(this.renderer, true, true, true)
            this.renderer.render(this.screen_scene, this.screen_camera);
         } else {
            this.camera.updateMatrixWorld();
            _.each(this.scatter_views, function(scatter) {
                scatter.mesh.material = scatter.mesh.material_normal
                scatter.set_limits(_.pick(this.model.attributes, 'xlim', 'ylim', 'zlim'))
            }, this)
            this.renderer.autoClear = false;
            this.renderer.clear()
            this.renderer.render(this.scene_opaque, camera);
            this.renderer.render(this.scene_scatter, camera);
            this.renderer.autoClear = true;
         }


    },
    update_light: function() {
        this.box_material_volr.uniforms.ambient_coefficient.value = this.model.get("ambient_coefficient")
        this.box_material_volr.uniforms.diffuse_coefficient.value = this.model.get("diffuse_coefficient")
        this.box_material_volr.uniforms.specular_coefficient.value = this.model.get("specular_coefficient")
        this.box_material_volr.uniforms.specular_exponent.value = this.model.get("specular_exponent")
        this.update()
    },
    update_size: function(skip_update) {
        console.log("update size")
        var width = this.model.get("width");
        var height = this.model.get("height");
        var render_width = width;
        var render_height = height;
        this.renderer.setSize(width, height);
        if(this.model.get("fullscreen")) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if(!this.model.get("data")) { // no volume data means full rendering
                console.log("do a fullscreen render")
                render_width  = window.innerWidth
                render_height = window.innerHeight
            }
        } else {
            this.renderer.setSize(width, height);
        }

        if(this.model.get("stereo")) {
            render_width /= 2;
        }
        render_width /= this.model.get("downscale")
        render_height /= this.model.get("downscale")

        var aspect = render_width / render_height;
        this.camera.aspect = aspect
        this.camera.updateProjectionMatrix();
        console.log("render width: " +render_width)
        this.back_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
        this.front_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
        this.volr_texture = new THREE.WebGLRenderTarget( render_width, render_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
        this.screen_texture = this.volr_texture
        this.box_material_volr.uniforms.back.value = this.back_texture.texture
        this.box_material_volr.uniforms.front.value = this.front_texture.texture
        this.box_material_volr.uniforms.render_size.value = [render_width, render_height]
        if(!skip_update)
            this.update()
    },
    data_set: function() {
        this.volume = this.model.get("data")
        if(!this.volume) {
            this.update_size()
            return;
            //this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}
        }
        this.texture_volume = this.texture_loader.load(this.volume.src, _.bind(this.update, this));//, _.bind(this.update, this))
        this.texture_volume.magFilter = THREE.LinearFilter
        this.texture_volume.minFilter = THREE.LinearFilter
        this.box_material_volr.uniforms.volume_rows.value = this.volume.rows,
        this.box_material_volr.uniforms.volume_columns.value = this.volume.columns
        this.box_material_volr.uniforms.volume_slices.value = this.volume.slices
        this.box_material_volr.uniforms.volume_size.value = this.volume.image_shape
        this.box_material_volr.uniforms.volume_slice_size.value = this.volume.slice_shape
        this.box_material_volr.uniforms.volume.value = this.texture_volume
        if(this.model.previous("data")) {
            this.update()
        } else {
            this.update_size() // could need a resize, see update_size
        }
    },
    tf_set: function() {
        // TODO: remove listeners from previous
        if(this.model.get("tf")) {
            this.model.get("tf").on('change:rgba', this.tf_changed, this);
            this.tf_changed()
        }
    },
    tf_changed: function() {
        var tf = this.model.get("tf")
        if(tf) {
            /*if(!this.texture_tf) {
                this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
            } else {
                this.texture_tf.image.data = tf.get_data_array()
                this.texture_tf.needsUpdate = true
            }*/
            this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
            this.texture_tf.needsUpdate = true // without this it doesn't seem to work
            this.box_material_volr.uniforms.transfer_function.value = this.texture_tf
            this.update()
        }
    }
});

var VolumeRendererThreeModel = widgets.DOMWidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name : 'VolumeRendererThreeModel',
            _view_name : 'VolumeRendererThreeView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            _model_module_version: semver_range,
             _view_module_version: semver_range,
            angle1: 0.1,
            angle2: 0.2,
            ambient_coefficient: 0.5,
            diffuse_coefficient: 0.8,
            specular_coefficient: 0.5,
            specular_exponent: 5,
            stereo: false,
            fullscreen: false,
            width: 500,
            height: 400,
            downscale: 1,
            scatters: null,
            show: "Volume",
            xlim: [0., 1.],
            ylim: [0., 1.],
            zlim: [0., 1.],
            animation: 1000,
        })
    }
}, {
    serializers: _.extend({
        tf: { deserialize: widgets.unpack_models },
        scatters: { deserialize: widgets.unpack_models },
    }, widgets.DOMWidgetModel.serializers)
});

var ScatterModel = widgets.WidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name : 'ScatterModel',
            _view_name : 'ScatterView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            _model_module_version: semver_range,
             _view_module_version: semver_range,
            size: 0.01,
            size_selected: 0.02,
            color: "red",
            color_selected: "white",
            geo: 'diamond'
        })
    }
});

var WidgetManagerHackModel = widgets.WidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name : 'WidgetManagerHack',
            _model_module : 'ipyvolume',
            _model_module_version: semver_range,
             _view_module_version: semver_range,
        })
    },
    initialize: function(attributes, options) {
        console.log(this)
        WidgetManagerHackModel.__super__.initialize.apply(this, arguments);
        console.info("get reference to widget manager")
        window.jupyter_widget_manager = this.widget_manager;
        window.jupyter_widgets = widgets
    }
});
    return {
        WidgetManagerHackModel: WidgetManagerHackModel,
        ScatterView: ScatterView,
        ScatterModel: ScatterModel,
        VolumeRendererThreeView: VolumeRendererThreeView,
        VolumeRendererThreeModel: VolumeRendererThreeModel,
        TransferFunctionView: TransferFunctionView,
        TransferFunctionWidgetJs3Model: TransferFunctionWidgetJs3Model,
        TransferFunctionJsBumpsModel: TransferFunctionJsBumpsModel
    };


})

//////////////////
// WEBPACK FOOTER
// ./src/volume.js
// module id = 1
// module chunks = 0