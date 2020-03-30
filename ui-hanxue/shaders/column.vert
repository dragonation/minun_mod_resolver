precision mediump float;
precision mediump int;

attribute vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec3 columnPosition;

void main() {
    columnPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
