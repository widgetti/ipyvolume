define(["jupyter-js-widgets", "underscore", "three", "jquery", "gl-matrix"],
        function(widgets, _, THREE, $, glm) {

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

var jQuery = $
//var colormap_url = require('../colormap.png');
//var default_cube_url = require('../cube.png');


(function($) {
var colormap_names = ["PaulT_plusmin", "binary", "Blues", "BuGn", "BuPu", "gist_yarg", "GnBu", "Greens", "Greys", "Oranges", "OrRd", "PuBu", "PuBuGn", "PuRd", "Purples", "RdPu", "Reds", "YlGn", "YlGnBu", "YlOrBr", "YlOrRd", "afmhot", "autumn", "bone", "cool", "copper", "gist_gray", "gist_heat", "gray", "hot", "pink", "spring", "summer", "winter", "BrBG", "bwr", "coolwarm", "PiYG", "PRGn", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "seismic", "Accent", "Dark2", "hsv", "Paired", "Pastel1", "Pastel2", "Set1", "Set2", "Set3", "spectral", "gist_earth", "gist_ncar", "gist_rainbow", "gist_stern", "jet", "brg", "CMRmap", "cubehelix", "gnuplot", "gnuplot2", "ocean", "rainbow", "terrain", "flag", "prism"];

    var gl;

    var shader_text = {}
    var shaders_loaded = 0;
    function are_shaders_loaded() {
        return true; //shader_text.length == shader_names.length * 2
    }

    //loadShaders("/nbextensions/volr/")


    function getShader_(gl, id, replacements) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            alert("Cannot find element " + id);
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }
        if(replacements) {
			console.log(replacements)
			for(var key in replacements) {
				//console.log(replacements)
				str  = str.replace(key, replacements[key])
			}
		}

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        } else {
            return null;
        }

        this.gl.shaderSource(shader, str);
        this.gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }



    $.vr = function(canvas, options) {

        var transfer_function_array = []

        this.fill_transfer_function_array = function() {
          transfer_function_array = []
          console.log("transfer function")
          console.log(options.volume_level)
          console.log(options.volume_width)
          for(var i = 0; i < 1024; i++) {
            var position = i / (1023.);
            var intensity = 0.;
            for(var j = 0; j < 3; j++) {
              //float bla = length(sample)/sqrt(3.);
              //float data_value = () * data_scale;
              var chi = (position-options.volume_level[j])/options.volume_width[j];
              var chisq = Math.pow(chi, 2.);
              intensity += Math.exp(-chisq) * options.opacity[j];
            }
            //console.log(intensity)
            transfer_function_array.push([intensity * 255.])
          }
        }

        this.update_transfer_function_array = function(array) {
          this.gl.bindTexture(this.gl.TEXTURE_2D, texture_transfer_function);
          if(array == undefined) {
            plugin.fill_transfer_function_array()
            array = transfer_function_array
          } else {
            var proper_array = [];
            for(var i = 0; i < array.length; i++) {
              proper_array.push([array[i]*255])
            }
          }
          var transfer_function_uint8_array = new Uint8Array(array);
          console.log("array > " + array.length)
          this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, array.length, 1, 0, this.gl.ALPHA, this.gl.UNSIGNED_BYTE, transfer_function_uint8_array);
        }

        //loadShaders()
        if(!are_shaders_loaded()) {
            console.log("shaders not loaded, only" + shaders_loaded + " out of " +(shader_names.length*2))
        }

        plugin.init = function() {
            log("ctor")
            log(this)
            log(canvas)

            //initAllShaders();
            //initBuffers();

        }

        this.drawScene = function() {
        }
        this.drawTexture = function () {
        }

        this.drawCube = function (program) {

        }


    	var update_counter = 0;
        this.updateScene = function() {
            (function(local_update_counter) {
                setTimeout(function(){
                    //console.log("update: " +update_counter +" / " +local_update_counter);
                    if(local_update_counter == update_counter) {
                        shader_volume_rendering = shader_volume_rendering_final;
                        plugin.real_updateScene()
                    }
                }, 300);
            })(++update_counter);
            shader_volume_rendering = shader_volume_rendering_updates;
            plugin.real_updateScene()

        }
        this.real_updateScene = function() {
            //console.log(localStorage)
            //localStorage.save("last_settings", settings)
            console.log("real update scene")
            this.gl.clearColor(0.0, 1.0, 0.0, 1.0);
            this.gl.enable(this.gl.DEPTH_TEST);

            this.drawScene();
        }


		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(this.gl.DEPTH_TEST);
		this.drawScene();

        //console.log(transfer_function_array)

    }
    $.fn.vr = function(options) {
        var settings = $.extend({
            // These are the defaults.
            color: "red",
            backgroundColor: "black",
            frame_buffer_width: 256,
            frame_buffer_height: 256,
            angle1: 0.2,
            angle2: 0.2,
            colormap_index:0,
            data_min:0.,
            data_max:1.,
            opacity:[0.04, 0.01, 0.1],
            brightness: 2.,
            volume_level: [0.1, 0.5, 0.75],
            volume_width: [0.1, 0.1, 0.2],
            cube:"cube.png",
            colormap:"colormap.png"
        }, options );
        log(settings)
//        #volume_level: [178/255., 85/255., 31/255., 250],
        log(this)
        return this.each(function() {
            var plugin = new $.vr(this, settings)
            log("return plugin")
            $(this).data("vr", plugin)
            return plugin
        });
    }
    function log(obj) {
        if ( window.console && window.console.log ) {
            window.console.log(obj );
        }
    };

}($));


// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including `_model_name`, `_view_name`, `_model_module`
// and `_view_module` when different from the base class.
//
// When serialiazing entire widget state for embedding, only values different from the
// defaults will be specified.
var VolumeModel = widgets.DOMWidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name : 'VolumeModel',
            _view_name : 'VolumeView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
            angle1: 0.1,
            angle2: 0.2,
            ambient_coefficient: 0.5,
            diffuse_coefficient: 0.8,
            specular_coefficient: 0.5,
            specular_exponent: 5
        })
    }
}, {
    serializers: _.extend({
        tf: { deserialize: widgets.unpack_models },
    }, widgets.DOMWidgetModel.serializers)
});


// Custom View. Renders the widget model.
var VolumeView = widgets.DOMWidgetView.extend({
    render: function() {
        this.frame_buffer_width = 256
        this.frame_buffer_height = 256

        this.colormap_index = 0
        this.brightness = 2
        this.data_min = 0
        this.data_max = 1

        this.model.on('change:angle1', this.update_scene, this);
        this.model.on('change:angle2', this.update_scene, this);
        this.model.on('change:data', this.volume_changed, this);

        this.model.on('change:ambient_coefficient', this.update_scene, this);
        this.model.on('change:diffuse_coefficient', this.update_scene, this);
        this.model.on('change:specular_coefficient', this.update_scene, this);
        this.model.on('change:specular_exponent', this.update_scene, this);


        window.tf = this.model.get("tf")
        this.canvas =  $('<canvas/>',{'class':'ipyvolume', 'display':'inline'}).width(512).height(512);
		//display_javascript(""" $('#%s').vr(
		//		$.extend({cube:%s, colormap:window.colormap_src}, %s)
		$(this.el).append(this.canvas)

        var shader_cube;
        var shader_texture;
        // 3 versions of the shaders exists
        var shader_volume_rendering_best;
        var shader_volume_rendering_fast;
        var shader_volume_rendering_poor;
        // used for different pruposes
        var shader_volume_rendering;
        var shader_volume_rendering_updates;
        var shader_volume_rendering_final;

        var shader_names = ["cube", "texture", "volr"]
        function loadShaders(base_url) {
            for(var i = 0; i < shader_names.length; i++) {
                loadShader(base_url + shader_names[i] + "-fragment.shader", shader_names[i]+"-fragment")
                loadShader(base_url + shader_names[i] + "-vertex.shader", shader_names[i]+"-vertex")
            }

        }
        var plugin = this;
        this.init_GL(this.canvas[0]); // pass the DOM element



        /*this.model.on('change:level1', this.value_changed, this);
        this.model.on('change:level2', this.value_changed, this);
        this.model.on('change:level3', this.value_changed, this);
        this.model.on('change:opacity1', this.value_changed, this);
        this.model.on('change:opacity2', this.value_changed, this);
        this.model.on('change:opacity3', this.value_changed, this);
        this.model.on('change:width1', this.value_changed, this);
        this.model.on('change:width2', this.value_changed, this);
        this.model.on('change:width3', this.value_changed, this);
        this.model.on('change:volume', this.volume_changed, this);*/
		//*
		var cube = default_cube_url;
		cube = this.model.get("data")
		/*this.vr = $(this.canvas).vr(
				$.extend(
				{
				    cube:cube,
				    colormap:colormap_url
				},
				{})
			)
			/**/
        //this.value_changed();

        this.volume_size = 128;
        this.shader_cube = this.init_shaders("cube");
        this.gl.useProgram(this.shader_cube);
        this.shader_texture = this.init_shaders("texture");
        this.shader_volume_rendering_best = this.init_shaders("volr", {NR_OF_STEPS:300});
        this.shader_volume_rendering_fast = this.init_shaders("volr", {NR_OF_STEPS:150});
        this.shader_volume_rendering_poor = this.init_shaders("volr", {NR_OF_STEPS:40});
        this.shader_volume_rendering = this.shader_volume_rendering_fast;
        this.shader_volume_rendering_updates = this.shader_volume_rendering_fast;
        this.shader_volume_rendering_final = this.shader_volume_rendering_best;

        this.texture_volume = this.init_volume_texture()
        this.volume_changed()

        this.texture_colormaps = this.init_colormap_texture(colormap_url)

        var triangleVertexPositionBuffer;
        var squareVertexPositionBuffer;
        var cubeVertexPositionBuffer;
        var cubeIndexBuffer;
        var cubeColorBuffer;

        var texture_frame_buffer_front;
        var texture_frame_buffer_back;
        var texture_frame_buffer_volume;
        var texture_show;
        var texture_transfer_function;
        //var texture_colormaps;

        var texture_volume;
        var colormap_image;

        this.texture_transfer_function = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_transfer_function);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        //this.fill_transfer_function_array()
        //var transfer_function_uint8_array = new Uint8Array(transfer_function_array);
        //console.log("array > " + transfer_function_array.length)
        //gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.ALPHA, transfer_function_array.length, 1, 0, this.gl.ALPHA, this.gl.UNSIGNED_BYTE, transfer_function_uint8_array);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        this.frame_buffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        this.frame_buffer.width = this.frame_buffer_width;
        this.frame_buffer.height = this.frame_buffer_height;


        // this is where we render the volume to
        this.texture_frame_buffer_volume = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_frame_buffer_volume);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.frame_buffer.width, this.frame_buffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        window.volume = this;

        // this is for the (x,y,z) coordinates encoded in rgb for the back plane
        this.texture_frame_buffer_back = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_frame_buffer_back);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        //gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
        //gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.frame_buffer.width, this.frame_buffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        // similar for the front
        this.texture_frame_buffer_front = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_frame_buffer_front);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        //gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST);
        //gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.frame_buffer.width, this.frame_buffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        // this is what we show, for debugging you may want to see the front or back
        this.texture_show = this.texture_frame_buffer_volume;//texture_frame_buffer_back;
        //texture_show = texture_frame_buffer_back;


        this.render_buffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.render_buffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.frame_buffer.width, this.frame_buffer.height);

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture_frame_buffer_front, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.render_buffer);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


        this.triangleVertexPositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
        var vertices = [
        0.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
        1.0, -1.0,  0.0
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.triangleVertexPositionBuffer.itemSize = 3;
        this.triangleVertexPositionBuffer.numItems = 3;

        // vertex buffers etc for cube and square
        this.squareVertexPositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
        vertices = [
        1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
        1.0, -1.0,  0.0,
        -1.0, -1.0,  0.0
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.squareVertexPositionBuffer.itemSize = 3;
        this.squareVertexPositionBuffer.numItems = 4;

        this.cubeVertexPositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexPositionBuffer);
        vertices = [
        0.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  0.0,  1.0,
        1.0,  0.0,  1.0,
        1.0,  1.0,  1.0,
        0.0,  1.0,  1.0,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.cubeVertexPositionBuffer.itemSize = 3;
        this.cubeVertexPositionBuffer.numItems = 8;

        // bind the positions to color as well
        this.cubeColorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.cubeColorBuffer.itemSize = 3;
        this.cubeColorBuffer.numItems = 8;

        this.cubeIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        /*

        3 2
        0 1

        7 6
        4 5
        */
        var indices = [
        0, 3, 2, // back
        0, 2, 1,
        5, 1, 2, // right
        5, 2, 6,
        4, 7, 3, // left
        4, 3, 0,
        7, 6, 2, // top
        7, 2, 3,
        5, 4, 0, // bottom
        5, 0, 1	,

        4, 5, 6, // front
        4, 6, 7
        ];
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        this.cubeIndexBuffer.itemSize = 1;
        this.cubeIndexBuffer.numItems = 3*2*6;//*4;



        this.mvMatrix = glm.mat4.create();
        this.pMatrix = glm.mat4.create();

		this.gl.clearColor(0.0, 1.0, 0.0, 1.0);
		this.gl.enable(this.gl.DEPTH_TEST);
        this.update_counter = 0;
		this.draw_scene();

        this.mouse_x = 0;
        this.mouse_y = 0;
        this.mouse_down = false;

		$(this.canvas).mousedown(_.bind(this.canvas_onmousedown, this));
		$(this.canvas).on("touchmove", _.bind(this.canvas_ontouchmove, this));
		$(this.canvas).mouseup(_.bind(this.canvas_onmouseup, this));
		$(this.canvas).mousemove(_.bind(this.canvas_onmousemove, this));

        // update transfer function
        this.tf_changed()
    },
    canvas_ontouchmove: function( event ) {
        var msg = "Handler for .touchmove() called at ";

        var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
        var elm = this.canvas.offset();
        var x = touch.pageX - elm.left;
        var y = touch.pageY - elm.top;
        //$( "#log" ).append( "<div>" + x +"," + y + "</div>" );
        if(x < this.canvas.width() && x > 0){
            if(y < this.canvas.height() && y > 0){
                //console.log(touch.pageY+' '+touch.pageX);
                msg += x + ", " + y;
                var dx = x - this.mouse_x;
                var dy = y - this.mouse_y;
                var speed = 0.01;
                this.model.set("angle1", this.model.get("angle1") + dx * speed);
                this.model.set("angle2", this.model.get("angle2") + dy * speed);
                //var msg = "change angle" + angle1 + ", " + angle2;
                this.mouse_x = x;
                this.mouse_y = y;
                this.update_scene();
                //$( "#log" ).append( "<div>" + msg + "</div>" );


                event.preventDefault();
            }
        }
    },
    canvas_onmousemove: function( event ) {
        var msg = "Handler for .mousemove() called at ";
        msg += event.pageX + ", " + event.pageY;
        var elm = this.canvas.offset();
        if(elm) {
            var x = event.pageX - elm.left;
            var y = event.pageY - elm.top;
            //$( "#log" ).append( "<div>" + x +"," + y + "</div>" );
            if(x < this.canvas.width() && x > 0){
                if(y < this.canvas.height() && y > 0){
                    if(this.mouse_down) {
                        var dx = event.pageX - this.mouse_x;
                        var dy = event.pageY - this.mouse_y;
                        var speed = 0.01;
                        this.model.set("angle1", this.model.get("angle1") + dx * speed);
                        this.model.set("angle2", this.model.get("angle2") + dy * speed);
                       // var msg = "change angle" + angle1 + ", " + angle2;
                        this.update_scene();
                    }
                }
            }
            this.mouse_x = event.pageX;
            this.mouse_y = event.pageY;
        }
        event.preventDefault();
    },
    canvas_onmousedown: function(event){
        this.mouse_down = true;
    },
    canvas_onmouseup: function(event){
        event.preventDefault();
        this.mouse_down = false;
    },
    draw_texture: function() {
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clearColor(1.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shader_texture);

        //glm.mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, pMatrix);
        var size = 1.0;
        glm.mat4.ortho(this.pMatrix, -size, size, -size, size, -100, 100)

        glm.mat4.identity(this.mvMatrix);

        glm.mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0.0, -7.0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
        this.gl.vertexAttribPointer(this.shader_cube.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
        this.set_matrix_uniforms(this.shader_texture);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_show);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
    },
    draw_cube: function(program) {
        this.gl.viewport(0, 0, this.frame_buffer.width, this.frame_buffer.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.useProgram(program);
        glm.mat4.perspective(this.pMatrix, 15, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0);
        var size = 0.6;///Math.sqrt(2);
        glm.mat4.ortho(this.pMatrix, -size, size, -size, size, -100, 100)

        glm.mat4.identity(this.mvMatrix);

        glm.mat4.translate(this.mvMatrix, this.mvMatrix, [-1.5, 0.0, -7.0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
        this.gl.vertexAttribPointer(this.shader_cube.vertexPositionAttribute, this.triangleVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
        this.set_matrix_uniforms(program);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.triangleVertexPositionBuffer.numItems);


        /*glm.mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        this.gl.vertexAttribPointer(shader_cube.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
        setMatrixUniforms();
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
        */
        var scale = glm.vec3.create();
        glm.vec3.set(scale, [0.8,0.8,0.8])

        glm.mat4.identity(this.mvMatrix);
        //glm.mat4.scale(this.mvMatrix, scale);
        glm.mat4.translate(this.mvMatrix, this.mvMatrix, [-0.0, 0.0, -7.0]);
        glm.mat4.rotateY(this.mvMatrix, this.mvMatrix, this.model.get("angle1"));
        glm.mat4.rotateX(this.mvMatrix, this.mvMatrix, this.model.get("angle2"));
        glm.mat4.translate(this.mvMatrix, this.mvMatrix, [-0.5, -0.5, -0.5]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeVertexPositionBuffer);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        this.gl.vertexAttribPointer(this.shader_cube.vertexPositionAttribute, this.cubeVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
        this.set_matrix_uniforms(program);
        //gl.drawArrays(this.gl.TRIANGLES, cubeIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        this.gl.drawElements(this.gl.TRIANGLES, this.cubeIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        //gl.drawElements(this.gl.LINES, cubeIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
    },
    draw_scene: function() {

        /*canvas2d_element = document.getElementById("canvas-transfer");
        canvas2d = canvas2d_element.getContext("2d");
        canvas2d.strokeStyle="purple"
        canvas2d.strokeStyle="purple"
        canvas2d.fillStyle="#000000";
        canvas2d.fillRect(0, 0, 512, 30);
        canvas2d.drawImage(colormap_image, 0, 70-1-colormap_index, 1024, 1, data_min*512, 0, (data_max - data_min)*512, 30)
        var data_scale = 1./(data_max - data_min);
        clamp = function(x, xmin, xmax) {
            return (x < xmin ? xmin : (x > xmax ? xmax : x));
        }
        sign = function(x) {
            return Math.abs(x) / x;
        }
        for(var j = 0; j < 4; j++) {
            canvas2d.beginPath();
            canvas2d.moveTo(data_min*512, 0);
            for(var x_index = 0; x_index < 512; x_index++) {
                var x = x_index/511;
                var data_value = (x - data_min) * data_scale;//, 0., 1.);
                var volume_level_value = (volume_level[j] - data_min) * data_scale;//, 0., 1.);
                var chi = (data_value-volume_level[j])/volume_width[j];
                var chisq = Math.pow(chi, 2.);
                var intensity = Math.exp(-chisq);
                var y = 30-intensity*(Math.log(opacity[j])/Math.log(10)+5)/5. * 30 * sign(data_value) * sign(1.-data_value);
                if(x_index == 0) {
                    canvas2d.moveTo(x_index, y);
                } else {
                    canvas2d.lineTo(x_index, y);
                }
                //glm.vec4 color_sample = texture2D(colormap, vec2(clamp((level+2.)/2., 0., 1.), colormap_index_scaled));
                //intensity = clamp(intensity, 0., 1.);
                //float distance_norm = clamp(((-chi/0.5)+1.)/2., 0., 1.);
                //color_index = 0.9;
                //glm.vec4 color_sample = texture2D(colormap, vec2(1.-volume_level[j], colormap_index_scaled));
                //glm.vec4 color_sample = texture2D(colormap, vec2(data_value, colormap_index_scaled));
            }
            canvas2d.stroke()
        }*/


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frame_buffer);
        this.gl.cullFace(this.gl.BACK);

        this.gl.enable(this.gl.CULL_FACE);

        this.gl.cullFace(this.gl.BACK);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture_frame_buffer_front, 0);
        this.draw_cube(this.shader_cube);

        this.gl.cullFace(this.gl.FRONT);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture_frame_buffer_back, 0);
        this.draw_cube(this.shader_cube);


        this.gl.cullFace(this.gl.BACK);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture_frame_buffer_volume, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_frame_buffer_back);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_frame_buffer_front);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_volume);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_colormaps);
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_transfer_function);
        this.gl.activeTexture(this.gl.TEXTURE0);

        this.gl.useProgram(this.shader_volume_rendering);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "back"),  0);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "front"),   1);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "volume"), 2);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "colormap"), 3);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "transfer_function"),  4);
        this.gl.uniform1i(this.gl.getUniformLocation(this.shader_volume_rendering, "colormap_index"), this.colormap_index);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "brightness"), this.brightness);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "data_min"), this.data_min);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "data_max"), this.data_max);
        this.gl.uniform2f(this.gl.getUniformLocation(this.shader_volume_rendering, "volume_size"), this.volume.image_shape[0], this.volume.image_shape[1]);
        this.gl.uniform2f(this.gl.getUniformLocation(this.shader_volume_rendering, "volume_slice_size"), this.volume.slice_shape[0], this.volume.slice_shape[1]);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "volume_rows"), this.volume.rows);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "volume_slices"), this.volume.slices);
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "volume_columns"), this.volume.columns);


        var mat = glm.mat3.create();
        glm.mat3.fromMat4(mat, this.mvMatrix)
        //glm.mat3.invert(mat, mat)
        this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.shader_volume_rendering, "mvMatrix"), false, mat);


        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "ambient_coefficient"), this.model.get("ambient_coefficient"));
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "diffuse_coefficient"), this.model.get("diffuse_coefficient"));
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "specular_coefficient"), this.model.get("specular_coefficient"));
        this.gl.uniform1f(this.gl.getUniformLocation(this.shader_volume_rendering, "specular_exponent"), this.model.get("specular_exponent"));


        //this.gl.uniform1fv(this.gl.getUniformLocation(shader_volume_rendering, "opacity"),  this.opacity);
        //this.gl.uniform1fv(this.gl.getUniformLocation(shader_volume_rendering, "volume_level"), options.volume_level);
        //this.gl.uniform1fv(this.gl.getUniformLocation(shader_volume_rendering, "volume_width"), options.volume_width);

        this.draw_cube(this.shader_volume_rendering);

        this.gl.cullFace(this.gl.BACK);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.draw_texture();
    },
    update_scene: function() {
        var that = this;
        (function(local_update_counter) {
            setTimeout(function(){
                //console.log("update: " +update_counter +" / " +local_update_counter);
                if(local_update_counter == that.update_counter) {
                    that.shader_volume_rendering = that.shader_volume_rendering_final;
                    that.update_scene_direct()
                }
            }, 300);
        })(++this.update_counter);
        this.shader_volume_rendering = this.shader_volume_rendering_updates;
        this.update_scene_direct()
        //this.()
    },
    update_scene_direct: function() {
        this.gl.clearColor(0.0, 1.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.draw_scene();
    },
    tf_changed: function() {
        var vr = $(this.vr).data('vr')
        src = this.model.get("tf").get("rgba")
        this.updateTFTexture(src)
    },
    set_matrix_uniforms: function (program) {
        this.gl.uniformMatrix4fv(program.pMatrixUniform, false, this.pMatrix);
        this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
    },
    volume_changed: function() {
        this.volume = this.model.get("data")
        if(!this.volume) {
            this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}
        }
        this.set_volume_texture_data(this.volume.src)
    },
    value_changed: function() {
        return;
         var new_settings = {
            volume_level: [this.model.get('level1'), this.model.get('level2'), this.model.get('level3')],
            volume_width: [this.model.get('width1'), this.model.get('width2'), this.model.get('width3')],
            opacity: [this.model.get('opacity1'), this.model.get('opacity2'), this.model.get('opacity3')]
         };
         var vr = $(this.vr).data('vr')
         $.extend(vr.settings, new_settings)
         window.vr = this.vr
         window.vv = this;
         vr.update_transfer_function_array()
		 vr.updateScene()
    },
    set_volume_texture_data: function(src) {
        this.load_texture(this.texture_volume, this.gl.RGBA, src);
    },
    init_colormap_texture: function(src) {
        var texture_colormaps = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture_colormaps);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.volume_size, this.volume_size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        colormap_image = this.load_texture(texture_colormaps, this.gl.RGB, src);
        return texture_colormaps;
        //var ext = this.gl.getExtension("OES_texture_float")
        //console.log("ext:" + ext.FLOAT);
    },
    init_volume_texture: function() {
        var texture_volume = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture_volume);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.volume_size, this.volume_size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        //this.load_texture(texture_volume, this.gl.RGBA, src);
        return texture_volume
    },
    load_texture: function (texture, format, url) {
        var textureImage = new Image();
        var that = this;
        textureImage.onload = function() {
            that.gl.bindTexture(that.gl.TEXTURE_2D, texture);
            that.gl.texImage2D(that.gl.TEXTURE_2D, 0, format, format, that.gl.UNSIGNED_BYTE, textureImage);
            //alert("loaded: " +volumeImage.src + " " +gl.getError() + ":" +volumeImage);
            that.update_scene()
        }
        textureImage.src = url;
        return textureImage;
    },
    updateTFTexture: function(rgba) {
        var textureImage = new Image();
        var that = this;
        var flat_array = [];
        window.rgba = rgba
        for(var i = 0; i < rgba.length; i++) {
            for(var j = 0; j < 4; j++) {
              flat_array.push(rgba[i][j]*255)
            }
        }
        var transfer_function_uint8_array = new Uint8Array(flat_array);
        // REMOVE: for debugging
        window.transfer_function_uint8_array = transfer_function_uint8_array
        window.flat_array = flat_array
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_transfer_function);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, rgba.length, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, transfer_function_uint8_array);
        this.update_scene()
        return

        textureImage.onload = function() {
            that.gl.bindTexture(that.gl.TEXTURE_2D, that.texture_transfer_function);
            that.gl.texImage2D(that.gl.TEXTURE_2D, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, textureImage);
            that.update_scene()
        }
        textureImage.src = src;
        return textureImage;
    },
    init_GL: function (canvas) {
        window.canvas = canvas
        this.gl = canvas.getContext("experimental-webgl");
        if(this.gl) {
            this.gl.viewportWidth = canvas.width;
            this.gl.viewportHeight = canvas.height;
        }
        if (!this.gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    },
    load_shader: function (url, name) {
        assign = function(response) {
            shader_text[name] = response
            shaders_loaded += 1;
        }
        return $.ajax({
            url: url,
        }).then(assign)
    },
    init_shaders: function (name, replacements) {
		var fragmentShader = this.get_shader(name+"_fragment", replacements);
		var vertexShader =   this.get_shader(name+"_vertex", replacements);
		var program = this.gl.createProgram();
		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}

		program.pMatrixUniform = this.gl.getUniformLocation(program, "uPMatrix");
		program.mvMatrixUniform = this.gl.getUniformLocation(program, "uMVMatrix");
        program.vertexPositionAttribute = this.gl.getAttribLocation(program, "aVertexPosition");
        this.gl.enableVertexAttribArray(program.vertexPositionAttribute);

		return program;
	},
    get_shader: function (id, replacements) {
        console.log("get shader " + id)
        var str = shaders[id]
        //var str = window.shader_cache[id]
        //console.log("id = " + id)
        if(replacements) {
			console.log(replacements)
			for(var key in replacements) {
				//console.log(replacements)
				str  = str.replace(key, replacements[key])
			}
		}

        var shader;
        //if (shaderScript.type == "x-shader/x-fragment") {
        if(id.indexOf("fragment") != -1) {
            shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            console.log("fragment shader")
        } else if(id.indexOf("vertex") != -1) {
            shader = this.gl.createShader(this.gl.VERTEX_SHADER);
            console.log("vertex shader")
        } else {
            alert("no shader " +id)
            return null;
        }

        this.gl.shaderSource(shader, str);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

});


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


var VolumeRendererThreeView = widgets.DOMWidgetView.extend( {
    render: function() {
        this.transitions = []
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

        this.box_geo = new THREE.BoxGeometry(1, 1, 1)
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

        var pointLight = new THREE.PointLight(0xFFFFFF);

        // set its position
        pointLight.position.x = 10;
        pointLight.position.y = 50;
        pointLight.position.z = 130;
        this.camera.position.z = 2

        // add to the scene

        this.scene = new THREE.Scene();
        this.scene.add(this.camera);
        this.scene.add(this.box_mesh)
        this.scene.add(pointLight);

        this.scene_opaque = new THREE.Scene();
        //this.scene.add(this.camera);

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


        this.vector_mesh = new THREE.Mesh(new THREE.CubeGeometry(0.1,1.0,0.2), new THREE.MeshBasicMaterial({color: 0xFFccAA}));
        //#this.vector_mesh.material_normal = this.vector_mesh.material
        //this.scene_opaque.add(this.vector_mesh)

        this.model.on('change:scatter', this.scatter_changed, this);
        this.scatter_changed()
        //this.create_scatter()
        //this.scene_opaque.add(this.scatter_mesh)

        this.texture_loader = new THREE.TextureLoader()
        //this.texture_volume = this.texture_loader.load(default_cube_url, _.bind(this.update, this), _.bind(this.update, this))
        //setTimeout( _.bind(this.update, this), 1000)
        //this.texture_volume.needsUpdate = true
        //this.texture_volume.magFilter = THREE.LinearFilter
        //this.texture_volume.minFilter = THREE.LinearFilter
        //window.texture_volume = this.texture_volume

        //tf_url = this.model.get("tf").get("rgba")
        //var data_array_tf = this.model.get("tf").get_data_array()
        //var rgba_tf = this.model.get("tf").get("rgba")
        //console.log(data_array_tf)
        //console.log(rgba_tf.length)
        //this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, rgba.length, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, transfer_function_uint8_array);

        this.texture_tf = null;//new THREE.DataTexture(null, this.model.get("tf").get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
        //this.texture_tf.needsUpdate = true
        //    THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter, 1)
        console.log(this.texture_tf)
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
        this.volume_changed()
        this.update_size()
        this.tf_changed()

//            this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}

        var that = this;
        //*
        this.el.addEventListener( 'change', _.bind(this.update, this) ); // remove when using animation loop
        this.update()
        console.log("render att3")

        this.model.on('change:downscale', this.update_size, this);
        this.model.on('change:stereo', this.update_size, this);
        this.model.on('change:angle1', this.update_scene, this);
        this.model.on('change:angle2', this.update_scene, this);
        this.model.on('change:data', this.volume_changed, this);

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

        function onWindowResize(){

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

        }

        window.last_volume = this;
        //navigator.wakeLock.request("display")


        return
        /**/
        //this.controls.autoRotate = true;
        function update () {
          // Draw!
          that.controls.update()
          that.renderer.render(that.scene, that.camera);

          // Schedule the next frame.
          requestAnimationFrame(update);
        }

        // Schedule the first frame.
        requestAnimationFrame(update);
        console.log("render 4")

        return

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
    transition: function(obj, prop) {
        var that = this;
        var object = obj;
        var property = prop;
        console.log("transition")
        console.log(obj)
        console.log(property)
        var Transition = function() {
            //this.objects = []
            this.time_start = (new Date()).getTime();
            this.duration = 400;
            this.cancelled = false;
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
                //console.log("setting ")
                //console.log(object)
                //console.log(property)
                object[property] = u;
            }
            //this.settime(name)
            that.transitions.push(this)
        }
        return new Transition()
    },
    schedule_update_scatter: function(attribute) {
        _.mapObject(this.model.get("scatter").changedAttributes(), function(val, key){
            console.log("changed " +key)
            this.scatter_previous[key] = this.model.get("scatter").previous(key)
        }, this)
        this.update_scatter_debounced()
    },
    scatter_changed: function() {
        console.log("scatter_changed")
        if(this.scatter_mesh)
            this.scene_opaque.remove(this.scatter_mesh)
        this.scatter_previous = {}
        this.update_scatter_debounced = _.debounce(_.bind(this.update_scatter, this), 50)
        var scatter = this.model.get("scatter")
        if(scatter) {
            scatter.on("change:size change:color change:x change:y change:z",   this.schedule_update_scatter, this)
            this.update_scatter()
        } else {
            this.update()
        }
    },
    update_scatter: function() {
        console.log("update scatter")
        this.scene_opaque.remove(this.scatter_mesh)
        this.create_scatter()
        this.scene_opaque.add(this.scatter_mesh)
        this.update()
    },
    create_scatter: function() {
        var scatter = this.model.get("scatter")
        console.log("create scatter")
        console.log(this.scatter_previous)
        var geo = new THREE.SphereGeometry(1, 2, 2)
        //var geo = new THREE.SphereGeometry(0.1, 32, 32)

        this.scatter_material = new THREE.RawShaderMaterial({
            uniforms: {animation_time : { type: "f", value: 0. },},
            vertexShader: require('../glsl/scatter-vertex.glsl'),
            fragmentShader: require('../glsl/scatter-fragment.glsl')
            })

        this.scatter_material_rgb = new THREE.RawShaderMaterial({
            uniforms: {animation_time : { type: "f", value: 0. },},
            vertexShader: "#define USE_RGB\n"+require('../glsl/scatter-vertex.glsl'),
            fragmentShader: "#define USE_RGB\n"+require('../glsl/scatter-fragment.glsl')
            })

        var buffer_geo = new THREE.BufferGeometry().fromGeometry(geo);
        var instanced_geo = new THREE.InstancedBufferGeometry();

        var vertices = buffer_geo.attributes.position.clone();
        instanced_geo.addAttribute( 'position', vertices );


        var x = scatter.get("x");
        var y = scatter.get("y");
        var z = scatter.get("z");
        var has_previous_xyz = scatter.previous("x") && scatter.previous("y") && scatter.previous("z")
        var count = Math.min(x.length, y.length, z.length);
        var count_previous = count;
        console.log("count: " +count)
        if(has_previous_xyz) {
            count_previous = Math.min(scatter.previous("x").length, scatter.previous("y").length, scatter.previous("z").length)
            console.log("has previous")
        }
        console.log("count_previous: " +count_previous)
        var max_count = Math.max(count, count_previous);
        console.log("max_count: " +max_count)

        //previous offsets
        var x_previous = this.scatter_previous["x"]|| x;
        var y_previous = this.scatter_previous["y"] || y;
        var z_previous = this.scatter_previous["z"] || z;


        // offsets
        var offsets = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var offsets_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
	    for(var i = 0; i < max_count; i++) {
	        if(i < count)
	            offsets.setXYZ(i, x[i]-0.5, y[i]-0.5, z[i]-0.5);
	        else
	            offsets.setXYZ(i, x_previous[i]-0.5, y_previous[i]-0.5, z_previous[i]-0.5);
	        if(i < count_previous)
	            offsets_previous.setXYZ(i, x_previous[i]-0.5, y_previous[i]-0.5, z_previous[i]-0.5);
	        else
	            offsets_previous.setXYZ(i, x[i]-0.5, y[i]-0.5, z[i]-0.5);
	    }
        instanced_geo.addAttribute( 'position_offset', offsets );
        instanced_geo.addAttribute( 'position_offset_previous', offsets_previous );

        // scales
        var scales = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var scales_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count ), 1, 1);
        var size = scatter.get("size")
        var size_previous = this.scatter_previous["size"]
        if(size_previous  == undefined)
            size_previous  = size;
	    for(var i = 0; i < max_count; i++) {
	        if(i < count)
    	        scales.setX(i, size);
    	    else
    	        scales.setX(i, 0.);
	        if(i < count_previous)
    	        scales_previous.setX(i, size_previous);
    	    else
    	        scales_previous.setX(i, 0.);
	    }
        instanced_geo.addAttribute( 'scale', scales);
        instanced_geo.addAttribute( 'scale_previous', scales_previous);

        // colors
        var colors = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var colors_previous = new THREE.InstancedBufferAttribute(new Float32Array( max_count * 3 ), 3, 1);
        var color = scatter.get("color")
        var color_previous = this.scatter_previous["color"]
        if(!color_previous)
            color_previous = color;
	    for(var i = 0; i < max_count; i++) {
   	        colors.setXYZ(i, color[0], color[1], color[2]);
   	        colors_previous.setXYZ(i, color_previous[0], color_previous[1], color_previous[2]);
	    }

        instanced_geo.addAttribute( 'color', colors );
        instanced_geo.addAttribute( 'color_previous', colors_previous );
	    this.scatter_mesh = new THREE.Mesh( instanced_geo, this.scatter_material );
	    this.scatter_mesh.material_rgb = this.scatter_material_rgb
	    this.scatter_mesh.material_normal = this.scatter_material

        this.scatter_previous = {}
        this.transition(this.scatter_material    .uniforms.animation_time, "value")
        this.transition(this.scatter_material_rgb.uniforms.animation_time, "value")
        //this.scatter_material.uniforms.time.value = u;
        //this.box_material.uniforms.time.value = u;
    },
    on_orientationchange: function(e) {/*
        this.box_mesh.rotation.reorder( "ZXY" );
        this.box_mesh.rotation.y = -e.alpha * Math.PI / 180;
        this.box_mesh.rotation.x = -(e.gamma * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.z = -(e.beta * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.z = -((e.alpha-180) * Math.PI / 180);
        this.box_mesh.rotation.x = -(e.beta * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.y = -(e.gamma * Math.PI / 180 + Math.PI*2);

        this.box_mesh.rotation.reorder( "XYZ" );
        this.box_mesh.rotation.x = (e.gamma * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.y = -(e.beta * Math.PI / 180 + Math.PI*2);
        this.box_mesh.rotation.z = -((e.alpha-180) * Math.PI / 180);

        // this.box_mesh.updateMatrix()
        //this.box_mesh.matrixAutoUpdate = true
        this.update()*/

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
        if(elem == this.renderer.domElement) {
            console.log("fullscreen")
            // TODO: we should actually reflect the fullscreen, since if it fails, we still have the fullscreen model var
            // set to true
            this.update_size()
        } else {
            if(this.model.get("fullscreen"))
                this.model.set("fullscreen", false)
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
        requestAnimationFrame(_.bind(this._real_update, this))
    },
    _real_update: function() {
        //this.controls_device.update()
        /*this.time_render = (new Date()).getTime() / 1000;
        var dt = (this.time_render - this.time_start)*2;
        var u = Math.min(1, dt);
        u = Math.pow(u, 0.5)
        this.scatter_material.uniforms.time.value = u;
        this.box_material.uniforms.time.value = u;*/


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
            // render the back coordinates
            this.box_mesh.material = this.box_material;
            this.box_material.side = THREE.BackSide;
            this.renderer.clearTarget(this.back_texture, true, true, true)
            this.renderer.render(this.scene, camera, this.back_texture);

            // now render the opaque object, such that we limit the rays
            this.box_material.side = THREE.FrontSide;
            this.renderer.autoClear = false;
            //this.scene_opaque.overrideMaterial = this.box_material;
            this.scatter_mesh.material = this.scatter_mesh.material_rgb
            this.renderer.render(this.scene_opaque, camera, this.back_texture);
            this.renderer.autoClear = true;

            this.scatter_mesh.material = this.scatter_mesh.material_normal

            // the front coordinates
            this.box_material.side = THREE.FrontSide;
            this.renderer.autoClear = false; // TODO move
            this.renderer.clearTarget(this.front_texture, true, true, true)
            this.renderer.render(this.scene, camera, this.front_texture);
            this.renderer.autoClear = true; // TODO move

            // render the opaque with normal materials
            this.scene_opaque.overrideMaterial = null;
            this.renderer.render(this.scene_opaque, camera, this.volr_texture);

            // render the volume
            this.box_mesh.material = this.box_material_volr;
            this.renderer.autoClear = false;
            // clear depth buffer
            this.renderer.clearTarget(this.volr_texture, false, true, false)
            this.renderer.render(this.scene, camera, this.volr_texture);
            this.renderer.autoClear = true;

            //this.screen_texture = this.back_texture
            this.screen_material.uniforms.tex.value = this.screen_texture.texture
            //this.renderer.clearTarget(this.renderer, true, true, true)
            this.renderer.render(this.screen_scene, this.screen_camera);
         } else {
            this.camera.updateMatrixWorld();
            this.renderer.render(this.scene_opaque, camera);
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
    volume_changed: function() {
        this.volume = this.model.get("data")
        if(!this.volume) {
            this.update_size()
            return;
            //this.volume = {image_shape: [2048, 1024], slice_shape: [128, 128], rows: 8, columns:16, slices: 128, src:default_cube_url}
        }
        this.texture_volume = this.texture_loader.load(this.volume.src, _.bind(this.update, this), _.bind(this.update, this))
        this.texture_volume.magFilter = THREE.LinearFilter
        this.texture_volume.minFilter = THREE.LinearFilter
        this.box_material_volr.uniforms.volume_rows.value = this.volume.rows,
        this.box_material_volr.uniforms.volume_columns.value = this.volume.columns
        this.box_material_volr.uniforms.volume_slices.value = this.volume.slices
        this.box_material_volr.uniforms.volume_size.value = this.volume.image_shape
        this.box_material_volr.uniforms.volume_slice_size.value = this.volume.slice_shape
        this.box_material_volr.uniforms.volume.value = this.texture_volume
        if(this.model.previous("data")) {
            console.log("it's ok, just update, we previously had a volume")
            this.update()
        } else {
            console.log("we didn't have that, so we may need to resize")
            this.update_size()
        }
    },
    tf_set: function() {
        this.model.get("tf").on('change:rgba', this.tf_changed, this);
        this.tf_changed()
    },
    tf_changed: function() {
        var tf = this.model.get("tf")
        if(tf) {
            if(!this.texture_tf) {
                this.texture_tf = new THREE.DataTexture(tf.get_data_array(), this.model.get("tf").get("rgba").length, 1, THREE.RGBAFormat, THREE.UnsignedByteType)
            } else {
                this.texture_tf.image.data = tf.get_data_array()
                this.texture_tf.needsUpdate = true
            }
            this.box_material_volr.uniforms.value = this.texture_tf
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
            scatter: null,
        })
    }
}, {
    serializers: _.extend({
        tf: { deserialize: widgets.unpack_models },
        scatter: { deserialize: widgets.unpack_models },
    }, widgets.DOMWidgetModel.serializers)
});

var ScatterModel = widgets.DOMWidgetModel.extend({
    defaults: function() {
        return _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
            _model_name : 'VolumeRendererThreeModel',
            _view_name : 'VolumeRendererThreeView',
            _model_module : 'ipyvolume',
            _view_module : 'ipyvolume',
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
            scatter: null,
        })
    }
}, {
    serializers: _.extend({
        tf: { deserialize: widgets.unpack_models },
        scatter: { deserialize: widgets.unpack_models },
    }, widgets.DOMWidgetModel.serializers)
});

    return {
        VolumeRendererThreeView: VolumeRendererThreeView,
        VolumeRendererThreeModel: VolumeRendererThreeModel,
        VolumeModel : VolumeModel,
        VolumeView : VolumeView,
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