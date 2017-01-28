varying vec2 tex_uv;

void main(void) {
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
    tex_uv = vec2(position.x+0.5, position.y+0.5);
}
