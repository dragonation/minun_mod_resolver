precision mediump float;
precision mediump int;

varying vec4 modelPosition;

uniform float height;

void main() {

    float distance = max(0.0, 1.0 - modelPosition.y / height);

    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.3);

}
