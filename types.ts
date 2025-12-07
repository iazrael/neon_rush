
export enum GemType {
  RED = 0,    // Bear
  ORANGE = 1, // Fox
  YELLOW = 2, // Cat
  GREEN = 3,  // Frog
  BLUE = 4,   // Whale
  PURPLE = 5, // Octopus
  WHITE = 6,  // Used for Rainbow
  EMPTY = -1
}

export enum SpecialType {
  NONE = 'NONE',
  ROW_BLAST = 'ROW_BLAST',
  COL_BLAST = 'COL_BLAST',
  AREA_BLAST = 'AREA_BLAST', // Bomb
  RAINBOW = 'RAINBOW'
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE'
}

export interface Position {
  x: number;
  y: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface GemComponent {
  id: number;
  gridX: number;
  gridY: number;
  visualX: number; // For smooth animation
  visualY: number;
  type: GemType;
  special: SpecialType;
  scale: number;
  opacity: number;
  isMatched: boolean;
  velocity: number;
  shakeOffset: Vector2;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type FloatingTextStyle = 'NORMAL' | 'COMBO' | 'CRITICAL';

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
  velocity: Vector2;
  style: FloatingTextStyle;
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  moves: number;
  gemTypes: number; // Difficulty: number of colors
}
