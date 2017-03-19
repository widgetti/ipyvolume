var semver_range = '~' + require('../package.json').version;

module.exports = {semver_range: semver_range}


function is_typedarray(obj) {
    return isTypedArray(obj)
}

function is_arraybuffer(obj) {
    return ArrayBuffer.isView(obj)
}


module.exports = {
    is_typedarray: is_typedarray,
    is_arraybuffer: is_arraybuffer
}