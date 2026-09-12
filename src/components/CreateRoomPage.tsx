import React, { useState, useEffect } from 'react';
import { Sparkles, Radio, Clock, Users, ArrowRight, ShieldCheck, RefreshCw, Globe, KeyRound, ClipboardPaste, Link as LinkIcon, AlertCircle } from 'lucide-react';
import type { SelfDestructDuration, RoomSummary } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';
import { apiClient } from '../utils/apiClient.ts';

interface CreateRoomPageProps {
  onCreateRoom: (data: {
    hostName: string;
    roomName: string;
    timer: SelfDestructDuration;
    openToJoin: boolean;
    liveVoiceEnabled: boolean;
  }) => Promise<void>;
  onRequestJoinRoom?: (roomId: string) => void;
  onJoinWithCode?: (code: string) => Promise<void>;
  isCreating: boolean;
}

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({
  onCreateRoom,
  onRequestJoinRoom,
  onJoinWithCode,
  isCreating,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join_code'>('create');
  const [hostName, setHostName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [timer, setTimer] = useState<SelfDestructDuration>('none');
  const [liveVoiceEnabled, setLiveVoiceEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Join by Code state
  const [inputCode, setInputCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('');

  // Live active rooms state
  const [liveOpenRooms, setLiveOpenRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchLiveRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await apiClient.getOpenRooms();
      // Deduplicate and filter out any rooms with 0 participants
      const seen = new Set<string>();
      const unique = data.filter((r) => {
        if (!r.id || seen.has(r.id) || r.participantCount <= 0) return false;
        seen.add(r.id);
        return true;
      });
      setLiveOpenRooms(unique);
    } catch (err) {
      console.error('Failed to fetch live rooms', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchLiveRooms();
    const interval = setInterval(fetchLiveRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const getTimerSubtext = (selectedTimer: SelfDestructDuration) => {
    switch (selectedTimer) {
      case '5m':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 5 minutes after launch.';
      case '10m':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 10 minutes after launch.';
      case '30m':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 30 minutes after launch.';
      case '1h':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 1 hour after launch.';
      case '3h':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 3 hours after launch.';
      case '24h':
        return 'Your link and code become your chat room — messages and the entire monolith will auto-destruct 24 hours after launch.';
      case 'none':
      default:
        return 'Your link and code become your chat room — share it once and the conversation stays alive forever.';
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setErrorMessage('Please enter your name to initialize the monolith');
      return;
    }
    setErrorMessage('');
    sounds.playClick();
    await onCreateRoom({
      hostName: hostName.trim(),
      roomName: roomName.trim(),
      timer,
      openToJoin: true,
      liveVoiceEnabled,
    });
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
      if (cleaned) {
        setInputCode(cleaned);
        sounds.playClick();
      }
    } catch {
      setCodeErrorMessage('Could not read from clipboard. Please paste manually.');
    }
  };

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!cleanCode) {
      setCodeErrorMessage('Please enter the 6-character room code');
      return;
    }
    if (cleanCode.length < 4) {
      setCodeErrorMessage('Room code is too short. It should be 4 digits + 2 letters (e.g. 4829XK).');
      return;
    }

    setCodeErrorMessage('');
    setIsJoiningByCode(true);
    sounds.playClick();

    try {
      if (onJoinWithCode) {
        await onJoinWithCode(cleanCode);
      } else if (onRequestJoinRoom) {
        onRequestJoinRoom(cleanCode);
      }
    } catch (err: any) {
      setCodeErrorMessage(err.message || 'Room code not found or room has expired.');
    } finally {
      setIsJoiningByCode(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 z-10 select-none">
      {/* Top Header Centered */}
      <div className="w-full flex flex-col justify-center items-center text-center mb-4 sm:mb-6 z-10 border-b border-white/10 pb-4">
        <h1 className="text-xl sm:text-2xl tracking-[0.25em] font-bold uppercase text-white">
          FRIENDCHAT
        </h1>
      </div>

      {/* Main Workspace: 2-Column Responsive Grid */}
      <div className="w-full max-w-5xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Creation Monolith Card */}
        <div 
          id="create-room-card"
          className="lg:col-span-7 w-full p-5 sm:p-7 border border-white/10 bg-white/5 backdrop-blur-xl rounded-sm relative overflow-hidden group shadow-2xl holo-card glow-accent"
        >
          {/* Top highlight gradient line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          {/* Section Mode Switcher Tabs */}
          <div className="flex border-b border-white/10 mb-5 pb-1 gap-2">
            <button
              type="button"
              id="tab-mode-create"
              onClick={() => {
                sounds.playClick();
                setActiveTab('create');
                setErrorMessage('');
              }}
              className={`flex-1 pb-2.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>GENERATE CODE & LINK</span>
            </button>

            <button
              type="button"
              id="tab-mode-paste-code"
              onClick={() => {
                sounds.playClick();
                setActiveTab('join_code');
                setCodeErrorMessage('');
              }}
              className={`flex-1 pb-2.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer relative ${
                activeTab === 'join_code'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>PASTE THE CODE TO JOIN</span>
            </button>
          </div>

          {/* TAB 1: GENERATE CODE & LINK FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Host Name Input */}

              {/* Host Name Input */}
              <div>
                <label 
                  htmlFor="input-hostname"
                  className="text-[9px] uppercase tracking-widest text-white/40 block mb-2 font-mono"
                >
                  YOUR CALLSIGN / NAME <span className="text-cyan-400">*</span>
                </label>
                <input
                  id="input-hostname"
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder=""
                  maxLength={30}
                  className="w-full bg-black/60 border border-white/20 py-2.5 px-3 text-[16px] sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 rounded-sm font-mono transition-all"
                  autoFocus
                />
              </div>

              {/* Room Name Input (Optional) */}
              <div>
                <label 
                  htmlFor="input-roomname"
                  className="text-[9px] uppercase tracking-widest text-white/40 block mb-2 font-mono"
                >
                  MONOLITH ROOM NAME (OPTIONAL)
                </label>
                <input
                  id="input-roomname"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder=""
                  maxLength={40}
                  className="w-full bg-black/60 border border-white/20 py-2.5 px-3 text-[16px] sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 rounded-sm font-mono transition-all"
                />
              </div>

              {/* Self-Destruct Timer */}
              <div>
                <label 
                  htmlFor="select-timer"
                  className="text-[9px] uppercase tracking-widest text-white/40 block mb-2 font-mono"
                >
                  SELF DESTRUCT TIMER
                </label>
                <div className="relative">
                  <select
                    id="select-timer"
                    value={timer}
                    onChange={(e) => {
                      sounds.playClick();
                      setTimer(e.target.value as SelfDestructDuration);
                    }}
                    className="w-full bg-black/60 border border-white/20 py-2.5 px-3 text-xs text-white appearance-none focus:outline-none focus:border-cyan-400 rounded-sm font-mono cursor-pointer pr-8"
                  >
                    <option value="none" className="bg-[#09090b] text-white font-mono">NO TIMER – CHAT LIVES FOREVER</option>
                    <option value="5m" className="bg-[#09090b] text-white font-mono">5 MIN – AUTO DESTRUCT</option>
                    <option value="10m" className="bg-[#09090b] text-white font-mono">10 MIN – AUTO DESTRUCT</option>
                    <option value="30m" className="bg-[#09090b] text-white font-mono">30 MIN – AUTO DESTRUCT</option>
                    <option value="1h" className="bg-[#09090b] text-white font-mono">1 HR – AUTO DESTRUCT</option>
                    <option value="3h" className="bg-[#09090b] text-white font-mono">3 HR – AUTO DESTRUCT</option>
                    <option value="24h" className="bg-[#09090b] text-white font-mono">24 HR – AUTO DESTRUCT</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] text-white/50">▼</div>
                </div>
              </div>

              {/* TOGGLES */}
              <div className="space-y-3 pt-1 border-t border-white/10">
                {/* LIVE VOICE CHAT */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-white/80 font-mono block">
                      Live Voice Chat
                    </span>
                  </div>

                  <button
                    type="button"
                    id="toggle-live-voice"
                    role="switch"
                    aria-checked={liveVoiceEnabled}
                    onClick={() => {
                      sounds.playClick();
                      setLiveVoiceEnabled(!liveVoiceEnabled);
                    }}
                    className={`w-8 h-4 border border-white/30 p-[2px] cursor-pointer transition-all ${
                      liveVoiceEnabled ? 'bg-white/20' : 'bg-black/60'
                    }`}
                  >
                    <div 
                      className={`w-3 h-full bg-white transition-transform ${
                        liveVoiceEnabled ? 'translate-x-3.5' : 'translate-x-0 bg-white/40'
                      }`} 
                    />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-2 bg-red-950/40 border border-red-500/40 rounded-sm text-red-400 text-xs text-center font-mono">
                  {errorMessage}
                </div>
              )}

              {/* ACTION BUTTON */}
              <button
                type="submit"
                id="btn-create-secret-link"
                disabled={isCreating}
                className="w-full py-3.5 px-6 bg-white hover:bg-white/90 text-black uppercase text-[10px] sm:text-xs font-bold tracking-widest rounded-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>
                  {isCreating ? 'SYNTHESIZING CODE & LINK...' : 'INITIALIZE CODE & LINK'}
                </span>
              </button>

              {/* Quick switch to paste code */}
              <div className="text-center pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveTab('join_code');
                  }}
                  className="text-[10px] font-mono text-cyan-400/80 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>PASTE CODE TO JOIN →</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PASTE THE CODE TO JOIN SECTION */}
          {activeTab === 'join_code' && (
            <form onSubmit={handleJoinByCodeSubmit} className="space-y-4">
              <div className="bg-gradient-to-br from-cyan-950/40 via-black/80 to-purple-950/30 border border-cyan-500/40 rounded-sm p-4 text-center space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] uppercase tracking-widest font-bold">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PASTE THE CODE TO JOIN</span>
                  </div>
                </div>

                {/* Big Cyber Monospace Code Input & Paste Action */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      id="input-room-code"
                      type="text"
                      value={inputCode}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
                        setInputCode(cleaned);
                        if (codeErrorMessage) setCodeErrorMessage('');
                      }}
                      placeholder=""
                      maxLength={6}
                      autoFocus
                      className="w-full bg-black/90 border-2 border-cyan-500/50 focus:border-cyan-400 py-3.5 px-4 text-xl sm:text-2xl font-mono font-black text-center tracking-[0.35em] text-cyan-300 placeholder-white/20 focus:outline-none rounded-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] uppercase"
                    />
                    
                    {/* Paste Button inside or beside */}
                    <button
                      type="button"
                      id="btn-paste-code"
                      onClick={handlePasteFromClipboard}
                      title="Paste code from clipboard"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-sm text-[9px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span className="hidden sm:inline">PASTE</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {codeErrorMessage && (
                <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-sm text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{codeErrorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-room-code"
                disabled={isJoiningByCode || !inputCode.trim()}
                className="w-full py-3.5 px-6 bg-cyan-400 hover:bg-cyan-300 text-black uppercase text-[10px] sm:text-xs font-bold tracking-widest rounded-sm transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isJoiningByCode ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>CONNECTING WITH CODE...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-black" />
                    <span>JOIN MONOLITH WITH CODE</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </>
                )}
              </button>

              {/* Switch back to create */}
              <div className="text-center pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveTab('create');
                  }}
                  className="text-[10px] font-mono text-white/50 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Want to host a new session? Generate new code & link →</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Active Channels List (ALWAYS DISPLAYED) */}
        <div 
          id="live-open-monoliths-card"
          className="lg:col-span-5 w-full p-5 sm:p-6 border border-white/10 bg-white/5 backdrop-blur-xl rounded-sm relative overflow-hidden group shadow-2xl holo-card"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 font-mono">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/90 font-bold">
                Live Channels ({liveOpenRooms.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                fetchLiveRooms();
              }}
              className="p-1 text-white/40 hover:text-white rounded-sm border border-white/10 transition-colors cursor-pointer"
              title="Refresh active rooms"
            >
              <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-[9px] font-mono text-white/40 mb-3 uppercase tracking-wider">
            Active rooms discovered on network:
          </p>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 font-mono">
            {liveOpenRooms.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-sm bg-black/40 space-y-2">
                <Globe className="w-6 h-6 text-white/20 mx-auto" />
                <p className="text-[11px] text-white/50 uppercase tracking-wide">
                  No live rooms currently active
                </p>
              </div>
            ) : (
              liveOpenRooms.map((room) => (
                <div
                  key={room.id}
                  id={`home-open-room-${room.id}`}
                  className="p-3 bg-black/60 hover:bg-black/90 border border-white/10 hover:border-cyan-500/40 rounded-sm transition-all flex flex-col gap-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wide group-hover:text-cyan-300 transition-colors">
                        {room.name}
                      </div>
                      <div className="text-[9px] text-white/40 mt-0.5 flex items-center gap-2">
                        <span>Host: <span className="text-white/80">@{room.hostName}</span></span>
                        {room.code && (
                          <span className="text-cyan-400 bg-cyan-950/60 px-1 py-0.2 border border-cyan-500/30 rounded text-[8px]">
                            CODE: {room.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      id={`btn-home-join-${room.id}`}
                      onClick={() => {
                        sounds.playClick();
                        if (onRequestJoinRoom) {
                          onRequestJoinRoom(room.id);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-white/90 text-black text-[9px] font-mono font-bold uppercase tracking-widest rounded-sm flex items-center gap-1 shadow-sm shrink-0 transition-all cursor-pointer active:scale-95"
                    >
                      <ShieldCheck className="w-3 h-3 text-black" />
                      <span>Join</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[9px] text-white/40 pt-1 border-t border-white/5">
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Users className="w-2.5 h-2.5" />
                      <span>{room.participantCount} online</span>
                    </span>

                    {room.liveVoiceEnabled && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-1 py-0.2 rounded-sm border border-emerald-500/30">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        <span>Voice Active</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-white/30 ml-auto">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{room.timer}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
