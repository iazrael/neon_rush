import { GameEngine } from '../GameEngine';
import { GEM_SIZE, GRID_COLS, GRID_ROWS, COLORS, EMOJIS } from '../../constants';
import { SpecialType } from '../../types';

export class RenderSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public draw() {
    if (!this.engine.ctx) return;

    this.engine.ctx.clearRect(0, 0, this.engine.width, this.engine.height);

    const gridW = GRID_COLS * GEM_SIZE;
    const gridH = GRID_ROWS * GEM_SIZE;

    this.engine.ctx.save();
    
    // Apply Global Screen Shake
    if (this.engine.shakeAmount > 0) {
        const sx = (Math.random() - 0.5) * this.engine.shakeAmount;
        const sy = (Math.random() - 0.5) * this.engine.shakeAmount;
        this.engine.ctx.translate(sx, sy);
    }

    // Apply Game Board Scaling and Centering
    this.engine.ctx.translate(this.engine.renderOffsetX, this.engine.renderOffsetY);
    this.engine.ctx.scale(this.engine.renderScale, this.engine.renderScale);

    // Draw Grid Background
    this.engine.ctx.strokeStyle = '#334155';
    this.engine.ctx.lineWidth = 1;
    this.engine.ctx.beginPath();
    for (let i = 0; i <= GRID_ROWS; i++) {
        this.engine.ctx.moveTo(0, i * GEM_SIZE);
        this.engine.ctx.lineTo(gridW, i * GEM_SIZE);
    }
    for (let i = 0; i <= GRID_COLS; i++) {
        this.engine.ctx.moveTo(i * GEM_SIZE, 0);
        this.engine.ctx.lineTo(i * GEM_SIZE, gridH);
    }
    this.engine.ctx.stroke();

    // Draw Gems
    this.engine.gems.forEach(gem => {
        if (gem.opacity <= 0.01) return;
        
        const ctx = this.engine.ctx!;
        ctx.save();
        const cx = gem.visualX + GEM_SIZE / 2;
        const cy = gem.visualY + GEM_SIZE / 2;
        
        ctx.translate(cx, cy);
        ctx.scale(gem.scale, gem.scale);
        ctx.globalAlpha = gem.opacity;

        // Draw Glow for Special
        if (gem.special !== SpecialType.NONE) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = COLORS[gem.type];
        } else if (gem.id === this.engine.selectedGemId) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
        }

        // Draw Emoji
        ctx.font = `${GEM_SIZE * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let char = EMOJIS[gem.type];
        if (gem.special === SpecialType.ROW_BLAST) char = '↔️';
        if (gem.special === SpecialType.COL_BLAST) char = '↕️';
        if (gem.special === SpecialType.AREA_BLAST) char = '💣';
        if (gem.special === SpecialType.RAINBOW) char = '🌈';

        if (gem.special !== SpecialType.RAINBOW && gem.special !== SpecialType.AREA_BLAST) {
             ctx.fillText(EMOJIS[gem.type], 0, 0);
        }
        
        if (gem.special !== SpecialType.NONE) {
             ctx.font = `${GEM_SIZE * 0.4}px Arial`;
             ctx.fillText(char, 0, 0);
        }

        ctx.restore();
    });

    // Draw Particles
    this.engine.particles.forEach(p => {
        const ctx = this.engine.ctx!;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Floating Text
    this.engine.floatingTexts.forEach(t => {
        const ctx = this.engine.ctx!;
        ctx.save();
        ctx.translate(t.x + GEM_SIZE/2, t.y);
        ctx.scale(t.scale, t.scale); // Text is also scaled by renderScale
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
    });

    this.engine.ctx.restore();
  }
}
