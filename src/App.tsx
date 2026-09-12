import React, { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import type {
  Room,
  Participant,
  ChatMessage,
  JoinRequest,
  SelfDestructDuration,
  WSMessage,
  RoomEventLog,
} from './types.ts';
import { CyberCanvas } from './components/CyberCanvas.tsx';
import { CreateRoomPage } from './components/CreateRoomPage.tsx';
import { ShareRoomPage } from './components/ShareRoomPage.tsx';
import { ChatRoomPage } from './components/ChatRoomPage.tsx';
import { JoinModal } from './components/JoinModal.tsx';
import { HostApprovalModal } from './components/HostApprovalModal.tsx';
import { DisintegratedRoomView } from './components/DisintegratedRoomView.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { sounds } from './utils/soundEffects.ts';
import { audioEngine } from './utils/audioStream.ts';
import { apiClient } from './utils/apiClient.ts';

export default function App() {
  // App views: 'create' | 'share' | 'chat' | 'burned'
  const [view, setView] = useState<'create' | 'share' | 'chat' | 'burned'>('create');
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  
  // Current user state
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('fc_user_id') || crypto.randomUUID();
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('fc_user_name') || '';
  });
  const [hostSecret, setHostSecret] = useState<string>('');

  // Active room state
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [burnReason, setBurnReason] = useState('Room disintegrating');

  // Modals & Prompts
  const [joinPromptRoom, setJoinPromptRoom] = useState<Room | null>(null);
  const [joinSource, setJoinSource] = useState<'link' | 'open_to_join'>('link');
  const [isWaitingForHostApproval, setIsWaitingForHostApproval] = useState(false);
  const [activeJoinRequestId, setActiveJoinRequestId] = useState<string | null>(null);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<JoinRequest | null>(null);
  
  // Real-time Event Logs (join, leave, system)
  const [eventLogs, setEventLogs] = useState<RoomEventLog[]>([]);

  // Typing indicators
  const [typingPeers, setTypingPeers] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const pollApprovalIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save user ID to localStorage
  useEffect(() => {
    localStorage.setItem('fc_user_id', currentUserId);
  }, [currentUserId]);

  // Check URL on load or navigation for room invite (e.g. /r/:roomId, /room/:roomId, ?r=:roomId)
  useEffect(() => {
    const checkUrlForRoom = async () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      let targetRoomId = searchParams.get('r') || searchParams.get('room') || searchParams.get('roomId');

      if (!targetRoomId) {
        // Matches /r/<roomId> or /room/<roomId>
        const match = path.match(/^\/(?:r|room)\/([^/?#]+)/i);
        if (match && match[1]) {
          targetRoomId = decodeURIComponent(match[1]);
        }
      }

      if (targetRoomId) {
        setJoinSource('link');
        try {
          const roomData = await apiClient.getRoom(targetRoomId, searchParams);
          if (roomData) {
            const storedSecret = localStorage.getItem(`fc_host_secret_${targetRoomId}`);
            if (storedSecret) {
              setHostSecret(storedSecret);
              setCurrentRoom(roomData);
              setView('chat');
            } else {
              setJoinPromptRoom(roomData);
            }
          } else {
            setBurnReason('This secret monolith link does not exist or has already been dissolved.');
            setView('burned');
          }
        } catch (err) {
          console.error('Failed to load room from URL:', err);
          setBurnReason('Could not connect to the monolith session. Please check your internet connection.');
          setView('burned');
        }
      }
    };

    checkUrlForRoom();

    const handlePopState = () => {
      checkUrlForRoom();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // BroadcastChannel for instant local cross-tab fallback
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('friendchat_channel');
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const data = event.data as WSMessage;
        handleIncomingWSMessage(data);
      };
      return () => bc.close();
    }
  }, [currentRoom]);

  // Connect WebSocket when room is active
  useEffect(() => {
    if (!currentRoom) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to FriendChat server');
        const isHost = Boolean(hostSecret);
        const participant: Participant = {
          id: currentUserId,
          name: currentUserName || (isHost ? currentRoom.hostName : 'Cyber Peer'),
          isHost,
          joinedAt: Date.now(),
          lastActive: Date.now(),
        };

        ws?.send(
          JSON.stringify({
            type: 'join',
            roomId: currentRoom.id,
            participant,
            hostSecret: hostSecret || undefined,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage;
          handleIncomingWSMessage(data);
        } catch (err) {
          console.error('WS parse error', err);
        }
      };

      ws.onerror = () => {
        console.debug('[Network] Server socket offline or static deployment; operating in client mesh mode.');
      };

      ws.onclose = () => {
        console.debug('WebSocket closed');
      };
    } catch (err) {
      console.debug('[Network] WebSocket init skipped on static client:', err);
    }

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      wsRef.current = null;
    };
  }, [currentRoom?.id, hostSecret]);

  // Complete guest registration after host clearance approval
  const finalizeApprovedGuestJoin = async (roomId: string, guestName: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: guestName,
          participantId: currentUserId,
          isHost: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to register participant');
      }

      const data = await res.json();
      sounds.playJoinAlert();
      setIsWaitingForHostApproval(false);
      setActiveJoinRequestId(null);
      setJoinPromptRoom(null);
      if (pollApprovalIntervalRef.current) {
        clearInterval(pollApprovalIntervalRef.current);
        pollApprovalIntervalRef.current = null;
      }

      setCurrentRoom(data.room);
      setView('chat');
      window.history.pushState({}, '', `/r/${roomId}`);
    } catch (err) {
      console.error('Error finalizing guest join', err);
      alert('Error entering monolith. Please try again.');
      setIsWaitingForHostApproval(false);
      setActiveJoinRequestId(null);
    }
  };

  // Central message dispatcher
  const handleIncomingWSMessage = (data: WSMessage) => {
    switch (data.type) {
      case 'room_state': {
        setCurrentRoom((prev) => {
          if (!prev) return data.room;
          return {
            ...data.room,
            messages: data.room.messages || prev.messages,
          };
        });
        break;
      }

      case 'chat_message': {
        sounds.playMessageReceived();
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === data.message.id)) return prev;
          return {
            ...prev,
            messages: [...prev.messages, data.message],
          };
        });
        break;
      }

      case 'typing': {
        if (data.isTyping) {
          setTypingPeers((prev) => {
            if (prev.includes(data.participantName)) return prev;
            return [...prev, data.participantName];
          });
        } else {
          setTypingPeers((prev) => prev.filter((name) => name !== data.participantName));
        }
        break;
      }

      case 'voice_state': {
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          const updatedParts = prev.participants.map((p) => {
            if (p.id === data.participantId) {
              return { ...p, isMuted: data.isMuted, isSpeaking: data.isSpeaking };
            }
            return p;
          });
          return { ...prev, participants: updatedParts };
        });
        break;
      }

      case 'voice_audio_chunk': {
        if (data.participantId !== currentUserId) {
          audioEngine.playIncomingAudioChunk(
            data.participantId,
            data.audioData,
            data.sampleRate,
            data.seq,
            data.timestamp
          );
        }
        break;
      }

      case 'webrtc_signal': {
        if (data.senderId !== currentUserId && (!data.targetId || data.targetId === currentUserId)) {
          audioEngine.handleWebRTCSignal(data.senderId, data.signal);
        }
        break;
      }

      case 'room_burned': {
        sounds.playBurnAlarm();
        setBurnReason(data.reason || 'Room disintegrated into the void.');
        setCurrentRoom(null);
        setView('burned');
        break;
      }

      case 'participant_joined': {
        sounds.playJoinAlert();
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          const exists = prev.participants.some((p) => p.id === data.participant.id);
          const updatedParts = exists
            ? prev.participants.map((p) => (p.id === data.participant.id ? data.participant : p))
            : [...prev.participants, data.participant];
          return { ...prev, participants: updatedParts };
        });

        setEventLogs((prev) => [
          ...prev.slice(-40),
          {
            id: crypto.randomUUID(),
            type: 'join',
            message: `@${data.participant.name} joined the monolith`,
            timestamp: Date.now(),
          },
        ]);
        break;
      }

      case 'participant_left': {
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.filter((p) => p.id !== data.participantId),
          };
        });

        setEventLogs((prev) => [
          ...prev.slice(-40),
          {
            id: crypto.randomUUID(),
            type: 'leave',
            message: `@${data.participantName} disconnected`,
            timestamp: Date.now(),
          },
        ]);
        break;
      }

      case 'join_request_received': {
        // ONLY the host receives and processes clearance approval prompts
        if (Boolean(hostSecret)) {
          sounds.playJoinAlert();
          setPendingJoinRequest(data.request);
        }
        break;
      }

      case 'join_request_response': {
        if (data.approved) {
          if (joinPromptRoom && isWaitingForHostApproval) {
            finalizeApprovedGuestJoin(data.roomId, currentUserName);
          }
        } else {
          if (isWaitingForHostApproval) {
            alert('Access clearance was denied by the monolith host.');
            setIsWaitingForHostApproval(false);
            setActiveJoinRequestId(null);
            if (pollApprovalIntervalRef.current) {
              clearInterval(pollApprovalIntervalRef.current);
              pollApprovalIntervalRef.current = null;
            }
          }
        }
        break;
      }
    }
  };

  // Polling fallback when waiting for host clearance approval
  useEffect(() => {
    if (!isWaitingForHostApproval || !joinPromptRoom || !activeJoinRequestId) {
      if (pollApprovalIntervalRef.current) {
        clearInterval(pollApprovalIntervalRef.current);
        pollApprovalIntervalRef.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/rooms/${joinPromptRoom.id}/join-request-status/${activeJoinRequestId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'approved') {
            finalizeApprovedGuestJoin(joinPromptRoom.id, currentUserName);
          } else if (data.status === 'rejected') {
            alert('Access clearance was denied by the monolith host.');
            setIsWaitingForHostApproval(false);
            setActiveJoinRequestId(null);
          }
        }
      } catch (err) {
        // silent poll retry
      }
    };

    const interval = setInterval(checkStatus, 2000);
    pollApprovalIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
      pollApprovalIntervalRef.current = null;
    };
  }, [isWaitingForHostApproval, joinPromptRoom, activeJoinRequestId, currentUserName]);

  // Create Room Handler
  const handleCreateRoom = async (formData: {
    hostName: string;
    roomName: string;
    timer: SelfDestructDuration;
    openToJoin: boolean;
    liveVoiceEnabled: boolean;
  }) => {
    setIsCreating(true);
    try {
      const data = await apiClient.createRoom(formData);

      setCurrentUserName(formData.hostName);
      localStorage.setItem('fc_user_name', formData.hostName);
      setCurrentUserId(data.hostId);
      localStorage.setItem('fc_user_id', data.hostId);
      setHostSecret(data.hostSecret);
      localStorage.setItem(`fc_host_secret_${data.roomId}`, data.hostSecret);

      const roomData: Room = {
        ...data.room,
        hostSecret: data.hostSecret,
        participants: [
          {
            id: data.hostId,
            name: formData.hostName,
            isHost: true,
            joinedAt: Date.now(),
            lastActive: Date.now(),
          },
        ],
        messages: [],
      };

      setCurrentRoom(roomData);

      // On Vercel / static hosts, include query params in URL so shared links reconstruct anywhere
      const queryParams = new URLSearchParams({
        c: data.code,
        h: formData.hostName,
        n: formData.roomName || `${formData.hostName}'s Monolith`,
        t: formData.timer,
        v: formData.liveVoiceEnabled ? '1' : '0',
      });
      window.history.pushState({}, '', `/r/${data.roomId}?${queryParams.toString()}`);
      setView('share');
    } catch (err) {
      console.error('Error in handleCreateRoom:', err);
      alert('Error initializing secret monolith. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Join Room as Guest Handler
  const handleGuestJoin = async (guestName: string) => {
    if (!joinPromptRoom) return;

    setCurrentUserName(guestName);
    localStorage.setItem('fc_user_name', guestName);

    // If joining as an unknown person via the OPEN TO JOIN public list:
    // Ask for host approval (clearance request sent to host only).
    if (joinSource === 'open_to_join') {
      setIsWaitingForHostApproval(true);
      try {
        const res = await fetch(`/api/rooms/${joinPromptRoom.id}/join-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestName, guestId: currentUserId }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setActiveJoinRequestId(data.requestId || data.request?.id);
        } else {
          // If running on static host where request clearance endpoint is not active, auto-approve
          finalizeApprovedGuestJoin(joinPromptRoom.id, guestName);
        }
      } catch (err: any) {
        finalizeApprovedGuestJoin(joinPromptRoom.id, guestName);
      }
    } else {
      // If user is joining THROUGH THE LINK (secret link or URL invite):
      // Directly joins the room immediately.
      try {
        const data = await apiClient.joinRoom(joinPromptRoom.id, guestName, currentUserId);
        sounds.playJoinAlert();
        setJoinPromptRoom(null);
        setCurrentRoom(data.room);
        setView('chat');
        window.history.pushState({}, '', `/r/${joinPromptRoom.id}`);
      } catch (err: any) {
        console.error('Error joining room via link:', err);
        throw err;
      }
    }
  };

  // Request to join an open room directly from the Open to Join list
  const handleRequestJoinOpenRoom = async (roomId: string) => {
    setJoinSource('open_to_join');
    try {
      const roomData = await apiClient.getRoom(roomId);
      if (roomData) {
        setJoinPromptRoom(roomData);
      } else {
        alert('Room is no longer active or has dissolved.');
      }
    } catch {
      alert('Failed to connect to room.');
    }
  };

  // Request to join a room directly with the 6-character code (4 digits + 2 letters)
  const handleJoinWithCode = async (code: string) => {
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    let roomData = await apiClient.getRoomByCode(cleanCode);
    if (!roomData) {
      // Auto-provision channel with this code so the user is never blocked or faced with dead ends
      try {
        const created = await apiClient.createRoom({
          hostName: currentUserName || 'Cyber Peer',
          roomName: `Monolith ${cleanCode}`,
          timer: 'none',
          openToJoin: true,
          liveVoiceEnabled: true,
          requestedCode: cleanCode,
        });
        roomData = created.room;
      } catch (err) {
        throw new Error(`Could not connect to monolith '${cleanCode}'. Please verify network status.`);
      }
    }
    const safeRoom: Room = { ...roomData, hostSecret: undefined as any };
    setJoinSource('link'); // Code-based direct entry behaves like secret link (instant entry without clearance delay)
    setJoinPromptRoom(safeRoom);
  };

  // Host approves / denies join request
  const handleResolveJoinRequest = async (requestId: string, approved: boolean) => {
    if (!currentRoom || !hostSecret) return;

    try {
      await fetch(`/api/rooms/${currentRoom.id}/resolve-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          approved,
          hostSecret,
        }),
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'resolve_join_request',
            roomId: currentRoom.id,
            requestId,
            approved,
            hostSecret,
          })
        );
      }
    } catch (err) {
      console.error('Error resolving request', err);
    } finally {
      setPendingJoinRequest(null);
    }
  };

  // Send Message
  const handleSendMessage = (msgData: {
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    documentUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }) => {
    if (!currentRoom) return;

    const isHost = Boolean(hostSecret);
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: currentRoom.id,
      senderId: currentUserId,
      senderName: currentUserName || (isHost ? currentRoom.hostName : 'Peer'),
      isHost,
      text: msgData.text,
      imageUrl: msgData.imageUrl,
      audioUrl: msgData.audioUrl,
      audioDuration: msgData.audioDuration,
      documentUrl: msgData.documentUrl,
      fileName: msgData.fileName,
      fileSize: msgData.fileSize,
      fileType: msgData.fileType,
      timestamp: Date.now(),
    };

    // Optimistic local update
    setCurrentRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, newMsg],
      };
    });

    // Send via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          roomId: currentRoom.id,
          message: newMsg,
        })
      );
    }

    // Broadcast fallback for local multi-tab
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'chat_message',
        roomId: currentRoom.id,
        message: newMsg,
      });
    }
  };

  // Typing signal
  const handleSendTyping = (isTyping: boolean) => {
    if (!currentRoom) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          roomId: currentRoom.id,
          participantId: currentUserId,
          participantName: currentUserName || 'Peer',
          isTyping,
        })
      );
    }
  };

  // Live Voice Call Chunk Broadcast (with sequence and timestamp for distance-immune jitter buffer)
  const handleSendVoiceChunk = (audioData: string, sampleRate: number, seq?: number, timestamp?: number) => {
    if (!currentRoom) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'voice_audio_chunk',
          roomId: currentRoom.id,
          participantId: currentUserId,
          participantName: currentUserName || (Boolean(hostSecret) ? currentRoom.hostName : 'Peer'),
          audioData,
          sampleRate,
          seq,
          timestamp,
        })
      );
    }
  };

  // WebRTC Signaling Relay (for direct high-speed P2P voice call)
  const handleSendWebRTCSignal = (targetId: string, signal: any) => {
    if (!currentRoom) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'webrtc_signal',
          roomId: currentRoom.id,
          senderId: currentUserId,
          targetId,
          signal,
        })
      );
    }
  };

  // Live Voice Mute / Speaking state broadcast
  const handleSendVoiceState = (isMuted: boolean, isSpeaking: boolean) => {
    if (!currentRoom) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'voice_state',
          roomId: currentRoom.id,
          participantId: currentUserId,
          isMuted,
          isSpeaking,
        })
      );
    }
  };

  // Host Burns Room
  const handleBurnRoom = async () => {
    if (!currentRoom || !hostSecret) return;

    try {
      await apiClient.burnRoom(currentRoom.id, hostSecret);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'burn_room',
            roomId: currentRoom.id,
            hostSecret,
          })
        );
      }
    } catch (err) {
      console.error('Error burning room', err);
    } finally {
      localStorage.removeItem(`fc_host_secret_${currentRoom.id}`);
      setBurnReason('You ignited the burn protocol. Monolith permanently deleted.');
      setCurrentRoom(null);
      setView('burned');
    }
  };

  // Reset to Home
  const handleResetHome = () => {
    setCurrentRoom(null);
    setHostSecret('');
    setJoinPromptRoom(null);
    setIsWaitingForHostApproval(false);
    setActiveJoinRequestId(null);
    setView('create');
    window.history.pushState({}, '', '/');
  };

  return (
    <main className="relative min-h-screen bg-[#09090b] text-[#f4f4f5] overflow-x-hidden font-sans selection:bg-white/20 selection:text-white">
      {/* 3D Parallax Grid & Escaping Glowing Dots Canvas Underlay */}
      <CyberCanvas />

      {/* View Routing */}
      {view === 'create' && (
        <CreateRoomPage
          onCreateRoom={handleCreateRoom}
          onRequestJoinRoom={handleRequestJoinOpenRoom}
          onJoinWithCode={handleJoinWithCode}
          isCreating={isCreating}
        />
      )}

      {view === 'share' && currentRoom && (
        <ShareRoomPage
          roomId={currentRoom.id}
          code={currentRoom.code}
          roomName={currentRoom.name}
          onEnterRoom={() => setView('chat')}
        />
      )}

      {view === 'chat' && currentRoom && (
        <ChatRoomPage
          room={currentRoom}
          currentUserId={currentUserId}
          isHost={Boolean(hostSecret)}
          eventLogs={eventLogs}
          onSendMessage={handleSendMessage}
          onBurnRoom={handleBurnRoom}
          onSendTyping={handleSendTyping}
          typingPeers={typingPeers}
          onSendVoiceChunk={handleSendVoiceChunk}
          onSendVoiceState={handleSendVoiceState}
          onSendWebRTCSignal={handleSendWebRTCSignal}
          onLeaveRoom={handleResetHome}
        />
      )}

      {view === 'burned' && (
        <DisintegratedRoomView
          reason={burnReason}
          onReset={handleResetHome}
        />
      )}

      {/* Guest Join Prompt Modal */}
      {joinPromptRoom && (
        <JoinModal
          room={joinPromptRoom}
          joinSource={joinSource}
          onJoin={handleGuestJoin}
          onClose={() => {
            setJoinPromptRoom(null);
            setIsWaitingForHostApproval(false);
            setActiveJoinRequestId(null);
          }}
          isWaitingForHostApproval={isWaitingForHostApproval}
        />
      )}

      {/* Host Clearance Approval Notification Toast (HOST ONLY) */}
      {pendingJoinRequest && Boolean(hostSecret) && (
        <HostApprovalModal
          request={pendingJoinRequest}
          onApprove={(reqId) => handleResolveJoinRequest(reqId, true)}
          onReject={(reqId) => handleResolveJoinRequest(reqId, false)}
        />
      )}

      {/* Discrete Eye Symbol in the left bottom corner of the page (Non-sticky absolute placement, discreet size matching reference) */}
      <button
        id="admin-eye-button"
        onClick={() => setIsAdminPortalOpen(true)}
        title="Admin Portal"
        aria-label="Admin Monitoring Portal"
        className="absolute bottom-2.5 left-2.5 z-20 opacity-20 hover:opacity-40 transition-opacity duration-200 cursor-pointer p-0 bg-transparent border-0 border-transparent shadow-none hover:shadow-none hover:bg-transparent hover:border-transparent outline-none focus:outline-none focus:ring-0 active:opacity-50 select-none flex items-center justify-center"
      >
        <Eye className="w-3 h-3 text-cyan-400/80 stroke-[1.5]" />
      </button>

      {/* Admin Monitoring Portal Modal */}
      <AdminPortal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
      />
    </main>
  );
}
