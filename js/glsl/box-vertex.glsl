varying vec4 vertex_color;

void main(void) {
    vec3 pos = position;
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vertex_color = vec4(pos + vec3(0.5, 0.5, 0.5), 1);
}
