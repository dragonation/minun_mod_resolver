precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 normal;
attribute vec3 color; // edge offset

uniform float expand;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec4 modelPosition;
varying vec4 modelWorldPosition;
varying vec4 modelNormal;

void main() {
    modelNormal = modelViewMatrix * vec4(normal, 0.0);
    modelWorldPosition = modelMatrix * vec4(position + expand * color, 1.0);
    modelPosition = viewMatrix * modelWorldPosition;
    gl_Position = projectionMatrix * modelPosition; 
}
