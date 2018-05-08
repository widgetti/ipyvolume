varying  vec2 tex_uv;

#if defined(PANORAMA_360) || defined(PANORAMA_180)
uniform samplerCube tex;
#else
uniform sampler2D tex;
#endif


void main(void) {
	const float PI = 3.141592653589793238462643383;
#if defined(PANORAMA_360)
	float phi   = (1.-tex_uv.x)* PI * 2.0;
	float theta = (1.-tex_uv.y) * PI;
    vec3 uvw = vec3(sin(phi) * sin(theta),
                               cos(theta),
                    cos(phi) * sin(theta)
                    );
    gl_FragColor = textureCube(tex, uvw);
#elif defined(PANORAMA_180)
	float x = (tex_uv.x-0.5)*2.;
	float y = (tex_uv.y-0.5)*2.;
	float r = sqrt(x*x + y*y);
	if(r > 1.)
		discard;
	float theta = r * PI/2.;
	float phi = atan(y, x);
	vec3 uvw = vec3(cos(phi) * sin(theta),
					sin(phi) * sin(theta),
					          -cos(theta));
    gl_FragColor = textureCube(tex, uvw);
#else
    gl_FragColor = texture2D(tex, tex_uv);
#endif
}
