import React from 'react';
import { Users, Shield, Clock, Mic, MicOff, Volume2, X } from 'lucide-react';
import type { Participant } from '../types.ts';

interface ParticipantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  roomName: string;
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  currentUserId,
  isHost,
  roomName,
}) => {
  if (!isOpen) return null;

  const formatJoinTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-md p-4 select-none">
      <div 
        id="participant-drawer-panel"
        className="w-full max-w-sm bg-[#0c0d11]/95 border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[600px] animate-in slide-in-from-right duration-200 holo-card relative"
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-white" />
            <div>
              <h2 className="text-xs font-mono font-bold tracking-[0.2em] text-white uppercase">
                Peer Manifest
              </h2>
              <span className="text-[9px] font-mono text-white/40 uppercase">
                {participants.length} {participants.length === 1 ? 'CALLSIGN' : 'CALLSIGNS'} ACTIVE
              </span>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-participants-drawer"
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="text-[9px] font-mono tracking-widest text-white/40 uppercase mb-2">
            ACTIVE RELAY PEERS ({participants.length})
          </div>

          {participants.map((p) => {
            const isMe = p.id === currentUserId;
            return (
              <div
                key={p.id}
                id={`participant-item-${p.id}`}
                className={`p-3 rounded-sm border transition-all flex items-center justify-between ${
                  p.isHost
                    ? 'bg-purple-950/25 border-purple-500/40 text-purple-200'
                    : 'bg-white/5 border-white/15 text-white/90'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Initial Avatar */}
                  <div
                    className={`w-7 h-7 rounded-sm flex items-center justify-center font-mono font-bold text-xs select-none border ${
                      p.isHost
                        ? 'bg-purple-600/30 text-purple-300 border-purple-400/40'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-white">
                        {p.name}
                      </span>
                      {p.isHost && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-sm text-[8px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          <Shield className="w-2 h-2" />
                          <span>HOST ★</span>
                        </span>
                      )}
                      {isMe && (
                        <span className="px-1 py-0.2 rounded-sm text-[8px] font-mono bg-white/10 text-white/70 border border-white/15">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[9px] font-mono text-white/40 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-white/30" />
                      <span>Joined {formatJoinTime(p.joinedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Voice status icon */}
                <div className="flex items-center gap-1">
                  {p.isSpeaking ? (
                    <span className="flex items-center gap-1 text-[8px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-1.5 py-0.5 rounded-sm">
                      <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                      <span>LIVE</span>
                    </span>
                  ) : p.isMuted ? (
                    <span className="text-white/30" title="Muted">
                      <MicOff className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-emerald-400/60" title="Mic Active">
                      <Mic className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-white/10 bg-black/70 text-center">
          <p className="text-[8px] font-mono tracking-widest text-white/40 uppercase">
            END-TO-END ENCRYPTED MONOLITH PEER MESH
          </p>
        </div>
      </div>
    </div>
  );
};
