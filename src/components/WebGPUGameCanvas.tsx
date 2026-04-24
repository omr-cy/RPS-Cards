import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { wgpuAssetManager } from '../lib/webgpu/WebGPUAssetManager';
import { webGPUCardRenderer, CardInstance } from '../lib/webgpu/WebGPUCardRenderer';

/**
 * WebGPUGameCanvas
 * Proof of Concept architectural implementation for WebGPU completely DOM-less rendering for the Card Game.
 * Warning: Replacing all DOM elements natively stops framer-motion and react-dom events. 
 * Raycasting and logical physics loops must be bound on top of this Canvas to fully convert the game. 
 */
export const WebGPUGameCanvas = ({ themes, cards }: { themes: any[], cards: CardInstance[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    async function init() {
      const wasCached = await wgpuAssetManager.initialize(themes, (p) => setProgress(p));
      setIsFirstLaunch(!wasCached);
      
      if (canvasRef.current && wgpuAssetManager.bitmap) {
        await webGPUCardRenderer.init(canvasRef.current, wgpuAssetManager.bitmap);
        
        const rect = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = rect.height * window.devicePixelRatio;
        webGPUCardRenderer.updateProjection(canvasRef.current.width, canvasRef.current.height);
        
        setIsReady(true);
      }
    }
    init();
  }, [themes]);

  useEffect(() => {
    if (isReady) {
      // Loop or reactive render hook
      // For now, render exactly when 'cards' instance prop updates
      let rAF: number;
      const loop = () => {
        webGPUCardRenderer.render(cards);
        rAF = requestAnimationFrame(loop);
      }
      loop();
      return () => cancelAnimationFrame(rAF);
    }
  }, [isReady, cards]);

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100vh' }}>
      {!isReady && isFirstLaunch && (
         <div className="fixed inset-0 z-[9999] bg-[#121212] flex items-center justify-center flex-col text-game-cream p-6 text-center select-none" dir="rtl">
            <div className="w-24 h-24 mb-8 bg-game-teal/10 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(45,212,191,0.2)]">
              <Sparkles className="w-12 h-12 text-game-teal" />
            </div>
            <h1 className="text-3xl font-display tracking-widest text-game-offwhite mb-4">كارد كلاش</h1>
            <p className="text-game-offwhite/60 mb-8 font-body max-w-xs leading-relaxed text-sm">جاري تجهيز موارد اللعبة (WebGPU)...</p>
            
            <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-game-teal rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="mt-3 text-xs text-game-teal font-mono">
              {Math.round(progress * 100)}%
            </div>
         </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
