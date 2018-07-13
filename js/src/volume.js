var _ = require('underscore')
var widgets = require('@jupyter-widgets/base');
var THREE = require('three')
var serialize = require('./serialize.js')
var values = require('./values.js')
var semver_range = require('./utils.js').semver_range;

var shaders = {}

shaders["box_fragment"] = require('raw-loader!../glsl/box-fragment.glsl');
shaders["box_vertex"] = require('raw-loader!../glsl/box-vertex.glsl');
shaders["volr_fragment"] = require('raw-loader!../glsl/volr-fragment.glsl');
shaders["volr_vertex"] = require('raw-loader!../glsl/volr-vertex.glsl');
shaders["volume_fragment"] = require('raw-loader!../glsl/volume-fragment.glsl');
shaders["volume_vertex"] = require('raw-loader!../glsl/volume-vertex.glsl');

var VolumeView = widgets.WidgetView.extend( {
    render: function() {
        this.renderer = this.options.parent;
        this.attributes_changed = {}
        this.volume_data = []

        window.vol = this;

        this.box_geo = this.renderer.box_geo;
        //this.box_material = new THREE.MeshLambertMaterial({color: 0xCC0000});
        this.box_material = new THREE.ShaderMaterial({
            uniforms: {
                offset: { type: '3f', value: [0, 0, 0] },
                scale : { type: '3f', value: [1, 1, 1] },
            },
            fragmentShader: shaders["box_fragment"],
            vertexShader: shaders["box_vertex"],
            side: THREE.BackSide
        });
        this.box_mesh = new THREE.Mesh(this.box_geo, this.box_material)
        //this.box_mesh.position.z = -5;
        this.box_mesh.updateMatrix()
        this.box_mesh.matrixAutoUpdate = true

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
                opacity_scale :  { type: "f", value: 1.0 },
                volume_rows : { type: "f", value: 8. },
                volume_columns : { type: "f", value: 16. },
                volume_slices : { type: "f", value: 128. },
                volume_size : { type: "2f", value: [2048., 1024.] },
                volume_slice_size : { type: "2f", value: [128., 128.] },
                volume_show_range : { type: "2f", value: [0., 1.] },
                volume_data_range : { type: "2f", value: [0., 1.] },
                clamp_min : {type: "b", value: false},
                clamp_max : {type: "b", value: false},
                ambient_coefficient : { type: "f", value: this.model.get("ambient_coefficient") },
                diffuse_coefficient : { type: "f", value: this.model.get("diffuse_coefficient") },
                specular_coefficient : { type: "f", value: this.model.get("specular_coefficient") },
                specular_exponent : { type: "f", value: this.model.get("specular_exponent") },
                render_size : { type: "2f", value: [render_width, render_height] },
                scale: {type: "3f"},
                offset: {type: "3f"},
            },
            blending: THREE.CustomBlending,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquation: THREE.AddEquation,
            transparent: true,
            fragmentShader: shaders["volr_fragment"],
            vertexShader: shaders["volr_vertex"],
            defines: {},
            side: THREE.BackSide
        });
        // a clone of the box_material_volr, with a different define (faster to render)
        this.box_material_volr_depth = new THREE.ShaderMaterial({
            uniforms: this.box_material_volr.uniforms,
            blending: THREE.NoBlending,
            fragmentShader: shaders["volr_fragment"],
            vertexShader: shaders["volr_vertex"],
            defines: {COORDINATE: true},
            side: THREE.BackSide
        });
        var update_volr_defines = () => {
            this.box_material_volr.defines = {USE_LIGHTING: this.model.get('volume_rendering_lighting')}
            this.box_material_volr.defines['METHOD_' + this.model.get('volume_rendering_method')] = true;
            this.box_material_volr.needsUpdate = true
            this.box_material_volr_depth.defines = {COORDINATE: true, USE_LIGHTING: this.model.get('volume_rendering_lighting')}
            this.box_material_volr_depth.defines['METHOD_' + this.model.get('volume_rendering_method')] = true;
            this.box_material_volr_depth.needsUpdate = true
            this.update()
        }
        this.model.on('change:volume_rendering_method change:volume_rendering_lighting', update_volr_defines)
        update_volr_defines()

        this.tf_set()
        this.data_set()

        this.add_to_scene()

        this.model.on('change:volume_data', this.data_set, this);

        this.model.on('change:ambient_coefficient', this.update_light, this);
        this.model.on('change:diffuse_coefficient', this.update_light, this);
        this.model.on('change:specular_coefficient', this.update_light, this);
        this.model.on('change:specular_exponent', this.update_light, this);
        var update_volume_minmax = () => {
            this.box_material_volr.uniforms.volume_data_range.value = [this.model.get('volume_data_min'), this.model.get('volume_data_max')]
            this.box_material_volr.uniforms.volume_show_range.value = [this.model.get('volume_show_min'), this.model.get('volume_show_max')]
            this.update()
        }
        this.model.on('change:volume_data_min change:volume_data_max change:volume_show_min change:volume_show_max', update_volume_minmax, this);
        update_volume_minmax()

        var update_volume_clamp = () => {
            this.box_material_volr.uniforms.clamp_min.value = this.model.get('volume_clamp_min')
            this.box_material_volr.uniforms.clamp_max.value = this.model.get('volume_clamp_max')
            this.update()
        }
        this.model.on('change:volume_clamp_min change:volume_clamp_max', update_volume_clamp, this);
        update_volume_clamp()

        var update_opacity_scale = () => {
            this.box_material_volr.uniforms['opacity_scale'].value = this.model.get('opacity_scale')
            this.update()
        }
        update_opacity_scale()
        this.model.on('change:opacity_scale', update_opacity_scale)

        this.model.on('change:tf', this.tf_set, this)        

        this.update_light();
    },
    update_light: function() {
        this.box_material_volr.uniforms.ambient_coefficient.value = this.model.get("ambient_coefficient")
        this.box_material_volr.uniforms.diffuse_coefficient.value = this.model.get("diffuse_coefficient")
        this.box_material_volr.uniforms.specular_coefficient.value = this.model.get("specular_coefficient")
        this.box_material_volr.uniforms.specular_exponent.value = this.model.get("specular_exponent")
        this.update()
    },
    data_set: function() {
        this.volume = this.model.get("volume_data")
        if(!this.volume) {
            this.update_size()
            return;
            //this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}
        }
        var data = new Uint8Array(this.volume.tiles.buffer)
        this.texture_volume = new THREE.DataTexture(data, this.volume.image_shape[0], this.volume.image_shape[1],
                                                    THREE.RGBAFormat, THREE.UnsignedByteType)
        this.texture_volume.magFilter = THREE.LinearFilter
        this.texture_volume.minFilter = THREE.LinearFilter
        this.box_material_volr.uniforms.volume_rows.value = this.volume.rows,
        this.box_material_volr.uniforms.volume_columns.value = this.volume.columns
        this.box_material_volr.uniforms.volume_slices.value = this.volume.slices
        this.box_material_volr.uniforms.volume_size.value = this.volume.image_shape
        this.box_material_volr.uniforms.volume_slice_size.value = this.volume.slice_shape
        this.box_material_volr.uniforms.volume.value = this.texture_volume
        this.box_material_volr.uniforms.volume_data_range.value = [this.model.get('volume_data_min'), this.model.get('volume_data_max')]
        this.box_material_volr.uniforms.volume_show_range.value = [this.model.get('volume_show_min'), this.model.get('volume_show_max')]
        this.texture_volume.needsUpdate = true // without this it doesn't seem to work
        if(this.model.previous("volume_data")) {
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
            this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").shape[0], 1, THREE.RGBAFormat, THREE.UnsignedByteType)
            this.texture_tf.needsUpdate = true // without this it doesn't seem to work
            this.box_material_volr.uniforms.transfer_function.value = this.texture_tf
            this.update()
        }
    },
    add_to_scene: function() {
        this.renderer.scene_volume.add(this.box_mesh)
    },
    remove_from_scene: function() {
        this.renderer.scene_volume.remove(this.box_mesh)
    },
    set_render_size: function(render_width, render_height){
        this.box_material_volr.uniforms.render_size.value = [render_width, render_height]
    },
    set_back_tex: function(tex){
        this.box_material_volr.uniforms.exit_points.value = tex;
    },
    set_geometry_color_depth_tex: function(render_target){
        this.box_material_volr.uniforms.geometry_color_tex.value = render_target.texture;
        this.box_material_volr.uniforms.geometry_depth_tex.value = render_target.depthTexture;
    },
});

var VolumeModel = widgets.WidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults(), {
            _model_name : 'VolumeModel',
            _view_name : 'VolumeView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            _model_module_version: semver_range,
             _view_module_version: semver_range,
            sequence_index: 0,
            data_min: 0.0,
            data_max: 1.0,
            step_size: 0.01,
            ambient_coefficient: 0.5,
            diffuse_coefficient: 0.8,
            specular_coefficient: 0.5,
            specular_exponent: 5,
            origin: [0,0,0],
            domain_size: [1,1,1]
        })
    }}, {
    serializers: _.extend({
        tf: { deserialize: widgets.unpack_models }
    }, widgets.DOMWidgetModel.serializers)
});



module.exports = {
    VolumeView:VolumeView,
    VolumeModel:VolumeModel
}
