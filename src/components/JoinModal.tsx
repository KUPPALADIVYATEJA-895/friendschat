import React, { useState } from 'react';
import { Sparkles, Shield, Radio, Clock, Loader2, X } from 'lucide-react';
import type { Room } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';

interface JoinModalProps {
  room: Room;
  onJoin: (guestName: string) => Promise<void>;
  onClose?: () => void;
  isWaitingForHostApproval?: boolean;
  joinSource?: 'link' | 'open_to_join';
}

export const JoinModal: React.FC<JoinModalProps> = ({
  room,
  onJoin,
  onClose,
  isWaitingForHostApproval = false,
  joinSource = 'link',
}) => {
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setError('Please provide a name to identify yourself in the monolith');
      return;
    }
    setError('');
    setSubmitting(true);
    sounds.playClick();
    try {
      await onJoin(guestName.trim());
    } catch (err: any) {
      setError(err?.message || 'Error joining room. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none">
      <div className="w-full max-w-[460px] bg-[#0c0d11]/95 border border-white/20 rounded-sm p-6 sm:p-8 shadow-2xl relative holo-card glow-accent overflow-hidden">
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Close Button if provided */}
        {onClose && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="opacity-50 text-[10px] font-mono tracking-widest uppercase mb-2">
            [RELAY PROTOCOL V4.2]
          </div>

          <h1 className="text-2xl font-light tracking-[0.2em] font-mono text-white uppercase">
            Cyber Monolith
          </h1>
          <p className="text-[10px] font-mono text-white/40 tracking-wider mt-1 uppercase">
            {joinSource === 'open_to_join'
              ? 'PUBLIC CHANNEL DISCOVERY • CLEARANCE REQUIRED'
              : 'DIRECT INVITE LINK • INSTANT ACCESS'}
          </p>
        </div>

        {/* Room Details Pill */}
        <div className="bg-black/60 border border-white/15 rounded-sm p-4 mb-6 space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-white/40 uppercase">TARGET ROOM</span>
            <span className="font-bold text-white uppercase">{room.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-white/40 uppercase">HOST CALLSIGN</span>
            <span className="text-cyan-300">★ {room.hostName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-white/40 uppercase">JOIN METHOD</span>
            {joinSource === 'open_to_join' ? (
              <span className="text-amber-300 text-[10px]">Public Channel (Host Approval)</span>
            ) : (
              <span className="text-emerald-400 text-[10px]">Secret Link (Direct Join)</span>
            )}
          </div>
          {room.liveVoiceEnabled && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-[9px] text-emerald-400/80 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE VOICE CHAT
              </span>
              <span className="text-[9px] text-emerald-300">ONLINE</span>
            </div>
          )}
        </div>

        {isWaitingForHostApproval ? (
          <div className="text-center py-6 space-y-4">
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <Shield className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="space-y-1 font-mono">
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">
                AWAITING HOST CLEARANCE...
              </h2>
              <p className="text-[11px] text-white/50 max-w-xs mx-auto">
                Host <strong className="text-white">@{room.hostName}</strong> has been sent your clearance request. You will automatically enter the chat as soon as the host approves.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label 
                htmlFor="input-guest-name" 
                className="block text-[10px] font-mono tracking-widest text-white/70 uppercase"
              >
                YOUR CALLSIGN / NAME
              </label>
              <input
                id="input-guest-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={30}
                autoFocus
                className="w-full bg-black/70 border border-white/20 focus:border-white/50 text-white placeholder-white/30 text-[16px] sm:text-xs font-mono px-3.5 py-3 rounded-sm outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-sm text-red-300 text-xs text-center font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="btn-join-monolith"
              disabled={submitting}
              className="w-full bg-white hover:bg-white/90 text-black text-xs font-mono font-bold tracking-[0.2em] py-3.5 px-6 rounded-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all cursor-pointer uppercase active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{joinSource === 'open_to_join' ? 'Requesting Clearance...' : 'Connecting...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>{joinSource === 'open_to_join' ? 'Request Clearance from Host' : 'Step Inside Room'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
