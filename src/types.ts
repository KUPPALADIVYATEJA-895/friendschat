export type SelfDestructDuration = 
  | '5m'
  | '10m'
  | '30m'
  | '1h'
  | '3h'
  | '24h'
  | 'none';

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  lastActive: number;
  avatarColor?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  isHost: boolean;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  documentUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  timestamp: number;
  expiresAt?: number;
}

export interface JoinRequest {
  id: string;
  roomId: string;
  guestName: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Room {
  id: string;
  code?: string;
  name: string;
  hostId: string;
  hostName: string;
  hostSecret: string;
  timer: SelfDestructDuration;
  openToJoin: boolean;
  liveVoiceEnabled: boolean;
  createdAt: number;
  expiresAt?: number;
  isBurned?: boolean;
  participants: Participant[];
  messages: ChatMessage[];
  pendingRequests?: JoinRequest[];
}

export interface RoomSummary {
  id: string;
  code?: string;
  name: string;
  hostName: string;
  timer: SelfDestructDuration;
  openToJoin: boolean;
  liveVoiceEnabled: boolean;
  createdAt: number;
  participantCount: number;
}

export interface RoomEventLog {
  id: string;
  type: 'join' | 'leave' | 'voice' | 'system';
  message: string;
  timestamp: number;
}

export interface DailyVisitorRecord {
  date: string;
  label: string;
  count: number;
  activeThreads: number;
  durationBuckets: {
    seconds: number;
    minutes: number;
    hours: number;
    avgFormatted: string;
  };
}

export interface AdminActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: number;
  device: 'desktop' | 'mobile';
  roomId?: string;
  roomName?: string;
  hostName?: string;
  roomLink?: string;
}

export interface AdminMonitoringData {
  liveNow: number;
  todayVisitors: number;
  thisWeekVisitors: number;
  thisMonthVisitors: number;
  lastMonthVisitors: number;
  visitorsLast14Days: DailyVisitorRecord[];
  durationBuckets: { seconds: number; minutes: number; hours: number; avgFormatted: string };
  weeklyReport: { day: string; count: number; percent: number; color: string }[];
  monthlyReport: { week: string; count: number; percent: number; color: string }[];
  deviceSplit: { desktop: number; mobile: number; total: number };
  topRooms: { id: string; name: string; hostName: string; visits: number; active: boolean; roomLink: string }[];
  recentActivity: AdminActivityItem[];
}

export type WSMessage =
  | { type: 'join'; roomId: string; participant: Participant; hostSecret?: string }
  | { type: 'leave'; roomId: string; participantId: string }
  | { type: 'chat_message'; roomId: string; message: ChatMessage }
  | { type: 'burn_room'; roomId: string; hostSecret: string }
  | { type: 'typing'; roomId: string; participantId: string; participantName: string; isTyping: boolean }
  | { type: 'voice_state'; roomId: string; participantId: string; isMuted: boolean; isSpeaking: boolean }
  | { type: 'voice_audio_chunk'; roomId: string; participantId: string; participantName?: string; audioData: string; sampleRate?: number; seq?: number; timestamp?: number }
  | { type: 'webrtc_signal'; roomId: string; senderId: string; targetId?: string; signal: any }
  | { type: 'join_request'; roomId: string; guestName: string; requestId: string }
  | { type: 'resolve_join_request'; roomId: string; requestId: string; approved: boolean; hostSecret: string }
  | { type: 'toggle_open_to_join'; roomId: string; openToJoin: boolean; hostSecret: string }
  | { type: 'participant_joined'; roomId: string; participant: Participant }
  | { type: 'participant_left'; roomId: string; participantId: string; participantName: string }
  | { type: 'room_state'; room: Room }
  | { type: 'room_burned'; roomId: string; reason: string }
  | { type: 'join_request_received'; request: JoinRequest }
  | { type: 'join_request_response'; requestId: string; approved: boolean; roomId: string }
  | { type: 'error'; message: string };
