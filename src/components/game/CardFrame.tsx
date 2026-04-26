import React, { ReactNode } from 'react';

interface CardFrameProps {
  children: ReactNode;
  color: string;
  className?: string;
  glow?: boolean;
}

export const CardFrame = ({ children, color, className = "", glow = true }: CardFrameProps) => {
  return (
    <div 
      className={`relative rounded-xl border-[3px] overflow-hidden bg-[#020202] transition-all duration-300 ${className}`}
      style={{ 
        borderColor: color,
        boxShadow: glow 
          ? `0 0 25px ${color}66, inset 0 0 20px ${color}33, 0 0 10px ${color}aa` 
          : `0 0 5px ${color}22`,
      }}
    >
      {/* Energy Glow Overlay */}
      {glow && (
        <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-pulse" />
        </div>
      )}

      {/* Corner Decorations */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {/* Top Left */}
        <div className="absolute top-1 left-1 w-5 h-5">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-[3px] border-l-[3px]" style={{ borderColor: color }} />
          <div className="absolute top-[5px] left-[5px] w-2 h-2" style={{ background: `linear-gradient(135deg, ${color} 50%, transparent 50%)`, opacity: 0.9 }} />
        </div>

        {/* Top Right */}
        <div className="absolute top-1 right-1 w-5 h-5">
          <div className="absolute top-0 right-0 w-3 h-3 border-t-[3px] border-r-[3px]" style={{ borderColor: color }} />
          <div className="absolute top-[5px] right-[5px] w-2 h-2" style={{ background: `linear-gradient(225deg, ${color} 50%, transparent 50%)`, opacity: 0.9 }} />
        </div>

        {/* Bottom Left */}
        <div className="absolute bottom-1 left-1 w-5 h-5">
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[3px] border-l-[3px]" style={{ borderColor: color }} />
          <div className="absolute bottom-[5px] left-[5px] w-2 h-2" style={{ background: `linear-gradient(45deg, ${color} 50%, transparent 50%)`, opacity: 0.9 }} />
        </div>

        {/* Bottom Right */}
        <div className="absolute bottom-1 right-1 w-5 h-5">
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[3px] border-r-[3px]" style={{ borderColor: color }} />
          <div className="absolute bottom-[5px] right-[5px] w-2 h-2" style={{ background: `linear-gradient(315deg, ${color} 50%, transparent 50%)`, opacity: 0.9 }} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
