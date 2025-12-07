import { GameEngine } from '../GameEngine';
import { GemType, Particle, FloatingText } from '../../types';
import { GEM_SIZE, COLORS } from '../../constants';

export class EffectSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public update(deltaTime: number) {
    // Update Particles
    for (let i = this.engine.particles.length - 1; i >= 0; i--) {
        const p = this.engine.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life--;
        if (p.life <= 0) this.engine.particles.splice(i, 1);
    }

    // Update Floating Text
    for (let i = this.engine.floatingTexts.length - 1; i >= 0; i--) {
        const t = this.engine.floatingTexts[i];
        t.y -= 1;
        t.life--;
        t.scale = Math.min(1.5, t.scale + 0.1);
        if (t.life <= 0) this.engine.floatingTexts.splice(i, 1);
    }
  }

  public spawnParticles(x: number, y: number, type: GemType) {
      const count = 8;
      const color = COLORS[type];
      for (let i = 0; i < count; i++) {
          this.engine.particles.push({
              id: Math.random(),
              x: x + GEM_SIZE/2,
              y: y + GEM_SIZE/2,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 40 + Math.random() * 20,
              maxLife: 60,
              color: color,
              size: 3 + Math.random() * 4
          });
      }
  }

  public addFloatingText(x: number, y: number, text: string) {
      this.engine.floatingTexts.push({
          id: Math.random(),
          x, y, text,
          life: 60,
          color: '#ffffff',
          scale: 0.5
      });
  }
}
