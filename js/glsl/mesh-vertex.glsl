#define USE_SCALE_X
#define USE_SCALE_Y
#define USE_SCALE_Z
#include <scales>


 // for animation, all between 0 and 1
uniform float animation_time_x;
uniform float animation_time_y;
uniform float animation_time_z;
uniform float animation_time_u;
uniform float animation_time_v;
uniform float animation_time_color;

//TODO: clarify scale functionality
uniform vec2 xlim;
uniform vec2 ylim;
uniform vec2 zlim;

uniform vec2 domain_x;
uniform vec2 domain_y;
uniform vec2 domain_z;

varying vec4 vertex_color;
varying vec3 vertex_position;

attribute vec3 position_previous;

#ifdef USE_TEXTURE
    attribute float u;
    attribute float v;
    attribute float u_previous;
    attribute float v_previous;
    varying vec2 vertex_uv;
#endif

#ifdef USE_COLORMAP
attribute float color_current;
attribute float color_previous;
uniform vec2 domain_color;
#else
attribute vec4 color_current;
attribute vec4 color_previous;
#endif
uniform sampler2D colormap;


void main(void) {

    //TODO: clarify scale functionality
    //vec3 origin = vec3(xlim.x, ylim.x, zlim.x);//
    //vec3 size_viewport = vec3(xlim.y, ylim.y, zlim.z) - origin;//

    vec3 animation_time = vec3(animation_time_x, animation_time_y, animation_time_z);
    vec3 animated_position = mix(position_previous, position, animation_time);

    //TODO: clarify scale functionality
    //vec3 model_pos = (mix(position_previous, position, animation_time) - origin) / size_viewport - 0.5;//
    vec3 model_pos = vec3(SCALE_X(animated_position.x), SCALE_Y(animated_position.y), SCALE_Z(animated_position.z));

    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(model_pos, 1.0);
    vec3 positionEye = ( modelViewMatrix * vec4(model_pos, 1.0 ) ).xyz;
    vertex_position = positionEye;
#ifdef USE_TEXTURE
    vertex_uv = vec2(mix(u_previous, u, animation_time_u), mix(v_previous, v, animation_time_v));
#endif

#ifdef USE_RGB
    vertex_color = vec4(model_pos + vec3(0.5, 0.5, 0.5), 1.0);
#else
    #ifdef USE_COLORMAP
        float color_animated = mix(color_previous, color_current, animation_time_color);
        float color_index = scale_transform_linear(color_animated, vec2(0.0, 1.0), domain_color);
        vertex_color = texture2D(colormap, vec2(color_index, 0));
    #else
        vertex_color = mix(color_previous, color_current, animation_time_color);
    #endif
#endif
}
