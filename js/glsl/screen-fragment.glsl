varying  vec2 tex_uv;

#ifdef THREESIXTY
uniform samplerCube tex;
#else
uniform sampler2D tex;
#endif


void main(void) {
#ifdef THREESIXTY
	const float PI = 3.141592653589793238462643383;
	vec3 uvw = vec3(-sin(tex_uv.x * PI * 2.0) * sin(tex_uv.y * PI),
					 cos(tex_uv.y * PI),
					-cos(tex_uv.x * PI * 2.0) * sin(tex_uv.y * PI));
    gl_FragColor = textureCube(tex, uvw);
#else
    gl_FragColor = texture2D(tex, tex_uv);
#endif
    //gl_FragColor = vec4(tex_uv.x, tex_uv.y, 0., 1.);
    //gl_FragColor = vec4(1., 0., 0., 1.);
}
