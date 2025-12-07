
import { GameEngine } from '../GameEngine';
import { GemType, Particle, FloatingTextStyle } from '../../types';
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
        
        // Physics - Simple upward float
        t.x += t.velocity.x;
        t.y += t.velocity.y;
        // Removed gravity (t.velocity.y += ...) for a clean float up
        
        t.life--;
        
        // Scale animation (pop in then slowly grow)
        if (t.life > t.maxLife - 10) {
            // Pop in logic handled in RenderSystem or implicit by initial scale
        }
        
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

  public addFloatingText(x: number, y: number, text: string, style: FloatingTextStyle = 'NORMAL') {
      let color = '#ffffff'; // White default
      let targetScale = 1.0;
      let life = 60;
      let vy = -1.0; // Gentle upward float default

      if (style === 'COMBO') {
          color = '#fbbf24'; // Amber-400
          targetScale = 1.3;
          vy = -1.5;
      } else if (style === 'CRITICAL') {
          color = '#a855f7'; // Purple-500
          targetScale = 1.6;
          vy = -2.0;
          life = 80;
      }

      this.engine.floatingTexts.push({
          id: Math.random(),
          x, 
          y, 
          text,
          life,
          maxLife: life,
          color,
          scale: targetScale,
          // Minimal horizontal drift, steady upward movement
          velocity: { x: (Math.random() - 0.5) * 0.5, y: vy },
          style
      });
  }
}
