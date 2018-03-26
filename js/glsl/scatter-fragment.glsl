#define SHADER_NAME fragInstanced
#extension GL_OES_standard_derivatives : enable

precision highp float;

varying vec3 vertex_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;

#ifdef USE_TEXTURE
uniform sampler2D texture;
uniform sampler2D texture_previous;
uniform float animation_time_texture;
#endif


void main(void) {
#ifdef USE_RGB
    gl_FragColor = vec4(vertex_color.rgb, 1);
#else
#ifdef AS_LINE
    gl_FragColor = vec4( vertex_color.rgb, 1.0 );
#else
#ifdef USE_SPRITE
 #ifdef USE_TEXTURE
    gl_FragColor = mix(texture2D(texture_previous, vertex_uv), texture2D(texture, vertex_uv), animation_time_texture);
 #else
    gl_FragColor = vec4( vertex_color.rgb, 1.0);
 #endif
#else
    vec3 fdx = dFdx( vertex_position );
    vec3 fdy = dFdy( vertex_position );
    vec3 normal = normalize( cross( fdx, fdy ) );
    float diffuse = dot( normal, vec3( 0.0, 0.0, 1.0 ) );

    gl_FragColor = vec4( clamp(diffuse, 0.2, 1.) * vertex_color, 1.0 );
#endif
#endif
#endif
}
