var _ = require('underscore')
var utils = require('./utils.js')
var THREE = require('three')
var widgets = require('@jupyter-widgets/base');
var ndarray = require('ndarray')

function ascii_decode(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function read_uint16_LE(buffer) {
        var view = new DataView(buffer);
        var val = view.getUint8(0);
        val |= view.getUint8(1) << 8;
        return val;
}

function numpy_buffer_to_ndarray(buf) {
    var magic = ascii_decode(buf.slice(0,6));
    if (magic.slice(1,6) != 'NUMPY') {
        throw new Error('unknown file type');
    }

    var version = new Uint8Array(buf.slice(6,8));
    var headerLength = read_uint16_LE(buf.slice(8,10));
    var headerStr = ascii_decode(buf.slice(10, 10+headerLength));
    var offsetBytes = 10 + headerLength;
      //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

    var info =  JSON.parse(headerStr.toLowerCase().replace('(','[').replace(',),',']').replace('),',']').replace(/'/g,"\""));

    // Intepret the bytes according to the specified dtype
    var data;
    if (info.descr === "|u1") {
      data = new Uint8Array(buf, offsetBytes);
    } else if (info.descr === "|i1") {
      data = new Int8Array(buf, offsetBytes);
    } else if (info.descr === "<u2") {
      data = new Uint16Array(buf, offsetBytes);
    } else if (info.descr === "<i2") {
      data = new Int16Array(buf, offsetBytes);
    } else if (info.descr === "<u4") {
      data = new Uint32Array(buf, offsetBytes);
    } else if (info.descr === "<i4") {
      data = new Int32Array(buf, offsetBytes);
    } else if (info.descr === "<f4") {
      data = new Float32Array(buf, offsetBytes);
    } else if (info.descr === "<f8") {
      data = new Float64Array(buf, offsetBytes);
    } else {
      throw new Error('unknown numeric dtype')
    }

    return ndarray(data, info.shape);

}

// see https://github.com/jovyan/pythreejs/pull/80/files
// should go to a seperate package/module
var typesToArray = {
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
    float32: Float32Array,
    float64: Float64Array
}

var arrayToTypes = {
    Int8Array: 'int8',
    Int16Array: 'int16',
    Int32Array: 'int32',
    Uint8Array: 'uint8',
    Uint16Array: 'uint16',
    Uint32Array: 'uint32',
    Float32Array: 'float32',
    Float64Array: 'float64'
}

function deserialize_typed_array(data, manager) {
    var type = typesToArray[data.dtype];
    if(data == null) {
        console.log('data is null')
    }
    if(!data.buffer) {
        console.log('data.buffer is null')
    }
    if(!data.buffer.buffer) {
        console.log('data.buffer is null')
    }
    return new type(data.buffer.buffer) ; //

}

function deserialize_array_or_json(data, manager) {
    if(data == null)
        return null;
    var arrays = null;
    if(_.isNumber(data)) { // plain number
        return data;
    } else { // should be an array of buffer+dtype+shape
        arrays = _.map(data, function(data) { return deserialize_typed_array(data, manager)})
    }
    arrays.original_data = data;
    return arrays;

    if(_.isArray(data) && !data.buffer) { // plain json, or list of buffers
        if(data.length == 0) {
            arrays = []
        } else
        if(!data[0].buffer) {
            // plain json
            if(_.isArray(data[0])) {
                arrays = _.map(data, function(array1d) { return new Float32Array(array1d)})
            } else {
                arrays = [new Float32Array(data)]
            }
        } else {
            arrays = _.map(data, function(data) { return new Float32Array(data.buffer)});
        }
    } else {
        nd = numpy_buffer_to_ndarray(data.buffer)
        if (nd.shape.length == 2) {
            arrays = []
            for(var i = 0; i < nd.shape[0]; i++) {
                var ar = nd.data.slice(i*nd.stride[0], (i+1)*nd.stride[0])
                arrays.push(ar)
            }
        } else { // assume 1d... ?
            arrays = [nd.data];
        }
    }
    arrays.original_data = data;
    return arrays;
}

function deserialize_color_or_json(data, manager) {
    if(data == null)
        return null;
    var arrays = null;

    // It can deals with these 6 cases: which are threated in the same order
    // shape is 0 dim, and it's a string, interpret as color
    // shape is 1 dim, items are strings, seperate color for each item
    // shape is 2 dim, items are strings, sequence of the above
    // shape is 1 dim, items are floats, it should be of length 3 -> rgb values
    // shape is 2 dim, items are float, it should be of shape (len(x), 3) -> rgb values
    // shape is 3 dim, items are float, it should be (sequence_length, len(x), 3) -> rgb values
    function string_array_to_rgb(string_array) {
        var rgbs = new Float32Array(string_array.length * 3);
        for(var i = 0; i < string_array.length; i++) {
            var color = new THREE.Color(string_array[i]);
            rgbs[i*3+0] = color.r;
            rgbs[i*3+1] = color.g;
            rgbs[i*3+2] = color.b;
        }
        return rgbs;
    }
    function rgb_array_to_rgb(rgb_array) {
        var rgbs = new Float32Array(rgb_array.length * 3);
        for(var i = 0; i < rgb_array.length; i++) {
            rgbs[i*3+0] = rgb_array[i][0];
            rgbs[i*3+1] = rgb_array[i][1];
            rgbs[i*3+2] = rgb_array[i][2];
        }
        return rgbs;
    }

    if (typeof data == "string") { // single color
        //var color = new THREE.Color(data)
        //arrays = new Float32Array([color.r, color.g, color.b]) // no sequence, scalar
        arrays = data; // special case, if we keep it a string, we can control it via colorppicker
    } else {
        if(typeof data[0].dtype !== "undefined") { // we have a list of ndarrays
            arrays = _.map(data, function(data) { return deserialize_typed_array(data, manager)})
        } else {
            // must be a plain list of string, or list of list
            if(dimension == 1 && typeof data[0] == "string") {
                arrays = string_array_to_rgb(data)
            } else
            if(dimension == 2 && typeof data[0][0] == "string") {
                arrays = _.map(data, string_array_to_rgb)
            } else {
                console.error("don't understand color type")
            }
        }
    }
    arrays.original_data = data;
    return arrays;
}


function serialize_array_or_json(obj, manager) {
    if(_.isNumber(obj)) return obj; // return numbers directly
    if(obj != null) {
        if(typeof obj.original_data == "undefined") // if someone modified the data from javascript land, we don't have this
            return obj
        else
            return obj.original_data; // ftm we just feed back the original data, we don't modify currently
    } else {
       return null;
    }
}
function deserialize_texture(data, manager) {
    if(typeof data == "string") {
        if(data.startsWith('IPY_MODEL_')) {
            return widgets.unpack_models(data, manager)
        }
    }
    return data
}
function deserialize_ndarray(data, manager) {
    if(data === null)
        return null;
    console.log('deserialize_ndarray')
    return ndarray(deserialize_typed_array(data, manager), data.shape);
}

function serialize_ndarray(data, manager) {
    if(data === null)
        return null;
    var ar = data;
    if(_.isArray(data) && !data.buffer) { // plain list of list
        var ar = require("ndarray-pack")(data)
    }
    data_json = {'data': ar.data.buffer, dtype:arrayToTypes[ar.data.constructor.name], shape:ar.shape}
    console.log('serialize_ndarray')
    return data_json;
}

function serialize_texture(data, manager) {
    return data;
}

window.ndarray = ndarray;


module.exports = {
    texture: {deserialize:deserialize_texture, serialize: serialize_texture},
      serialize_array_or_json:   serialize_array_or_json,
    deserialize_array_or_json: deserialize_array_or_json,
    deserialize_color_or_json: deserialize_color_or_json,
    array_or_json: { deserialize: deserialize_array_or_json, serialize: serialize_array_or_json },
    color_or_json: { deserialize: deserialize_color_or_json, serialize: serialize_array_or_json },
    ndarray: { deserialize: deserialize_ndarray, serialize: serialize_ndarray },
}
