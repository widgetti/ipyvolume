varying vec4 vertex_color;

void main(void) {
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
    vertex_color = vec4(position + vec3(0.5, 0.5, 0.5), 1);
}
