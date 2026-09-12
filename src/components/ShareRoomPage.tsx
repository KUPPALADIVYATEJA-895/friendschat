import React, { useState } from 'react';
import { Link as LinkIcon, Copy, Check, Send, Flame, KeyRound, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';
import confetti from 'canvas-confetti';

interface ShareRoomPageProps {
  roomId: string;
  code?: string;
  roomName: string;
  onEnterRoom: () => void;
}

export const ShareRoomPage: React.FC<ShareRoomPageProps> = ({
  roomId,
  code,
  roomName,
  onEnterRoom,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Generate full shareable URL (preserving query params for standalone/Vercel link resolution)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${roomId}${window.location.search || ''}`
    : `https://friendchat.monolith/r/${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      sounds.playClick();
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#67e8f9', '#94a3b8'],
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      sounds.playClick();
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#38bdf8', '#ffffff', '#a855f7'],
      });
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSendToFriend = async () => {
    sounds.playClick();
    const shareText = code
      ? `Join my encrypted FriendChat Monolith room!\nRoom Code: ${code}\nOr join directly via link:`
      : `Enter our encrypted one-on-one cyber monolith session:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `FriendChat - Join ${roomName || 'Secret Monolith'}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to copy link
      }
    }
    handleCopyLink();
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between p-4 sm:p-6 z-10 select-none">
      {/* Top Header Centered */}
      <div className="w-full flex flex-col justify-center items-center text-center mb-4 sm:mb-6 z-10 border-b border-white/10 pb-4">
        <h1 className="text-xl sm:text-2xl tracking-[0.25em] font-bold uppercase text-white">
          FRIENDCHAT
        </h1>
      </div>

      {/* Main Center Card */}
      <div className="w-full max-w-[580px] mx-auto my-auto flex flex-col items-center py-4">
        {/* Share Monolith Card */}
        <div 
          id="share-link-card"
          className="w-full p-5 sm:p-7 border border-white/10 bg-white/5 backdrop-blur-xl rounded-sm relative overflow-hidden group shadow-2xl holo-card glow-accent space-y-5"
        >
          {/* Top highlight gradient line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Room Monolith Generated
            </h3>
          </div>

          {/* 6-DIGIT/ALPHABET CODE SECTION (4 Digits + 2 Letters) */}
          {code && (
            <div className="bg-gradient-to-br from-cyan-950/40 via-black/80 to-purple-950/30 border border-cyan-500/40 rounded-sm p-4 text-center space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-start">
                <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] uppercase tracking-widest">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>JOIN CODE</span>
                </div>
              </div>

              {/* Big Monospace Code Display */}
              <div 
                id="generated-room-code-display"
                onClick={handleCopyCode}
                className="bg-black/90 border border-cyan-400/40 hover:border-cyan-400 py-3.5 px-4 rounded-sm flex items-center justify-center gap-3 cursor-pointer group transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]"
                title="Click to copy room code"
              >
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-[0.35em] text-cyan-300 group-hover:text-cyan-200 uppercase pl-[0.35em]">
                  {code}
                </span>
                <div className="ml-2 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[9px] font-mono text-cyan-300 flex items-center gap-1">
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-cyan-300" />
                      <span>COPY</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Secret Link Display Box */}
          <div className="space-y-1.5">
            <div 
              id="secret-link-display-box"
              onClick={handleCopyLink}
              className="bg-black/70 border border-white/20 hover:border-white/50 rounded-sm p-3 flex items-center gap-3 cursor-pointer group transition-all duration-200"
            >
              <LinkIcon className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
              <span 
                id="text-secret-link-url"
                className="text-xs font-mono text-white/90 truncate flex-1 tracking-tight select-all"
              >
                {shareUrl}
              </span>
              <div className="shrink-0 text-white/40 group-hover:text-white transition-colors">
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          {/* Action Row: Copy Link & Send to Friend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Copy Link Button */}
            <button
              type="button"
              id="btn-copy-link"
              onClick={handleCopyLink}
              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[10px] sm:text-xs font-mono font-bold tracking-widest py-3 px-4 rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer uppercase active:scale-[0.99]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">COPIED LINK</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white/70" />
                  <span>COPY LINK</span>
                </>
              )}
            </button>

            {/* Send to Friend Button */}
            <button
              type="button"
              id="btn-send-to-friend"
              onClick={handleSendToFriend}
              className="w-full bg-white hover:bg-white/90 text-black text-[10px] sm:text-xs font-mono font-bold tracking-widest py-3 px-4 rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.99] uppercase"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              <span>SHARE INVITE</span>
            </button>
          </div>

          {/* Open Chat Room Button */}
          <button
            type="button"
            id="btn-open-chat-room"
            onClick={() => {
              sounds.playClick();
              onEnterRoom();
            }}
            className="w-full bg-white/5 hover:bg-white/15 text-white border border-white/25 text-[10px] sm:text-xs font-mono font-bold tracking-widest py-3.5 px-6 rounded-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] uppercase"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>ENTER CHAT ROOM</span>
          </button>
        </div>
      </div>
    </div>
  );
};
