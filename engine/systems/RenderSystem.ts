
import { GameEngine } from '../GameEngine';
import { GEM_SIZE, GRID_COLS, GRID_ROWS, COLORS, EMOJIS } from '../../constants';
import { SpecialType } from '../../types';

export class RenderSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  public draw(ctx: CanvasRenderingContext2D) {

    ctx.clearRect(0, 0, this.engine.width, this.engine.height);

    const gridW = GRID_COLS * GEM_SIZE;
    const gridH = GRID_ROWS * GEM_SIZE;

    ctx.save();
    
    // Apply Global Screen Shake
    if (this.engine.shakeAmount > 0) {
        const sx = (Math.random() - 0.5) * this.engine.shakeAmount;
        const sy = (Math.random() - 0.5) * this.engine.shakeAmount;
        ctx.translate(sx, sy);
    }

    // Apply Game Board Scaling and Centering
    ctx.translate(this.engine.renderOffsetX, this.engine.renderOffsetY);
    ctx.scale(this.engine.renderScale, this.engine.renderScale);

    // Draw Grid Background
    const padding = 2;
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            ctx.fillStyle = '#1e293b'; // Slate-800
            this.roundRect(
                ctx, 
                x * GEM_SIZE + padding, 
                y * GEM_SIZE + padding, 
                GEM_SIZE - padding * 2, 
                GEM_SIZE - padding * 2, 
                10
            );
            ctx.fill();
        }
    }

    // Draw Gems
    this.engine.gems.forEach(gem => {
        if (gem.opacity <= 0.01) return;
        
        ctx.save();
        const cx = gem.visualX + GEM_SIZE / 2;
        const cy = gem.visualY + GEM_SIZE / 2;
        
        ctx.translate(cx, cy);
        ctx.scale(gem.scale, gem.scale);
        ctx.globalAlpha = gem.opacity;

        // Draw Gem Background (Rounded Tile)
        // Reduced tilePadding from 4 to 2 to make gems appear larger
        const tilePadding = 2;
        const tileSize = GEM_SIZE - tilePadding * 2;
        
        // Background Glow/Fill
        ctx.fillStyle = COLORS[gem.type] + '80'; // Increased opacity to 50%
        if (gem.special !== SpecialType.NONE) {
             ctx.shadowBlur = 15;
             ctx.shadowColor = COLORS[gem.type];
             ctx.fillStyle = COLORS[gem.type] + 'C0'; // More opacity for specials (75%)
        } else if (gem.id === this.engine.selectedGemId) {
             ctx.shadowBlur = 20;
             ctx.shadowColor = '#ffffff';
             ctx.fillStyle = COLORS[gem.type] + 'A0';
        }

        // Draw Rounded Background
        this.roundRect(ctx, -tileSize/2, -tileSize/2, tileSize, tileSize, 12);
        ctx.fill();

        // Draw Border
        ctx.strokeStyle = COLORS[gem.type];
        ctx.lineWidth = 2;
        if (gem.special !== SpecialType.NONE) ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Emoji
        ctx.shadowBlur = 0; // Reset shadow for text to be crisp
        // Increased font size slightly relative to GEM_SIZE
        ctx.font = `${GEM_SIZE * 0.70}px "Segoe UI Emoji", "Apple Color Emoji", Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let char = EMOJIS[gem.type];
        // Overlays for specials
        let overlayChar = '';
        if (gem.special === SpecialType.ROW_BLAST) overlayChar = '↔️';
        if (gem.special === SpecialType.COL_BLAST) overlayChar = '↕️';
        if (gem.special === SpecialType.AREA_BLAST) overlayChar = '💣';
        if (gem.special === SpecialType.RAINBOW) char = '🌈';

        // Draw Main Icon
        // For bombs, show a bomb emoji instead of the gem emoji
        if (gem.special === SpecialType.AREA_BLAST) {
            ctx.fillText('💣', 0, 4);
        } else {
            ctx.fillText(char, 0, 4);
        }
        
        // Draw Overlay Icon for Specials (except Rainbow and Bomb which have their own icons)
        if (overlayChar && gem.special !== SpecialType.RAINBOW && gem.special !== SpecialType.AREA_BLAST) {
            ctx.font = `${GEM_SIZE * 0.45}px Arial`; // Increased overlay size
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(overlayChar, 0, 0);
        }

        ctx.restore();
    });

    // Draw Particles
    this.engine.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Floating Text (Rendered last to be on top)
    this.engine.floatingTexts.forEach(t => {
        ctx.save();
        
        // Move to position (coordinates are relative to the grid)
        const cx = t.x + GEM_SIZE / 2; // Center horizontally on the gem
        const cy = t.y + GEM_SIZE / 2;
        
        ctx.translate(cx, cy);
        
        // Pop-in animation scale
        let currentScale = t.scale;
        if (t.life > t.maxLife - 10) {
            currentScale *= (t.maxLife - t.life) / 10;
        }
        
        ctx.scale(currentScale, currentScale);
        
        // Fade out
        const alpha = Math.min(1, t.life / 20);
        ctx.globalAlpha = alpha;

        // Settings based on Style
        ctx.fillStyle = t.color;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'black';
        ctx.lineJoin = 'round';
        
        // Font
        let fontSize = 36;
        if (t.style === 'CRITICAL') fontSize = 52;
        else if (t.style === 'COMBO') fontSize = 42;
        
        ctx.font = `900 ${fontSize}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Stroke then Fill
        ctx.strokeText(t.text, 0, 0);
        ctx.fillText(t.text, 0, 0);
        
        ctx.restore();
    });

    ctx.restore();
  }
}
