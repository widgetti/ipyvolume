precision highp float;
uniform sampler2D back_tex;
uniform sampler2D geometry_depth_tex;

// samplers in structs has bad support

struct Volume
{
    float opacity_scale;
    float brightness;
    vec2 data_range;
    vec2 show_range;
    float rows;
    float columns;
    float slices;
    vec2 size;
    vec2 slice_size;
    bool clamp_min;
    bool clamp_max;
    vec3 scale;
    vec3 offset;
    bool lighting;
};

#if (VOLUME_COUNT > 0)
uniform sampler2D data[VOLUME_COUNT];
uniform sampler2D transfer_function[VOLUME_COUNT];
uniform Volume volumes[VOLUME_COUNT];
#endif

#if (VOLUME_COUNT_MAX_INT > 0)
uniform Volume volumes_max_int[VOLUME_COUNT_MAX_INT];
uniform sampler2D data_max_int[VOLUME_COUNT_MAX_INT];
uniform sampler2D transfer_function_max_int[VOLUME_COUNT_MAX_INT];
float max_values[VOLUME_COUNT_MAX_INT];
float max_depth[VOLUME_COUNT_MAX_INT];
bool  has_values[VOLUME_COUNT_MAX_INT];
// for MAX_INT, we cannot add the coordinate directly, we do it after we found the max
vec4  max_weighted_coordinate[VOLUME_COUNT_MAX_INT];
vec4  max_colors[VOLUME_COUNT_MAX_INT];
#endif

struct Layer {
    float depth;
    vec4 color;
    bool skip;
};

Layer layers[VOLUME_COUNT_MAX_INT+1];


//uniform float brightness;

//uniform sampler2D colormap;
//uniform int colormap_index;
//uniform int surfaces;
//uniform float opacity[4];
//uniform float level[4];
//uniform float width[4];
uniform vec2 render_size;

varying vec3 front;

// for lighting
uniform mat3 mvMatrix;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

vec3 light_dir;
vec3 eye;
//uniform float color_index;

uniform int steps;



vec2 compute_slice_offset(float slice, float columns, vec2 uv_slice_spacing) {
    return uv_slice_spacing * vec2(mod(slice, columns), floor(slice / columns));
}
vec4 sample_as_3d_texture(sampler2D tex, vec2 tex_size, vec3 texCoord, vec2 slice_size, float slices, float rows, float columns) {
  float slice   = texCoord.z*slices*(slices-1.)/slices ;
  float slice_z  = floor(slice);
  float slice_z_offset = fract(slice);

  vec2 pixel = 1./tex_size;
  vec2 uv_slice_spacing = slice_size/tex_size;

  vec2 coord = vec2(texCoord.x, texCoord.y);
  vec2 uv = pixel * 0.5 + coord * (uv_slice_spacing - pixel);

  vec2 slice0_offset = compute_slice_offset(slice_z, columns, uv_slice_spacing);
  vec2 slice1_offset = compute_slice_offset(slice_z + 1.0, columns, uv_slice_spacing);

  vec4 slice0_color = texture2D(tex, slice0_offset + uv);
  vec4 slice1_color = texture2D(tex, slice1_offset + uv);
  return mix(slice0_color, slice1_color, slice_z_offset);
}

uniform float ambient_coefficient;
uniform float diffuse_coefficient;
uniform float specular_coefficient;
uniform float specular_exponent;

mat3 transpose3(mat3 m) {
    vec3 v0 = m[0];
    vec3 v1 = m[1];
    vec3 v2 = m[2];
    return mat3(
        vec3(v0.x, v1.x, v2.x),
        vec3(v0.y, v1.y, v2.y),
        vec3(v0.z, v1.z, v2.z)
        );
}

vec2 sample(sampler2D data, Volume volume, vec3 ray_pos, inout vec3 normal) {
    vec3 pos_relative = (ray_pos+volume.offset)*volume.scale;
    if(any(lessThan(pos_relative, vec3(0.))) || any(greaterThan(pos_relative, vec3(1.))))
        return vec2(0.0);
    vec4 sample = sample_as_3d_texture(data, volume.size, pos_relative, volume.slice_size, volume.slices, volume.rows, volume.columns);
    normal = (-sample.xyz)*2.+1.;
    float raw_data_value = sample.a; //(sample.a - data_min) * data_scale;
    float scaled_data_value = (raw_data_value*(volume.data_range[1] - volume.data_range[0])) + volume.data_range[0];
    float data_value = (scaled_data_value - volume.show_range[0])/(volume.show_range[1] - volume.show_range[0]);
    // TODO: how do we deal with this with multivolume rendering
    // if(((data_value < 0.) && !volume.clamp_min) || ((data_value > 1.) && !volume.clamp_max)) {
    //     ray_pos += ray_delta;
    //     continue;
    // }
    data_value = clamp(data_value, 0., 1.);
    return vec2(data_value, 1);
}

vec4 apply_lighting(vec4 color, vec3 normal) {
    float cosangle_light = max((dot(light_dir, normal)), 0.);
    float cosangle_eye = max((dot(eye, normal)), 0.);
    vec4 result = vec4(color.rgb * (ambient_coefficient + diffuse_coefficient*cosangle_light + specular_coefficient * pow(cosangle_eye, specular_exponent)), color.a);
    return result;
}

vec4 add_sample(sampler2D data, sampler2D transfer_function, Volume volume, vec3 ray_pos, vec4 color_in) {
    vec4 color;
    vec3 pos_relative = (ray_pos+volume.offset)*volume.scale;
    /*vec4 sample_x = sample_as_3d_texture(volume, size, pos + vec3(delta, 0, 0), slice_size, slices, rows, columns);
    vec4 sample_y = sample_as_3d_texture(volume, size, pos + vec3(0, delta, 0), slice_size, slices, rows, columns);
    vec4 sample_z = sample_as_3d_texture(volume, size, pos + vec3(0, 0, delta), slice_size, slices, rows, columns);

    vec3 normal = normalize(vec3((sample_x[0]-sample[0])/delta, (sample_y[0]-sample[0])/delta, (sample_z[0]-sample[0])/delta));
    normal = -vec3(normal.x, normal.y, normal.z);
    float cosangle_light = max((dot(light_dir, normal)), 0.);
    float cosangle_eye = max((dot(eye, normal)), 0.);*/

    vec3 normal;
    vec2 sample = sample(data, volume, ray_pos, normal);
    float data_value = sample[0];
    if(sample[1] == 0.0)
        return color_in;
    if(((data_value < 0.) && !volume.clamp_min) || ((data_value > 1.) && !volume.clamp_max))
        return color_in;

    vec4 color_sample = texture2D(transfer_function, vec2(data_value, 0.5));
    if(volume.lighting) {
        color_sample = apply_lighting(color_sample, normal);
    }

    // float intensity = color_sample.a;
    //float alpha_sample = intensity * sign(data_value) * sign(1.-data_value) * 100. / float(steps) * ray_length;//clamp(1.-chisq, 0., 1.) * 0.5;//1./128.* length(color_sample) * 100.;
    // float alpha_sample = intensity * 100. / float(steps);//clamp(1.-chisq, 0., 1.) * 0.5;//1./128.* length(color_sample) * 100.;
    // alpha_sample = clamp(alpha_sample * volume.opacity_scale, 0., 1.);

    //float intensity = texture2D(transfer_function, vec2(data_value, 0.5)).a;
    //color_sample = texture2D(transfer_function, data_value);
    //vec4 color_sample = texture2D(colormap, vec2(sample.a, colormap_index_scaled));
    //color_sample = texture2D(volume, ray_pos.yz);
    //float alpha_sample = opacity*intensity;//1./128.* length(color_sample) * 100.;
    // float alpha_total = color_in.a + alpha_sample;
    // color.rgb = color_in.rgb + (1.0 - alpha_total) * color_sample.rgb * alpha_sample;
    // color.a = alpha_total;
    vec4 dst = color_in;
    vec4 src = color_sample;
    src.a *= clamp(100./float(steps) * volume.opacity_scale, 0.0, 1.0);
    #ifdef COORDINATE
        color.a   = src.a  + dst.a;
        color.rgb = dst.xyz + ray_pos * src.a;
    #else
        color.rgb = (1.0-dst.a) * src.rgb * src.a * volume.brightness + dst.rgb;
        color.a   = src.a  + dst.a;
    #endif
    return color;
}

vec4 blend_pre_multiplied(vec4 dst, vec4 src) {
    return dst * (1.0-src.a) + src;
}

const int MAX_STEPS = 1000;
vec2 pixel;

vec4 cast_ray(vec3 ray_begin, vec3 ray_end, vec4 color) {
    vec3 ray_direction = ray_end - ray_begin;
    vec3 ray_delta = normalize(ray_direction) * (1./float(steps));
    vec3 ray_pos = ray_begin;

    float ray_length = length(ray_direction);
    float ray_length_delta = length(ray_delta);
    float ray_length_traveled = 0.;

    vec2 pixel = vec2(gl_FragCoord.x, gl_FragCoord.y) / render_size;
    vec4 voxel_view_space_coord;
    float voxel_frag_depth;
    vec4 geometry_depth;

    for(int i = 0; i < MAX_STEPS; i++) {
        geometry_depth = texture2D(geometry_depth_tex, pixel); 
        voxel_view_space_coord = projectionMatrix * modelViewMatrix * vec4(ray_pos+vec3(-0.5, -0.5, -0.5),1.0);
        voxel_frag_depth = ((voxel_view_space_coord.z / voxel_view_space_coord.w)+1.0)/2.0;
        if(geometry_depth.x > 0.0 && voxel_frag_depth > geometry_depth.x){
            break;
        }

        {{#volumes}}
            color = add_sample(data[{{.}}], transfer_function[{{.}}], volumes[{{.}}], ray_pos, color);
        {{/volumes}}
        if(color.a >= 1.)
            break;
        ray_pos += ray_delta;
        ray_length_traveled += ray_length_delta;
        if(ray_length_traveled >= ray_length)
            break;
    }
    return color;
}

void cast_ray_max(vec3 ray_begin, vec3 ray_end);

void main(void) {
#ifdef METHOD_MAX_INTENSITY
    float max_value = 0.;
    float max_cosangle_light = 0.;
    float max_cosangle_eye = 0.;
#endif


    pixel = vec2(gl_FragCoord.x, gl_FragCoord.y) / render_size;
    vec4 color = vec4(0, 0, 0, 0);
    // float color_index;

    //mat3 rotation = mat3(mvMatrix);
    mat3 rotation = (mat3(viewMatrix));
    light_dir = normalize(vec3(-1,-1,1) * rotation);
    eye = vec3(0, 0, 1) * rotation;

    float delta = 1.0/256./2.;

#ifdef COORDINATE
    // contains the weighted coordinate, where the last component is the weight
    // diving by w gives it the average value
    vec4 weighted_coordinate = vec4(0., 0., 0., 0.);
#endif 
    vec3 ray_begin = front;
    vec3 ray_end = texture2D(back_tex, pixel).rgb;
    vec3 ray_begin0 = ray_begin;
    vec3 ray_end0 = ray_end;
    cast_ray_max(ray_begin, ray_end);
    #if (VOLUME_COUNT_MAX_INT > 1)
        // TODO: horrible sort, fix!!
        for(int i = 0; i < VOLUME_COUNT_MAX_INT-1; i++) {
            for(int j = 1; j < VOLUME_COUNT_MAX_INT; j++) {
                if(has_values[i] && has_values[j] && (i < j)) {
                    if(max_depth[j] < max_depth[i]) {
                        float depth = max_depth[i];
                        max_depth[i] = max_depth[j];
                        max_depth[j] = depth;
                        vec4 color = max_colors[i];
                        max_colors[i] = max_colors[j];
                        max_colors[j] = color;
                    }
                }
            }
        }
    #endif
    #if (VOLUME_COUNT_MAX_INT > 0)
        for(int i = 0; i < VOLUME_COUNT_MAX_INT; i++) {
            layers[i].depth = 0.0;
            layers[i].color = vec4(0.0);
            if(has_values[i]) {
                layers[i].depth = max_depth[i];
                layers[i].color = max_colors[i];
            }
        }
    #endif
    // last layer is the absolute end of the volume, its color is fully transparant
    layers[VOLUME_COUNT_MAX_INT].depth = 1.0;
    layers[VOLUME_COUNT_MAX_INT].color = vec4(0.0);
    float depth = -100.0;
    ray_begin = ray_begin0;
    for(int i = 0; i < VOLUME_COUNT_MAX_INT+1; i++) {
        // TODO: debug this, it seems that > makes more sense, but gives artifacts in the situation of
        // having 2 max int volr, 1 normal, the 2nd will have holes when it's the only volume in the los.
        if(layers[i].depth >= depth)
        {
            ray_end = ray_begin0 + (ray_end0 - ray_begin0) * layers[i].depth;
            color = cast_ray(ray_begin, ray_end, color);
            #ifdef COORDINATE
                // color += layers[i].color;
                color = blend_pre_multiplied(layers[i].color, color);
            #else
                color = blend_pre_multiplied(layers[i].color, color);
            #endif
            ray_begin = ray_end;
            depth = layers[i].depth;
        }
    }

    #ifdef COORDINATE
        vec3 average_coordinate = color.xyz/color.a;
        gl_FragColor = vec4(average_coordinate, color.a);
    #else
        gl_FragColor = color;
    #endif
    //gl_FragColor = vec4(ray_begin.xyz, 0.1) * brightness;
    //gl_FragColor = vec4(rotation[0], 1) * brightness;
    //gl_FragColor = vec4(alpha_total, 0., 0., 1.);
    //gl_FragColor = texture2D(volume, vec2(ray_begin.x, ray_begin.y));
    // gl_FragColor = vec4(ray_pos.x, ray_pos.y, ray_pos.z, 1);
    //gl_FragColor = texture2D(transfer_function, vec2(pixel.x, 0.5));
    //gl_FragColor = vec4(texture2D(volume, vec2(pixel.x, pixel.y)).rgb, 1.0);
    // gl_FragColor = vec4(pixel.x, pixel.y, 0, 1);
    // gl_FragColor = vec4(ray_end, 1.);
    // gl_FragColor = vec4(ray_begin, 1);
    //float tintensity = texture2D(transfer_function, vec2(pixel.x / 1., 0.5)).a;
    //gl_FragColor = vec4(0, tintensity, 0., 1.);
    //gl_FragColor = vec4(ray_e, 1);
}




void cast_ray_max(vec3 ray_begin, vec3 ray_end) {
    vec3 ray_direction = ray_end - ray_begin;
    vec3 ray_delta = normalize(ray_direction) * (1./float(steps));
    vec3 ray_pos = ray_begin;

    float ray_length = length(ray_direction);
    float ray_length_delta = length(ray_delta);
    float ray_length_traveled = 0.;

    vec4 voxel_view_space_coord;
    float voxel_frag_depth;
    vec4 geometry_depth;
    for(int i = 0; i < MAX_STEPS; i++) {

        {{#volumes_max_int}}
        {
            vec3 normal;
            vec2 sample = sample(data_max_int[{{.}}], volumes_max_int[{{.}}], ray_pos, normal);
            if(sample.x > max_values[{{.}}] && sample.y > 0.0) {
                max_values[{{.}}] = sample.x;
                has_values[{{.}}] = true;
                // the weight of the coordinate equals its opacity
                max_colors[{{.}}] = texture2D(transfer_function_max_int[{{.}}], vec2(max_values[{{.}}], 0.5));
                if(volumes_max_int[{{.}}].lighting)
                    max_colors[{{.}}] = apply_lighting(max_colors[{{.}}], normal);
                float alpha = clamp(max_colors[{{.}}].a * volumes_max_int[{{.}}].opacity_scale, 0., 1.);
                max_colors[{{.}}].a = alpha;
                #ifdef COORDINATE
                    max_colors[{{.}}].rgb = ray_pos * alpha; // no need to use brightness for the coordinates
                #else
                    max_colors[{{.}}].rgb *= alpha * volumes_max_int[{{.}}].brightness; // pre-blend
                #endif
                max_weighted_coordinate[{{.}}].xyz = ray_pos * alpha;
                max_weighted_coordinate[{{.}}].a = alpha;
                max_depth[{{.}}] = ray_length_traveled/ray_length;
            }
        }
        {{/volumes_max_int}}

        ray_pos += ray_delta;
        ray_length_traveled += ray_length_delta;
        if(ray_length_traveled >= ray_length)
            break;
    }
}