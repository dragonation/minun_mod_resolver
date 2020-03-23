precision mediump float;
precision mediump int;

attribute vec3 position;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

varying vec4 modelPosition;

void main() {
    modelPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(modelPosition.x, -0.1, modelPosition.z, 1.0); 
}
