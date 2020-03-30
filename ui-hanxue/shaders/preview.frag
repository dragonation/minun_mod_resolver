precision mediump float;
precision mediump int;

varying vec4 modelPosition;
varying vec4 modelNormal;

varying vec4 modelWorldPosition;

uniform float width;
uniform float depth;
uniform float height;
uniform float slicing;

uniform float selected;

uniform float hideAboveSlice;

void main() {

    float layerSize = 0.5;
    float base = 0.2;

    vec3 slicingColor = vec3(1.0, 1.0, 1.0);
    vec3 baseColor = vec3(0.5, 0.7, 1.0);
    if ((modelWorldPosition.x <= 0.0) || (modelWorldPosition.z <= 0.0) ||
        (modelWorldPosition.x >= width) || (modelWorldPosition.z >= depth)) {
        baseColor = vec3(1.0, 0.55, 0.4);
    }

    if ((hideAboveSlice > 0.0) && (modelWorldPosition.y > slicing)) {
        discard;
    }

    vec3 direction = normalize(-modelPosition.xyz);
    vec3 normal = normalize(modelNormal.xyz);
    float specular = dot(direction, normal);
    if ((hideAboveSlice > 0.0) && (specular < 0.0)) { 

        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);

    } else {

        if (specular < 0.0) {
            specular = 0.0;
        }

        specular = pow(specular, 3.0 + 1.0) * (1.0 - base);

        float distance = (layerSize - abs(modelWorldPosition.y - slicing)) / layerSize;
        if (distance < 0.0) {
            distance = 0.0;
        }

        vec3 color = baseColor.rgb * (base + specular) * (1.0 - distance) + distance * slicingColor.rgb;
        if (selected > 0.0) {
            color = (1.0 + color) * 0.5;
        }

        gl_FragColor = vec4(color.rgb, 1.0);

    }

}
