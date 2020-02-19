varying vec2 fragUV;
void main() {
    fragUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
}
