var _ = require('underscore')
var widgets = require('@jupyter-widgets/base');
var THREE = require('three')
var serialize = require('./serialize.js')
var values = require('./values.js')

var semver_range = require('./utils.js').semver_range;
var cat_data = require("../data/cat.json")

var ScatterView = widgets.WidgetView.extend( {
    render: function() {
        console.log("created scatter view, parent is")
        console.log(this.options.parent)
        this.renderer = this.options.parent;
        this.previous_values = {}
        this.attributes_changed = {}
        window.last_scatter = this;

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
            vertexShader: require('raw-loader!../glsl/scatter-vertex.glsl'),
            fragmentShader: require('raw-loader!../glsl/scatter-fragment.glsl'),
            visible: this.model.get("visible") && this.model.get("visible_markers")
            })

        this.material_rgb = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader: "#define USE_RGB\n"+require('raw-loader!../glsl/scatter-vertex.glsl'),
            fragmentShader: "#define USE_RGB\n"+require('raw-loader!../glsl/scatter-fragment.glsl'),
            visible: this.model.get("visible") && this.model.get("visible_markers")
            })

        this.line_material = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader:   "#define AS_LINE\n"+require('raw-loader!../glsl/scatter-vertex.glsl'),
            fragmentShader: "#define AS_LINE\n"+require('raw-loader!../glsl/scatter-fragment.glsl'),
            visible: this.model.get("visible") && this.model.get("visible_lines")
            })

        this.line_material_rgb = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader:   "#define AS_LINE\n#define USE_RGB\n"+require('raw-loader!../glsl/scatter-vertex.glsl'),
            fragmentShader: "#define AS_LINE\n#define USE_RGB\n"+require('raw-loader!../glsl/scatter-fragment.glsl'),
            visible: this.model.get("visible") && this.model.get("visible_lines")
            })

        this.create_mesh()
        this.add_to_scene()
        this.model.on("change:size change:size_selected change:color change:color_selected change:sequence_index change:x change:y change:z change:selected change:vx change:vy change:vz",   this.on_change, this)
        this.model.on("change:geo change:connected", this.update_, this)
        this.model.on("change:visible change:visible_markers change:visible_lines", this.update_visibility, this)
    },
    update_visibility: function () {
        this.material.visible = this.model.get("visible") && this.model.get("visible_markers");
        this.material_rgb.visible = this.model.get("visible") && this.model.get("visible_markers");
        this.line_material.visible = this.model.get("visible") && this.model.get("visible_lines");
        this.line_material_rgb.visible = this.model.get("visible") && this.model.get("visible_lines");
        this.renderer.update()
    },
    set_limits: function(limits) {
        _.mapObject(limits, function(value, key) {
            this.material.uniforms[key].value = value
        }, this)
    },
    add_to_scene: function() {
        console.log("add")
        this.renderer.scene_scatter.add(this.mesh)
        console.log(this.mesh, this.line_segments)
        if(this.line_segments) {
            console.log('add line segments')
            this.renderer.scene_scatter.add(this.line_segments)
        }
    },
    remove_from_scene: function() {
        this.renderer.scene_scatter.remove(this.mesh)
        if(this.line_segments) {
            this.renderer.scene_scatter.remove(this.line_segments)
        }
    },
    on_change: function(attribute) {
        _.mapObject(this.model.changedAttributes(), function(val, key){
            console.log("changed " +key)
            this.previous_values[key] = this.model.previous(key)
            // attributes_changed keys will say what needs to be animated, it's values are the properties in
            // this.previous_values that need to be removed when the animation is done
            // we treat changes in _selected attributes the same
            var key_animation = key.replace("_selected", "")
            if (key_animation == "sequence_index") {
                var animated_by_sequence = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'size', 'color']
                _.each(animated_by_sequence, function(name) {
                    if(_.isArray(this.model.get(name))) {
                        this.attributes_changed[name] = [name, 'sequence_index']
                    }
                }, this)
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
                if(["x", "y", "z", "vx", "vy", "vz", 'color'].indexOf(key_animation) != -1) {
                    //console.log("adding size to list of changed attributes")
                    this.attributes_changed["size"] = []
                }

            }
        }, this)
        this.update_()
    },
    update_: function() {
        console.log("update scatter")
        this.remove_from_scene()
        this.create_mesh()
        this.add_to_scene()
        this.renderer.update()
    },
    _get_value: function(value, index, default_value) {
        var default_value = default_value;
        if(!value)
            return default_value
        // it is either an array of typed arrays, or a list of numbers coming from the javascript world
        if(_.isArray(value) && !_.isNumber(value[0]))
            return value[index % value.length]
        else
            return value
    },
    get_current: function(name, index, default_value) {
        return this._get_value(this.model.get(name), index, default_value)
    },
    get_previous: function(name, index, default_value) {
        return this._get_value(this.previous_values[name] || this.model.get(name), index, default_value)
    },
    _get_value_vec3: function(value, index, default_value) {
        var default_value = default_value;
        if(!value)
            return default_value
        if(_.isArray(value))
            return value[index % value.length]
        else
            return value
    },
    get_current_vec3: function(name, index, default_value) {
        return this._get_value_vec3(this.model.get(name), index, default_value)
    },
    get_previous_vec3: function(name, index, default_value) {
        return this._get_value_vec3(this.previous_values[name] || this.model.get(name), index, default_value)
    },
    create_mesh: function() {
        console.log("previous values: ")
        console.log(this.previous_values)
        console.log("attributes changed: ")
        console.log(this.attributes_changed)
        var geo = this.model.get("geo")
        console.log(geo)

        if(!geo)
            geo = "diamond"
        var buffer_geo = new THREE.BufferGeometry().fromGeometry(this.geos[geo]);
        var instanced_geo = new THREE.InstancedBufferGeometry();

        var vertices = buffer_geo.attributes.position.clone();
        instanced_geo.addAttribute('position', vertices);

        var sequence_index = this.model.get("sequence_index");
        var sequence_index_previous = this.previous_values["sequence_index"]
        if(typeof sequence_index_previous == "undefined")
            sequence_index_previous = sequence_index;

        var scalar_names = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'size', 'size_selected'];
        var vector3_names = ['color', 'color_selected']
        var current  = new values.Values(scalar_names, vector3_names, _.bind(this.get_current, this), sequence_index)
        var previous = new values.Values(scalar_names, vector3_names, _.bind(this.get_previous, this), sequence_index_previous)

        var length = Math.max(current.length, previous.length)
        if(length == 0) {
            console.error("no single member is an array, not supported (yet?)")
        }


        current.trim(current.length); // make sure all arrays are of equal length
        previous.trim(previous.length)
        var previous_length = previous.length;
        var current_length = current.length;
        if(this.model.get("selected") || this.previous_values["selected"]) {
            // upgrade size and size_previous to an array if they were not already
            current.ensure_array(['size', 'size_selected', 'color', 'color_selected'])
            previous.ensure_array(['size', 'size_selected', 'color', 'color_selected'])
            var selected = this.get_current('selected', sequence_index, []);
            current.select(selected)
            var selected = this.get_previous('selected', sequence_index_previous, []);
            previous.select(selected)
        }
        // if we have a change in length, we use size to fade in/out particles, so make sure they are arrays
        if(current.length != previous.length) {
            current.ensure_array('size')
            previous.ensure_array('size')
        }
        if(current.length > previous.length) { // grow..
            previous.pad(current)
            previous.array['size'].fill(0, previous_length); // this will make them smoothly fade in
        } else if(current.length < previous.length) { // shrink..
            current.pad(previous)
            current.array['size'].fill(0, current_length); // this will make them smoothly fade out
        }
        // we are only guaranteed to have 16 attributes for the shader, so better merge some into single vectors
        current.merge_to_vec3(['vx', 'vy', 'vz'], 'v')
        previous.merge_to_vec3(['vx', 'vy', 'vz'], 'v')

        // we don't want to send these to the shader, these are handled at the js side
        current.pop(['size_selected', 'color_selected'])
        previous.pop(['size_selected', 'color_selected'])

        // add atrributes to the geometry, this makes the available to the shader
        current.add_attributes(instanced_geo)
        previous.add_attributes(instanced_geo, '_previous')

	    this.mesh = new THREE.Mesh(instanced_geo, this.material );
	    this.mesh.material_rgb = this.material_rgb
	    this.mesh.material_normal = this.material


        if(this.model.get('connected')) {
            var geometry = new THREE.BufferGeometry();

            current.merge_to_vec3(['x', 'y', 'z'], 'vertices')
            previous.merge_to_vec3(['x', 'y', 'z'], 'vertices')
            geometry.addAttribute('position', new THREE.BufferAttribute(current.array_vec3['vertices'], 3))
            geometry.addAttribute('position_previous', new THREE.BufferAttribute(previous.array_vec3['vertices'], 3))

            current.ensure_array(['color'])
            previous.ensure_array(['color'])
            geometry.addAttribute('color', new THREE.BufferAttribute(current.array_vec3['color'], 3))
            geometry.addAttribute('color_previous', new THREE.BufferAttribute(previous.array_vec3['color'], 3))
            //material = new THREE.LineBasicMaterial( {  linewidth: 1, vertexColors: THREE.VertexColors } );

            /*var geometry = new THREE.Geometry();
            var vs = current.array_vec3['vertices'];
            //this.material.uniforms[key].value = value
            for ( i = 0; i < vs.length/3; i ++ ) {
                var vertex1 = new THREE.Vector3();
                vertex1.x = vs[i*3+0];
                vertex1.y = vs[i*3+1];
                vertex1.z = vs[i*3+2];
                geometry.vertices.push( vertex1 );

            }*/
            this.line_segments = new THREE.Line(geometry, this.line_material);
            console.log('create line segments')
        } else {
            this.line_segments = null;
        }

        _.mapObject(this.attributes_changed, function(changed_properties, key){
            var property = "animation_time_" + key
            console.log("animating", key)
            var done = function done() {
                _.each(changed_properties, function clear(prop) {
                    delete this.previous_values[prop] // may happen multiple times, that is ok
                }, this)
            }
            // uniforms of material_rgb has a reference to these same object
            var set = function(value) {
                this.material.uniforms[property]['value'] = value
            }
            this.renderer.transition(set, done, this)
        }, this)
        this.attributes_changed = {}
    }
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
            size: 5,
            size_selected: 7,
            color: "red",
            color_selected: "white",
            geo: 'diamond',
            sequence_index: 0,
            connected: false,
        })
    }}, {
    serializers: _.extend({
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        z: serialize.array_or_json,
        vx: serialize.array_or_json,
        vy: serialize.array_or_json,
        vz: serialize.array_or_json,
        selected: serialize.array_or_json,
        size: serialize.array_or_json,
        size_selected: serialize.array_or_json,
        color: serialize.color_or_json,
        color_selected: serialize.color_or_json
    }, widgets.WidgetModel.serializers)
});



module.exports = {
    ScatterView:ScatterView,
    ScatterModel:ScatterModel
}
