precision highp float;
varying vec4 vertex_color;
uniform sampler2D front;
uniform sampler2D back;
uniform sampler2D volume;
//uniform sampler2D colormap;
//uniform int colormap_index;
//uniform int surfaces;
//uniform float opacity[4];
//uniform float volume_level[4];
//uniform float volume_width[4];
uniform float brightness;
uniform float data_min;
uniform float data_max;
uniform float volume_rows;
uniform float volume_columns;
uniform float volume_slices;
uniform vec2 volume_size;
uniform vec2 volume_slice_size;
uniform vec2 render_size;

uniform sampler2D transfer_function;


// for lighting
uniform mat3 mvMatrix;

//uniform float color_index;

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
void main(void) {
    const int steps = 150;

    vec2 pixel = vec2(gl_FragCoord.x, gl_FragCoord.y) / render_size;
    //vec4 textureColor = texture2D(volume, vec2(pixel.x * width + x_index, pixel.y*height + y_index));
    //vec3 ray_begin = vertex_color.xyz;//texture2D(front, pixel).rgb;
    //vec3 ray_end = texture2D(back, pixel).rgb;
    vec3 ray_end = vertex_color.xyz;//texture2D(front, pixel).rgb;
    vec3 ray_begin = texture2D(front, pixel).rgb;
    vec3 ray_direction = ray_end - ray_begin;
    vec3 ray_delta = ray_direction * (1./float(steps));
    vec3 ray_pos = ray_begin;
	float ray_length = sqrt(ray_direction.x*ray_direction.x + ray_direction.y*ray_direction.y + ray_direction.z*ray_direction.z);
    vec4 color = vec4(0, 0, 0, 0);
    float alpha_total = 0.;
    //float colormap_index_scaled = 0.5/70. + float(colormap_index)/70.;
    float color_index;
    float data_scale = 1./(data_max - data_min);

    //mat3 rotation = mat3(mvMatrix);
    mat3 rotation = (mat3(viewMatrix));
	vec3 light_dir = normalize(vec3(-1,-1,1) * rotation);
	vec3 eye = vec3(0, 0, 1) * rotation;

	float delta = 1.0/256./2.;


    for(int i = 0; i < steps; i++) {
        vec3 pos = ray_pos;
        //pos = vec3(pos.xy, 1./128. * mod1); //ray_pos.z * 0.9 + 0.05);
        //pos = vec3(1./128. * mod1, pos.yz); //ray_pos.z * 0.9 + 0.05);
        //pos = vec3(pos.x, pos.yz); //ray_pos.z * 0.9 + 0.05);
        //pos = vec3(ray_pos.xy, 1./128. * mod1); //ray_pos.z * 0.9 + 0.05);
        //pos = vec3(ray_pos.x, ray_pos.y, 1./128. * mod1); //ray_pos.z * 0.9 + 0.05);
        //vec4 color_sample = sampleAs3DTexture(volume, pos, 128., 8., 16.);
        vec4 sample = sample_as_3d_texture(volume, volume_size, pos, volume_slice_size, volume_slices, volume_rows, volume_columns);
        vec4 sample_x = sample_as_3d_texture(volume, volume_size, pos + vec3(delta, 0, 0), volume_slice_size, volume_slices, volume_rows, volume_columns);
        vec4 sample_y = sample_as_3d_texture(volume, volume_size, pos + vec3(0, delta, 0), volume_slice_size, volume_slices, volume_rows, volume_columns);
        vec4 sample_z = sample_as_3d_texture(volume, volume_size, pos + vec3(0, 0, delta), volume_slice_size, volume_slices, volume_rows, volume_columns);

        vec3 normal = normalize(vec3((sample_x[0]-sample[0])/delta, (sample_y[0]-sample[0])/delta, (sample_z[0]-sample[0])/delta));
        normal = -vec3(normal.x, normal.y, normal.z);
        float cosangle_light = max((dot(light_dir, normal)), 0.);
        float cosangle_eye = max((dot(eye, normal)), 0.);

        //for(int j = 0; j < 3; j++) {
          //float bla = length(sample)/sqrt(3.);
          float data_value = (sample.a - data_min) * data_scale;
          //float volume_level_value = (volume_level[j] - data_min) * data_scale;;
          //float chi = (data_value-volume_level[j])/volume_width[j];
          //float chisq = pow(chi, 2.);
          //float intensity = exp(-chisq);
          //vec4 color_sample = texture2D(colormap, vec2(clamp((level+2.)/2., 0., 1.), colormap_index_scaled));
          //intensity = clamp(intensity, 0., 1.);
          //float distance_norm = clamp(((-chi/0.5)+1.)/2., 0., 1.);
          //color_index = 0.9;
          //vec4 color_sample = texture2D(colormap, vec2(1.-volume_level[j], colormap_index_scaled));
          //vec4 color_sample = texture2D(colormap, vec2(data_value, colormap_index_scaled));

          vec4 color_sample = texture2D(transfer_function, vec2(data_value, 0.5));

          color_sample = color_sample * (ambient_coefficient + diffuse_coefficient*cosangle_light + specular_coefficient * pow(cosangle_eye, specular_exponent));

          float intensity = color_sample.a;
          //float intensity = texture2D(transfer_function, vec2(data_value, 0.5)).a;
          //color_sample = texture2D(transfer_function, data_value);
          //vec4 color_sample = texture2D(colormap, vec2(sample.a, colormap_index_scaled));
          //color_sample = texture2D(volume, ray_pos.yz);
          //float alpha_sample = opacity*intensity;//1./128.* length(color_sample) * 100.;
          float alpha_sample = intensity * sign(data_value) * sign(1.-data_value) * 100. / float(steps) * ray_length;//clamp(1.-chisq, 0., 1.) * 0.5;//1./128.* length(color_sample) * 100.;
          alpha_sample = clamp(alpha_sample, 0., 1.);
          color = color + (1.0 - alpha_total) * color_sample * alpha_sample;
          if(alpha_total >= 1.)
            break;
          alpha_total = clamp(alpha_total + alpha_sample, 0., 1.);
        //}
        ray_pos += ray_delta;
    }
    gl_FragColor = vec4(color.rgb, 1) * brightness;
    //gl_FragColor = vec4(rotation[0], 1) * brightness;
    //gl_FragColor = vec4(alpha_total, 0., 0., 1.) * brightness;
    //gl_FragColor = texture2D(volume, vec2(ray_begin.x, ray_begin.y));
    //gl_FragColor = vec4(ray_pos.x, ray_pos.y, ray_pos.z, 1);
    //gl_FragColor = texture2D(transfer_function, vec2(pixel.x, 0.5));
    //gl_FragColor = vec4(pixel.x, pixel.y, 0, 1);
    //gl_FragColor = vec4(ray_end, 1);
    //float tintensity = texture2D(transfer_function, vec2(pixel.x / 1., 0.5)).a;
    //gl_FragColor = vec4(0, tintensity, 0., 1.);
    //gl_FragColor = vec4(ray_e, 1);
}
