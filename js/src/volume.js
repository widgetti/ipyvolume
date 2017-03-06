define(["jupyter-js-widgets", "underscore", "three", "three-text2d", "gl-matrix", "d3"] ,
        function(widgets, _, THREE, THREEtext2d, glm, d3) {

// same strategy as: ipywidgets/jupyter-js-widgets/src/widget_core.ts, except we use ~
// so that N.M.x is allowed (we don't care about x, but we assume 0.2.x is not compatible with 0.3.x
var semver_range = '~' + require('../package.json').version;

var axis_names = ['x', 'y', 'z']

var styles = require('../data/style.json')
//
window.THREE = THREE;
//window.THREEx = {};
var cat_data = require("../data/cat.json")
require("./three/OrbitControls.js")
require("./three/TrackballControls.js")
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

function to_rgb(color) {
    color = new THREE.Color(color)
    return [color.r, color.g, color.b]
}

function get_array_dimension(array) {
    var dimension = 0;
    while(typeof array[0] != "undefined") {
        array = array[0];
        dimension += 1;
    }
    return dimension
}

function get_value_size(variable, sequence_index, default_function) {
    if(typeof variable == "undefined") {
        return default_function
    } else {
        var dimension = get_array_dimension(variable)
        if(dimension == 0) {
            return function(glyph_index) {
                return variable
            }
        }
        else if(dimension == 1) {
            return function(glyph_index) {
                return variable[glyph_index]
            }
        }
        else if(dimension == 2) {
            return function(glyph_index) {
                return variable[sequence_index][glyph_index]
            }
        } else {
            console.error("unknown array for size:", variable, 'with dimension', dimension)
        }
    }
}


function get_value_index_color(variable, index, max_count){
    //Return a function that take the glyph_index as an argument and return the color
    // It can deals with these 6 cases: which are threated in the same order
    // shape is 0 dim, and it's a string, interpret as color
    // shape is 1 dim, items are strings, seperate color for each item
    // shape is 2 dim, items are strings, sequence of the above
    // shape is 1 dim, items are floats, it should be of length 3 -> rgb values
    // shape is 2 dim, items are float, it should be of shape (len(x), 3) -> rgb values
    // shape is 3 dim, items are float, it should be (sequence_length, len(x), 3) -> rgb values


    if (typeof variable == "string") {
        //OD string
        color =  to_rgb(variable)
        return function(glyph_index){
            return color
        }
    }
    else if (typeof variable[0] == "string"){
        //1D string
        return function(glyph_index){
            return to_rgb(variable[glyph_index])
        }
    }
    else if (typeof variable[0][0] == "string"){
        //2D string
        if (typeof index == "undefined")
            checked_index = 0
        else
            checked_index = Math.min(index,variable.length -1)

        return function(glyph_index){
            return  to_rgb(variable[checked_index][glyph_index])
        }
    }
    else if (_.isNumber(variable[0])){
        // 1d Numeric
        return function(glyph_index){
            return variable
        }
    }
    else if(_.isNumber(variable[0][0])){
        // 2d Numeric
        return function(glyph_index){
            return variable[glyph_index]
        }
    }
    else if(_.isNumber(variable[0][0][0])){
        // 3d numeric
        if (typeof index == "undefined")
            checked_index = 0
        else
            checked_index = Math.min(index,variable.length -1)

        return function(glyph_index){
            return variable[checked_index][glyph_index]
        }
    }

}

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
        this.geo_cat = new THREE.Geometry()
        for(var i = 0; i < cat_data.vertices.length; i++) {
            var v = new THREE.Vector3( cat_data.vertices[i][1], cat_data.vertices[i][2], cat_data.vertices[i][0]);
            this.geo_cat.vertices.push(v)
        }
        var i = 0;
        while(i < cat_data.indices.length ) {
            var indices = []
            var start = i;
            var length = 0;
            var done = false;
            while(!done) {
                indices.push(cat_data.indices[i])
                length++;
                if(cat_data.indices[i] < 0)
                    done = true
                i++;
            }
            indices[length-1] = -1-indices[length-1];// indicates end, so swap sign
            for(var j = 0; j < indices.length-2; j++) {
            //for(var j = 0; j < 1; j++) {
                var face = new THREE.Face3( indices[0], indices[1+j], indices[2+j])
                this.geo_cat.faces.push(face)
            }
        }
        //this.geo = new THREE.ConeGeometry(0.2, 1)
        this.geo_arrow = new THREE.CylinderGeometry(0, 0.2, 1)
        this.geos = {
            diamond: this.geo_diamond,
            box: this.geo_box,
            arrow: this.geo_arrow,
            sphere: this.geo_sphere,
            cat: this.geo_cat,
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
        this.model.on("change:size change:size_selected change:color change:color_selected change:sequence_index change:x change:y change:z change:selected change:vx change:vy change:vz",   this.on_change, this)
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
            if (key_animation == "sequence_index"){
              pindex = this.model.previous("sequence_index")

              if (this.model.get("x") && typeof this.model.get("x")[0][0] != "undefined" ) {
                this.previous_values["x"] = this.model.get("x")[pindex]
                this.attributes_changed["x"] =["x"]
              }
              if (this.model.get("y") && typeof this.model.get("y")[0][0] != "undefined" ) {
                this.previous_values["y"] = this.model.get("y")[pindex]
                this.attributes_changed["y"] =["y"]
              }
              if (this.model.get("z") && typeof this.model.get("z")[0][0] != "undefined" ) {
                this.previous_values["z"] = this.model.get("z")[pindex]
                this.attributes_changed["z"] =["z"]
              }
              if (this.model.get("vx") && typeof this.model.get("vx")[0][0] != "undefined" ) {
                this.previous_values["vx"] = this.model.get("vx")[pindex]
                this.attributes_changed["vx"] =["vx"]
              }
              if (this.model.get("vy") && typeof this.model.get("vy")[0][0] != "undefined" ) {
                this.previous_values["vy"] = this.model.get("vy")[pindex]
                this.attributes_changed["vy"] =["vy"]
              }
              if (this.model.get("vz") && typeof this.model.get("vz")[0][0] != "undefined" ) {
                this.previous_values["vz"] = this.model.get("vz")[pindex]
                this.attributes_changed["vz"] =["vz"]
              }
              if (this.model.get("size") && typeof this.model.get("size")[0][0] != "undefined" ) {
                this.previous_values["size"] = this.model.get("size")[pindex]
                this.attributes_changed["size"] =["size"]
              }

              if (this.model.get("color") ) {
                  color = this.model.get("color")
                  if (typeof color == "string" || typeof color[0] == "string" || _.isNumber(color[0]) || _.isNumber(color[0][0])) {
                      //0D or 1D
                  }
                  else {
                        this.previous_values["color"] = this.model.get("color")[Math.min(pindex,color.length-1)]
                        this.attributes_changed["color"] =["color"]
                  }
              }



            }
	    else if(key_animation == "geo") {
                // direct change, no animation
            }
	    else if(key_animation == "selected") { // and no explicit animation on this one
                this.attributes_changed["color"] = [key]
                this.attributes_changed["size"] = []
            } else {
                this.attributes_changed[key_animation] = [key]
                // animate the size as well on x y z changes
                if(["x", "y", "z", "vx", "vy", "vz","sequence_index"].indexOf(key) != -1) {
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

        var index = this.model.get("sequence_index");

        function get_value_index(variable, index){
            if ( !variable){
              // if undefined
              return variable
            }
            if (typeof index != "undefined"  && typeof variable[0][0] != "undefined") {
              // if two D
              index1 = Math.min(index,variable.length - 1);
              return variable[index1]
            }
            //1D
            return variable
        }

        var x = get_value_index(this.model.get("x"),index);
        var y = get_value_index(this.model.get("y"),index);
        var z = get_value_index(this.model.get("z"),index);
        var vx = get_value_index(this.model.get("vx"),index);
        var vy = get_value_index(this.model.get("vy"),index);
        var vz = get_value_index(this.model.get("vz"),index);

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
        if(!selected_previous)
            selected_previous = []

        var scales = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var scales_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var size = get_value_size(this.model.get("size"), index)
        var size_previous = get_value_size(this.previous_values["size"], index, size)
        var size_selected = get_value_size(this.model.get("size_selected"), index)
        var size_selected_previous = get_value_size(this.previous_values["size_selected"], index, size_selected);

	    for(var i = 0; i < max_count; i++) {
	        var cur_size = size(i);
	        var cur_size_previous = size_previous(i);
	        if(selected.indexOf(i) != -1)
	            cur_size = size_selected(i)
	        if(selected_previous.indexOf(i) != -1)
	            cur_size_previous = size_selected_previous(i)
	        if(i < count)
    	        scales.setX(i, cur_size/100.); // sizes are in percentages, but in viewport it's normalized
    	    else
    	        scales.setX(i, 0.);
	        if(i < count_previous)
    	        scales_previous.setX(i, cur_size_previous/100.);
    	    else
    	        scales_previous.setX(i, 0.);
	    }
        instanced_geo.addAttribute( 'scale', scales);
        instanced_geo.addAttribute( 'scale_previous', scales_previous);

        // colors
        var colors = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var colors_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);

        Color = get_value_index_color(this.model.get("color"),index,max_count)

        Color_previous = Color;
        if("color" in this.previous_values)
            Color_previous = get_value_index_color(this.previous_values["color"],this.previous_values["index"],max_count)

        var color_selected = to_rgb(this.model.get("color_selected"))
        var color_selected_previous = "color_selected" in this.previous_values ? to_rgb(this.previous_values["color_selected"]) : color_selected;
        if(!color_selected_previous)
            color_selected_previous = color_selected;

  	    for(var i = 0; i < max_count; i++) {

  	        var cur_color = Color(i);

  	        if(selected.indexOf(i) != -1)
  	            cur_color = color_selected

     	      colors.setXYZ(i, cur_color[0], cur_color[1], cur_color[2]);

            var cur_color_previous = Color_previous(i);

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
            var done = function done() {
                _.each(changed_properties, function clear(prop) {
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


// similar to _.bind, except it
// puts this as first argument to f, followed be other arguments, and make context f's this
function bind_d3(f, context) {
    return function() {
        var args  = [this].concat([].slice.call(arguments)) // convert argument to array
        f.apply(context, args)
    }
}

var VolumeRendererThreeView = widgets.DOMWidgetView.extend( {
    render: function() {
        this.transitions = []
        this._update_requested = false
        this.update_counter = 0
        var width = this.model.get("width");
        var height = this.model.get("height");
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.el.appendChild(this.renderer.domElement);

        // el_mirror is a 'mirror' dom tree that d3 needs
        // we use it to attach axes and tickmarks to the dom
        // which reflect the objects in the scene
        this.el_mirror = document.createElement("div")
        this.el.appendChild(this.el_mirror);
        this.el_axes = document.createElement("div")
        this.el_mirror.appendChild(this.el_axes);

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

        var make_line = function(x1, y1, z1, x2, y2, z2, material) {
            //var linewidth = 2;
            //var material = new THREE.LineBasicMaterial({color: color, linewidth: linewidth});
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3( x1, y1, z1 ), new THREE.Vector3( x2, y2, z2));
            return new THREE.Line( geometry, material );
        }
        var make_axis = function(x, y, z, material) {
            return make_line(-0.5, -0.5, -0.5 ,  -0.5+x, -0.5+y, -0.5+z, material)
        }
        var linewidth = 2;
        this.axes_material = new THREE.LineBasicMaterial({color: "cyan", linewidth: linewidth});
        this.xaxes_material = new THREE.LineBasicMaterial({color: "red", linewidth: linewidth});
        this.yaxes_material = new THREE.LineBasicMaterial({color: "green", linewidth: linewidth});
        this.zaxes_material = new THREE.LineBasicMaterial({color: "blue", linewidth: linewidth});
        this.x_axis = make_axis(1, 0, 0, this.xaxes_material)
        this.y_axis = make_axis(0, 1, 0, this.yaxes_material)
        this.z_axis = make_axis(0, 0, 1, this.zaxes_material)
        this.axes = new THREE.Object3D()
        this.axes.add(this.x_axis)
        this.axes.add(this.y_axis)
        this.axes.add(this.z_axis)

        this.wire_box = new THREE.Object3D()
        var grey = 0xCCccCC;
        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5+1, -0.5, -0.5, grey))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5, -0.5+1, -0.5+1, -0.5, this.axes_material))
        this.wire_box.add(make_line(-0.5, -0.5, -0.5+1, -0.5+1, -0.5, -0.5+1, this.axes_material))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5+1, -0.5+1, -0.5+1, -0.5+1, this.axes_material))

        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5, -0.5+1, -0.5, this.axes_material))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5, -0.5+1, -0.5+1, -0.5, this.axes_material))
        this.wire_box.add(make_line(-0.5, -0.5, -0.5+1, -0.5, -0.5+1, -0.5+1, this.axes_material))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5+1, -0.5+1, -0.5+1, -0.5+1, this.axes_material))

        //this.wire_box.add(make_line(-0.5, -0.5, -0.5, -0.5, -0.5, -0.5+1, this.axes_material))
        this.wire_box.add(make_line(-0.5+1, -0.5, -0.5, -0.5+1, -0.5, -0.5+1, this.axes_material))
        this.wire_box.add(make_line(-0.5, -0.5+1, -0.5, -0.5, -0.5+1, -0.5+1, this.axes_material))
        this.wire_box.add(make_line(-0.5+1, -0.5+1, -0.5, -0.5+1, -0.5+1, -0.5+1, this.axes_material))

        this.camera.position.z = 2


        // d3 data
        this.axes_data = [
                {name: 'x', label: 'x', object: null, object_label: null, translate: [ 0.0, -0.5, -0.5], rotate: [Math.PI/4, 0, 0], rotation_order: 'XYZ'},
                {name: 'y', label: 'y', object: null, object_label: null, translate: [-0.5,  0.0, -0.5], rotate: [Math.PI*3/4, 0, Math.PI/2], rotation_order: 'ZXY'},
                {name: 'z', label: 'z', object: null, object_label: null,translate: [-0.5, -0.5,  0.0], rotate: [-Math.PI/8, -Math.PI/2, 0], rotation_order: 'YZX'}
            ]

        this.ticks = 5; //hardcoded for now

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

        this.control_trackball = new THREE.TrackballControls( this.camera, this.renderer.domElement );
        this.control_orbit = new THREE.OrbitControls( this.camera, this.renderer.domElement );
        this.control_trackball.noPan = true;
        this.control_orbit.enablePan = false;
        this.control_trackball.enabled = this.model.get('camera_control') == 'trackball'
        this.control_orbit.enabled = this.model.get('camera_control') == 'orbit'

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

        this.model.on('change:xlabel change:ylabel change:zlabel change:screen_capture_enabled change:camera_control', this.update, this);
        this.model.on('change:style', this.update, this);
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

        this.control_trackball.addEventListener( 'change', _.bind(this.update, this) );
        this.control_orbit.addEventListener( 'change', _.bind(this.update, this) );

        this.renderer.domElement.addEventListener( 'resize', _.bind(this.on_canvas_resize, this), false );
        THREEx.FullScreen.addFullScreenChangeListener(_.bind(this.on_fullscreen_change, this))
        this.update()

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
    _d3_add_axis: function(node, d, i) {
        //console.log("add axis", d, i)
        var axis = new THREE.Object3D()
        axis.translateX(d.translate[0])
        axis.translateY(d.translate[1])
        axis.translateZ(d.translate[2])
        d3.select(node).attr("translate-x", d.translate[0])
        d3.select(node).attr("translate-y", d.translate[1])
        d3.select(node).attr("translate-z", d.translate[2])
        //this.axis_x.rotateY(Math.PI/2)
        axis.rotation.reorder(d.rotation_order)
        axis.rotation.x = d.rotate[0]
        axis.rotation.y = d.rotate[1]
        axis.rotation.z = d.rotate[2]
        this.axes.add(axis)

        var s = 0.01*0.4
        // TODO: puzzled by the align not working as expected..
        var aligns = {x: THREEtext2d.textAlign.topRight, y:THREEtext2d.textAlign.topRight, z:THREEtext2d.textAlign.center}
        var label = new THREEtext2d.SpriteText2D(d.label, { align: aligns[d.name], font: '30px Arial', fillStyle: '#00FF00', antialias: true })
        label.material.transparent = true
        label.material.alphaTest = 0.01
        label.scale.set(s,s,s)
        axis.add(label)
        d.object_label = label;
        d.object = axis;
        d.scale = d3.scaleLinear().domain(this.model.get(d.name + "lim")).range([-0.5, 0.5])
        d.ticks = null
    },
    _d3_update_axis: function(node, d, i) {
        //console.log("update axis", d, this.model.get(d.name + "lim"))
        d.object_label.text = d.label;
        d.object_label.fillStyle = d.fillStyle;
        var n = d.name // x, y or z
        d.object_label.fillStyle = this.get_style('axes.' +n +'.label.color axes.'   +n +'.color axes.label.color axes.color')
        d.object_label.visible = this.get_style(  'axes.' +n +'.label.visible axes.' +n +'.visible axes.label.visible axes.visible')
        d.scale = d3.scaleLinear().domain(this.model.get(d.name + "lim")).range([-0.5, 0.5])
    },
    _d3_add_axis_tick: function(node, d, i) {
        //console.log("add tick", d, node, d3.select(d3.select(node).node().parentNode))
        var parent_data = d3.select(d3.select(node).node().parentNode).datum(); // TODO: find the proper way to do so
        var scale = parent_data.scale;

        var tick_format = scale.tickFormat(this.ticks, ".1f");
        var tick_text = tick_format(d.value);

        // TODO: puzzled by the align not working as expected..
        var aligns = {x: THREEtext2d.textAlign.topRight, y:THREEtext2d.textAlign.topRight, z:THREEtext2d.textAlign.center}
        var sprite =  new THREEtext2d.SpriteText2D(tick_text, { align: aligns[parent_data.name], font: '30px Arial', fillStyle: '#00FF00', antialias: true })
        sprite.material.transparent = true
        //sprite.material.alphaTest = 0.1
        sprite.blending = THREE.CustomBlending
        sprite.blendSrc = THREE.SrcAlphaFactor
        sprite.blendDst = THREE.OneMinusSrcAlphaFactor
        sprite.blendEquation = THREE.AddEquation
        var s = 0.01*0.4*0.5;
        //sprite.position.x = scale(d.value)
        //sprite.scale.set(s,s,s)
        sprite.scale.multiplyScalar(s)
        var n = parent_data.name // x, y or z
        sprite.fillStyle = this.get_style('axes.' +n +'.ticklabel.color axes.ticklabel.color axes.' +n +'.color axes.color')
        parent_data.object.add(sprite)
        d.object_ticklabel = sprite;
        return sprite

        sprite.text = tick_text[i]
        sprite.fillStyle = this.model.get("style")[parent_data.name + 'axis.color']
    },
    _d3_update_axis_tick: function(node, d, i) {
        var parent_data = d3.select(d3.select(node).node().parentNode).datum(); // TODO: find the proper way to do so
        //console.log("update tick", d, i, parent_data)
        var scale = parent_data.scale;
        var tick_format = scale.tickFormat(this.ticks, ".1f");
        var tick_text = tick_format(d.value);
        d.object_ticklabel.text = tick_text
        d.object_ticklabel.position.x = scale(d.value)
        var n = parent_data.name // x, y or z
        d.object_ticklabel.fillStyle = this.get_style('axes.' +n +'.ticklabel.color axes.ticklabel.color axes.' +n +'.color axes.color')
        d.object_ticklabel.visible = this.get_style('axes.' +n +'.ticklabel.visible axes.' +n +'.visible axes.visible')
        //d.object_ticklabel.fillStyle = this.model.get("style")[parent_data.name + 'axis.color']
    },
    _d3_remove_axis_tick: function(node, d, i) {
        //console.log("remove tick", d, i)
        d.object_ticklabel.text = "" // TODO: removing and adding new tick marks will result in just many empty text sprites
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
                u = Math.pow(u, that.model.get("animation_exponent"))
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
        this.control_trackball.handleResize()
        this.control_trackball.enabled = this.model.get('camera_control') == 'trackball'
        this.control_orbit.enabled = this.model.get('camera_control') == 'orbit'
        this._update_requested = false

        this.renderer.setClearColor(this.get_style_color('background-color'))
        this.x_axis.visible = this.get_style('axes.x.visible axes.visible')
        this.y_axis.visible = this.get_style('axes.y.visible axes.visible')
        this.z_axis.visible = this.get_style('axes.z.visible axes.visible')
        this.axes_material.color = this.get_style_color('axes.color')
        this.xaxes_material.color = this.get_style_color('axes.x.color axes.color')
        this.yaxes_material.color = this.get_style_color('axes.y.color axes.color')
        this.zaxes_material.color = this.get_style_color('axes.z.color axes.color')

        this.axes_data[0].fillStyle = this.get_style('axes.x.color axes.color')
        this.axes_data[1].fillStyle = this.get_style('axes.y.color axes.color')
        this.axes_data[2].fillStyle = this.get_style('axes.z.color axes.color')

        this.axes_data[0].label = this.model.get("xlabel")
        this.axes_data[1].label = this.model.get("ylabel")
        this.axes_data[2].label = this.model.get("zlabel")

        this.wire_box.visible = this.get_style('box.visible')

        d3.select(this.el_axes).selectAll(".ipyvol-axis")
                .data(this.axes_data)
                .each(bind_d3(this._d3_update_axis, this))
                .enter()
                .append("div")
                .attr("class", "ipyvol-axis")
                .each(bind_d3(this._d3_add_axis, this));

        var that = this;
        this.ticks = 5


        this.last_tick_selection = d3.select(this.el_axes).selectAll(".ipyvol-axis").data(this.axes_data).selectAll(".ipyvol-tick").data(
            function(d, i, node) {
                var child_data = d.ticks
                if(child_data) {
                    child_data = d.ticks = child_data.slice()
                    var ticks = d.scale.ticks(that.ticks)
                    while(child_data.length < ticks.length) // ticks may return a larger array, so grow child data
                        child_data.push({})
                    while(child_data.length > ticks.length) // ticks may return a smaller array, so pop child data
                        child_data.pop()
                    _.each(ticks, function(tick, i) {
                        child_data[i].value = tick;
                    });
                    return child_data
                } else {
                    var scale = d.scale;
                    var ticks = scale.ticks(that.ticks)
                    var child_data = _.map(ticks, function(value) { return {value: value}});
                    d.ticks = child_data;
                    return child_data;
                }
            })
        this.last_tick_selection
            .each(bind_d3(this._d3_update_axis_tick, this))
            .enter()
            .append("div")
            .attr("class", "ipyvol-tick")
            .each(bind_d3(this._d3_add_axis_tick, this))
        this.last_tick_selection
            .exit()
            .remove()
            .each(bind_d3(this._d3_remove_axis_tick, this))

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
        if(this.model.get('screen_capture_enabled')) {
            var data = this.renderer.domElement.toDataURL(this.model.get('screen_capture_mime_type'));
            this.model.set("screen_capture_data", data)
            this.model.save()
        }
        this.transitions = transitions_todo;
        if(this.transitions.length > 0) {
            this.update()
        }
    },
    get_style_color: function(name) {
        style = this.get_style(name)
        if(style) {
            return new THREE.Color(style)
        } else {
            console.error("could not find color for", name)
        }
    },
    get_style: function(name) {
        var value = [null]
        _.each(name.split(" "), function(property) {
            var value_found = _.reduce(property.split("."), function(object, property) {
                if(object != null && object[property] != undefined)
                    return object[property]
                else
                    return null
            }, this.model.get("style"), this)
            if(value_found != null && value[0] == null)
                value[0] = value_found
        }, this)

        return value[0]
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
            this.renderer.render(this.scene_scatter, camera, this.volr_texture);
            this.renderer.render(this.scene_opaque, camera, this.volr_texture);
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
            this.renderer.render(this.scene_scatter, camera);
            this.renderer.render(this.scene_opaque, camera);
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
            screen_capture_enabled: false,
            screen_capture_mime_type: 'image/png',
            screen_capture_data: null,
            fullscreen: false,
            camera_control: 'trackball',
            width: 500,
            height: 400,
            downscale: 1,
            scatters: null,
            show: "Volume",
            xlim: [0., 1.],
            ylim: [0., 1.],
            zlim: [0., 1.],
            animation: 1000,
            animation_exponent: 0.5,
            style: styles['light']
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
