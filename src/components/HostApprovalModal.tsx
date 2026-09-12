import React from 'react';
import { ShieldAlert, Check, X, User } from 'lucide-react';
import type { JoinRequest } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';

interface HostApprovalModalProps {
  request: JoinRequest | null;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const HostApprovalModal: React.FC<HostApprovalModalProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  if (!request) return null;

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-[#0c0d11]/95 border border-white/30 rounded-sm p-4 shadow-[0_0_40px_rgba(255,255,255,0.15)] animate-in slide-in-from-top duration-300 backdrop-blur-xl holo-card select-none">
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-sm bg-white/10 text-white border border-white/20 shrink-0">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>

        <div className="space-y-1 flex-1 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-widest text-white/80 uppercase">
              [CLEARANCE REQUEST]
            </span>
            <span className="text-[8px] text-white/40">
              JUST NOW
            </span>
          </div>

          <div className="text-xs text-white/90">
            <span className="font-bold text-white">@{request.guestName}</span> is requesting relay access.
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-white/10 font-mono">
        <button
          type="button"
          id="btn-deny-guest-request"
          onClick={() => {
            sounds.playClick();
            onReject(request.id);
          }}
          className="w-full bg-red-950/30 hover:bg-red-950/60 text-red-300 border border-red-500/40 text-[10px] font-bold tracking-widest py-2 px-3 rounded-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase"
        >
          <X className="w-3 h-3" />
          <span>DENY</span>
        </button>

        <button
          type="button"
          id="btn-grant-guest-request"
          onClick={() => {
            sounds.playClick();
            onApprove(request.id);
          }}
          className="w-full bg-white hover:bg-white/90 text-black text-[10px] font-bold tracking-widest py-2 px-3 rounded-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.2)] uppercase active:scale-95"
        >
          <Check className="w-3 h-3" />
          <span>GRANT ACCESS</span>
        </button>
      </div>
    </div>
  );
};
