import { GameEngine } from '../GameEngine';
import { GEM_SIZE, GRID_COLS, GRID_ROWS } from '../../constants';
import { audioService } from '../../services/audioService2';
import { SpecialType } from '../../types';

export class InputSystem {
  private engine: GameEngine;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartTime: number = 0;
  private isDragging: boolean = false;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public handleInput(x: number, y: number, type: 'start' | 'move' | 'end') {
    if (this.engine.isProcessing || this.engine.movesLeft <= 0) return;

    // Unproject coordinates using current scale and offset
    const localX = (x - this.engine.renderOffsetX) / this.engine.renderScale;
    const localY = (y - this.engine.renderOffsetY) / this.engine.renderScale;

    const gx = Math.floor(localX / GEM_SIZE);
    const gy = Math.floor(localY / GEM_SIZE);

    const isInside = gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;

    if (type === 'start') {
        if (isInside) {
            const gemId = this.engine.grid[gy][gx];
            this.engine.selectedGemId = gemId;
            // Record start position for Swipe detection
            this.dragStartX = x; 
            this.dragStartY = y;
            this.dragStartTime = Date.now();
            this.isDragging = true;
            audioService.playSelect();
        } else {
            this.engine.selectedGemId = null;
        }
    } else if (type === 'move') {
        if (this.isDragging && this.engine.selectedGemId !== null) {
            const dx = x - this.dragStartX;
            const dy = y - this.dragStartY;
            const distSq = dx*dx + dy*dy;
            // Threshold for swipe (scaled approx 30px)
            const threshold = 30 * 30; 

            if (distSq > threshold) {
                // Determine swipe direction
                const gem = this.engine.gems.get(this.engine.selectedGemId);
                if (gem) {
                     let targetGx = gem.gridX;
                     let targetGy = gem.gridY;
                     
                     if (Math.abs(dx) > Math.abs(dy)) {
                         // Horizontal
                         targetGx += dx > 0 ? 1 : -1;
                     } else {
                         // Vertical
                         targetGy += dy > 0 ? 1 : -1;
                     }
                     
                     // Check bounds and Trigger Swap
                     if (targetGx >= 0 && targetGx < GRID_COLS && targetGy >= 0 && targetGy < GRID_ROWS) {
                         const targetId = this.engine.grid[targetGy][targetGx];
                         const targetGem = this.engine.gems.get(targetId);
                         if (targetGem) {
                             this.engine.matchSystem.attemptSwap(gem, targetGem);
                         }
                     }
                }
                // Stop dragging after swipe triggers to prevent double moves
                this.isDragging = false; 
                this.engine.selectedGemId = null;
            }
        }
    } else if (type === 'end') {
      // Check for Tap (Manual Activation of Special Gems)
      if (this.isDragging && this.engine.selectedGemId !== null) {
          const duration = Date.now() - this.dragStartTime;
          // Short duration and didn't move far enough to trigger swipe
          if (duration < 500) {
              const gem = this.engine.gems.get(this.engine.selectedGemId);
              if (gem && gem.special !== SpecialType.NONE) {
                  // Manual Activation
                  this.engine.movesLeft--;
                  this.engine.isProcessing = true;
                  // Trigger pipeline as if it was a match of 1
                  this.engine.matchSystem.processMatches([gem.id]);
              }
          }
      }

      this.isDragging = false;
      this.engine.selectedGemId = null;
    }
  }
}
