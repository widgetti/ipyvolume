import * as _  from 'underscore';
import * as THREE from 'three';
import * as utils from './utils.js';

/* Manages a list of scalar and arrays for use with WebGL instanced rendering
*/

class Values {
    public static defaults: {[key:string]: number} = {
        vx: 0,
        vy: 1,
        vz: 0,
        x: 0,
        y: 0,
        z: 0,
        size: 0
    };

    public length = Infinity;
    public scalar: {[key: string]: any} = {};
    public scalar_vec3: {[key: string]: any} = {};
    public scalar_vec4: {[key: string]: any} = {};
    public array: {[key: string]: any} = {};
    public array_vec3: {[key: string]: any} = {};
    public array_vec4: {[key: string]: any} = {};
    public values: {[key: string]: any} = {};

    public constructor(names: [string],
                       names_vec3: [string],
                       getter: any,
                       sequence_index: number,
                       names_vec4: [string]) {

        _.each(names, (name) => {
            let value = getter(name, sequence_index, Values.defaults[name]);

            if(utils.is_typedarray(value)) {
                if(name != 'selected') // hardcoded.. hmm bad
                    this.length = Math.min(this.length, value.length);
                this.array[name] = value;
            } else {
                this.scalar[name] = value;
            }

            this.values[name] = value;
        });

        _.each(names_vec3, (name) => {
            let value = getter(name, sequence_index, Values.defaults[name]);

            if(name.indexOf('color') !== -1  && typeof value === "string") { // special case to support controlling color from a widget
                let color = new THREE.Color(value);
                value = new Float32Array([color.r, color.g, color.b]); // no sequence, scalar
            }

            if(utils.is_typedarray(value) && value.length > 3) { // single value is interpreted as scalar
                this.array_vec3[name] = value;
                this.length = Math.min(this.length, value.length/3);
            } else {
                this.scalar_vec3[name] = value;
            }

            this.values[name] = value;
        });

        _.each(names_vec4, (name) => {
            let value = getter(name, sequence_index, Values.defaults[name]);

            if(name.indexOf('color') !== -1  && typeof value === "string") {
                // special case to support controlling color from a widget
                let color = new THREE.Color(value);
                value = new Float32Array([color.r, color.g, color.b, 1.0]);
            }

            if(utils.is_typedarray(value) && value.length > 4) {
                this.array_vec4[name] = value;
                // color vectors have 4 components
                this.length = Math.min(this.length, value.length / 4);
            } else {
                // single value is interpreted as scalar
                this.scalar_vec4[name] = value;
            }

            this.values[name] = value;
        });
    }

    public trim = (new_length: number) => {
        this.array = _.mapObject(this.array, function(array) {
            return array.length === new_length ? array : array.slice(0, new_length);
        });
    
        this.array_vec3 = _.mapObject(this.array_vec3, function(array_vec3) {
            return array_vec3.length === new_length*3 ? array_vec3 : array_vec3.slice(0, new_length*3);
        });
    
        this.array_vec4 = _.mapObject(this.array_vec4, (array_vec4) => {
            return (array_vec4.length === new_length * 4) ? array_vec4 : array_vec4.slice(0, new_length * 4);
        });
    
        this.length = new_length;
    };

    public ensure_array = (name: string | [string]) => {
        let names = _.isArray(name) ? name : [name];
        _.each(names, (name) => {
            if(typeof this.scalar[name] !== 'undefined') {
                let array = this.array[name] = new Float32Array(this.length);
                array.fill(this.scalar[name]);
                delete this.scalar[name];
                delete this.values[name];
            }
            let value_vec3 = this.scalar_vec3[name];
            let value_vec4 = this.scalar_vec4[name];
            
            if(typeof value_vec3 !== 'undefined') {
                let array = this.array_vec3[name] = new Float32Array(this.length*3);
                for(let i = 0; i < this.length; i++) {
                    array[i*3+0] = value_vec3[0];
                    array[i*3+1] = value_vec3[1];
                    array[i*3+2] = value_vec3[2];
                }
                delete this.scalar_vec3[name];
                delete this.values[name];
            }
            
            if(typeof value_vec4 !== 'undefined') {
                this.array_vec4[name] = new Float32Array(this.length * 4);
                
                let array = this.array_vec4[name];
    
                for(let i = 0; i < this.length; i++) {
                    array[i * 4 + 0] = value_vec4[0];
                    array[i * 4 + 1] = value_vec4[1];
                    array[i * 4 + 2] = value_vec4[2];
                    array[i * 4 + 3] = value_vec4[3];
                }
                delete this.scalar_vec4[name];
                delete this.values[name];
            }
        });
    };

    public grow = (new_length: number) => {
        this.array = _.mapObject(this.array, (array) => {
            let new_array = new array.constructor(new_length);
            new_array.set(array);

            return new_array;
        });

        this.array_vec3 = _.mapObject(this.array_vec3, (array_vec3) => {
            let new_array = new array_vec3.constructor(new_length*3);
            new_array.set(array_vec3);

            return new_array;
        })
        this.length = length;
    };

    public pad = (other: Values) => {
        this.array = _.mapObject(this.array, (array, name) => {
            let new_array = new array.constructor(other.length);
    
            if(typeof other.array[name] === "undefined") { // then other must be a scalar
                new_array.fill(other.scalar[name], this.length);
            } else {
                new_array.set(other.array[name].slice(this.length), this.length);
            }
            new_array.set(array);

            return new_array;
        });
    
        this.array_vec3 = _.mapObject(this.array_vec3, (array_vec3, name) => {
            let new_array = new array_vec3.constructor(other.length*3);
            if(typeof other.array_vec3[name] === "undefined") { // then other must be a scalar
                let other_scalar = other.scalar_vec3[name];
                for(let i = this.length; i < other.length; i++) {
                    new_array[i*3+0] = other_scalar[0];
                    new_array[i*3+1] = other_scalar[1];
                    new_array[i*3+2] = other_scalar[2];
                }
            } else {
                new_array.set(other.array_vec3[name].slice(this.length*3), this.length*3);
            }
            new_array.set(array_vec3);
            return new_array;
        });
    
        this.array_vec4 = _.mapObject(this.array_vec4, (array_vec4, name) => {
            let new_array = new array_vec4.constructor(other.length * 4);
    
            if(typeof other.array_vec4[name] === "undefined") {
                // then other must be a scalar
                let other_scalar = other.scalar_vec4[name];
    
                for(let i = this.length; i < other.length; i++) {
                    new_array[i * 4 + 0] = other_scalar[0];
                    new_array[i * 4 + 1] = other_scalar[1];
                    new_array[i * 4 + 2] = other_scalar[2];
                    new_array[i * 4 + 3] = other_scalar[3];
                }
            } else {
                new_array.set(other.array_vec4[name].slice(this.length * 4), this.length * 4);
            }
    
            new_array.set(array_vec4);
            return new_array;
        });
    
        this.length = other.length;
    };

    public select = (selected: [number]) => {
        // copy since we will modify
        let sizes = this.array['size'] = this.array['size'].slice();
        let size_selected = this.array['size_selected'];
        // copy since we will modify
        let color = this.array_vec4['color'] = this.array_vec4['color'].slice();
        let color_selected = this.array_vec4['color_selected'];
        // this assumes, and requires that color_selected is an array, maybe a bit inefficient
        _.each(selected, (index) => {
            if(index < this.length) {
                sizes[index] = size_selected[index];
                color[index*4+0] = color_selected[index*4+0];
                color[index*4+1] = color_selected[index*4+1];
                color[index*4+2] = color_selected[index*4+2];
                color[index*4+3] = color_selected[index*4+3];
            }
        });
    };

    public merge_to_vec3 = (names: [string], new_name: string) => {
        let element_length = names.length;
        let array = new Float32Array(this.length * element_length); // Float32Array should be replaced by a good common value
        _.each(names, (name, index) => {
            this.ensure_array(name);
            let array1d = this.array[name];
            for(let i = 0; i < this.length; i++) {
                array[i*element_length + index] = array1d[i];
            }
            delete this.array[name];
            delete this.values[name];
        });
        this.array_vec3[new_name] = array;
    };

    public pop = (name: string | [string]) => {
        let names = _.isArray(name) ? name : [name];
        _.each(names, (name) => {
            _.each([this.scalar,
                this.scalar_vec3,
                this.array,
                this.array_vec3],
                (storage) => {
                if(typeof storage[name] !== 'undefined') {
                    delete storage[name];
                }
            })
        });
    };

    public add_attributes = (geometry: any, postfix: any) => {
        postfix = postfix || '';
        // set all attributes
        _.each(this.array, (array, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(array, 1, 1);
                geometry.addAttribute(name+postfix, attr);
            }
        });
    
        _.each(this.array_vec3, (array, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(array, 3, 1);
                attr.normalized = name.indexOf("color") === -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        });

        _.each(this.array_vec4, (array, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(array, 4, 1);
                attr.normalized = name.indexOf("color") === -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        });

        _.each(this.scalar, (scalar, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(new Float32Array([scalar]), 1, this.length);
                geometry.addAttribute(name+postfix, attr);
            }
        });
    
        _.each(this.scalar_vec3, (scalar_vec3, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(scalar_vec3, 3, this.length);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        });
        _.each(this.scalar_vec4, (scalar_vec4, name) => {
            if(name.indexOf("selected") === -1) { // selected attributes should not be send to the shader
                let attr = new THREE.InstancedBufferAttribute(scalar_vec4, 4, this.length);
                attr.normalized = name.indexOf("color") == -1 ? false : true; // color should be normalized
                geometry.addAttribute(name+postfix, attr);
            }
        });
    };
}

export = {Values: Values};