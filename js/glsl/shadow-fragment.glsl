uniform sampler2D map;
varying vec2 vUv;
#include <packing>

void main ()
{
    vec4 rgbaDepth = texture2D (map, vUv);
    float fDepth = unpackRGBAToDepth(rgbaDepth);
    gl_FragColor = vec4 (vec3 (fDepth), 1.0);
    // gl_FragColor = vec4 (vec3 (rgbaDepth.w), 1.0);
}

