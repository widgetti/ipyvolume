varying vec2 tex_uv;

void main(void) {
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
#ifdef THREESIXTY
    tex_uv = vec2(-position.x, -position.y+0.5);
#else
    tex_uv = vec2(position.x+0.5, position.y+0.5);
#endif
}
