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

        this.box_geo = new THREE.BoxBufferGeometry(1, 1, 1)
        //this.box_material = new THREE.MeshLambertMaterial({color: 0xCC0000});
        this.box_material = new THREE.ShaderMaterial({
            uniforms: {
                centerNormalizeTransform: {type:'m4', value: new THREE.Matrix4()},
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

        var render_size = this.renderer.getRenderSize()

        this.box_material_volr = new THREE.ShaderMaterial( {
            uniforms: {
                exit_points: { type: "t", value: null },
                volume_tex : { type: 't', value: null },
                geometry_color_tex: { type: "t", value: null},
                geometry_depth_tex: { type: "t", value: null},
                transfer_function_tex: { type: 't', value: this.texture_tf},
                data_values_minmax: {type: "v2", value: new THREE.Vector2(this.model.get("data_min"),this.model.get("data_max"))},
                volume_size: { type: "v3", value: [0,0,0]},
                tex_tile_size: { type: "v2", value: [1,1]},
                nr_of_tiles: { type: "v2", value: [1,1]},
                slice_pixel_size: { type: "v2", value: [1,1]},
                slice_inner_size: { type: "v2", value: [1,1]},
                render_size: { type: 'v2', value: render_size},
                step_size: {type: 'f', value: this.model.get("step_size")},
                threshold: {type: 'v2', value: [0.4,0.6]}, // DEBGUUUU
                show_threshold: {type: 'i', value: false}, 
                centerNormalizeTransform: {type:'m4', value: new THREE.Matrix4()},
                debugnumber: {type: 'i', value:0},
                debugfloat: { type: "f", value: 0.0},
                noise_factor: {type: 'f', value: 0.1}
            },
            fragmentShader: shaders["volume_fragment"],
            vertexShader: shaders["volume_vertex"],
            transparent: true,
            side: THREE.FrontSide,
        } );

        this.tf_set()
        this.data_set()

        this.add_to_scene()

        this.model.on('change:volume_data', this.data_set, this);
        this.model.on('change:tf', this.tf_set, this)

        this.model.on('change:ambient_coefficient', this.update_light, this);
        this.model.on('change:diffuse_coefficient', this.update_light, this);
        this.model.on('change:specular_coefficient', this.update_light, this);
        this.model.on('change:specular_exponent', this.update_light, this);

        this.model.on('change:step_size', this.update_volume_render_settings, this);

        this.update_light();
    },
    update_volume_render_settings: function(){
        this.box_material_volr.uniforms.step_size.value = this.model.get('step_size');
    },
    set_limits: function(limits) {
        // refactor and maybe rename function and pass global domain translation 

        var xptp = limits.xlim[1] - limits.xlim[0]
        var yptp = limits.ylim[1] - limits.ylim[0]
        var zptp = limits.zlim[1] - limits.zlim[0]

        var domainscale = Math.max(Math.max(xptp,yptp),zptp)

        var volOrigin = this.model.get('origin')
        var volDomainSize = this.model.get('domain_size')

        this.box_material_volr.uniforms.centerNormalizeTransform.value.identity()
                                .multiply((new THREE.Matrix4()).makeScale(1/domainscale,1/domainscale,1/domainscale)) // Global domain scale
                                .multiply((new THREE.Matrix4()).makeTranslation(-(limits.xlim[0]+xptp/2),-(limits.ylim[0]+yptp/2),-(limits.zlim[0]+zptp/2))) // Global translation
                                .multiply((new THREE.Matrix4()).makeTranslation((volOrigin[0]+volDomainSize[0]/2),(volOrigin[1]+volDomainSize[1]/2),(volOrigin[2]+volDomainSize[2]/2))) // Translate to volume origin
                                .multiply((new THREE.Matrix4()).makeScale(volDomainSize[0],volDomainSize[1],volDomainSize[2])) // Scale to volume domain size
        this.box_material.uniforms.centerNormalizeTransform.value.identity()
                                .multiply((new THREE.Matrix4()).makeScale(1/domainscale,1/domainscale,1/domainscale)) // Global domain scale
                                .multiply((new THREE.Matrix4()).makeTranslation(-(limits.xlim[0]+xptp/2),-(limits.ylim[0]+yptp/2),-(limits.zlim[0]+zptp/2))) // Global translation
                                .multiply((new THREE.Matrix4()).makeTranslation((volOrigin[0]+volDomainSize[0]/2),(volOrigin[1]+volDomainSize[1]/2),(volOrigin[2]+volDomainSize[2]/2))) // Translate to volume origin
                                .multiply((new THREE.Matrix4()).makeScale(volDomainSize[0],volDomainSize[1],volDomainSize[2])) // Scale to volume domain size
    },
    update_light: function() {
        // this.box_material_volr.uniforms.ambient_coefficient.value = this.model.get("ambient_coefficient")
        // this.box_material_volr.uniforms.diffuse_coefficient.value = this.model.get("diffuse_coefficient")
        // this.box_material_volr.uniforms.specular_coefficient.value = this.model.get("specular_coefficient")
        // this.box_material_volr.uniforms.specular_exponent.value = this.model.get("specular_exponent")
        // this.renderer.update()
    },
    data_set: function() {
        var volumes = this.model.get("volume_data")
        if(!volumes) {
            this.renderer.update_size()
            return;
            //this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}
        }

        // VOLUME LOADER THAT NEEDS TO BE CHANGED INTO DATA TEXTURE
        //this.texture_volume = this.texture_loader.load(this.volume.src, _.bind(this.update, this));//, _.bind(this.update, this))
        //this.texture_volume.magFilter = THREE.LinearFilter
        //this.texture_volume.minFilter = THREE.LinearFilter
        // *************** //

        var tex_tile_size = [1.0 / volumes.nr_of_tiles[0],1.0 / volumes.nr_of_tiles[1]]
    
        var slicePixelSize = new THREE.Vector2(tex_tile_size[0]/volumes.size[0],tex_tile_size[1]/volumes.size[1]);
        var volumeSliceSize = new THREE.Vector2(volumes.size[0],volumes.size[1]);
        var sliceInnerSize = slicePixelSize.clone().multiply(volumeSliceSize.clone().subScalar(1.0));

        this.texture_volumes = []

        _.each(volumes.volume_data_tiled, function(vol) {
            var dataValues = new Float32Array( vol.buffer.buffer );
            var texvol = new THREE.DataTexture(dataValues, volumes.size[0]*volumes.nr_of_tiles[0], volumes.size[1]*volumes.nr_of_tiles[1], 
                                               THREE.LuminanceFormat, 
                                               THREE.FloatType,
                                               THREE.UVMapping,
                                               THREE.ClampToEdgeWrapping,
                                               THREE.ClampToEdgeWrapping,
                                               THREE.LinearFilter,
                                               THREE.LinearFilter);
            texvol.needsUpdate = true;
            this.texture_volumes.push(texvol)
        }, this)

        this.box_material_volr.uniforms.volume_size.value = volumes.size
        this.box_material_volr.uniforms.volume_tex.value = this.texture_volumes[0]
        this.box_material_volr.uniforms.tex_tile_size.value = tex_tile_size
        this.box_material_volr.uniforms.nr_of_tiles.value = volumes.nr_of_tiles
        this.box_material_volr.uniforms.slice_pixel_size.value = slicePixelSize
        this.box_material_volr.uniforms.slice_inner_size.value = sliceInnerSize
        this.box_material_volr.needsUpdate = true;

        if(this.model.previous("volume_data")) {
            this.renderer.update()
        } else {
            this.renderer.update_size() // could need a resize, see update_size
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
            this.texture_tf = new THREE.DataTexture(tf.get_data_array(), tf.get("rgba").shape[0], 1, THREE.RGBAFormat)
            this.texture_tf.needsUpdate = true // without this it doesn't seem to work
            this.box_material_volr.uniforms.transfer_function_tex.value = this.texture_tf
            this.renderer.update()
        }
    },
    add_to_scene: function() {
        this.renderer.scene_volume.add(this.box_mesh)
    },
    remove_from_scene: function() {
        this.renderer.scene_volume.remove(this.box_mesh)
    },
    update_: function() {

    },
    set_render_size: function(render_width, render_height){ // Check this
        this.box_material_volr.uniforms.render_size.value = [render_width, render_height]
    },
    set_exit_points_tex: function(tex){
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
