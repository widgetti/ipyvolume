var semver_range = '~' + require('../package.json').version;

var isTypedArray = require('is-typedarray')


function is_typedarray(obj) {
    return isTypedArray(obj)
}

function is_arraybuffer(obj) {
    return ArrayBuffer.isView(obj)
}

function get_array_dimension(array) {
    var dimension = 0;
    while(typeof array[0] != "undefined") {
        array = array[0];
        dimension += 1;
    }
    return dimension
}



module.exports = {
    is_typedarray: is_typedarray,
    is_arraybuffer: is_arraybuffer,
    get_array_dimension: get_array_dimension,
    semver_range: semver_range
}