import React, { useEffect, useState } from 'react';
import { Globe, Users, Radio, Clock, ShieldCheck, ArrowRight, X, RefreshCw } from 'lucide-react';
import type { RoomSummary } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';

interface OpenRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestJoinRoom: (roomId: string, roomName: string) => void;
}

export const OpenRoomsModal: React.FC<OpenRoomsModalProps> = ({
  isOpen,
  onClose,
  onRequestJoinRoom,
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpenRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/open');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to fetch open rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOpenRooms();
      const interval = setInterval(fetchOpenRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div 
        id="open-rooms-directory-modal"
        className="w-full max-w-2xl bg-[#0c0d11]/95 border border-white/20 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] holo-card glow-accent relative"
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/60 font-mono">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '20s' }} />
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-white uppercase">
                Live Directory
              </h2>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">
                DISCOVER OPEN SESSIONS (HOST CLEARANCE REQUIRED)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-refresh-rooms"
              onClick={() => {
                sounds.playClick();
                fetchOpenRooms();
              }}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
              title="Refresh active rooms"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              id="btn-close-open-rooms"
              onClick={onClose}
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 font-mono">
          {loading && rooms.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-xs">
              <span className="animate-pulse">Scanning frequency channels for live monoliths...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Globe className="w-8 h-8 text-white/20 mx-auto" />
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">No Public Monoliths Active</div>
              <p className="text-[11px] text-white/40 max-w-sm mx-auto">
                Create a secret link and switch on "OPEN TO JOIN" to broadcast your room to the directory.
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                id={`open-room-card-${room.id}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-sm p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      {room.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-white/60 uppercase">
                      Host: {room.hostName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-white/40">
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Users className="w-3 h-3" />
                      <span>{room.participantCount} online</span>
                    </span>

                    {room.liveVoiceEnabled && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded-sm border border-emerald-500/30">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Voice Active</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-white/40">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span>Timer: {room.timer}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id={`btn-request-join-${room.id}`}
                  onClick={() => {
                    sounds.playClick();
                    onRequestJoinRoom(room.id, room.name);
                  }}
                  className="bg-white hover:bg-white/90 text-black text-[10px] font-mono font-bold tracking-[0.2em] py-2 px-3.5 rounded-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 uppercase shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                  <span>Request Entry</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-white/10 bg-black/70 text-center font-mono">
          <p className="text-[8px] tracking-widest text-white/40 uppercase">
            HOSTS RETAIN SOVEREIGN APPROVAL OVER ALL INCOMING TRANSMITTERS
          </p>
        </div>
      </div>
    </div>
  );
};
