import Phaser from 'phaser';
import type { GameState } from '../types';
import { MAP_W, MAP_H, WHALE_MAX_HP } from '../types';
import { characterById } from '../characters';

const waterFrag = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

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
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv.y = 1.0 - uv.y; // Flip Y
    
    vec2 waveUv = uv * vec2(20.0, 12.0) + vec2(time * 0.2, time * 0.15);
    float n = noise(waveUv) * 0.5 + noise(waveUv * 2.0) * 0.25;
    
    vec3 baseColor = vec3(0.38, 0.67, 0.82); // 61ACD2
    vec3 highlightColor = vec3(0.5, 0.75, 0.88);
    vec3 color = mix(baseColor, highlightColor, n);
    
    float highlight = smoothstep(0.65, 0.8, n);
    color = mix(color, vec3(0.6, 0.8, 0.9), highlight * 0.3);

    gl_FragColor = vec4(color, 1.0);
}
`;

export default class GameScene extends Phaser.Scene {
    private gameState?: GameState;
    private waterShader!: Phaser.GameObjects.Shader;
    private mapDrawn = false;
    
    private whaleSprite!: Phaser.GameObjects.Container;
    private timmyText!: Phaser.GameObjects.Text;
    private boatSprites: Record<string, Phaser.GameObjects.Container> = {};
    private boatTexts: Record<string, Phaser.GameObjects.Text> = {};
    private sandbankGraphics!: Phaser.GameObjects.Graphics;
    private healZoneGraphics!: Phaser.GameObjects.Graphics;
    private bargeGraphics!: Phaser.GameObjects.Graphics;
    private staticMapLayer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { state: GameState }) {
        this.gameState = data.state;
    }

    preload() {
        const graphics = this.make.graphics({ fillStyle: { color: 0xffffff } });
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('white_circle', 32, 32);
        graphics.destroy();
    }

    create() {
        this.waterShader = this.add.shader(new Phaser.Display.BaseShader('WaterShader', waterFrag), MAP_W / 2, MAP_H / 2, MAP_W, MAP_H) as Phaser.GameObjects.Shader;
        this.waterShader.setDepth(0); // Water is at the very bottom
        
        this.staticMapLayer = this.add.container();
        this.staticMapLayer.setDepth(10); // Sandbanks and Heal Zones

        this.sandbankGraphics = this.add.graphics();
        this.healZoneGraphics = this.add.graphics();
        this.bargeGraphics = this.add.graphics();
        this.bargeGraphics.setDepth(20);

        this.staticMapLayer.add([this.sandbankGraphics, this.healZoneGraphics]);

        this.whaleSprite = this.add.container(0, 0);
        this.whaleSprite.setDepth(30);
        const whaleBody = this.add.ellipse(0, 0, 96, 44, 0x1f2937);
        const whaleBelly = this.add.ellipse(-4, 8, 76, 24, 0xd1d5db);
        const whaleEye = this.add.circle(28, -6, 4, 0xffffff);
        const whalePupil = this.add.circle(29, -6, 2, 0x000000);
        const whaleTail = this.add.graphics();
        this.whaleSprite.add([whaleBody, whaleBelly, whaleTail, whaleEye, whalePupil]);

        this.timmyText = this.add.text(0, 0, 'TIMMY', { fontFamily: "'Comic Neue', system-ui", fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5);
        this.timmyText.setDepth(31);

        this.add.existing(this.whaleSprite);
        this.add.existing(this.timmyText);
        this.add.existing(this.bargeGraphics);
    }
  
    update(time: number, delta: number) {
        if (!this.gameState) return;

        if (!this.mapDrawn && this.gameState.sandbanks.length > 0) {
            this.drawMap();
            this.mapDrawn = true;
        }

        this.waterShader.setUniform('time.value', time / 1000);
        const s = this.gameState;

        // Animate whale tail
        const tail = this.whaleSprite.list[2] as Phaser.GameObjects.Graphics;
        tail.clear();
        tail.fillStyle(0x1f2937);
        const anim = Math.sin(time * 0.0022) * (s.whale.state === 'stranded' ? 0.2 : 1);
        const bob = Math.sin(time * 0.002) * 2;
        
        const tailPath = new Phaser.Curves.Path(-46, bob);
        tailPath.cubicBezierTo( -55, -8 + bob, -58, -14 + bob + anim * 5, -64, -16 + bob + anim * 8);
        tailPath.cubicBezierTo(-60, bob, -60, bob, -64, 16 + bob - anim * 8);
        tailPath.cubicBezierTo(-58, 14 + bob, -55, 8 + bob, -46, bob);
        tailPath.closePath();
        tail.fillPath(tailPath);
        this.whaleSprite.setPosition(s.whale.x, s.whale.y);
        this.whaleSprite.setRotation(s.whale.heading);
        this.whaleSprite.setAlpha(s.whale.hp < 30 ? (s.whale.hp < 15 ? 0.35 : 0.6) : 1);
        this.timmyText.setPosition(s.whale.x, s.whale.y - 40);

        const activePlayerIds = new Set<string>();
        for (const [id, p] of Object.entries(s.players)) {
            if (p.connected && p.boat.alive) {
                activePlayerIds.add(id);
                if (!this.boatSprites[id]) this.createBoatSprite(id, p);
                
                const sprite = this.boatSprites[id];
                sprite.setPosition(p.boat.x, p.boat.y);
                sprite.setRotation(p.boat.heading);
                this.boatTexts[id].setPosition(p.boat.x, p.boat.y - 32);
            }
        }

        for (const id in this.boatSprites) {
            if (!activePlayerIds.has(id)) {
                this.boatSprites[id].destroy();
                delete this.boatSprites[id];
                this.boatTexts[id].destroy();
                delete this.boatTexts[id];
            }
        }
        
        this.bargeGraphics.clear();
        const b = s.barge;
        const openSize = b.openingSize / 2;
        const openTop = b.y + b.h / 2 - openSize;
        const openBottom = b.y + b.h / 2 + openSize;
        
        this.bargeGraphics.fillStyle(0x3a2418);
        this.bargeGraphics.fillRect(b.x, b.y, b.w, openTop - b.y);
        this.bargeGraphics.fillRect(b.x, openBottom, b.w, (b.y + b.h) - openBottom);
        
        this.bargeGraphics.lineStyle(4, 0xfbbf24);
        this.bargeGraphics.strokeRect(b.x, b.y, b.w, b.h);
        this.bargeGraphics.lineBetween(b.x, openTop, b.x + b.w, openTop);
        this.bargeGraphics.lineBetween(b.x, openBottom, b.x + b.w, openBottom);
        
        // Barge side bumpers
        this.bargeGraphics.fillStyle(0x0ea5a0);
        this.bargeGraphics.fillRect(b.x - 6, openTop - 20, 12, 40);
        this.bargeGraphics.fillRect(b.x - 6, openBottom - 20, 12, 40);
        
        for (const fx of s.fx) {
            if (!(fx as any)._rendered) {
                (fx as any)._rendered = true;
                this.spawnFx(fx);
            }
        }
    }
    
    spawnFx(fx: any) {
        if (fx.kind === 'damage' || fx.kind === 'heal') {
            const textValue = fx.value > 0 ? `+${fx.value}` : `${fx.value}`;
            const color = fx.value > 0 ? '#10b981' : '#ef4444';
            const text = this.add.text(fx.x, fx.y - 20, textValue, { fontFamily: "'Comic Neue', system-ui", fontSize: '28px', color, stroke: '#000000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5);
            text.setDepth(100);
            this.tweens.add({ targets: text, y: fx.y - 80, alpha: 0, duration: 1500, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
        } else if (fx.kind === 'blow') {
            this.add.particles(fx.x, fx.y, 'white_circle', { speed: { min: 50, max: 200 }, angle: { min: 240, max: 300 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 800, tint: 0xa5f3fc, quantity: 20, emitting: true, duration: 200 }).setDepth(50);
        } else if (fx.kind === 'hupen') {
            const circle = this.add.circle(fx.x, fx.y, 10, 0, 0).setStrokeStyle(4, 0xf87171);
            circle.setDepth(5); // Under boats, above map
            this.tweens.add({ targets: circle, radius: 230, alpha: 0, duration: 300, onComplete: () => circle.destroy() });
        } else if (fx.kind === 'crash') {
            this.add.particles(fx.x, fx.y, 'white_circle', { speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 }, scale: { start: 0.3, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 400, tint: [0xffab40, 0xffe8c8], quantity: 5, emitting: true, duration: 100 }).setDepth(50);
        }
    }

    createBoatSprite(id: string, player: any) {
        const c = characterById(player.characterId);
        const hull = this.add.polygon(0, 0, [ 22, 0, -18, -12, -22, -10, -22, 10, -18, 12 ], Phaser.Display.Color.HexStringToColor(c.color).color);
        const engine = this.add.rectangle(-20, 0, 10, 14, Phaser.Display.Color.HexStringToColor(c.accent).color);
        
        this.boatSprites[id] = this.add.container(player.boat.x, player.boat.y, [hull, engine]);
        this.boatSprites[id].setDepth(40);
        
        this.boatTexts[id] = this.add.text(player.boat.x, player.boat.y - 32, player.name.toUpperCase(), { fontFamily: "'Comic Neue', system-ui", fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' }).setOrigin(0.5);
        this.boatTexts[id].setDepth(41);
        
        this.add.existing(this.boatTexts[id]);
    }

    drawMap() {
        if (!this.gameState) return;
        this.sandbankGraphics.clear();
        this.healZoneGraphics.clear();

        for (const z of this.gameState.healZones) {
            this.healZoneGraphics.fillStyle(0x22d3ee, 0.25).fillRect(z.x, z.y, z.w, z.h);
            this.healZoneGraphics.lineStyle(2, 0x22d3ee, 0.6).strokeRect(z.x, z.y, z.w, z.h);
            this.staticMapLayer.add(this.add.text(z.x + z.w / 2, z.y + z.h / 2, 'Bagger-Rinne', { fontFamily: "'Comic Neue', system-ui", fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.7));
        }

        for (const sb of this.gameState.sandbanks) {
            if (sb.poly.length < 3) continue;
            this.sandbankGraphics.fillStyle(0xb89866);
            this.sandbankGraphics.lineStyle(2, 0x5a4628, 0.35);

            this.sandbankGraphics.beginPath();
            this.sandbankGraphics.moveTo(sb.poly[0][0], sb.poly[0][1]);
            for (let i = 1; i < sb.poly.length; i++) {
                this.sandbankGraphics.lineTo(sb.poly[i][0], sb.poly[i][1]);
            }
            this.sandbankGraphics.closePath();
            this.sandbankGraphics.fillPath();
            this.sandbankGraphics.strokePath();

            if (sb.name) {
                this.staticMapLayer.add(this.add.text(sb.x, sb.y, sb.name, { fontFamily: "'Comic Neue', system-ui", fontSize: '16px', color: '#281e14', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.7));
            }
        }
    }

    public updateState(newState: GameState) {
        this.gameState = newState;
    }
}
