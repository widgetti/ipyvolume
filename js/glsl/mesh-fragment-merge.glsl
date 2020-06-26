#extension GL_OES_standard_derivatives : enable

#ifdef LAMBERT_SHADING_MODEL
    #define LAMBERT

    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform float emissiveIntensity;
    uniform float opacity;

    varying vec3 vLightFront;

    #ifdef DOUBLE_SIDED

    	varying vec3 vLightBack;

    #endif

    #include <common>
    #include <packing>
    #include <dithering_pars_fragment>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <aomap_pars_fragment>
    #include <lightmap_pars_fragment>
    #include <emissivemap_pars_fragment>
    #include <envmap_pars_fragment>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <fog_pars_fragment>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
#endif//LAMBERT_SHADING_MODEL

varying vec4 vertex_color;
varying vec3 vertex_position;
varying vec2 vertex_uv;

#ifdef USE_TEXTURE
    uniform sampler2D texture;
    uniform sampler2D texture_previous;
    uniform float animation_time_texture;
#endif


void main(void) {
#ifdef USE_RGB
    gl_FragColor = vec4(vertex_color.rgb, 1.0);
#else
#ifdef AS_LINE
    gl_FragColor = vec4(vertex_color.rgb, vertex_color.a);
#else
    vec3 fdx = dFdx( vertex_position );
    vec3 fdy = dFdy( vertex_position );
    vec3 normal = normalize( cross( fdx, fdy ) );
    float diffuse = dot( normal, vec3( 0.0, 0.0, 1.0 ) );

#ifdef USE_TEXTURE
    vec4 sample = mix(texture2D(texture_previous, vertex_uv), texture2D(texture, vertex_uv), animation_time_texture);
    gl_FragColor = vec4(clamp(diffuse, 0.2, 1.) * sample.rgb, 1.0);
#else
    gl_FragColor = vec4(clamp(diffuse, 0.2, 1.) * vertex_color.rgb, vertex_color.a);
#endif // USE_TEXTURE
#endif // AS_LINE
#endif // USE_RGB


#ifdef LAMBERT_SHADING_MODEL
    gl_FragColor = vec4(0.0, 1.0, 0.0, 0.5);
#endif//LAMBERT_SHADING_MODEL
}
