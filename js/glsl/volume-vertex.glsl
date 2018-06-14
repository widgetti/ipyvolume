
precision highp float;
precision highp int;
uniform mat4 centerNormalizeTransform;

varying vec3 entry_point;

void main() {
    entry_point = position + vec3(0.5,0.5,0.5);
    gl_Position = projectionMatrix * 
                  modelViewMatrix * 
                  centerNormalizeTransform *
                  vec4( position, 1.0 );
}