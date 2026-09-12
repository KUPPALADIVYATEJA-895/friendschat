import React, { useState } from 'react';
import { Flame, AlertTriangle, X } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface BurnConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBurn: () => Promise<void>;
  roomName: string;
}

export const BurnConfirmationModal: React.FC<BurnConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmBurn,
  roomName,
}) => {
  const [isBurning, setIsBurning] = useState(false);

  if (!isOpen) return null;

  const handleBurn = async () => {
    sounds.playBurnAlarm();
    setIsBurning(true);
    await onConfirmBurn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div 
        id="burn-modal-panel"
        className="w-full max-w-md bg-[#0e090b]/95 border border-red-900/80 rounded-sm p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden holo-card"
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent pointer-events-none" />

        {/* Top Warning Ribbon */}
        <div className="flex items-center justify-between pb-4 border-b border-red-900/40">
          <div className="flex items-center gap-2 text-red-500">
            <Flame className="w-4 h-4 animate-pulse text-red-500" />
            <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase">
              BURN PROTOCOL INITIATION
            </span>
          </div>
          <button
            type="button"
            id="btn-cancel-burn"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white rounded-sm border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-5 space-y-4 font-mono">
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/60 rounded-sm p-3.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-red-200 leading-relaxed">
              <strong className="text-white block mb-1 uppercase tracking-wider">IRREVERSIBLE MONOLITH DISINTEGRATION</strong>
              Burning will immediately erase all chat history, close active transmissions, and disconnect all peers permanently. No backups exist.
            </div>
          </div>

          <p className="text-[10px] text-white/50 font-mono text-center uppercase tracking-wider">
            TARGET: <span className="text-white font-bold">{roomName || 'Secret Monolith'}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 font-mono">
          <button
            type="button"
            id="btn-abort-burn"
            onClick={onClose}
            disabled={isBurning}
            className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold tracking-[0.2em] py-3 px-4 rounded-sm border border-white/20 transition-all cursor-pointer uppercase"
          >
            ABORT
          </button>

          <button
            type="button"
            id="btn-confirm-burn"
            onClick={handleBurn}
            disabled={isBurning}
            className="w-full border border-red-900 bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs font-bold tracking-[0.2em] py-3 px-4 rounded-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 uppercase active:scale-95"
          >
            <Flame className="w-4 h-4 text-red-500 animate-bounce" />
            <span>{isBurning ? 'VAPORIZING...' : 'IGNITE BURN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
