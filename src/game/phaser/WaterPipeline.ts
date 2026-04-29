import Phaser from 'phaser';

const fragShader = `
#define SHADER_NAME WATER_FS
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uMainSampler;

varying vec2 outTexCoord;

// Simple noise function
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = outTexCoord;
    
    // Wind/Movement
    vec2 waveUv = uv * 8.0 + vec2(uTime * 0.02, uTime * 0.015);
    float n = noise(waveUv) * 0.5 + noise(waveUv * 2.0) * 0.25;
    
    // Base cartoony colors
    vec3 waterColor = mix(vec3(0.1, 0.5, 0.7), vec3(0.15, 0.6, 0.8), n);
    
    // Specular highlights
    float highlight = smoothstep(0.6, 0.8, n);
    waterColor = mix(waterColor, vec3(0.8, 0.9, 1.0), highlight * 0.5);

    gl_FragColor = vec4(waterColor, 1.0);
}
`;

export default class WaterPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game: Phaser.Game) {
        super({
            game,
            fragShader,
        });
    }

    onPreRender() {
        this.set1f('uTime', this.game.loop.time / 1000);
        this.set2f('uResolution', this.renderer.width, this.renderer.height);
    }
}
