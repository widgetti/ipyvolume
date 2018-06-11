var _ = require('underscore');
var widgets = require('@jupyter-widgets/base');
var THREE = require('three');
var serialize = require('./serialize.js');
var values = require('./values.ts');
var semver_range = require('./utils.js').semver_range;

var MeshView = widgets.WidgetView.extend( {
    render: function() {
        //console.log("created mesh view, parent is")
        //console.log(this.options.parent)
        this.renderer = this.options.parent;
        this.previous_values = {}
        this.attributes_changed = {}
        window.last_mesh = this;
        this.meshes = []
        this.texture_loader = new THREE.TextureLoader()
        this.textures = null;
        if(this.model.get('texture')) {
            this._load_textures()
        }

        this.uniforms = {
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
        }
        this.material = this.model.get('material').obj.clone()
        this.material_rgb = this.model.get('material').obj.clone()
        this.line_material = this.model.get('line_material').obj.clone()
        this.line_material_rgb = this.model.get('line_material').obj.clone()
        this.materials = [this.material, this.material_rgb, this.line_material, this.line_material_rgb]
        this._update_materials()
        this.model.get('material').on('change', () => {
            this._update_materials()
            this.renderer.update()
        })
        this.model.get('line_material').on('change', () => {
            this._update_materials()
            this.renderer.update()
        })

        this.create_mesh()
        this.add_to_scene()
        this.model.on("change:color change:sequence_index change:x change:y change:z change:v change:u change:triangles change:lines",   this.on_change, this)
        this.model.on("change:geo change:connected", this.update_, this)
        this.model.on("change:texture", this._load_textures, this)
        this.model.on("change:visible", this.update_visibility, this)
    },
    update_visibility: function () {
        this._update_materials()
        this.renderer.update()
    },

    _load_textures: function() {
        var texture = this.model.get('texture');
        if(texture.stream) { // instanceof media.MediaStreamModel) {
            this.textures = null
            this.texture_video = document.createElement('video')
            texture.stream.then(_.bind(function(stream) {
                this.texture_video.src = window.URL.createObjectURL(stream);
                var texture = new THREE.VideoTexture(this.texture_video)
                //texture.wrapS = THREE.RepeatWrapping;
                //texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                //texture.wrapT = THREE.RepeatWrapping;
                this.textures = [texture];
                this.update_()
            }, this))
        } else {
            this.textures = _.map(this.model.get('texture'), function(texture_url) {
                return this.texture_loader.load(texture_url, _.bind(function(texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    this.update_()
                }, this));
            }, this)
        }
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
            mesh.geometry.dispose()
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
            else if(key_animation == "lines") {
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
            return default_value;
        // it is either an array of typed arrays, or a list of numbers coming from the javascript world
        if(_.isArray(value) && !_.isNumber(value[0])) {
            // check whether alpha component was provided or not
            var out_index = index % value.length;
            var rows = value.original_data[out_index].shape[0];
            var cols = value.original_data[out_index].shape[1];

            if ((cols === 3) && _.isNumber(value[out_index][0])) {
                // for rbg colors add alphas
                var out_length = rows * 4;
                var out_value = new Float32Array(out_length);
                var temp_value = value[out_index];

                for (var i = 0; i < rows; i++) {
                    out_value[i*4] = temp_value[i*3];
                    out_value[i*4 + 1] = temp_value[i*3 + 1];
                    out_value[i*4 + 2] = temp_value[i*3 + 2];
                    out_value[i*4 + 3] = 1.0;
                }

                return out_value;
            } else {
                // either we have color with alpha or a different format, not the rgb
                return value[out_index];
            }
        } else {
            return value;
        }
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
    _update_materials: function() {
        this.material.copy(this.model.get('material').obj)
        this.material_rgb.copy(this.model.get('material').obj)
        this.line_material.copy(this.model.get('line_material').obj)
        this.line_material_rgb.copy(this.model.get('line_material').obj)
        this.material_rgb.defines = {USE_RGB: true}
        this.line_material.defines = {USE_RGB: true, AS_LINE: true}
        this.line_material_rgb.defines = {USE_RGB: true}
        this.material.extensions = {derivatives: true}
        // locally and the visible with this object's visible trait
        this.material.visible = this.material.visible && this.model.get('visible');
        this.material_rgb.visible = this.material.visible && this.model.get('visible');
        this.line_material.visible = this.line_material.visible && this.model.get('visible');
        this.line_material_rgb.visible = this.line_material.visible && this.model.get('visible');
        this.materials.forEach((material) => {
            material.vertexShader = require('raw-loader!../glsl/mesh-vertex.glsl');
            material.fragmentShader = require('raw-loader!../glsl/mesh-fragment.glsl');
            material.uniforms = this.uniforms;
        })
        var texture = this.model.get('texture');
        if(texture && this.textures) {
            this.material.defines['USE_TEXTURE'] = true;
        }
    },
    create_mesh: function() {
        /*console.log("previous values: ")
        console.log(this.previous_values)
        console.log("attributes changed: ")
        console.log(this.attributes_changed)*/
        this.meshes = []

        var sequence_index = sequence_index_original = this.model.get("sequence_index");
        var sequence_index_previous = sequence_index_previous_original = sequence_index;

        if(typeof this.previous_values["sequence_index"] != "undefined") {
            sequence_index_previous = sequence_index_previous_original = this.previous_values["sequence_index"]
        }

        var time_offset, time_delta;

        if(sequence_index >= sequence_index_previous) {
            time_offset = sequence_index_previous - Math.floor(sequence_index_previous)
            time_delta = sequence_index - sequence_index_previous
            sequence_index = Math.ceil(sequence_index);
            sequence_index_previous = Math.floor(sequence_index_previous);
            // if we are at integer sequence frame, we can simply interpolate
            if((sequence_index_previous != sequence_index_previous_original) || (sequence_index != sequence_index_original)) {
                // but when we are not, we should interpolate from the nearest sequence frame to get a proper animation
                if((sequence_index - sequence_index_previous) > 1) {
                    sequence_index_previous = sequence_index - 1;
                    time_delta = sequence_index_original - sequence_index_previous
                    time_offset = 0;
                }
            }
        } else {
            time_offset = Math.ceil(sequence_index_previous)-sequence_index_previous
            time_delta = sequence_index_previous-sequence_index
            sequence_index = Math.floor(sequence_index);
            sequence_index_previous = Math.ceil(sequence_index_previous);
            if((sequence_index_previous != sequence_index_previous_original) || (sequence_index != sequence_index_original)) {
                if((sequence_index_previous - sequence_index) > 1) {
                    sequence_index_previous = sequence_index + 1;
                    time_offset = 0;
                    time_delta = sequence_index_previous-sequence_index_original
                }
            }
        }

        if (time_delta > 1) { // we're going over a 'keyframe' border
            time_delta = time_delta % 1;

            if(time_delta == 0) {
                // special case
                time_delta = 1.;
            }
        }
        
        if (time_delta == 0) {
            // occurs when we don't change keyframes, but just a property
			time_delta = 1;
        }
        //console.log('>>>', sequence_index, sequence_index_previous, time_offset, time_delta)

        var scalar_names = ['x', 'y', 'z', 'u', 'v'];
        var vector4_names = ['color'];

        var current  = new values.Values(scalar_names,
                                        [],
                                        _.bind(this.get_current, this),
                                        sequence_index,
                                        vector4_names);
        var previous = new values.Values(scalar_names,
                                        [],
                                        _.bind(this.get_previous, this),
                                        sequence_index_previous,
                                        vector4_names);

        var length = Math.max(current.length, previous.length)
        if(length == 0) {
            console.error("no single member is an array, not supported (yet?)")
        }

        current.trim(current.length); // make sure all arrays are of equal length
        previous.trim(previous.length)
        var previous_length = previous.length;
        var current_length = current.length;

        if(current.length > previous.length) { // grow..
            previous.pad(current)
        } else if(current.length < previous.length) { // shrink..
            current.pad(previous)
        }


        current.merge_to_vec3(['x', 'y', 'z'], 'vertices')
        previous.merge_to_vec3(['x', 'y', 'z'], 'vertices')
        current.ensure_array(['color'])
        previous.ensure_array(['color'])
        var triangles = this.model.get('triangles')
        if(triangles) {
            triangles = triangles[0]
            var geometry = new THREE.BufferGeometry();
            geometry.addAttribute('position', new THREE.BufferAttribute(current.array_vec3['vertices'], 3));
            geometry.addAttribute('position_previous', new THREE.BufferAttribute(previous.array_vec3['vertices'], 3));
            geometry.addAttribute('color', new THREE.BufferAttribute(current.array_vec4['color'], 4));
            geometry.addAttribute('color_previous', new THREE.BufferAttribute(previous.array_vec4['color'], 4));
            geometry.setIndex(new THREE.BufferAttribute(triangles, 1))
            var texture = this.model.get('texture');
            var u = current.array['u']
            var v = current.array['v']
            if(texture && u && v && this.textures) {
                var sequence_index_texture = sequence_index;
                this.material.uniforms['texture'].value = this.textures[sequence_index_texture % this.textures.length]; // TODO/BUG: there could
                // be a situation where texture property is modified, but this.textures isn't done yet..
                this.material.uniforms['texture_previous'].value = this.textures[sequence_index_previous % this.textures.length];
                geometry.addAttribute('u', new THREE.BufferAttribute(u, 1))
                geometry.addAttribute('v', new THREE.BufferAttribute(v, 1))
                var u_previous = previous.array['u']
                var v_previous = previous.array['v']
                geometry.addAttribute('u_previous', new THREE.BufferAttribute(u_previous, 1))
                geometry.addAttribute('v_previous', new THREE.BufferAttribute(v_previous, 1))
            }

            this.surface_mesh = new THREE.Mesh(geometry, this.material);
            // BUG? because of our custom shader threejs thinks our object if out
            // of the frustum
            this.surface_mesh.frustumCulled = false;
            this.surface_mesh.material_rgb = this.material_rgb;
            this.surface_mesh.material_normal = this.material;
            this.meshes.push(this.surface_mesh);
        }

	    var lines = this.model.get('lines');
	    if(lines) {
            var geometry = new THREE.BufferGeometry();

            geometry.addAttribute('position', new THREE.BufferAttribute(current.array_vec3['vertices'], 3))
            geometry.addAttribute('position_previous', new THREE.BufferAttribute(previous.array_vec3['vertices'], 3))
            var color = new THREE.BufferAttribute(current.array_vec4['color'], 4);
            color.normalized = true;
            geometry.addAttribute('color', color)
            var color_previous = new THREE.BufferAttribute(previous.array_vec4['color'], 4);
            color_previous.normalized = true;
            geometry.addAttribute('color_previous', color_previous);
            var indices = new Uint32Array(lines[0]);
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            this.line_segments = new THREE.LineSegments(geometry, this.line_material);
            this.line_segments.frustumCulled = false;
            //TODO: check lines with volume rendering, also in scatter
            this.line_segments.material_rgb = this.line_material_rgb;
            this.line_segments.material_normal = this.line_material;
            this.meshes.push(this.line_segments);
        } else {
            this.line_segments = null;
        }


        _.mapObject(this.attributes_changed, function(changed_properties, key){
            var property = "animation_time_" + key;
            //console.log("animating", key)
            var done = function done() {
                _.each(changed_properties, function clear(prop) {
                    delete this.previous_values[prop]; // may happen multiple times, that is ok
                }, this);
            }
            // uniforms of material_rgb has a reference to these same object
            //this.renderer.transition(this.material.uniforms[property], "value", done, this)
            this.renderer.transition(function(value) {
                this.material.uniforms[property]['value'] = time_offset + time_delta * value;
            }, done, this);
        }, this)
        this.attributes_changed = {};
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
            visible: true,
            visible_lines: true,
            visible_faces: true
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
        texture: serialize.texture,
        material: { deserialize: widgets.unpack_models },
        line_material: { deserialize: widgets.unpack_models },
    }, widgets.WidgetModel.serializers)
});



module.exports = {
    MeshView:MeshView,
    MeshModel:MeshModel
}
