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

type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

const App: React.FC = () => {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  
  // New Menu States
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [showInstructions, setShowInstructions] = useState(false);

  // Bind Engine Callbacks
  useEffect(() => {
    const engine = engineRef.current;
    
    engine.onScoreUpdate = (s, m, c, ct) => {
      setScore(s);
      setMoves(m);
      setCombo(c);
      setComboTimer(ct);
    };

    engine.onGameEvent = (event) => {
      if (event === 'win') {
        setMessage('Level Complete!');
        setGameState(GameState.LEVEL_COMPLETE);
      } else if (event === 'lose') {
        setMessage('No Moves Left!');
        setGameState(GameState.GAME_OVER);
      } else if (event === 'reshuffle') {
          setMessage('No Moves! Reshuffling...');
          setTimeout(() => setMessage(null), 2000);
      }
    };
  }, []);

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
    audioService.init();
    const config = getDifficultyConfig(LEVELS[currentLevelIdx]);
    engineRef.current.startLevel(config);
    setScore(0);
    setMoves(config.moves);
    setGameState(GameState.PLAYING);
    setMessage(null);
  }, [currentLevelIdx, getDifficultyConfig]);

  const nextLevel = () => {
      if (currentLevelIdx < LEVELS.length - 1) {
          setCurrentLevelIdx(prev => prev + 1);
          // Wait for state update is tricky in hooks, so we calculate next config directly
          const nextIdx = currentLevelIdx + 1;
          const config = getDifficultyConfig(LEVELS[nextIdx]);
          engineRef.current.startLevel(config);
          setScore(0);
          setMoves(config.moves);
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

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans select-none">
      {/* HUD */}
      <div className="h-16 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-700 shadow-lg z-10 relative">
        <div className="flex flex-col">
           <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Score</span>
           <span className="text-2xl font-mono text-cyan-400 drop-shadow-md">{score.toLocaleString()}</span>
        </div>
        
        {/* Combo Bar */}
        <div className="flex-1 mx-4 flex flex-col items-center justify-center opacity-90">
             {combo > 1 && (
                 <>
                    <span className="text-yellow-400 font-black italic text-lg animate-pulse">{combo}x COMBO!</span>
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-75 ease-linear"
                            style={{ width: `${(comboTimer / COMBO_TIME_LIMIT) * 100}%` }}
                        />
                    </div>
                 </>
             )}
        </div>

        <div className="flex flex-col items-end">
           <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Moves</span>
           <span className={`text-2xl font-mono drop-shadow-md ${moves < 5 ? 'text-red-500 animate-bounce' : 'text-emerald-400'}`}>{moves}</span>
        </div>
      </div>

      {/* Target Info Bar */}
      {gameState === GameState.PLAYING && (
          <div className="bg-slate-800/50 backdrop-blur text-center py-1 text-xs text-slate-300 border-b border-slate-700/50">
              Level {LEVELS[currentLevelIdx].level} ({difficulty}) • Target: {getDifficultyConfig(LEVELS[currentLevelIdx]).targetScore}
          </div>
      )}

      {/* Game Area */}
      <div className="flex-1 relative">
        <GameCanvas engine={engineRef.current} />
        
        {/* Floating Message Overlay */}
        {message && gameState === GameState.PLAYING && (
            <div className="absolute top-1/4 left-0 w-full text-center pointer-events-none z-20">
                <span className="inline-block px-6 py-2 bg-black/60 backdrop-blur rounded-full text-white font-bold animate-bounce border border-white/20">
                    {message}
                </span>
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

          <div className="relative z-10 flex flex-col items-center max-w-md w-full">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 mb-2 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)] text-center tracking-tight">
              NEON RUSH
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase mb-8">Cyberpunk Match-3</p>
            
            {/* Difficulty Selector */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-8 border border-slate-700 shadow-xl w-full">
                {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                            difficulty === d 
                            ? 'bg-slate-700 text-cyan-400 shadow-md' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {d === 'EASY' ? '简单' : d === 'NORMAL' ? '普通' : '困难'}
                    </button>
                ))}
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-xl font-bold text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:scale-105 active:scale-95 transition-all border border-cyan-400/30 mb-4"
            >
              开始游戏 (START)
            </button>
            
            <button
                onClick={() => setShowInstructions(true)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm py-2"
            >
                <InfoIcon /> 游戏玩法说明
            </button>
          </div>
        </div>
      )}

      {/* --- INSTRUCTIONS MODAL --- */}
      {showInstructions && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-lg max-h-[90vh] rounded-2xl flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center p-4 border-b border-slate-800">
                      <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                          <InfoIcon /> 游戏指南
                      </h3>
                      <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-white p-2">
                          <CloseIcon />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-6 space-y-6 text-slate-200">
                      <section>
                          <h4 className="text-lg font-bold text-white mb-2 border-l-4 border-cyan-500 pl-3">基础玩法</h4>
                          <p className="text-sm text-slate-400 leading-relaxed">
                              滑动手指交换相邻的宝石。当 <span className="text-white font-bold">3个或以上</span> 同色宝石连成一直线（横向或纵向）时，它们将被消除并得分。
                          </p>
                      </section>

                      <section>
                          <h4 className="text-lg font-bold text-white mb-3 border-l-4 border-purple-500 pl-3">特殊宝石 & 机制</h4>
                          <div className="space-y-4">
                              <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-4">
                                  <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">↔️</div>
                                  <div>
                                      <div className="font-bold text-yellow-400">直线爆炸 (4连消)</div>
                                      <div className="text-xs text-slate-400">4个宝石连成一线生成。消除时会炸毁整行或整列的宝石。</div>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-4">
                                  <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">💣</div>
                                  <div>
                                      <div className="font-bold text-red-400">区域炸弹 (T/L型消除)</div>
                                      <div className="text-xs text-slate-400">以T型或L型匹配5个宝石生成。爆炸时消除周围 3x3 区域的所有宝石。</div>
                                  </div>
                              </div>

                              <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-4">
                                  <div className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">🌈</div>
                                  <div>
                                      <div className="font-bold text-white">彩虹核心 (5连直线)</div>
                                      <div className="text-xs text-slate-400">5个宝石连成一线生成。点击它并与任意宝石交换，将消除全屏所有该颜色的宝石！</div>
                                  </div>
                              </div>
                          </div>
                      </section>

                      <section>
                          <h4 className="text-lg font-bold text-white mb-2 border-l-4 border-green-500 pl-3">强力组合技</h4>
                          <p className="text-sm text-slate-400 leading-relaxed mb-2">
                              试着将两个特殊宝石交换位置，触发超级连锁反应！
                          </p>
                          <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                              <li>炸弹 + 炸弹 = 超大范围爆炸</li>
                              <li>直线 + 直线 = 十字消除</li>
                              <li>彩虹 + 任何宝石 = 强力清场</li>
                          </ul>
                      </section>
                  </div>
                  
                  <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
                      <button onClick={() => setShowInstructions(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-colors">
                          明白了 (Got it)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* GAME OVER Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
          <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg">任务失败</h2>
          <p className="text-red-300 mb-8 uppercase tracking-widest font-bold">Game Over</p>
          
          <div className="bg-black/40 p-6 rounded-xl border border-red-500/30 mb-8 text-center min-w-[200px]">
              <div className="text-sm text-slate-400 uppercase">Final Score</div>
              <div className="text-4xl font-mono text-white font-bold">{score.toLocaleString()}</div>
          </div>

          <button 
            onClick={restartLevel}
            className="flex items-center gap-2 px-8 py-4 bg-white text-red-900 rounded-xl font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95 shadow-xl"
          >
            <RefreshIcon /> 再试一次 (Retry)
          </button>
          
          <button onClick={() => setGameState(GameState.MENU)} className="mt-4 text-slate-400 text-sm underline">
              返回主菜单
          </button>
        </div>
      )}

      {/* VICTORY Overlay */}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg text-center">关卡完成!</h2>
          <p className="text-emerald-300 mb-8 uppercase tracking-widest font-bold">Level Complete</p>
          
          <div className="bg-black/40 p-6 rounded-xl border border-emerald-500/30 mb-8 text-center min-w-[200px]">
              <div className="text-sm text-slate-400 uppercase">Score</div>
              <div className="text-4xl font-mono text-emerald-400 font-bold">{score.toLocaleString()}</div>
          </div>

          <button 
            onClick={nextLevel}
            className="px-12 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-transform"
          >
            下一关 (Next Level)
          </button>
        </div>
      )}
    </div>
  );
};

export default App;