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

    // phong lighting models parameters
    vec3 diffuseColor;
    vec3 specular;
    vec3 emissive;
    float shininess;
};

vec2 compute_slice_offset(float slice, float columns, vec2 uv_slice_spacing) {
    float column = floor((slice+0.5) / (columns));
    float row = slice - column * columns;
    return uv_slice_spacing * vec2(row, column);
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