varying vec4 vertex_color;
uniform vec3 scale;
uniform vec3 offset;

void main(void) {
    vec3 pos = position;
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos,1.0);
    vertex_color = vec4((pos + vec3(0.5, 0.5, 0.5))*scale + offset, 1);
}
