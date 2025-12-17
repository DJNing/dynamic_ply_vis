import { Color } from 'three';

export const VERTEX_SHADER = `
attribute float group_id;
attribute float part_id;
attribute vec3 color;

varying vec3 vColor;
varying float vGroup;
varying float vPart;

uniform float uMode; // 0=RGB, 1=Group, 2=Part
uniform vec3 uDisplacement;
uniform float uAnim1Progress; // 0->1 (Displacement reduces to 0)

uniform float uSelectedGroup;
uniform float uSelectedPart;
uniform mat4 uPartMatrix; // Interpolated SE3 matrix
uniform float uAnim2Progress;

// Simple color palettes for IDs - Darker for Light Background
vec3 getGroupColor(float id) {
    // Generate saturated, slightly darker colors
    float r = mod(id * 0.7 + 0.1, 0.8);
    float g = mod(id * 0.3 + 0.2, 0.8);
    float b = mod(id * 0.5 + 0.3, 0.8);
    return vec3(r, g, b);
}

vec3 getPartColor(float id) {
    float r = mod(id * 0.4 + 0.6, 0.8);
    float g = mod(id * 0.8 + 0.1, 0.8);
    float b = mod(id * 0.2 + 0.4, 0.8);
    return vec3(r, g, b);
}

void main() {
    vGroup = group_id;
    vPart = part_id;

    // Mode Color Handling
    if (uMode < 0.5) {
        vColor = color;
    } else if (uMode < 1.5) {
        vColor = getGroupColor(group_id);
    } else {
        vColor = getPartColor(part_id);
    }

    // Animation 1: Displacement
    // Only apply to Group 0 (Source). Group 1 (Target) stays static.
    // Pos = Src + Disp * (1.0 - Progress)
    vec3 animatedPos = position;
    
    // Check if group_id is 0 (allow small float error)
    if (abs(group_id - 0.0) < 0.1) {
         animatedPos = position + uDisplacement * (1.0 - uAnim1Progress);
    }

    // Animation 2: SE3 Transform on selection
    // Only apply if matches selection
    // We assume uPartMatrix is already interpolated Identity -> Target on CPU
    bool isSelected = (abs(group_id - uSelectedGroup) < 0.1) && (abs(part_id - uSelectedPart) < 0.1);
    
    if (isSelected) {
        vec4 pos4 = vec4(animatedPos, 1.0);
        animatedPos = (uPartMatrix * pos4).xyz;
    }

    vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
    gl_PointSize = 4.0 * (10.0 / -mvPosition.z); // Scale by distance
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const FRAGMENT_SHADER = `
varying vec3 vColor;

void main() {
    // Simple circle point
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    gl_FragColor = vec4(vColor, 1.0);
}
`;