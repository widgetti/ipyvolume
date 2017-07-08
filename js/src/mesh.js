var _ = require('underscore')
var widgets = require('jupyter-js-widgets');
var THREE = require('three')
var serialize = require('./serialize.js')
var values = require('./values.js')

var semver_range = require('./utils.js').semver_range;

var MeshView = widgets.WidgetView.extend( {
    render: function() {
        console.log("created mesh view, parent is")
        console.log(this.options.parent)
        this.renderer = this.options.parent;
        this.previous_values = {}
        this.attributes_changed = {}
        window.last_mesh = this;
        this.meshes = []
        this.texture_loader = new THREE.TextureLoader()
        this.textures = null;
        if(this.model.get('texture')) {
            this.textures = _.map(this.model.get('texture'), function(texture_url) {
                console.log('loading texture', texture_url)
                return this.texture_loader.load(texture_url, _.bind(function(texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    console.log('loaded texture', texture, this)
                    this.update_()
                }, this));
            }, this)
        }

        this.material = new THREE.RawShaderMaterial({
            uniforms: {
                xlim : { type: "2f", value: [0., 1.] },
                ylim : { type: "2f", value: [0., 1.] },
                zlim : { type: "2f", value: [0., 1.] },
                animation_time_x : { type: "f", value: 1. },
                animation_time_y : { type: "f", value: 1. },
                animation_time_z : { type: "f", value: 1. },
                animation_time_u : { type: "f", value: 1. },
                animation_time_v : { type: "f", value: 1. },
                animation_time_color : { type: "f", value: 1. },
                animation_time_texture : { type: "f", value: 1. },
                texture: { type: 't', value: null },
                texture_previous: { type: 't', value: null },
            },
            side:THREE.DoubleSide,
            vertexShader: require('../glsl/mesh-vertex.glsl'),
            fragmentShader: require('../glsl/mesh-fragment.glsl'),
            polygonOffset: true,
            polygonOffsetFactor: 1, // positive value pushes polygon further away, so wireframes will render properly (z-buffer issues)
            polygonOffsetUnits: 1
                })

        this.material_texture = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader: "#define USE_TEXTURE\n"+require('../glsl/mesh-vertex.glsl'),
            fragmentShader: "#define USE_TEXTURE\n"+require('../glsl/mesh-fragment.glsl'),
            side:THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1, // positive value pushes polygon further away, so wireframes will render properly (z-buffer issues)
            polygonOffsetUnits: 1
            })

        this.material_rgb = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader: "#define USE_RGB\n"+require('../glsl/mesh-vertex.glsl'),
            fragmentShader: "#define USE_RGB\n"+require('../glsl/mesh-fragment.glsl'),
            side:THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1, // positive value pushes polygon further away, so wireframes will render properly (z-buffer issues)
            polygonOffsetUnits: 1
            })

        this.line_material = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader:   "#define AS_LINE\n"+require('../glsl/mesh-vertex.glsl'),
            fragmentShader: "#define AS_LINE\n"+require('../glsl/mesh-fragment.glsl')
            })

        this.line_material_rgb = new THREE.RawShaderMaterial({
            uniforms: this.material.uniforms,
            vertexShader:   "#define AS_LINE\n#define USE_RGB\n"+require('../glsl/mesh-vertex.glsl'),
            fragmentShader: "#define AS_LINE\n#define USE_RGB\n"+require('../glsl/mesh-fragment.glsl')
            })

        this.create_mesh()
        this.add_to_scene()
        this.model.on("change:color change:sequence_index change:x change:y change:z change:v change:u",   this.on_change, this)
        this.model.on("change:geo change:connected", this.update_, this)
    },
    set_limits: function(limits) {
        _.mapObject(limits, function(value, key) {
            this.material.uniforms[key].value = value
        }, this)
    },
    add_to_scene: function() {
        _.each(this.meshes, function(mesh) {
            this.renderer.scene_scatter.add(mesh)
        }, this)
    },
    remove_from_scene: function() {
        _.each(this.meshes, function(mesh) {
            this.renderer.scene_scatter.remove(mesh)
        }, this)
    },
    on_change: function(attribute) {
        _.mapObject(this.model.changedAttributes(), function(val, key){
            //console.log("changed " +key)
            this.previous_values[key] = this.model.previous(key)
            // attributes_changed keys will say what needs to be animated, it's values are the properties in
            // this.previous_values that need to be removed when the animation is done
            // we treat changes in _selected attributes the same
            var key_animation = key.replace("_selected", "")
            if (key_animation == "sequence_index") {
                var animated_by_sequence = ['x', 'y', 'z', 'u', 'v', 'color']
                _.each(animated_by_sequence, function(name) {
                    if(_.isArray(this.model.get(name)) && this.model.get(name).length > 1) {
                        this.attributes_changed[name] = [name, 'sequence_index']
                    }
                }, this)
                    this.attributes_changed['texture'] = ['texture', 'sequence_index']
            }
    	    else if(key_animation == "triangles") {
                // direct change, no animation
            }
	        else if(key_animation == "selected") { // and no explicit animation on this one
                this.attributes_changed["color"] = [key]
            } else {
                this.attributes_changed[key_animation] = [key]
                // animate the size as well on x y z changes
                if(["x", "y", "z", "u", "v", 'color'].indexOf(key_animation) != -1) {
                    //console.log("adding size to list of changed attributes")
                    //this.attributes_changed["size"] = []
                }

            }
        }, this)
        this.update_()
    },
    update_: function() {
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
        this.meshes = []

        var sequence_index = this.model.get("sequence_index");
        var sequence_index_previous = this.previous_values["sequence_index"]
        if(typeof sequence_index_previous == "undefined")
            sequence_index_previous = sequence_index;

        var scalar_names = ['x', 'y', 'z', 'u', 'v'];
        var vector3_names = ['color']
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
        /*if(this.model.get("selected") || this.previous_values["selected"]) {
            // upgrade size and size_previous to an array if they were not already
            current.ensure_array(['size', 'size_selected', 'color', 'color_selected'])
            previous.ensure_array(['size', 'size_selected', 'color', 'color_selected'])
            var selected = this.get_current('selected', sequence_index, []);
            current.select(selected)
            var selected = this.get_previous('selected', sequence_index_previous, []);
            previous.select(selected)
        }*/
        // if we have a change in length, we use size to fade in/out particles, so make sure they are arrays
        /*if(current.length != previous.length) {
            current.ensure_array('size')
            previous.ensure_array('size')
        }
        if(current.length > previous.length) { // grow..
            previous.pad(current)
            previous.array['size'].fill(0, previous_length); // this will make them smoothly fade in
        } else if(current.length < previous.length) { // shrink..
            current.pad(previous)
            current.array['size'].fill(0, current_length); // this will make them smoothly fade out
        }*/
        // we are only guaranteed to have 16 attributes for the shader, so better merge some into single vectors
        //current.merge_to_vec3(['vx', 'vy', 'vz'], 'v')
        //previous.merge_to_vec3(['vx', 'vy', 'vz'], 'v')

        // we don't want to send these to the shader, these are handled at the js side
        //current.pop(['size_selected', 'color_selected'])
        //previous.pop(['size_selected', 'color_selected'])


        current.merge_to_vec3(['x', 'y', 'z'], 'vertices')
        previous.merge_to_vec3(['x', 'y', 'z'], 'vertices')
        current.ensure_array(['color'])
        previous.ensure_array(['color'])
        var triangles = this.model.get('triangles')
        if(triangles) {
            var geometry = new THREE.BufferGeometry();
            geometry.addAttribute('position', new THREE.BufferAttribute(current.array_vec3['vertices'], 3))
            geometry.addAttribute('position_previous', new THREE.BufferAttribute(previous.array_vec3['vertices'], 3))
            geometry.addAttribute('color', new THREE.BufferAttribute(current.array_vec3['color'], 3))
            geometry.addAttribute('color_previous', new THREE.BufferAttribute(previous.array_vec3['color'], 3))
            geometry.setIndex(new THREE.BufferAttribute(triangles[0], 1))
            var texture = this.model.get('texture');
            var u = current.array['u']
            var v = current.array['v']
            if(texture && u && v) {
                material = this.material_texture
                material.uniforms['texture'].value = this.textures[sequence_index];
                material.uniforms['texture_previous'].value = this.textures[sequence_index_previous];
                geometry.addAttribute('u', new THREE.BufferAttribute(u, 1))
                geometry.addAttribute('v', new THREE.BufferAttribute(v, 1))
                var u_previous = previous.array['u']
                var v_previous = previous.array['v']
                geometry.addAttribute('u_previous', new THREE.BufferAttribute(u_previous, 1))
                geometry.addAttribute('v_previous', new THREE.BufferAttribute(v_previous, 1))
            } else {
                material = this.material
            }

            this.surface_mesh = new THREE.Mesh(geometry, material);
            this.surface_mesh.material_rgb = this.material_rgb
            this.surface_mesh.material_normal = material
            this.meshes.push(this.surface_mesh)
        }

	    var lines = this.model.get('lines')
	    if(lines) {
            var geometry = new THREE.BufferGeometry();

            geometry.addAttribute('position', new THREE.BufferAttribute(current.array_vec3['vertices'], 3))
            geometry.addAttribute('position_previous', new THREE.BufferAttribute(previous.array_vec3['vertices'], 3))
            var color = new THREE.BufferAttribute(current.array_vec3['color'], 3)
            color.normalized = true;
            geometry.addAttribute('color', color)
            var color_previous = new THREE.BufferAttribute(previous.array_vec3['color'], 3)
            color_previous.normalized = true;
            geometry.addAttribute('color_previous', color_previous)
            geometry.setIndex(new THREE.BufferAttribute(lines[0], 1))

            this.line_segments = new THREE.LineSegments(geometry, this.line_material);
            //TODO: check lines with volume rendering, also in scatter
            this.line_segments.material_rgb = this.line_material_rgb
            this.line_segments.material_normal = this.line_material
            console.log('create line segments')
            this.meshes.push(this.line_segments)
        } else {
            this.line_segments = null;
        }


        _.mapObject(this.attributes_changed, function(changed_properties, key){
            var property = "animation_time_" + key
            //console.log("animating", key)
            var done = function done() {
                _.each(changed_properties, function clear(prop) {
                    delete this.previous_values[prop] // may happen multiple times, that is ok
                }, this)
            }
            // uniforms of material_rgb has a reference to these same object
            //this.renderer.transition(this.material.uniforms[property], "value", done, this)
            this.renderer.transition(function(value) {
                this.material.uniforms[property]['value'] = time_offset + time_delta * value;
            }, done, this);
        }, this)
        this.attributes_changed = {}
    }
});

var MeshModel = widgets.WidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name : 'MeshModel',
            _view_name : 'MeshView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            _model_module_version: semver_range,
             _view_module_version: semver_range,
            color: "red",
            sequence_index: 0,
            connected: false,
        })
    }}, {
    serializers: _.extend({
        x: serialize.array_or_json,
        y: serialize.array_or_json,
        z: serialize.array_or_json,
        u: serialize.array_or_json,
        v: serialize.array_or_json,
        triangles: serialize.array_or_json,
        lines: serialize.array_or_json,
        color: serialize.color_or_json,
    }, widgets.WidgetModel.serializers)
});



module.exports = {
    MeshView:MeshView,
    MeshModel:MeshModel
}
