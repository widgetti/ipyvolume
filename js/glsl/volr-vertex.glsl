//attribute vec3 aVertexPosition;

//uniform mat4 uMVMatrix;
//uniform mat4 uPMatrix;
varying vec3 front;

void main(void) {
    //gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
    //vertex_color = vec4(aVertexPosition, 1);
    front = vec4(position+vec3(0.5, 0.5, 0.5), 1).xyz;
}
