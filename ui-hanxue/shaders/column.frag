precision mediump float;
precision mediump int;

varying vec3 columnPosition;

uniform float width;
uniform float depth;
uniform float height;
uniform float outline;

void main() {
    if (columnPosition.y > height) {
        discard;
    }
    gl_FragColor = vec4(0.6, 0.6, 0.6, 1.0);
}
