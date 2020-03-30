precision mediump float;
precision mediump int;

varying vec4 modelPosition;

uniform float slicing;
uniform float hideAboveSlice;

void main() {

    if ((hideAboveSlice > 0.0) && (modelPosition.y > slicing)) {
        discard;
    }

    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.3);

}
