#include <packing>

varying vec2 fragUV;

uniform float ux;
uniform float uy;

uniform sampler2D layer;
uniform sampler2D layer2;
uniform sampler2D layer3;
uniform sampler2D layer4;

uniform float cameraNear;
uniform float cameraFar;

vec2 readDepth(sampler2D depth, vec2 uv) {

    vec4 values = texture2D(depth, vec2(uv.x, uv.y));

    float depthValue = 255.0;
    if (values.r >= 0.5) {
        depthValue = 127.0 * 2.0 * (values.r - 0.5) + values.g + values.b / 255.0;
    }

    return vec2(depthValue / 255.0, values.a);

}

float getEdge(sampler2D depth, vec2 uv) {

    vec2 z00 = readDepth(depth, vec2(uv.x - ux, uv.y - uy));
    vec2 z01 = readDepth(depth, vec2(uv.x - ux, uv.y));
    vec2 z02 = readDepth(depth, vec2(uv.x - ux, uv.y + uy));
    vec2 z10 = readDepth(depth, vec2(uv.x, uv.y - uy));
    vec2 z11 = readDepth(depth, vec2(uv.x, uv.y));
    vec2 z12 = readDepth(depth, vec2(uv.x, uv.y + uy));
    vec2 z20 = readDepth(depth, vec2(uv.x + ux, uv.y - uy));
    vec2 z21 = readDepth(depth, vec2(uv.x + ux, uv.y));
    vec2 z22 = readDepth(depth, vec2(uv.x + ux, uv.y + uy));

    float x = z20.x + 1.4 * z21.x + z22.x - z00.x - 1.4 * z01.x - z02.x;
    float y = z02.x + 1.4 * z12.x + z22.x - z00.x - 1.4 * z10.x - z20.x;

    float d = z11.x * (cameraFar - cameraNear) + cameraNear;
    float n = ((z11.y - 0.5) * 2.0);
    float m = sqrt(1.0 - n * n);

    float diff = m / n * d * 0.003;

    float result = sqrt(x * x + y * y) * 400.0;
    if ((result < 0.3) || (result < diff)) {
        result = 0.0;
    } else {
        float c = 0.0;
        c += (z11.x - z00.x);
        c += (z11.x - z01.x);
        c += (z11.x - z02.x);
        c += (z11.x - z10.x);
        c += (z11.x - z12.x);
        c += (z11.x - z20.x);
        c += (z11.x - z21.x);
        c += (z11.x - z22.x);
        if (c <= 0.0002) {
            result = 0.0;
        } else {
            if (result > 0.8) {
                result = 1.0;
            } else {
                result = (result - 0.3) / 0.5;
            } 
        }
    }

    return result; 

}

void main() {
    float z = clamp(getEdge(layer, fragUV), 0.0, 1.0);
    float z2 = clamp(getEdge(layer2, fragUV), 0.0, 1.0);
    float z3 = clamp(getEdge(layer3, fragUV), 0.0, 1.0);
    float edge = clamp((z + z2 * 0.25 + z3 * 0.25), 0.0, 1.0);
    vec4 pixel = texture2D(layer4, fragUV);
    if (edge > 0.0) {
        pixel.rgb = pixel.rgb * (1.0 - edge);
        pixel.a = pixel.a + (1.0 - pixel.a) * edge;
    }
    pixel.rgb = pixel.rgb + 1.0 - pixel.a;
    pixel.a = 1.0;
    gl_FragColor = pixel;
    // gl_FragColor = vec4(edge, edge, edge, 1.0);
    // gl_FragColor = vec4(z, z, z, 1.0);
    // gl_FragColor = vec4(z2, z2, z2, 1.0);
    // gl_FragColor = texture2D(layer2, fragUV);
}
