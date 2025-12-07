import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { GameEngine } from '../engine/GameEngine';

interface GameCanvasProps {
  engine: GameEngine;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);

  // Resize Handler
  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Handle DPI
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        engine.setCanvas(canvasRef.current);
        // Normalize context scale for DPI
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        engine.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [engine]);

  // Game Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      engine.update(deltaTime);
      engine.draw();
      
      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [engine]);

  // Input Handling Helper
  const getCoordinates = (e: React.TouchEvent | React.MouseEvent | React.Touch | React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    // Check if it's a TouchEvent with touches array
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && (e as React.TouchEvent).touches && (e as React.TouchEvent).touches.length > 0) {
        clientX = (e as React.TouchEvent).touches[0].clientX;
        clientY = (e as React.TouchEvent).touches[0].clientY;
    } else if ('changedTouches' in e && (e as React.TouchEvent).changedTouches && (e as React.TouchEvent).changedTouches.length > 0) {
        clientX = (e as React.TouchEvent).changedTouches[0].clientX;
        clientY = (e as React.TouchEvent).changedTouches[0].clientY;
    } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    // e.preventDefault(); // Sometimes prevents clicking UI overlay if not careful, but okay here
    const { x, y } = getCoordinates(e);
    engine.handleInput(x, y, 'start');
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
     // Prevent scrolling behavior
     if (e.cancelable) e.preventDefault();
     const { x, y } = getCoordinates(e);
     engine.handleInput(x, y, 'move');
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    engine.handleInput(x, y, 'end');
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-900 shadow-inner select-none">
      <canvas
        ref={canvasRef}
        className="block touch-none select-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
};

export default GameCanvas;