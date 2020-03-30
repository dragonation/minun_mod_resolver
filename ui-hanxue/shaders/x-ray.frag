precision mediump float;
precision mediump int;

varying vec4 modelPosition;
varying vec4 modelNormal;

varying vec4 modelWorldPosition;

uniform float slicing;

uniform float hideAboveSlice;

void main() {

    vec3 baseColor = vec3(0.5, 0.7, 1.0);
    
    vec3 direction = normalize(-modelPosition.xyz);
    vec3 normal = normalize(modelNormal.xyz);
    float specular = dot(direction, normal);

    if ((hideAboveSlice > 0.0) && (modelWorldPosition.y > slicing)) {
        discard;
    }

    if (specular < 0.0) { specular = 0.0; }

    gl_FragColor = vec4((1.0 - specular) * baseColor.rgb * 0.85, 1.0);

}
