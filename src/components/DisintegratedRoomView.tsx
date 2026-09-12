import React from 'react';
import { Flame, Sparkles, RefreshCw } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface DisintegratedRoomViewProps {
  reason: string;
  onReset: () => void;
}

export const DisintegratedRoomView: React.FC<DisintegratedRoomViewProps> = ({
  reason,
  onReset,
}) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 z-10 select-none animate-in zoom-in-95 duration-300">
      <div 
        id="disintegrated-room-card"
        className="w-full max-w-md bg-[#130b0d]/90 backdrop-blur-2xl border border-red-500/40 rounded-2xl p-8 shadow-[0_0_60px_rgba(239,68,68,0.3)] text-center space-y-6 relative overflow-hidden"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
          <Flame className="w-8 h-8 text-red-500 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-tech text-white tracking-wider uppercase">
            Monolith Disintegrated
          </h1>
          <p className="text-xs font-code text-red-300/80 uppercase tracking-widest">
            ALL TRANSMISSIONS PERMANENTLY ERASED
          </p>
        </div>

        <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl text-xs font-sans text-white/70 leading-relaxed">
          {reason || 'The session host ignited the burn protocol or the self-destruct countdown reached zero.'}
        </div>

        <button
          type="button"
          id="btn-return-home"
          onClick={() => {
            sounds.playClick();
            onReset();
          }}
          className="w-full bg-[#d5e0ea] hover:bg-white text-[#09090b] text-xs sm:text-sm font-tech font-bold tracking-widest py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all cursor-pointer uppercase active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4 text-[#09090b]" />
          <span>Synthesize New Monolith</span>
        </button>
      </div>
    </div>
  );
};
