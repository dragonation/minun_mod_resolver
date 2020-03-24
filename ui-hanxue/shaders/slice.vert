precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

varying vec4 modelPosition;
varying vec4 modelNormal;

void main() {
    modelPosition = modelMatrix * vec4(position, 1.0);
    modelNormal = modelMatrix * vec4(normal, 0.0);
    gl_Position = projectionMatrix * viewMatrix * modelPosition; 
}
