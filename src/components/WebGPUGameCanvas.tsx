import React, { useEffect, useRef, useState } from 'react';
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
         <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col items-center justify-center gap-4 text-center select-none" dir="rtl">
            <div className="w-10 h-10 border-4 border-game-primary border-t-transparent rounded-full animate-spin" />
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-game-primary rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
         </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
