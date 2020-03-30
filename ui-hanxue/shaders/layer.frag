precision mediump float;
precision mediump int;

varying vec3 gridPosition;

uniform float width;
uniform float height;
uniform float grid;

uniform sampler2D map;

void main() {

    // TODO: checkout why we need to increase 0.5mm on z-axis
    vec4 color = texture2D(map, vec2(gridPosition.x / width, (gridPosition.z + 0.5) / height));
    float alpha = 0.0;
    if ((gridPosition.x > -1.0) && (gridPosition.x < width + 1.0) &&
        (gridPosition.z > -1.0) && (gridPosition.z < height + 1.0)) {
        if ((gridPosition.x < 0.0) || (gridPosition.z < 0.0) ||
            (gridPosition.x > width) || (gridPosition.z > height)) {
            float alphaX = abs((gridPosition.x < 0.0) ? (gridPosition.x + 1.0) : (1.0 - gridPosition.x + width));
            float alphaZ = abs((gridPosition.z < 0.0) ? (gridPosition.z + 1.0) : (1.0 - gridPosition.z + height));
            alpha = 0.4 * (alphaX < alphaZ ? alphaX : alphaZ);
        } else {
            alpha = 0.4;
        }
    }

    vec3 layerColor = vec3(0.46, 0.65, 0.84);

    gl_FragColor = vec4(
        layerColor.rgb + color.rgb * (1.0 - alpha), 
        alpha + (1.0 - alpha) * color.r);

}
