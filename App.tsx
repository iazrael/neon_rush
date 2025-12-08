
import React, { useState, useRef, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameEngine } from './engine/GameEngine';
import { GameState, GemType } from './types';
import { LEVELS, COMBO_TIME_LIMIT, EMOJIS } from './constants';
import { audioService } from './services/AudioService';

// Icons
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const ExitIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);

type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

const App: React.FC = () => {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  
  // Game State
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(1000);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  
  // Menu States
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [showInstructions, setShowInstructions] = useState(false);

  // Inventory States
  const [items, setItems] = useState({ bombs: 3, reshuffles: 3 });
  const [interactionMode, setInteractionMode] = useState<'NORMAL' | 'ITEM_BOMB'>('NORMAL');

  // Audio Auto-Resume
  const resumeAudio = useCallback(() => {
      audioService.resume();
  }, []);

  // Bind Engine Callbacks
  useEffect(() => {
    const engine = engineRef.current;
    
    engine.onScoreUpdate = (s, t, m, c, ct, i) => {
      setScore(s);
      setTargetScore(t);
      setMoves(m);
      setCombo(c);
      setComboTimer(ct);
      setItems(i);
      setInteractionMode(engine.interactionMode);
    };

    engine.onGameEvent = (event) => {
      if (event === 'win') {
        setMessage('Level Complete!');
        setGameState(GameState.LEVEL_COMPLETE);
      } else if (event === 'lose') {
        setMessage('No Moves Left!');
        setGameState(GameState.GAME_OVER);
      } else if (event === 'reshuffle') {
          setMessage('Reshuffling...');
          setTimeout(() => setMessage(null), 2000);
      } else if (event === 'multi_match') {
          // Additional effects
      }
    };
  }, []);

  const playUiSound = () => {
    audioService.init(); 
    audioService.playUiClick();
  };

  const getDifficultyConfig = useCallback((baseConfig: typeof LEVELS[0]) => {
      let moveMult = 1;
      let scoreMult = 1;

      if (difficulty === 'EASY') {
          moveMult = 1.5;
          scoreMult = 0.8;
      } else if (difficulty === 'HARD') {
          moveMult = 0.8;
          scoreMult = 1.2;
      }

      return {
          ...baseConfig,
          moves: Math.floor(baseConfig.moves * moveMult),
          targetScore: Math.floor(baseConfig.targetScore * scoreMult)
      };
  }, [difficulty]);

  const startGame = useCallback(() => {
    const config = getDifficultyConfig(LEVELS[currentLevelIdx]);
    engineRef.current.startLevel(config);
    setScore(0);
    setTargetScore(config.targetScore);
    setMoves(config.moves);
    setItems({ bombs: 3, reshuffles: 3 });
    setGameState(GameState.PLAYING);
    setMessage(null);
  }, [currentLevelIdx, getDifficultyConfig]);

  const quitGame = () => {
      playUiSound();
      setGameState(GameState.MENU);
  };

  const nextLevel = () => {
      if (currentLevelIdx < LEVELS.length - 1) {
          setCurrentLevelIdx(prev => prev + 1);
          const nextIdx = currentLevelIdx + 1;
          const config = getDifficultyConfig(LEVELS[nextIdx]);
          engineRef.current.startLevel(config);
          setScore(0);
          setTargetScore(config.targetScore);
          setMoves(config.moves);
          setItems({ bombs: 3, reshuffles: 3 });
          setGameState(GameState.PLAYING);
          setMessage(null);
      } else {
          setMessage("You Finished All Levels!");
          setGameState(GameState.MENU);
          setCurrentLevelIdx(0);
      }
  };

  const restartLevel = () => {
      startGame();
  };

  // --- ITEM HANDLERS ---
  const toggleBombMode = () => {
      playUiSound();
      if (interactionMode === 'ITEM_BOMB') {
          engineRef.current.setInteractionMode('NORMAL');
      } else {
          engineRef.current.setInteractionMode('ITEM_BOMB');
          setMessage("Tap a Gem to Explode!");
          setTimeout(() => setMessage(null), 3000);
      }
  };

  const useReshuffle = () => {
      playUiSound();
      if (items.reshuffles > 0) {
          engineRef.current.useReshuffleItem();
      }
  };

  // --- HUD Calculations ---
  const scoreProgress = Math.min(100, (score / targetScore) * 100);
  const progressBarColor = scoreProgress < 30 ? 'bg-red-500' : scoreProgress < 70 ? 'bg-yellow-500' : 'bg-emerald-400';

  return (
    <div 
        className="w-full h-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans select-none"
        onClick={resumeAudio} 
        onTouchStart={resumeAudio}
    >
      
      {/* HUD Container - Modern App Style */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 w-full z-20 px-3 py-3 pointer-events-none flex flex-col gap-2">
            
            {/* Top Row: Pause | Level Info | Progress | Moves */}
            <div className="flex items-center gap-3 w-full max-w-lg mx-auto">
                {/* Pause/Exit Button */}
                <button 
                    onClick={quitGame}
                    className="pointer-events-auto w-10 h-10 rounded-xl bg-slate-800/80 backdrop-blur border border-white/10 flex items-center justify-center text-slate-300 active:scale-95 transition-transform"
                >
                    <PauseIcon />
                </button>

                {/* Main HUD Capsule */}
                <div className="flex-1 h-12 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg flex items-center px-4 relative overflow-hidden">
                    
                    {/* Level Badge */}
                    <div className="flex flex-col items-center mr-4 pr-4 border-r border-white/10">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Level</span>
                        <span className="text-lg font-black text-white leading-none">{LEVELS[currentLevelIdx].level}</span>
                    </div>

                    {/* Progress Bar Area */}
                    <div className="flex-1 flex flex-col justify-center gap-1">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                            <span className="text-[10px] font-mono text-slate-400">
                                <span className="text-white font-bold">{score}</span> / {targetScore}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className={`h-full ${progressBarColor} shadow-[0_0_10px_currentColor] transition-all duration-500 ease-out relative`}
                                style={{ width: `${scoreProgress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Moves Capsule */}
                <div className={`w-14 h-12 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg flex flex-col items-center justify-center ${moves < 5 ? 'border-red-500/50 bg-red-900/20' : ''}`}>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Moves</span>
                    <span className={`text-xl font-black font-mono leading-none ${moves < 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {moves}
                    </span>
                </div>
            </div>

            {/* Sub Row: Combo Bar (Appears when active) */}
            <div className="h-6 w-full flex justify-center items-center overflow-visible">
                {combo > 1 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        <span className="text-yellow-400 font-black italic text-lg tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce">
                            {combo}x COMBO
                        </span>
                        {/* Countdown Timer for Combo */}
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden ring-1 ring-white/10">
                            <div 
                                className="h-full bg-gradient-to-r from-yellow-500 to-orange-600"
                                style={{ 
                                    width: `${(comboTimer / COMBO_TIME_LIMIT) * 100}%`,
                                    transition: 'width 0.1s linear' 
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 relative cursor-crosshair">
        <GameCanvas engine={engineRef.current} />
        
        {/* Floating Message Overlay */}
        {message && gameState === GameState.PLAYING && (
            <div className="absolute top-1/3 left-0 w-full text-center pointer-events-none z-30">
                <span className="inline-block px-8 py-3 bg-black/70 backdrop-blur-md rounded-full text-white font-bold animate-bounce border border-white/20 text-lg shadow-2xl">
                    {message}
                </span>
            </div>
        )}

        {/* --- ITEMS BAR (Bottom) --- */}
        {gameState === GameState.PLAYING && (
            <div className="absolute bottom-0 left-0 w-full flex justify-center gap-8 pointer-events-auto z-20 pb-[env(safe-area-inset-bottom)]">
                <button 
                    onClick={toggleBombMode}
                    className={`flex flex-col items-center gap-1 transition-all active:scale-95 group ${items.bombs === 0 ? 'opacity-40 grayscale' : ''}`}
                    disabled={items.bombs === 0}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-all relative overflow-hidden ${
                        interactionMode === 'ITEM_BOMB' 
                        ? 'bg-red-600 border-white scale-110 shadow-red-900/50' 
                        : 'bg-slate-800/90 backdrop-blur border-slate-600 hover:border-red-400'
                    }`}>
                         <span className="text-3xl relative z-10 group-hover:scale-110 transition-transform">💣</span>
                         <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 skew-x-12 translate-x-[-100%] group-hover:animate-shine" />
                    </div>
                    <span className="text-[10px] font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300 shadow-sm relative -mt-3 z-20">
                        {items.bombs}
                    </span>
                </button>

                <button 
                    onClick={useReshuffle}
                    className={`flex flex-col items-center gap-1 transition-all active:scale-95 group ${items.reshuffles === 0 ? 'opacity-40 grayscale' : ''}`}
                    disabled={items.reshuffles === 0}
                >
                    <div className="w-16 h-16 bg-slate-800/90 backdrop-blur rounded-2xl flex items-center justify-center border-2 border-slate-600 shadow-2xl hover:border-blue-400 transition-all relative overflow-hidden">
                         <div className="text-white group-hover:rotate-180 transition-transform duration-500">
                             <RefreshIcon />
                         </div>
                         <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 skew-x-12 translate-x-[-100%] group-hover:animate-shine" />
                    </div>
                    <span className="text-[10px] font-black bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300 shadow-sm relative -mt-3 z-20">
                        {items.reshuffles}
                    </span>
                </button>
            </div>
        )}
      </div>

      {/* --- MENU OVERLAY --- */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 overflow-hidden">
           {/* Background Decoration */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
              <div className="absolute top-10 left-10 text-6xl animate-pulse">🐻</div>
              <div className="absolute bottom-20 right-10 text-6xl animate-bounce">💎</div>
              <div className="absolute top-1/2 left-1/4 text-4xl text-cyan-500 blur-sm">✨</div>
           </div>

          <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-in zoom-in duration-500">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)] text-center tracking-tight">
              NEON RUSH
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase mb-8 font-bold opacity-80">Cyberpunk Match-3</p>
            
            {/* Difficulty Selector */}
            <div className="flex bg-slate-900/80 backdrop-blur p-1 rounded-2xl mb-8 border border-slate-700 shadow-2xl w-full">
                {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                    <button
                        key={d}
                        onClick={() => { playUiSound(); setDifficulty(d); }}
                        className={`flex-1 py-3 rounded-xl text-xs font-black tracking-wider transition-all ${
                            difficulty === d 
                            ? 'bg-slate-700 text-cyan-400 shadow-lg scale-100 ring-1 ring-cyan-500/30' 
                            : 'text-slate-500 hover:text-slate-300 scale-95'
                        }`}
                    >
                        {d === 'EASY' ? '简单' : d === 'NORMAL' ? '普通' : '困难'}
                    </button>
                ))}
            </div>

            <button 
              onClick={() => { playUiSound(); startGame(); }}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-xl font-black text-white shadow-[0_0_30px_rgba(8,145,178,0.4)] hover:scale-[1.02] active:scale-95 transition-all border border-cyan-400/30 mb-4 tracking-wide"
            >
              开始游戏
            </button>
            
            <button
                onClick={() => { playUiSound(); setShowInstructions(true); }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm py-2 font-semibold"
            >
                <InfoIcon /> 游戏玩法说明
            </button>
          </div>
        </div>
      )}

      {/* --- INSTRUCTIONS MODAL --- */}
      {showInstructions && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-lg max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
                  <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900">
                      <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                          <InfoIcon /> 游戏指南
                      </h3>
                      <button onClick={() => { playUiSound(); setShowInstructions(false); }} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full">
                          <CloseIcon />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6 text-slate-200 bg-slate-950/50">
                      <section>
                          <h4 className="text-sm font-black text-slate-500 uppercase mb-2 tracking-widest">基础玩法</h4>
                          <p className="text-sm text-slate-400 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                              滑动手指交换相邻的宝石。当 <span className="text-cyan-400 font-bold">3个或以上</span> 同色宝石连成一直线（横向或纵向）时，它们将被消除并得分。
                          </p>
                      </section>
                      <section>
                          <h4 className="text-sm font-black text-slate-500 uppercase mb-2 tracking-widest">强力道具</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col items-center text-center">
                                  <div className="text-2xl mb-1">💣</div>
                                  <div className="text-xs font-bold text-white">定点炸弹</div>
                                  <div className="text-[10px] text-slate-500">炸毁任意 3x3 区域</div>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col items-center text-center">
                                  <div className="text-2xl mb-1 text-blue-400"><RefreshIcon /></div>
                                  <div className="text-xs font-bold text-white">重新洗牌</div>
                                  <div className="text-[10px] text-slate-500">重排所有宝石</div>
                              </div>
                          </div>
                      </section>

                      <section>
                          <h4 className="text-sm font-black text-slate-500 uppercase mb-3 tracking-widest">特殊宝石配方</h4>
                          <div className="space-y-3">
                              <div className="bg-slate-900/80 p-3 rounded-xl flex items-center gap-4 border border-slate-800">
                                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">↔️</div>
                                  <div>
                                      <div className="font-bold text-yellow-400 text-sm">直线爆炸</div>
                                      <div className="text-[11px] text-slate-400">4个宝石连成一线生成。消除整行或整列。</div>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-900/80 p-3 rounded-xl flex items-center gap-4 border border-slate-800">
                                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">💣</div>
                                  <div>
                                      <div className="font-bold text-red-400 text-sm">区域炸弹</div>
                                      <div className="text-[11px] text-slate-400">T型或L型(5个)生成。爆炸消除周围区域。</div>
                                  </div>
                              </div>

                              <div className="bg-slate-900/80 p-3 rounded-xl flex items-center gap-4 border border-slate-800">
                                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-2xl">🌈</div>
                                  <div>
                                      <div className="font-bold text-white text-sm">彩虹核心</div>
                                      <div className="text-[11px] text-slate-400">5个连成一线生成。交换消除全屏同色！</div>
                                  </div>
                              </div>
                          </div>
                      </section>
                  </div>
                  
                  <div className="p-4 border-t border-slate-800 bg-slate-900">
                      <button onClick={() => { playUiSound(); setShowInstructions(false); }} className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 rounded-xl text-white font-bold transition-colors shadow-lg shadow-cyan-900/20">
                          开始战斗 (Ready)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* GAME OVER Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
          <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg">任务失败</h2>
          <p className="text-red-300 mb-8 uppercase tracking-widest font-bold opacity-80">Game Over</p>
          
          <div className="bg-black/40 p-8 rounded-3xl border border-red-500/30 mb-8 text-center min-w-[240px] shadow-2xl">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Final Score</div>
              <div className="text-5xl font-mono text-white font-bold">{score.toLocaleString()}</div>
          </div>

          <div className="flex gap-4">
              <button onClick={() => { playUiSound(); setGameState(GameState.MENU); }} className="px-6 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-colors">
                  退出
              </button>
              <button 
                onClick={() => { playUiSound(); restartLevel(); }}
                className="flex items-center gap-2 px-8 py-4 bg-white text-red-900 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-transform active:scale-95 shadow-xl"
              >
                <RefreshIcon /> 再试一次
              </button>
          </div>
        </div>
      )}

      {/* VICTORY Overlay */}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="text-7xl mb-6 animate-bounce filter drop-shadow-lg">🏆</div>
          <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg text-center">关卡完成!</h2>
          <p className="text-emerald-300 mb-8 uppercase tracking-widest font-bold opacity-80">Level Complete</p>
          
          <div className="bg-black/40 p-8 rounded-3xl border border-emerald-500/30 mb-8 text-center min-w-[240px] shadow-2xl">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Score</div>
              <div className="text-5xl font-mono text-emerald-400 font-bold">{score.toLocaleString()}</div>
          </div>

          <button 
            onClick={() => { playUiSound(); nextLevel(); }}
            className="px-12 py-5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl text-xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-transform"
          >
            下一关 (Next Level)
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
