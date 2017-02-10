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

attribute vec3 position;

attribute vec3 position_offset;
attribute vec3 position_offset_previous;

attribute vec3 color;
attribute vec3 color_previous;

attribute vec3 vector;
attribute vec3 vector_previous;

attribute float scale;
attribute float scale_previous;



void main(void) {
    // assume the vector points to the y axis
    vec3 vector_current = mix(normalize(vector_previous), normalize(vector), vec3(animation_time_vx, animation_time_vy, animation_time_vz))
           * mix(length(vector_previous), length(vector), (animation_time_vx+ animation_time_vy+ animation_time_vz)/3.);
    vec3 y_axis = normalize(vector_current);
    // we may have bad luck, and alight with 1 vector, so take two vectors, and we'll always find a non-zero vector
    vec3 some_z_vector_a = vec3(0., 1., 1.);
    vec3 some_z_vector_b = normalize(vec3(0., 2., 1.));
    vec3 x_axis = normalize(cross(y_axis, some_z_vector_a)  + cross(y_axis, some_z_vector_b));
    vec3 z_axis = -normalize(cross(y_axis, x_axis)); // - to keep it right handed
    float vector_length = length(vector_current);
    // the following matrix should point it to the direction of 'vector'
    mat3 move_to_vector = mat3(x_axis, y_axis, z_axis);
    //vec3 x = vec3(1, 0, 0);
    //vec3 y = vec3(0, 1, 0);
    //vec3 z = vec3(0, 0, 1);
    //mat3 move_to_vector = mat3(z, y, x);
    vec3 origin = vec3(xlim.x, ylim.x, zlim.x);
    vec3 size = vec3(xlim.y, ylim.y, zlim.y) - origin;
    vec3 pos = (move_to_vector * (position*mix(scale_previous, scale, animation_time_size)))
        + (mix(position_offset_previous, position_offset, vec3(animation_time_x, animation_time_y, animation_time_z))
                - origin) / size - 0.5;
    //vec3 pos = (pos_object ) / size;// - 0.5;
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vec3 positionEye = ( modelViewMatrix * vec4( pos, 1.0 ) ).xyz;
    vertex_position = positionEye;



#ifdef USE_RGB
    vertex_color = vec3(pos + vec3(0.5, 0.5, 0.5));
#else
    vertex_color = mix(color_previous, color, animation_time_color);
#endif
}
