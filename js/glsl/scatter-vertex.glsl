#define SHADER_NAME vertInstanced

precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float animation_time; // for animation, between 0 and 1

varying vec3 vertex_color;
varying vec3 vertex_position;

attribute vec3 position_offset_previous;
attribute vec3 position_offset;
attribute vec3 position;
attribute vec3 color;
attribute vec3 color_previous;

attribute float scale;
attribute float scale_previous;

void main(void) {
    vec3 pos = position * mix(scale_previous, scale, animation_time)+mix(position_offset_previous, position_offset, animation_time);
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vec3 positionEye = ( modelViewMatrix * vec4( position, 1.0 ) ).xyz;
    vertex_position = positionEye;
#ifdef USE_RGB
    vertex_color = vec3(pos + vec3(0.5, 0.5, 0.5));
#else
    vertex_color = mix(color_previous, color, animation_time);
#endif
}
