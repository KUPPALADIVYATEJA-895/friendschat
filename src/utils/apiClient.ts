import type { Room, RoomSummary, SelfDestructDuration, Participant, ChatMessage } from '../types.ts';

// Helper to calculate expiry time
export function calculateExpiryTimestamp(timer: SelfDestructDuration): number | undefined {
  const now = Date.now();
  switch (timer) {
    case '5m': return now + 5 * 60 * 1000;
    case '10m': return now + 10 * 60 * 1000;
    case '30m': return now + 30 * 60 * 1000;
    case '1h': return now + 60 * 60 * 1000;
    case '3h': return now + 3 * 60 * 60 * 1000;
    case '24h': return now + 24 * 60 * 60 * 1000;
    case 'none':
    default:
      return undefined;
  }
}

// Generate 6-character room code: 4 digits + 2 uppercase letters (e.g. 4829XK)
export function generateClientRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  for (let i = 0; i < 2; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Generate base64url random ID in browser
export function generateRandomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Check if response is valid JSON (not HTML fallback from Vercel rewrites)
async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Local Storage helpers for client-side resiliency (e.g. Vercel static deployment)
const CLIENT_OPEN_ROOMS_KEY = 'fc_client_open_rooms';

function saveClientOpenRoom(room: RoomSummary) {
  try {
    const raw = localStorage.getItem(CLIENT_OPEN_ROOMS_KEY);
    const existing: RoomSummary[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((r) => r.id !== room.id);
    filtered.unshift(room);
    localStorage.setItem(CLIENT_OPEN_ROOMS_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (e) {
    console.warn('[ApiClient] Failed to save client room locally:', e);
  }
}

function getLocalClientOpenRooms(): RoomSummary[] {
  try {
    const raw = localStorage.getItem(CLIENT_OPEN_ROOMS_KEY);
    if (!raw) return [];
    const list: RoomSummary[] = JSON.parse(raw);
    const now = Date.now();
    return list.filter((r) => {
      const exp = calculateExpiryTimestamp(r.timer);
      return !exp || exp > now;
    });
  } catch {
    return [];
  }
}

export const apiClient = {
  // Create Room (with automatic Vercel static-hosting fallback)
  async createRoom(formData: {
    hostName: string;
    roomName: string;
    timer: SelfDestructDuration;
    openToJoin: boolean;
    liveVoiceEnabled: boolean;
    requestedCode?: string;
  }): Promise<{
    roomId: string;
    code: string;
    hostSecret: string;
    hostId: string;
    room: Room;
  }> {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await parseJsonResponse<any>(res);
      if (data && data.roomId && data.room) {
        // Successfully created via backend server!
        try {
          localStorage.setItem(`fc_client_room_${data.roomId}`, JSON.stringify(data.room));
          if (data.code) {
            localStorage.setItem(`fc_client_code_${data.code.toUpperCase()}`, data.roomId);
          }
          saveClientOpenRoom({
            id: data.room.id,
            code: data.room.code,
            name: data.room.name,
            hostName: data.room.hostName,
            timer: data.room.timer,
            openToJoin: data.room.openToJoin,
            liveVoiceEnabled: data.room.liveVoiceEnabled,
            createdAt: data.room.createdAt,
            participantCount: 1,
          });
        } catch (e) {}
        return data;
      }
    } catch (err) {
      console.warn('[ApiClient] Backend /api/rooms unavailable, initializing client-side monolith:', err);
    }

    // --- FALLBACK FOR VERCEL STATIC HOSTING ---
    // If backend is not available or returned HTML (Vercel rewrite), synthesize local monolith seamlessly
    const roomId = generateRandomId();
    const code = (formData.requestedCode && formData.requestedCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)) || generateClientRoomCode();
    const hostSecret = 'hs_' + generateRandomId() + generateRandomId();
    const hostId = 'usr_' + generateRandomId();
    const createdAt = Date.now();
    const expiresAt = calculateExpiryTimestamp(formData.timer);

    const initialHost: Participant = {
      id: hostId,
      name: formData.hostName.trim(),
      isHost: true,
      joinedAt: createdAt,
      lastActive: createdAt,
      isMuted: false,
      isSpeaking: false,
    };

    const newRoom: Room = {
      id: roomId,
      code,
      name: formData.roomName.trim() || `${formData.hostName.trim()}'s Monolith`,
      hostId,
      hostName: formData.hostName.trim(),
      hostSecret,
      timer: formData.timer,
      openToJoin: formData.openToJoin,
      liveVoiceEnabled: formData.liveVoiceEnabled,
      createdAt,
      expiresAt,
      participants: [initialHost],
      messages: [],
      pendingRequests: [],
    };

    // Save locally
    try {
      localStorage.setItem(`fc_client_room_${roomId}`, JSON.stringify(newRoom));
      localStorage.setItem(`fc_client_code_${code}`, roomId);
      saveClientOpenRoom({
        id: newRoom.id,
        code: newRoom.code,
        name: newRoom.name,
        hostName: newRoom.hostName,
        timer: newRoom.timer,
        openToJoin: newRoom.openToJoin,
        liveVoiceEnabled: newRoom.liveVoiceEnabled,
        createdAt: newRoom.createdAt,
        participantCount: 1,
      });
    } catch {}

    return {
      roomId,
      code,
      hostSecret,
      hostId,
      room: newRoom,
    };
  },

  // Get Room by ID
  async getRoom(roomId: string, searchParams?: URLSearchParams): Promise<Room | null> {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      const data = await parseJsonResponse<Room>(res);
      if (data && data.id) {
        return data;
      }
    } catch (err) {
      console.warn('[ApiClient] Backend getRoom unavailable:', err);
    }

    // --- FALLBACK FOR VERCEL ---
    // 1. Check local storage
    try {
      const local = localStorage.getItem(`fc_client_room_${roomId}`);
      if (local) {
        const parsed: Room = JSON.parse(local);
        if (!parsed.isBurned && (!parsed.expiresAt || parsed.expiresAt > Date.now())) {
          return parsed;
        }
      }
    } catch {}

    // 2. Reconstruct from URL search params if visiting shared link on Vercel
    if (searchParams) {
      const name = searchParams.get('n') || searchParams.get('name');
      const hostName = searchParams.get('h') || searchParams.get('host');
      const code = searchParams.get('c') || searchParams.get('code');
      const timer = (searchParams.get('t') || 'none') as SelfDestructDuration;
      const voice = searchParams.get('v') === '1' || searchParams.get('voice') === 'true';

      if (name || hostName || code) {
        const reconstructedRoom: Room = {
          id: roomId,
          code: code || generateClientRoomCode(),
          name: name || `${hostName || 'Host'}'s Monolith`,
          hostId: 'host_' + roomId,
          hostName: hostName || 'Host',
          hostSecret: '',
          timer: timer || 'none',
          openToJoin: true,
          liveVoiceEnabled: voice,
          createdAt: Date.now(),
          expiresAt: calculateExpiryTimestamp(timer),
          participants: [],
          messages: [],
        };
        return reconstructedRoom;
      }
    }

    return null;
  },

  // Search Room by Code
  async getRoomByCode(code: string): Promise<Room | null> {
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    try {
      const res = await fetch(`/api/rooms/code/${encodeURIComponent(cleanCode)}`);
      const data = await parseJsonResponse<any>(res);
      if (data && (data.room || data.id)) {
        return data.room || data;
      }
    } catch (err) {
      console.warn('[ApiClient] Backend getRoomByCode unavailable:', err);
    }

    // Check local storage
    try {
      const roomId = localStorage.getItem(`fc_client_code_${cleanCode}`);
      if (roomId) {
        return await this.getRoom(roomId);
      }
      // Scan all open rooms
      const open = getLocalClientOpenRooms();
      const match = open.find((r) => r.code?.toUpperCase() === cleanCode);
      if (match) {
        return await this.getRoom(match.id);
      }

      // Deep scan all localStorage keys for any stored room matching cleanCode
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fc_client_room_') || key.startsWith('fc_room_'))) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const r = JSON.parse(raw);
              if (r && r.code && r.code.replace(/[^A-Z0-9]/gi, '').toUpperCase() === cleanCode) {
                return r;
              }
            }
          } catch {}
        }
      }
    } catch {}

    return null;
  },

  // Get Live Open Rooms
  async getOpenRooms(): Promise<RoomSummary[]> {
    try {
      const res = await fetch('/api/rooms/open');
      const data = await parseJsonResponse<RoomSummary[]>(res);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('[ApiClient] Backend getOpenRooms unavailable:', err);
    }

    // Return client-side open rooms
    return getLocalClientOpenRooms();
  },

  // Join Room
  async joinRoom(roomId: string, participantName: string, participantId: string): Promise<{ success: boolean; room: Room }> {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName,
          participantId,
          isHost: false,
        }),
      });

      const data = await parseJsonResponse<any>(res);
      if (data && data.room) {
        return data;
      }
    } catch (err) {
      console.warn('[ApiClient] Backend joinRoom unavailable, joining client-side:', err);
    }

    // Client-side join
    let room = await this.getRoom(roomId);
    if (!room) {
      throw new Error('This monolith link does not exist or has already been dissolved.');
    }

    const participant: Participant = {
      id: participantId,
      name: participantName,
      isHost: false,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    };

    if (!room.participants.some((p) => p.id === participantId)) {
      room.participants.push(participant);
      try {
        localStorage.setItem(`fc_client_room_${roomId}`, JSON.stringify(room));
      } catch {}
    }

    return { success: true, room };
  },

  // Burn / Dissolve Room
  async burnRoom(roomId: string, hostSecret?: string): Promise<boolean> {
    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostSecret }),
      });
    } catch {}

    try {
      localStorage.removeItem(`fc_client_room_${roomId}`);
      const raw = localStorage.getItem(CLIENT_OPEN_ROOMS_KEY);
      if (raw) {
        const list: RoomSummary[] = JSON.parse(raw);
        localStorage.setItem(CLIENT_OPEN_ROOMS_KEY, JSON.stringify(list.filter((r) => r.id !== roomId)));
      }
    } catch {}

    return true;
  },
};
