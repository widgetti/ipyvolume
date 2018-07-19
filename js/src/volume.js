var _ = require('underscore')
var widgets = require('@jupyter-widgets/base');
var THREE = require('three')
var serialize = require('./serialize.js')
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

        var render_size = this.renderer.getRenderSize()

        this.vol_box_geo = new THREE.BoxBufferGeometry(1, 1, 1);
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
        this.vol_box_mesh = new THREE.Mesh(this.vol_box_geo, this.box_material)
        //this.vol_box_mesh.position.z = -5;
        this.vol_box_mesh.updateMatrix()
        this.vol_box_mesh.matrixAutoUpdate = true

        this.texture_loader = new THREE.TextureLoader()

        this.texture_tf = null;//new THREE.DataTexture(null, this.model.get("tf").get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)

        this.box_material_volr = new THREE.ShaderMaterial({
            uniforms: {
                back_tex : { type: 't', value: null },
                volume : { type: 't', value: null },
                geometry_depth_tex: { type: 't', value: null },
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
                render_size : { type: "2f", value: render_size },
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
            side: THREE.FrontSide
        });
        var update_volr_defines = () => {
            this.box_material_volr.defines = {USE_LIGHTING: this.model.get('volume_rendering_lighting')}
            this.box_material_volr.defines['METHOD_' + this.model.get('volume_rendering_method')] = true;
            this.box_material_volr.needsUpdate = true
            this.box_material_volr_depth.defines = {COORDINATE: true, USE_LIGHTING: this.model.get('volume_rendering_lighting')}
            this.box_material_volr_depth.defines['METHOD_' + this.model.get('volume_rendering_method')] = true;
            this.box_material_volr_depth.needsUpdate = true;
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
    
        }
        this.model.on('change:volume_data_min change:volume_data_max change:volume_show_min change:volume_show_max', update_volume_minmax, this);
        update_volume_minmax()

        var update_volume_clamp = () => {
            this.box_material_volr.uniforms.clamp_min.value = this.model.get('volume_clamp_min')
            this.box_material_volr.uniforms.clamp_max.value = this.model.get('volume_clamp_max')
    
        }
        this.model.on('change:volume_clamp_min change:volume_clamp_max', update_volume_clamp, this);
        update_volume_clamp()

        var update_opacity_scale = () => {
            this.box_material_volr.uniforms['opacity_scale'].value = this.model.get('opacity_scale')
    
        }
        update_opacity_scale()
        this.model.on('change:opacity_scale', update_opacity_scale)

        this.model.on('change:tf', this.tf_set, this)        

        window.last_volume = this; // for debugging purposes

        this.update_light();
    },
    update_light: function() {
        this.box_material_volr.uniforms.ambient_coefficient.value = this.model.get("ambient_coefficient")
        this.box_material_volr.uniforms.diffuse_coefficient.value = this.model.get("diffuse_coefficient")
        this.box_material_volr.uniforms.specular_coefficient.value = this.model.get("specular_coefficient")
        this.box_material_volr.uniforms.specular_exponent.value = this.model.get("specular_exponent")

    },
    data_set: function() {
        this.volume = this.model.get("volume_data")
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
        }
    },
    set_limits: function(limits) {
        var xlim = limits.xlim;
        var ylim = limits.ylim
        var zlim = limits.zlim
        var dx = (xlim[1] - xlim[0])
        var dy = (ylim[1] - ylim[0])
        var dz = (zlim[1] - zlim[0])

        var dmax = Math.max(dx,dy,dz); 

        var extent = this.model.get('extent')

       // normalized coordinates of the corners of the box 
        var x0n = (extent[0][0]-xlim[0])/dx
        var x1n = (extent[0][1]-xlim[0])/dx
        var y0n = (extent[1][0]-ylim[0])/dy
        var y1n = (extent[1][1]-ylim[0])/dy
        var z0n = (extent[2][0]-zlim[0])/dz
        var z1n = (extent[2][1]-zlim[0])/dz

        // clipped coordinates
        var cx0 = Math.max(x0n,  0)
        var cx1 = Math.min(x1n,  1)
        var cy0 = Math.max(y0n,  0)
        var cy1 = Math.min(y1n,  1)
        var cz0 = Math.max(z0n,  0)
        var cz1 = Math.min(z1n,  1)

        // the clipped coordinates back to world space, then normalized to extend
        // these are example calculations, the transform goes into scale and offset uniforms below
        // var cwx0 = (cx0 * dx + xlim[0] - extent[0][0])/(extent[0][1] - extent[0][0])
        // var cwx1 = (cx1 * dx + xlim[0] - extent[0][0])/(extent[0][1] - extent[0][0])

        // this.box_geo = new THREE.BoxBufferGeometry(cx1-cx0, cy1-cy0, cz1-cz0)
        // this.box_geo.translate((cx1-x0)/2, (cy1-cy0)/2, (cz1-cz0)/2)
        // this.box_geo.translate(cx0, cy0, cz0)
        // this.box_geo.translate(-0.5, -0.5, -0.5)
        this.box_geo = new THREE.BoxBufferGeometry(1, 1, 1)
        this.box_geo.translate(0.5, 0.5, 0.5)
        this.box_geo.scale((cx1-cx0), (cy1-cy0), (cz1-cz0))
        this.box_geo.translate(cx0, cy0, cz0)
        this.box_geo.translate(-0.5, -0.5, -0.5)
        this.vol_box_mesh.geometry = this.box_geo
        
        this.box_material_volr.uniforms.scale.value = [1/(x1n-x0n), 1/(y1n-y0n), 1/(z1n-z0n)]
        this.box_material_volr.uniforms.offset.value = [-x0n, -y0n, -z0n]
    },
    add_to_scene: function() {
        this.renderer.scene_volume.add(this.vol_box_mesh)
    },
    remove_from_scene: function() {
        this.renderer.scene_volume.remove(this.vol_box_mesh)
    },
    set_render_size: function(render_width, render_height){
        this.box_material_volr.uniforms.render_size.value = [render_width, render_height]
    },
    set_back_tex: function(tex){
        this.box_material_volr.uniforms.back_tex.value = tex;
    },
    set_geometry_depth_tex: function(tex){
        this.box_material_volr.uniforms.geometry_depth_tex.value = tex;
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
            step_size: 0.01,
            ambient_coefficient: 0.5,
            diffuse_coefficient: 0.8,
            specular_coefficient: 0.5,
            specular_exponent: 5,
            opacity_scale: 1.0,
            extent: null,
            volume_rendering_lighting: true,
            volume_rendering_method: 'NORMAL',
            volume_clamp_min: false,
            volume_clamp_max: false,
            volume_data_range: null,
            volume_show_range: null,
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
