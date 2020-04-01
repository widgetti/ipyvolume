#extension GL_OES_standard_derivatives : enable
#define PHONG


 // for animation, all between 0 and 1
uniform float animation_time_x;
uniform float animation_time_y;
uniform float animation_time_z;
uniform float animation_time_u;
uniform float animation_time_v;
uniform float animation_time_color;

uniform vec2 xlim;
uniform vec2 ylim;
uniform vec2 zlim;

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

attribute vec4 color_current;
attribute vec4 color_previous;

//PHONG
////////////////////////////////////////////////////////////////////////////////
varying vec3 vViewPosition;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
////////////////////////////////////////////////////////////////////////////////
void main() 
{
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

	vNormal = normalize( transformedNormal );

#endif

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz;

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>

    vec3 origin = vec3(xlim.x, ylim.x, zlim.x);
    vec3 size_viewport = vec3(xlim.y, ylim.y, zlim.y) - origin;

    vec3 pos = (mix(position_previous, position, vec3(animation_time_x, animation_time_y, animation_time_z))
                - origin) / size_viewport - 0.5;
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vec3 positionEye = ( modelViewMatrix * vec4( pos, 1.0 ) ).xyz;
    vertex_position = positionEye;
	
#ifdef USE_TEXTURE
    vertex_uv = vec2(mix(u_previous, u, animation_time_u), mix(v_previous, v, animation_time_v));
#endif

#ifdef USE_RGB
    vertex_color = vec4(pos + vec3(0.5, 0.5, 0.5), 1.0);
#else
    vertex_color = mix(color_previous, color_current, animation_time_color);
#endif

}
