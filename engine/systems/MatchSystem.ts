import { GameEngine } from '../GameEngine';
import { GemComponent, GemType, SpecialType } from '../../types';
import { GRID_ROWS, GRID_COLS, GEM_SIZE, COMBO_TIME_LIMIT, LEVELS } from '../../constants';
import { audioService } from '../../services/audioService2';

export class MatchSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  private delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  public initializeGrid() {
    this.engine.grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
  }

  public startLevel(levelConfig: any) {
    this.engine.level = levelConfig.level;
    this.engine.movesLeft = levelConfig.moves;
    this.engine.score = 0;
    this.engine.combo = 0;
    this.engine.comboTimer = 0;
    this.engine.gems.clear();
    this.engine.particles = [];
    this.engine.floatingTexts = [];
    this.initializeGrid();
    this.engine.isProcessing = true; 

    // Initial Fill
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        this.spawnGem(x, y, levelConfig.gemTypes, true);
      }
    }
    
    this.resolveInitialBoard(levelConfig.gemTypes);
    
    this.engine.isProcessing = false;
  }

  public spawnGem(x: number, y: number, types: number, instant: boolean = false) {
    const id = this.engine.nextId++;
    const type = Math.floor(Math.random() * types) as GemType;
    
    const gem: GemComponent = {
      id,
      gridX: x,
      gridY: y,
      visualX: x * GEM_SIZE,
      visualY: instant ? y * GEM_SIZE : -GEM_SIZE * 2, // Start above screen
      type,
      special: SpecialType.NONE,
      scale: instant ? 1 : 0,
      opacity: instant ? 1 : 0,
      isMatched: false,
      velocity: 0,
      shakeOffset: { x: 0, y: 0 }
    };
    
    this.engine.gems.set(id, gem);
    this.engine.grid[y][x] = id;
    return gem;
  }

  public async attemptSwap(gemA: GemComponent, gemB: GemComponent) {
    this.engine.isProcessing = true;
    audioService.playSwap();

    // Swap Grid positions
    const ax = gemA.gridX;
    const ay = gemA.gridY;
    const bx = gemB.gridX;
    const by = gemB.gridY;

    this.engine.grid[ay][ax] = gemB.id;
    this.engine.grid[by][bx] = gemA.id;
    gemA.gridX = bx; gemA.gridY = by;
    gemB.gridX = ax; gemB.gridY = ay;

    // Wait for visual swap
    await this.delay(200);

    // Check Matches
    const matches = this.findMatches();
    
    // Check Special Combos
    const specialCombo = this.checkSpecialCombo(gemA, gemB);

    if (matches.length > 0 || specialCombo) {
      this.engine.movesLeft--;
      if (specialCombo) {
          await this.executeSpecialCombo(gemA, gemB);
      }
      this.processMatches(matches);
    } else {
      // Swap Back
      audioService.playInvalid();
      this.engine.grid[ay][ax] = gemA.id;
      this.engine.grid[by][bx] = gemB.id;
      gemA.gridX = ax; gemA.gridY = ay;
      gemB.gridX = bx; gemB.gridY = by;
      this.engine.isProcessing = false;
    }
  }

  private checkSpecialCombo(a: GemComponent, b: GemComponent): boolean {
    if (a.special !== SpecialType.NONE && b.special !== SpecialType.NONE) return true;
    if (a.special === SpecialType.RAINBOW || b.special === SpecialType.RAINBOW) return true;
    return false;
  }

  private async executeSpecialCombo(a: GemComponent, b: GemComponent) {
     this.triggerSpecial(a);
     this.triggerSpecial(b);
  }

  public findMatches(): number[] {
    const matchedSet = new Set<number>();

    // Horizontal
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS - 2; x++) {
        const id1 = this.engine.grid[y][x];
        const id2 = this.engine.grid[y][x+1];
        const id3 = this.engine.grid[y][x+2];
        const g1 = this.engine.gems.get(id1);
        const g2 = this.engine.gems.get(id2);
        const g3 = this.engine.gems.get(id3);

        if (g1 && g2 && g3 && g1.type === g2.type && g1.type === g3.type && g1.type !== GemType.EMPTY) {
            matchedSet.add(id1); matchedSet.add(id2); matchedSet.add(id3);
            let k = x + 3;
            while (k < GRID_COLS) {
                const idNext = this.engine.grid[y][k];
                const gNext = this.engine.gems.get(idNext);
                if (gNext && gNext.type === g1.type) {
                    matchedSet.add(idNext);
                    k++;
                } else break;
            }
        }
      }
    }

    // Vertical
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS - 2; y++) {
        const id1 = this.engine.grid[y][x];
        const id2 = this.engine.grid[y+1][x];
        const id3 = this.engine.grid[y+2][x];
        const g1 = this.engine.gems.get(id1);
        const g2 = this.engine.gems.get(id2);
        const g3 = this.engine.gems.get(id3);

        if (g1 && g2 && g3 && g1.type === g2.type && g1.type === g3.type && g1.type !== GemType.EMPTY) {
            matchedSet.add(id1); matchedSet.add(id2); matchedSet.add(id3);
            let k = y + 3;
            while (k < GRID_ROWS) {
                const idNext = this.engine.grid[k][x];
                const gNext = this.engine.gems.get(idNext);
                if (gNext && gNext.type === g1.type) {
                    matchedSet.add(idNext);
                    k++;
                } else break;
            }
        }
      }
    }

    return Array.from(matchedSet);
  }

  public async processMatches(matches: number[]) {
    // 1. Combo logic
    this.engine.combo++;
    this.engine.comboTimer = COMBO_TIME_LIMIT;
    const multiplier = 1 + (this.engine.combo * 0.1);
    
    // 2. Detect creation of Special Gems
    const gemsToCreate: {x: number, y: number, type: GemType, special: SpecialType}[] = [];
    
    if (matches.length >= 4) {
        // Find center of match (approximation)
        const firstGem = this.engine.gems.get(matches[0]);
        if (firstGem) {
            let special = matches.length >= 5 ? SpecialType.AREA_BLAST : SpecialType.ROW_BLAST;
             if (Math.random() > 0.5) special = SpecialType.COL_BLAST;
             if (matches.length >= 5 && Math.random() > 0.8) special = SpecialType.RAINBOW;

             gemsToCreate.push({
                 x: firstGem.gridX,
                 y: firstGem.gridY,
                 type: special === SpecialType.RAINBOW ? GemType.WHITE : firstGem.type,
                 special: special
             });
        }
    }

    // 3. Mark matched
    matches.forEach(id => {
        const g = this.engine.gems.get(id);
        if (g) {
            g.isMatched = true;
            this.triggerSpecial(g); // If the matched gem was already special, trigger it
            this.engine.effectSystem.spawnParticles(g.visualX, g.visualY, g.type);
            this.engine.effectSystem.addFloatingText(g.visualX, g.visualY, `+${Math.floor(10 * multiplier)}`);
        }
    });

    this.engine.shakeAmount = 5 + (this.engine.combo * 2);
    this.engine.score += Math.floor(matches.length * 10 * multiplier);
    audioService.playMatch(this.engine.combo);

    await this.delay(300); // Wait for pop animation

    // 4. Remove
    this.removeGems();

    // 5. Create Specials
    gemsToCreate.forEach(info => {
        // Hijack the slot
        const id = this.engine.nextId++;
        const gem: GemComponent = {
            id,
            gridX: info.x,
            gridY: info.y,
            visualX: info.x * GEM_SIZE,
            visualY: info.y * GEM_SIZE,
            type: info.type,
            special: info.special,
            scale: 0, // Zoom in
            opacity: 1,
            isMatched: false,
            velocity: 0,
            shakeOffset: { x: 0, y: 0 }
        };
        this.engine.gems.set(id, gem);
        this.engine.grid[info.y][info.x] = id;
    });

    // 6. Gravity & Refill
    await this.applyGravity();
    
    // 7. Check for cascading matches
    const newMatches = this.findMatches();
    if (newMatches.length > 0) {
        await this.delay(200);
        await this.processMatches(newMatches);
    } else {
        this.engine.isProcessing = false;
        
        // Check win/loss
        if (this.engine.movesLeft === 0 && this.engine.score < LEVELS[this.engine.level-1].targetScore) {
             if (this.engine.onGameEvent) this.engine.onGameEvent('lose');
        } else if (this.engine.score >= LEVELS[this.engine.level-1].targetScore) {
             if (this.engine.onGameEvent) {
                 audioService.playWin();
                 this.engine.onGameEvent('win');
             }
        } else {
            // Check possible moves
            if (!this.hasPossibleMoves()) {
                this.reshuffle();
            }
        }
    }
  }

  private triggerSpecial(gem: GemComponent) {
      if (gem.special === SpecialType.NONE) return;
      audioService.playExplosion();
      
      const targets: number[] = [];
      
      if (gem.special === SpecialType.ROW_BLAST) {
          for (let x=0; x<GRID_COLS; x++) targets.push(this.engine.grid[gem.gridY][x]);
      } else if (gem.special === SpecialType.COL_BLAST) {
          for (let y=0; y<GRID_ROWS; y++) targets.push(this.engine.grid[y][gem.gridX]);
      } else if (gem.special === SpecialType.AREA_BLAST) {
          for (let y = gem.gridY-1; y <= gem.gridY+1; y++) {
              for (let x = gem.gridX-1; x <= gem.gridX+1; x++) {
                  if (y>=0 && y<GRID_ROWS && x>=0 && x<GRID_COLS) targets.push(this.engine.grid[y][x]);
              }
          }
      } else if (gem.special === SpecialType.RAINBOW) {
          // Find a random color to destroy
          const targetType = Math.floor(Math.random() * 5); 
          this.engine.gems.forEach(g => {
              if (g.type === targetType) targets.push(g.id);
          });
      }

      targets.forEach(id => {
          const g = this.engine.gems.get(id);
          if (g && !g.isMatched) {
              g.isMatched = true;
              this.engine.effectSystem.spawnParticles(g.visualX, g.visualY, g.type);
              this.triggerSpecial(g); // Chain reaction
          }
      });
  }

  private removeGems() {
    this.engine.gems.forEach((gem, id) => {
        if (gem.isMatched) {
            this.engine.grid[gem.gridY][gem.gridX] = 0; // Clear grid slot
            this.engine.gems.delete(id);
        }
    });
  }

  private async applyGravity() {
    let moved = true;
    while (moved) {
        moved = false;
        for (let x = 0; x < GRID_COLS; x++) {
            for (let y = GRID_ROWS - 1; y > 0; y--) {
                if (this.engine.grid[y][x] === 0 && this.engine.grid[y-1][x] !== 0) {
                    // Move down
                    const id = this.engine.grid[y-1][x];
                    this.engine.grid[y][x] = id;
                    this.engine.grid[y-1][x] = 0;
                    const gem = this.engine.gems.get(id);
                    if (gem) {
                        gem.gridY = y;
                        gem.velocity = 0;
                    }
                    moved = true;
                }
            }
        }
        
        // Spawn new
        for (let x = 0; x < GRID_COLS; x++) {
            if (this.engine.grid[0][x] === 0) {
                const types = LEVELS[this.engine.level-1]?.gemTypes || 4;
                this.spawnGem(x, 0, types, false);
                moved = true;
            }
        }
        await this.delay(50);
    }
    await this.delay(400); 
  }

  private hasPossibleMoves(): boolean {
      return true; // Simplification
  }

  private reshuffle() {
      if (this.engine.onGameEvent) this.engine.onGameEvent('reshuffle');
      this.engine.isProcessing = true;
      const allGems: GemComponent[] = [];
      this.engine.gems.forEach(g => allGems.push(g));
      
      // Shuffle positions
      for (let i = allGems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tempX = allGems[i].gridX;
          const tempY = allGems[i].gridY;
          allGems[i].gridX = allGems[j].gridX;
          allGems[i].gridY = allGems[j].gridY;
          allGems[j].gridX = tempX;
          allGems[j].gridY = tempY;
      }

      // Update grid
      this.engine.grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
      allGems.forEach(g => {
          this.engine.grid[g.gridY][g.gridX] = g.id;
          g.visualY = -500;
      });
      
      setTimeout(() => { this.engine.isProcessing = false; }, 1000);
  }

  private resolveInitialBoard(types: number) {
      let matches = this.findMatches();
      let attempts = 0;
      while (matches.length > 0 && attempts < 10) {
          matches.forEach(id => {
              const gem = this.engine.gems.get(id);
              if (gem) gem.type = Math.floor(Math.random() * types) as GemType;
          });
          matches = this.findMatches();
          attempts++;
      }
  }
}
