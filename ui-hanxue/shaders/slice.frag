precision mediump float;
precision mediump int;

varying vec4 modelPosition;
varying vec4 modelNormal;

uniform float depth;

void main() {
    
    if (modelPosition.y > depth) {
        discard;
    }

    if (modelNormal.y > 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }

}
