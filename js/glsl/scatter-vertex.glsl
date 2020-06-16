#include <fog_pars_vertex>

#define USE_SCALE_X
#define USE_SCALE_Y
#define USE_SCALE_Z
#define USE_SCALE_SIZE_X
#define USE_SCALE_SIZE_Y
#define USE_SCALE_SIZE_Z
#define USE_SCALE_AUX
#include <scales>

 // for animation, all between 0 and 1
uniform float animation_time_x;
uniform float animation_time_y;
uniform float animation_time_z;
uniform float animation_time_aux;
uniform float animation_time_vx;
uniform float animation_time_vy;
uniform float animation_time_vz;
uniform float animation_time_size;
uniform float animation_time_color;

uniform vec2 domain_x;
uniform vec2 domain_y;
uniform vec2 domain_z;
uniform vec2 domain_aux;

uniform vec2 domain_size_x;
uniform vec2 domain_size_y;
uniform vec2 domain_size_z;

uniform mat4 geo_matrix;

varying vec4 vertex_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;

#ifdef AS_LINE
attribute vec3 position_previous;
#else
attribute float x;
attribute float x_previous;
attribute float y;
attribute float y_previous;
attribute float z;
attribute float z_previous;
attribute float aux;
attribute float aux_previous;

attribute vec3 v;
attribute vec3 v_previous;


attribute float size;
attribute float size_previous;
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
    vec3 animation_time = vec3(animation_time_x, animation_time_y, animation_time_z);
    vec3 animation_time_v = vec3(animation_time_vx, animation_time_vy, animation_time_vz);

#ifdef AS_LINE
    vec3 animated_position = mix(position_previous, position, animation_time);
    vec3 model_pos = vec3(SCALE_X(animated_position.x), SCALE_Y(animated_position.y), SCALE_Z(animated_position.z));
    vec4 view_pos = modelViewMatrix * vec4(model_pos, 1.0);
#else
    vec3 vector = v;
    vec3 vector_previous = v_previous;
    vec3 position_offset = vec3(x, y, z);
    vec3 position_offset_previous = vec3(x_previous, y_previous, z_previous);

    // assume the vector points to the y axis
    vec3 vector_current = mix(normalize(vector_previous), normalize(vector), animation_time_v)
           * mix(length(vector_previous), length(vector), (animation_time_vx+ animation_time_vy+ animation_time_vz)/3.);
    vec3 y_axis = normalize(vector_current);
    // we may have bad luck, and alight with 1 vector, so take two vectors, and we'll always find a non-zero vector
    vec3 some_z_vector_a = vec3(0., 1., 1.);
    vec3 some_z_vector_b = normalize(vec3(0., 2., 1.));
    vec3 x_axis = normalize(cross(y_axis, some_z_vector_a)  + cross(y_axis, some_z_vector_b));
    vec3 z_axis = -normalize(cross(y_axis, x_axis)); // - to keep it right handed
    //float vector_length = length(vector_current);
    // the following matrix should point it to the direction of 'vector'
    mat3 move_to_vector = mat3(x_axis, y_axis, z_axis);

    float size_scalar = mix(size_previous, size, animation_time_size);
    // TODO: replace the 0. in SCALE_SIZE_X(0.) by a uniform, so we can make it work with log?
    vec3 size_vector = vec3(SCALE_SIZE_X(size_scalar) - SCALE_SIZE_X(0.), SCALE_SIZE_Y(size_scalar) - SCALE_SIZE_Y(0.), SCALE_SIZE_Z(size_scalar) -  SCALE_SIZE_Z(0.));
    float aux_current = mix(aux_previous, aux, animation_time_aux);
    vec3 animated_position_offset = mix(position_offset_previous, position_offset, animation_time);
    vec3 model_pos = vec3(SCALE_X(animated_position_offset.x), SCALE_Y(animated_position_offset.y), SCALE_Z(animated_position_offset.z));
    SHADER_SNIPPET_SIZE;
    //vec3 pos = (pos_object ) / size;// - 0.5;
    #ifdef USE_SPRITE
        // if we are a sprite, we add the position in view coordinates, and need to 
        vec4 view_pos = modelViewMatrix * vec4(model_pos, 1.0);
        view_pos += vec4((position.xy)*(s*0.5),0,0);
    #else
        // the position is the orignal mesh position, so we scale and add that to the centrol location
        // and we also rotate it into the direction of the vector v
        vec4 position_transformed = geo_matrix * vec4(position, 1.0);
        position_transformed.xyz = position_transformed.xyz / position_transformed.w;
        model_pos += move_to_vector * (position_transformed.xyz*size_vector);
        vec4 view_pos = modelViewMatrix * vec4(model_pos, 1.0);
    #endif
#endif
    vec4 mvPosition = view_pos;
    gl_Position = projectionMatrix * view_pos;
    vec3 positionEye = ( modelViewMatrix * vec4( model_pos, 1.0 ) ).xyz;
    vertex_position = positionEye;
    vertex_uv = position.xy / 2. - 0.5;
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

    #include <fog_vertex>
}
