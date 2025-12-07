import { GemType } from './types';

export const GRID_ROWS = 8;
export const GRID_COLS = 8;
export const GEM_SIZE = 64; // Base logical size, will scale with canvas
export const ANIMATION_SPEED = 15; // Higher is faster (lerp factor)
export const GRAVITY = 1.5;
export const SWAP_SPEED = 0.2;

export const COLORS: Record<GemType, string> = {
  [GemType.RED]: '#ef4444',
  [GemType.ORANGE]: '#f97316',
  [GemType.YELLOW]: '#eab308',
  [GemType.GREEN]: '#22c55e',
  [GemType.BLUE]: '#3b82f6',
  [GemType.PURPLE]: '#a855f7',
  [GemType.WHITE]: '#ffffff',
  [GemType.EMPTY]: '#000000'
};

// 3D Style Emojis
export const EMOJIS: Record<GemType, string> = {
  [GemType.RED]: '🐻',
  [GemType.ORANGE]: '🦊',
  [GemType.YELLOW]: '🐱',
  [GemType.GREEN]: '🐸',
  [GemType.BLUE]: '🐳',
  [GemType.PURPLE]: '🐙',
  [GemType.WHITE]: '💎',
  [GemType.EMPTY]: ''
};

export const LEVELS = [
  { level: 1, targetScore: 1000, moves: 20, gemTypes: 4 },
  { level: 2, targetScore: 2500, moves: 25, gemTypes: 5 },
  { level: 3, targetScore: 5000, moves: 30, gemTypes: 6 },
  { level: 4, targetScore: 8000, moves: 35, gemTypes: 6 },
  { level: 5, targetScore: 12000, moves: 40, gemTypes: 6 },
];

export const COMBO_TIME_LIMIT = 180; // Frames (approx 3 seconds at 60fps)
