import { GemComponent, Particle, FloatingText, SpecialType } from '../types';
import { GRID_ROWS, GRID_COLS, GEM_SIZE, ANIMATION_SPEED } from '../constants';
import { MatchSystem } from './systems/MatchSystem';
import { InputSystem } from './systems/InputSystem';
import { RenderSystem } from './systems/RenderSystem';
import { EffectSystem } from './systems/EffectSystem';

export class GameEngine {
  // --- STATE (Public for Systems) ---
  public gems: Map<number, GemComponent> = new Map();
  public grid: number[][] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  
  public width: number = 0;
  public height: number = 0;
  public ctx: CanvasRenderingContext2D | null = null;
  public nextId: number = 1;
  
  public renderScale: number = 1;
  public renderOffsetX: number = 0;
  public renderOffsetY: number = 0;

  // Logic State
  public isProcessing: boolean = false;
  public selectedGemId: number | null = null;
  public score: number = 0;
  public combo: number = 0;
  public comboTimer: number = 0;
  public movesLeft: number = 0;
  public level: number = 1;
  
  public shakeAmount: number = 0;

  // --- SYSTEMS ---
  public matchSystem: MatchSystem;
  public inputSystem: InputSystem;
  public renderSystem: RenderSystem;
  public effectSystem: EffectSystem;

  // --- EVENTS ---
  public onScoreUpdate: ((score: number, moves: number, combo: number, comboTimer: number) => void) | null = null;
  public onGameEvent: ((event: 'win' | 'lose' | 'reshuffle') => void) | null = null;

  constructor() {
    // Initialize Systems
    this.matchSystem = new MatchSystem(this);
    this.inputSystem = new InputSystem(this);
    this.renderSystem = new RenderSystem(this);
    this.effectSystem = new EffectSystem(this);

    this.matchSystem.initializeGrid();
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;

    const gridW = GRID_COLS * GEM_SIZE;
    const gridH = GRID_ROWS * GEM_SIZE;
    const paddingX = 20;
    const paddingY = 40; 
    
    const availableW = width - paddingX;
    const availableH = height - paddingY;
    
    this.renderScale = Math.min(availableW / gridW, availableH / gridH);
    this.renderOffsetX = (width - gridW * this.renderScale) / 2;
    this.renderOffsetY = (height - gridH * this.renderScale) / 2;
  }

  public startLevel(levelConfig: any) {
    this.matchSystem.startLevel(levelConfig);
  }

  public handleInput(x: number, y: number, type: 'start' | 'move' | 'end') {
    this.inputSystem.handleInput(x, y, type);
  }

  public update(deltaTime: number) {
    // 1. Update Combo Timer
    if (this.combo > 0) {
        this.comboTimer -= 1;
        if (this.comboTimer <= 0) {
            this.combo = 0;
        }
    }

    // 2. Screen Shake Decay
    if (this.shakeAmount > 0) {
        this.shakeAmount *= 0.9;
        if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    }

    // 3. Update Gems (Lerp Animation) - Kept simple in Engine or move to PhysicsSystem
    this.gems.forEach(gem => {
      const targetX = gem.gridX * GEM_SIZE;
      const targetY = gem.gridY * GEM_SIZE;
      
      gem.visualX += (targetX - gem.visualX) * (ANIMATION_SPEED * deltaTime);
      gem.visualY += (targetY - gem.visualY) * (ANIMATION_SPEED * deltaTime);
      
      const targetScale = gem.isMatched ? 0 : 1;
      const targetOpacity = gem.isMatched ? 0 : 1;
      
      gem.scale += (targetScale - gem.scale) * (10 * deltaTime);
      gem.opacity += (targetOpacity - gem.opacity) * (10 * deltaTime);

      if (gem.special !== SpecialType.NONE && !gem.isMatched) {
          gem.scale = 1 + Math.sin(Date.now() / 200) * 0.1;
      }
    });

    // 4. Update Effects
    this.effectSystem.update(deltaTime);

    // 5. Notify UI
    if (this.onScoreUpdate) {
        this.onScoreUpdate(this.score, this.movesLeft, this.combo, this.comboTimer);
    }
  }

  public draw() {
    this.renderSystem.draw();
  }
}
