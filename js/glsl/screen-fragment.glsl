varying  vec2 tex_uv;
uniform sampler2D tex;

void main(void) {
    gl_FragColor = texture2D(tex, tex_uv);
    //gl_FragColor = vec4(tex_uv.x, tex_uv.y, 0., 1.);
    //gl_FragColor = vec4(1., 0., 0., 1.);
}
