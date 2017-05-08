#define SHADER_NAME vertInstanced

precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
 // for animation, all between 0 and 1
uniform float animation_time_x;
uniform float animation_time_y;
uniform float animation_time_z;
uniform float animation_time_vx;
uniform float animation_time_vy;
uniform float animation_time_vz;
uniform float animation_time_size;
uniform float animation_time_color;

uniform vec2 xlim;
uniform vec2 ylim;
uniform vec2 zlim;

varying vec3 vertex_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;

attribute vec3 position;
attribute vec3 position_previous;

attribute vec3 color;
attribute vec3 color_previous;



void main(void) {
    vec3 origin = vec3(xlim.x, ylim.x, zlim.x);
    vec3 size_viewport = vec3(xlim.y, ylim.y, zlim.y) - origin;

    vec3 pos = (mix(position_previous, position, vec3(animation_time_x, animation_time_y, animation_time_z))
                - origin) / size_viewport - 0.5;
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vec3 positionEye = ( modelViewMatrix * vec4( pos, 1.0 ) ).xyz;
    vertex_position = positionEye;
    vertex_uv = position.xy;

#ifdef USE_RGB
    vertex_color = vec3(pos + vec3(0.5, 0.5, 0.5));
#else
    vertex_color = mix(color_previous, color, animation_time_color);
#endif
}
