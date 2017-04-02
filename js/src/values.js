var _ = require('underscore')
var THREE = require('three')
var utils = require('./utils.js')

/* Manages a list of scalar and arrays for use with WebGL instanced rendering
*/

function Values(names, names_vec3, getter, sequence_index) {
    var defaults = {vx: 0, vy: 1, vz: 0, x: 0, y: 0, z: 0, size:0}
    this.length = Infinity;
    this.scalar = {}
    this.scalar_vec3 = {}
    this.array = {}
    this.array_vec3 = {}
    this.values = {}

    _.each(names, function(name) {
        var value = getter(name, sequence_index, defaults[name]);
        if(utils.is_typedarray(value)) {
            if(name != 'selected') // hardcoded.. hmm bad
                this.length = Math.min(this.length, value.length)
            this.array[name] = value
        } else {
            this.scalar[name] = value
        }
        this.values[name] = value;
    }, this)
    _.each(names_vec3, function(name) {
        var value = getter(name, sequence_index, defaults[name]);
        if(name.indexOf('color') != -1  && typeof value == "string") { // special case to support controlling color from a widget
            var color = new THREE.Color(value)
            value = new Float32Array([color.r, color.g, color.b]) // no sequence, scalar
        }
        if(utils.is_typedarray(value) && value.length > 3) { // single value is interpreted as scalar
            this.array_vec3[name] = value
            this.length = Math.min(this.length, value.length/3)
        } else {
            this.scalar_vec3[name] = value
        }
        this.values[name] = value;
    }, this);
    this.trim = function(new_length) {
        this.array = _.mapObject(this.array, function(array) {
            return array.length == new_length ? array : array.slice(0, new_length)
        })
        this.array_vec3 = _.mapObject(this.array_vec3, function(array_vec3) {
            return array_vec3.length == new_length*3 ? array_vec3 : array_vec3.slice(0, new_length*3)
        })
        this.length = new_length;
    }
    this.ensure_array = function(name) {
        var names = _.isArray(name) ? name : [name];
        _.each(names, function(name) {
            if(typeof this.scalar[name] != 'undefined') {
                var array = this.array[name] = new Float32Array(this.length);
                array.fill(this.scalar[name])
                delete this.scalar[name]
                delete this.values[name]
            }
            var value_vec3 = this.scalar_vec3[name]
            if(typeof value_vec3 != 'undefined') {
                var array = this.array_vec3[name] = new Float32Array(this.length*3);
                for(var i = 0; i < this.length; i++) {
                    array[i*3+0] = value_vec3[0]
                    array[i*3+1] = value_vec3[1]
                    array[i*3+2] = value_vec3[2]
                }
                delete this.scalar_vec3[name]
                delete this.values[name]
            }
        }, this)
    }
    this.grow = function(new_length) {
        this.array = _.mapObject(this.array, function(array) {
            var new_array = new array.constructor(new_length)
            new_array.set(array)
            return new_array;
        })
        this.array_vec3 = _.mapObject(array_vec3, function(array_vec3) {
            var new_array = new array_vec3.constructor(new_length*3)
            new_array.set(array_vec3)
            return new_array;
        })
        this.length = length;
    }
    this.pad = function(other) {
        this.array = _.mapObject(this.array, function(array, name) {
            var new_array = new array.constructor(other.length)
            if(typeof other.array[name] == "undefined") { // then other must be a scalar
                new_array.fill(other.scalar[name], this.length)
            } else {
                new_array.set(other.array[name].slice(this.length), this.length)
            }
            new_array.set(array)
            return new_array;
        })
        this.array_vec3 = _.mapObject(this.array_vec3, function(array_vec3, name) {
            var new_array = new array_vec3.constructor(other.length*3)
            if(typeof other.array_vec3[name] == "undefined") { // then other must be a scalar
                var other_scalar = other.scalar_vec3[name];
                for(var i = this.length; i < other.length; i++) {
                    new_array[i*3+0] = other_scalar[0]
                    new_array[i*3+1] = other_scalar[1]
                    new_array[i*3+2] = other_scalar[2]
                }
            } else {
                new_array.set(other.array_vec3[name].slice(this.length*3), this.length*3)
            }
            new_array.set(array_vec3)
            return new_array;
        })
        this.length = other.length;
    }
    this.select = function(selected) {
        var sizes = this.array['size'] = this.array['size'].slice() // copy since we will modify
        var size_selected = this.array['size_selected']
        var color = this.array_vec3['color'] = this.array_vec3['color'].slice() // copy since we will modify
        var color_selected = this.array_vec3['color_selected']
        // this assumes, and requires that color_selected is an array, maybe a bit inefficient
        _.each(selected, function(index) {
            if(index < this.length) {
                sizes[index] = size_selected[index];
                color[index*3+0] = color_selected[index*3+0]
                color[index*3+1] = color_selected[index*3+1]
                color[index*3+2] = color_selected[index*3+2]
            }
        }, this)
    }
    this.merge_to_vec3 = function(names, new_name) {
        var element_length = names.length;
        var array = new Float32Array(this.length * element_length); // Float32Array should be replaced by a good common value
        _.each(names, function(name, index) {
            this.ensure_array(name)
            var array1d = this.array[name]
            for(var i = 0; i < this.length; i++) {
                array[i*element_length + index] = array1d[i];
            }
            delete this.array[name];
            delete this.values[name]
        }, this)
        this.array_vec3[new_name] = array
    }
    this.pop = function(names) {
        var names = _.isArray(name) ? name : [name];
        _.each(names, function(name) {
            _.each([this.scalar, this.scalar_vec3, this.array, this.array_vec3], function(storage) {
                if(typeof storage[name] != 'undefined') {
                    delete storage[name]
                }
            })
        }, this);
    }
    this.add_attributes = function(geometry, postfix) {
        var postfix = postfix || '';
        // set all attributes
        _.each(this.array, function(array, name) {
            if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(array, 1, 1);
                geometry.addAttribute(name+postfix, attr);
            }
        }, this)
        _.each(this.array_vec3, function(array, name) {
            if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(array, 3, 1);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        }, this)
        _.each(this.scalar, function(scalar, name) {
            if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(new Float32Array([scalar]), 1, this.length);
                geometry.addAttribute(name+postfix, attr);
            }
        }, this)
        _.each(this.scalar_vec3, function(scalar_vec3, name) {
            if(name.indexOf("selected") == -1) { // selected attributes should not be send to the shader
                var attr = new THREE.InstancedBufferAttribute(scalar_vec3, 3, this.length);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        }, this)
    }
}

module.exports = {Values: Values}