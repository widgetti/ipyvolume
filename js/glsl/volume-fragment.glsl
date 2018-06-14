precision highp float;
precision highp int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 centerNormalizeTransform;
uniform sampler2D exit_points;
uniform sampler2D geometry_color_tex;
uniform sampler2D geometry_depth_tex;
uniform sampler2D volume_tex;
uniform sampler2D transfer_function_tex;
uniform float step_size;
uniform vec2 render_size;
uniform vec3 volume_size;
uniform vec2 slice_inner_size;
uniform vec2 slice_pixel_size;
uniform vec2 tex_tile_size;
uniform vec2 nr_of_tiles;
uniform vec2 threshold;
uniform int show_threshold;
uniform vec2 data_values_minmax;
uniform float noise_factor;

uniform int debugnumber;
uniform float debugfloat;

varying vec3 entry_point;

const int MAXSTEPS = 1733;// Maximum steps is ceil(sqrt(3)/minStep_size) minStep_size = 0.001

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 sample3DTex(vec3 voxel_coord){
    vec2 offset = slice_pixel_size * 0.5 + voxel_coord.xy * slice_inner_size;
    
    float zSlice0 = min(floor(voxel_coord.z*volume_size.z),volume_size.z-1.0);
    float zSlice1 = min(zSlice0 + 1.0, volume_size.z - 1.0);

    vec2 s1coords = offset + vec2(mod(zSlice0, nr_of_tiles[0]),floor(zSlice0 / nr_of_tiles[0])) * tex_tile_size;
    vec2 s2coords = offset + vec2(mod(zSlice1, nr_of_tiles[0]),floor(zSlice1 / nr_of_tiles[0])) * tex_tile_size;

    vec4 slice0Color = texture2D(volume_tex, s1coords);
    vec4 slice1Color = texture2D(volume_tex, s2coords);
    float zOffset = mod(voxel_coord.z * volume_size.z, 1.0);
    return mix(slice0Color, slice1Color, zOffset);
}

void main() {
    vec3 exit_point = texture2D(exit_points, gl_FragCoord.st/render_size).xyz;
    if (entry_point == exit_point)
        discard;
    vec3 ray_dir = exit_point - entry_point;
    vec3 ray_dir_normalized = normalize(ray_dir);
    float ray_length = length(ray_dir); // the length from front to back is calculated and used to terminate the ray
    vec3 delta_dir = ray_dir_normalized * step_size;
    float delta_dir_len = length(delta_dir);
    vec4 color_acum = vec4(0.0);
    float data_value;
    float length_acum = 0.0;
    vec4 color_sample; // The src color 
    vec4 voxel_view_space_coord;
    float voxelFragDepth;
    vec4 geometry_color;
    vec4 geometry_depth;

    float alpha_correction_exponent = step_size * length(volume_size);

    vec3 jitter = delta_dir * (rand(gl_FragCoord.xy)*noise_factor); // jitter to reduce artifacts

    vec3 voxel_coord = entry_point + jitter;

    for(int i = 0; i < MAXSTEPS; i++)
    {
        // First check if geometry is in front of voxel
        geometry_color = texture2D(geometry_color_tex, gl_FragCoord.st/render_size); 
        geometry_depth = texture2D(geometry_depth_tex, gl_FragCoord.st/render_size); 
        voxel_view_space_coord = projectionMatrix*modelViewMatrix *
                              centerNormalizeTransform *
                              vec4(voxel_coord - vec3(0.5,0.5,0.5),1.0);
        voxelFragDepth = ((voxel_view_space_coord.z / voxel_view_space_coord.w)+1.0)/2.0;

        if (geometry_depth.x > 0.0 && voxelFragDepth > geometry_depth.x){
            color_acum.rgb += (1.0 - color_acum.a) * geometry_color.rgb * geometry_color.a;
            color_acum.a += (1.0 - color_acum.a) * geometry_color.a;    
        }

        if (color_acum.a >= 1.0) // terminate if opacity > 1 or the ray is outside the volume    
        {
            color_acum.a = 1.0;
            break;
        } 
        else if (length_acum >= ray_length)
        {   
            break;  
        }   

        // Then do the voxel sampling
        data_value =  sample3DTex(voxel_coord).x;

        color_sample = texture2D(transfer_function_tex, vec2((data_value-data_values_minmax.x)/(data_values_minmax.y-data_values_minmax.x),0.5));

        if(show_threshold==1 && data_value>=threshold.x && data_value<=threshold.y)
            color_sample = vec4(1.0,0.0,0.0,0.1);

        // accomodate for variable sampling rates (base interval defined by mod_compositing.frag)
        color_sample.a = 1.0 - pow(1.0 - color_sample.a, alpha_correction_exponent); // alpha correction for lower sample size than volume resolution
        color_acum.rgb += (1.0 - color_acum.a) * color_sample.rgb * color_sample.a;
        color_acum.a += (1.0 - color_acum.a) * color_sample.a;

        voxel_coord += delta_dir;
        length_acum += delta_dir_len;
    }

    gl_FragColor = color_acum;    
}