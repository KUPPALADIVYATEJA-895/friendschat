import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Users,
  Image as ImageIcon,
  Mic,
  MicOff,
  Send,
  Radio,
  Clock,
  Play,
  Pause,
  X,
  Volume2,
  Volume1,
  VolumeX,
  Volume,
  Share2,
  Sparkles,
  LogOut,
  Copy,
  Check,
  Shield,
  Activity,
  ArrowRight,
  Smile,
  Sliders,
  PhoneCall,
  PhoneOff,
  Headphones,
  Info,
  Zap,
  Wifi,
  FileText,
  Paperclip,
  Download,
  Eye,
  ExternalLink,
  ClipboardPaste,
} from 'lucide-react';
import type { Room, ChatMessage, Participant, RoomEventLog } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';
import { audioEngine, type AudioSignalStats } from '../utils/audioStream.ts';
import { ParticipantDrawer } from './ParticipantDrawer.tsx';
import { BurnConfirmationModal } from './BurnConfirmationModal.tsx';
import { EmojiPicker } from './EmojiPicker.tsx';

interface ChatRoomPageProps {
  room: Room;
  currentUserId: string;
  isHost: boolean;
  eventLogs?: RoomEventLog[];
  onSendMessage: (msg: {
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    documentUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }) => void;
  onBurnRoom: () => Promise<void>;
  onSendTyping: (isTyping: boolean) => void;
  typingPeers: string[];
  onSendVoiceChunk?: (audioData: string, sampleRate: number, seq?: number, timestamp?: number) => void;
  onSendVoiceState?: (isMuted: boolean, isSpeaking: boolean) => void;
  onSendWebRTCSignal?: (targetId: string, signal: any) => void;
  onLeaveRoom?: () => void;
  isConnected?: boolean;
}

export const ChatRoomPage: React.FC<ChatRoomPageProps> = ({
  room,
  currentUserId,
  isHost,
  eventLogs = [],
  onSendMessage,
  onBurnRoom,
  onSendTyping,
  typingPeers,
  onSendVoiceChunk,
  onSendVoiceState,
  onSendWebRTCSignal,
  onLeaveRoom,
  isConnected = true,
}) => {
  const [inputText, setInputText] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    size?: number;
    type?: string;
  } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lastPastedSource, setLastPastedSource] = useState<'clipboard' | null>(null);

  // Voice Recording (voice note message) state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Live Voice Call state
  const [isLiveMicActive, setIsLiveMicActive] = useState(false);
  const [isLiveMicMuted, setIsLiveMicMuted] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [callVolume, setCallVolume] = useState<number>(() => {
    return Math.round(audioEngine.getCallVolume() * 100);
  });
  const [longDistanceBooster, setLongDistanceBooster] = useState<boolean>(() => {
    return audioEngine.isLongDistanceBoosterEnabled();
  });
  const [signalStats, setSignalStats] = useState<AudioSignalStats>(() => {
    return audioEngine.getSignalStats();
  });
  const [testingVolume, setTestingVolume] = useState(false);

  // Remaining time for self-destruct
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Audio Playback state for voice message notes
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Mobile virtual viewport height tracking to ensure composer stays pinned above keyboard
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDocument) setPreviewDocument(null);
        if (lightboxImage) setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [previewDocument, lightboxImage]);

  // Auto-initialize incoming audio playback context on mount so user can hear others
  useEffect(() => {
    audioEngine.initPlayback();
    return () => {
      if (isLiveMicActive) {
        audioEngine.stopLiveVoice();
      }
    };
  }, []);

  // Update signal statistics periodically when live call is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveMicActive) {
      interval = setInterval(() => {
        setSignalStats(audioEngine.getSignalStats());
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLiveMicActive]);

  // Track call duration when live call is connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLiveMicActive) {
      timer = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDurationSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isLiveMicActive]);

  // Viewport tracking for mobile virtual keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages]);

  // Live Timer Countdown calculation
  useEffect(() => {
    if (!room.expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((room.expiresAt! - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [room.expiresAt]);

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCallDuration = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Live Voice Spectrum Visualizer Loop (Visualizes both Outgoing Mic & Incoming Peer Audio)
  useEffect(() => {
    if (!room.liveVoiceEnabled) return;

    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawVisualizer = () => {
      const micVol = audioEngine.getMicVolume();
      const peerVol = audioEngine.getPeerOutputVolume();
      const micFreq = audioEngine.getMicFrequencyData();
      const peerFreq = audioEngine.getPeerFrequencyData();

      setAudioVolume(isLiveMicActive ? micVol : peerVol);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 14;
      const barWidth = (canvas.width / barCount) - 2;
      let x = 1;

      for (let i = 0; i < barCount; i++) {
        // Use mic frequency if active, or peer frequency if audio is playing
        const micVal = isLiveMicActive && !isLiveMicMuted ? (micFreq[i] || 0) : 0;
        const peerVal = peerFreq[i] || 0;
        const activeVal = Math.max(micVal, peerVal);

        const barHeight = Math.max(2, (activeVal / 255) * canvas.height * 0.85);
        const y = (canvas.height - barHeight) / 2;

        if (peerVal > micVal && peerVal > 20) {
          // Incoming peer speech in vivid Cyan / Purple
          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        } else if (isLiveMicActive && !isLiveMicMuted && micVal > 15) {
          // Outgoing mic transmission in Emerald
          ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        }

        ctx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + 2;
      }

      animId = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();
    return () => cancelAnimationFrame(animId);
  }, [room.liveVoiceEnabled, isLiveMicActive, isLiveMicMuted]);

  // Voice recording timer for voice notes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  // Helper to insert emoji
  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  // Helper: Format file size into human-readable string
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Helper: Get visually coded file badge & color
  const getFileBadge = (fileName?: string, fileType?: string) => {
    const ext = (fileName?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf' || fileType?.includes('pdf')) {
      return { label: 'PDF', color: 'text-red-400 bg-red-950/60 border-red-500/40' };
    }
    if (['doc', 'docx', 'odt'].includes(ext) || fileType?.includes('word')) {
      return { label: 'DOC', color: 'text-blue-400 bg-blue-950/60 border-blue-500/40' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || fileType?.includes('sheet') || fileType?.includes('excel')) {
      return { label: 'SHEET', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
    }
    if (['ppt', 'pptx'].includes(ext) || fileType?.includes('presentation')) {
      return { label: 'SLIDE', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType?.includes('zip') || fileType?.includes('compressed')) {
      return { label: 'ZIP', color: 'text-purple-400 bg-purple-950/60 border-purple-500/40' };
    }
    if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py'].includes(ext) || fileType?.includes('text')) {
      return { label: ext.toUpperCase() || 'TXT', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40' };
    }
    return { label: ext.toUpperCase() || 'FILE', color: 'text-white/70 bg-white/10 border-white/20' };
  };

  // Trigger file download directly to client device
  const handleDownloadDocument = (docUrl: string, fileName: string = 'document') => {
    try {
      const link = document.createElement('a');
      link.href = docUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      sounds.playClick();
    } catch (err) {
      console.error('Download error:', err);
      window.open(docUrl, '_blank');
    }
  };

  // Process and stage an image (from file upload, drag-and-drop, or clipboard paste)
  const processImageFile = (file: File, source: 'upload' | 'clipboard' = 'upload') => {
    if (file.size > 15 * 1024 * 1024) {
      alert('Pasted image size limit is 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setLastPastedSource(source === 'clipboard' ? 'clipboard' : null);
      sounds.playClick();
      chatInputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  // Process and stage a document / PDF (from file upload or clipboard paste)
  const processDocumentFile = (file: File, source: 'upload' | 'clipboard' = 'upload') => {
    if (file.size > 25 * 1024 * 1024) {
      alert('Document size limit is 25MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedDocument({
        url: reader.result as string,
        name: file.name || 'Pasted_Document',
        size: file.size,
        type: file.type || 'application/octet-stream',
      });
      setLastPastedSource(source === 'clipboard' ? 'clipboard' : null);
      sounds.playClick();
      chatInputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  // Process generic clipboard or dropped file
  const processGenericFile = (file: File, source: 'upload' | 'clipboard' = 'upload') => {
    if (file.type.startsWith('image/')) {
      processImageFile(file, source);
    } else {
      processDocumentFile(file, source);
    }
  };

  // Fast 1-Click Copy any chat message text, link, or attachment details
  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      sounds.playClick();
      let textToCopy = msg.text || '';
      if (!textToCopy && msg.fileName) {
        textToCopy = `${msg.fileName} (${formatFileSize(msg.fileSize)})`;
      }
      if (!textToCopy && msg.imageUrl) {
        textToCopy = msg.imageUrl;
      }
      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedMessageId(msg.id);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Direct Paste Button Action: reads image or text from system clipboard
  const handlePasteFromClipboard = async () => {
    sounds.playClick();
    try {
      // 1. Try reading rich items (including image blobs from screenshots)
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], 'clipboard_image.png', { type: imgType });
            processImageFile(file, 'clipboard');
            return;
          }
        }
      }

      // 2. Fallback to clipboard text
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
          chatInputRef.current?.focus();
          onSendTyping(true);
          return;
        }
      }

      chatInputRef.current?.focus();
    } catch (err) {
      // Browser permissions may restrict programmatic read; guide user to Ctrl+V / Cmd+V
      chatInputRef.current?.focus();
    }
  };

  // Clipboard Paste Event Handler on the Message Input
  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImageFile(file, 'clipboard');
            return;
          }
        }
      }
    }

    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      processGenericFile(files[0], 'clipboard');
      return;
    }

    // Default text paste handled natively; signal typing state
    onSendTyping(true);
  };

  // Global Keyboard Paste Listener: allows pressing Ctrl+V anywhere in the room to paste text or images
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // 1. Check for clipboard images
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              processImageFile(file, 'clipboard');
              return;
            }
          }
        }
      }

      // 2. Check for clipboard files (e.g. copied PDF or doc)
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        processGenericFile(files[0], 'clipboard');
        return;
      }

      // 3. If text is pasted and active element is NOT an input/textarea, inject into chat input
      const target = e.target as HTMLElement | null;
      const isInputFocused = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (!isInputFocused) {
        const text = e.clipboardData?.getData('text');
        if (text) {
          e.preventDefault();
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
          chatInputRef.current?.focus();
          onSendTyping(true);
          sounds.playClick();
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Submit Text/Image/Document message
  const handleSend = () => {
    if (!inputText.trim() && !selectedImage && !selectedDocument) return;

    sounds.playMessageSent();
    onSendMessage({
      text: inputText.trim() || undefined,
      imageUrl: selectedImage || undefined,
      documentUrl: selectedDocument?.url,
      fileName: selectedDocument?.name,
      fileSize: selectedDocument?.size,
      fileType: selectedDocument?.type,
    });

    setInputText('');
    setSelectedImage(null);
    setSelectedDocument(null);
    setLastPastedSource(null);
    setEmojiPickerOpen(false);
    onSendTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle Image File Attachment from file picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, 'upload');
    e.target.value = '';
  };

  // Handle Document / PDF Attachment from file picker
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processDocumentFile(file, 'upload');
    e.target.value = '';
  };

  // Handle Voice Note Recording start/stop
  const handleToggleVoiceRecording = async () => {
    if (!isRecordingVoice) {
      try {
        await audioEngine.startRecording();
        setIsRecordingVoice(true);
        sounds.playClick();
      } catch (err) {
        alert('Could not access microphone for voice message.');
      }
    } else {
      try {
        const result = await audioEngine.stopRecording();
        setIsRecordingVoice(false);
        sounds.playMessageSent();
        onSendMessage({
          audioUrl: result.dataUrl,
          audioDuration: result.duration,
        });
      } catch (err) {
        setIsRecordingVoice(false);
      }
    }
  };

  // Start / Join Real-Time Live Voice Call (Distance-Immune HD Engine)
  const handleStartVoiceCall = async () => {
    try {
      sounds.playClick();
      await audioEngine.startLiveVoice(
        (chunkBase64, sampleRate, seq, timestamp) => {
          if (onSendVoiceChunk) {
            onSendVoiceChunk(chunkBase64, sampleRate, seq, timestamp);
          }
        },
        (isSpeaking, vol) => {
          setIsLocalSpeaking(isSpeaking);
          if (onSendVoiceState) {
            onSendVoiceState(isLiveMicMuted, isSpeaking);
          }
        },
        (targetId, signal) => {
          if (onSendWebRTCSignal) {
            onSendWebRTCSignal(targetId, signal);
          }
        }
      );

      // Initialize WebRTC P2P direct mesh peers with other participants in room
      room.participants.forEach((p) => {
        if (p.id !== currentUserId) {
          audioEngine.initWebRTCPeer(p.id, isHost);
        }
      });

      setIsLiveMicActive(true);
      setIsLiveMicMuted(false);
      audioEngine.setMuted(false);
      sounds.playVoiceToggle(true);
      if (onSendVoiceState) {
        onSendVoiceState(false, false);
      }
    } catch (err) {
      console.error('Failed to start voice call:', err);
      alert('Unable to access microphone. Please check browser microphone permissions.');
    }
  };

  // Toggle Long-Distance Signal Booster
  const handleToggleBooster = () => {
    const next = !longDistanceBooster;
    setLongDistanceBooster(next);
    audioEngine.setLongDistanceBooster(next);
    sounds.playClick();
  };

  // Leave / Disconnect Live Voice Call
  const handleLeaveVoiceCall = () => {
    sounds.playClick();
    audioEngine.stopLiveVoice();
    setIsLiveMicActive(false);
    setIsLiveMicMuted(false);
    setIsLocalSpeaking(false);
    sounds.playVoiceToggle(false);
    if (onSendVoiceState) {
      onSendVoiceState(true, false);
    }
  };

  // Toggle Mic Mute / Unmute in live call
  const handleToggleMute = () => {
    const nextMuted = !isLiveMicMuted;
    setIsLiveMicMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    sounds.playVoiceToggle(!nextMuted);
    if (onSendVoiceState) {
      onSendVoiceState(nextMuted, false);
    }
  };

  // Adjust Call Volume (0% to 200%)
  const handleVolumeChange = (newVolPercent: number) => {
    const clamped = Math.max(0, Math.min(200, newVolPercent));
    setCallVolume(clamped);
    audioEngine.setCallVolume(clamped / 100);
  };

  // Play test chime to verify volume level
  const handleTestVolumeChime = () => {
    setTestingVolume(true);
    audioEngine.playTestTone();
    setTimeout(() => setTestingVolume(false), 500);
  };

  // Play/Pause Voice message note
  const handlePlayVoiceMessage = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.play();
      setPlayingAudioId(msgId);
      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // Copy Room Link
  const handleCopyLink = () => {
    sounds.playClick();
    const url = `${window.location.origin}/r/${room.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Find participants currently speaking
  const activeSpeakers = room.participants.filter(
    (p) => p.isSpeaking && (p.id !== currentUserId || isLocalSpeaking)
  );

  return (
    <div 
      id="fullscreen-chat-room-container"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
      className="fixed inset-0 w-full flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-hidden z-20"
    >
      {/* 1. TOP FULL-WIDTH HEADER */}
      <header 
        id="chat-top-header"
        className="w-full h-14 bg-[#0d0e13]/95 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30 font-mono"
      >
        {/* Left: Leave button + Room Logo & Name */}
        <div className="flex items-center gap-3 min-w-0">
          {onLeaveRoom && (
            <button
              type="button"
              id="btn-leave-room"
              onClick={() => {
                sounds.playClick();
                if (confirm('Leave this monolith session and return to base?')) {
                  onLeaveRoom();
                }
              }}
              className="px-2 py-1 rounded-sm bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 text-[10px] tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Exit room"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}

          <div className="w-7 h-7 border border-white/30 flex items-center justify-center bg-white/5 rotate-45 shrink-0 hidden xs:flex">
            <div className="-rotate-45 font-bold text-xs text-white">Ω</div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 
                id="room-display-name"
                className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase truncate"
              >
                {room.name || `${room.hostName}'s Monolith`}
              </h1>
              <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.2 rounded-sm uppercase tracking-wider font-semibold border ${
                isConnected
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-500/40 text-amber-300 animate-pulse'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isConnected ? 'SIGNAL 100% ONLINE' : 'RECONNECTING...'}</span>
              </span>
            </div>
            <div className="text-[9px] text-white/40 flex items-center gap-1.5 truncate">
              <span>Host: <strong className="text-white/70">@{room.hostName}</strong></span>
              <span>•</span>
              <span className="text-cyan-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {room.participants.length} online
              </span>
              {room.code && (
                <>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">CODE: {room.code}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Self-Destruct Timer or Decay info */}
        <div className="flex items-center gap-2">
          {remainingSeconds !== null ? (
            <div 
              id="self-destruct-ticker"
              className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-orange-950/30 border border-orange-500/40 text-orange-300 text-[10px] sm:text-xs font-mono shadow-[0_0_12px_rgba(249,115,22,0.15)]"
              title="Room decay countdown"
            >
              <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>DECAY: {formatCountdown(remainingSeconds)}</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 text-[10px] text-white/40 px-2 py-0.5 rounded-sm bg-white/5 border border-white/10">
              <Clock className="w-3 h-3 text-white/30" />
              <span>PERMANENT SESSION</span>
            </div>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Copy Link */}
          <button
            type="button"
            id="btn-quick-copy-link"
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Invite Link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invite Link</span>
              </>
            )}
          </button>

          {/* Mobile participants toggle */}
          <button
            type="button"
            id="btn-toggle-mobile-drawer"
            onClick={() => {
              sounds.playClick();
              setMobileDrawerOpen(true);
            }}
            className="md:hidden px-2 py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 text-[10px] flex items-center gap-1.5 cursor-pointer"
            title="View participants & logs"
          >
            <Users className="w-3.5 h-3.5 text-cyan-300" />
            <span>{room.participants.length}</span>
          </button>

          {/* Host Burn Monolith button */}
          {isHost && (
            <button
              type="button"
              id="btn-burn-room"
              onClick={() => {
                sounds.playClick();
                setBurnModalOpen(true);
              }}
              className="border border-red-900 bg-red-950/40 hover:bg-red-900/60 py-1.5 px-3 text-red-400 hover:text-red-300 uppercase text-[10px] font-bold tracking-widest rounded-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.25)] active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="hidden sm:inline">BURN</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. REAL-TIME LIVE VOICE CALL & VOLUME ADJUSTABLE BAR */}
      {room.liveVoiceEnabled && (
        <div 
          id="live-voice-transmission-bar"
          className="px-3 sm:px-6 py-2.5 border-b border-cyan-500/30 bg-[#07111a]/95 flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono z-20 shadow-md relative"
        >
          {/* Left: Call Connection & Mic Status */}
          <div className="flex items-center gap-2.5">
            {!isLiveMicActive ? (
              <button
                type="button"
                id="btn-start-live-call"
                onClick={handleStartVoiceCall}
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] font-bold tracking-wider uppercase bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Start Voice Call</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Active Call Badge with duration */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>CALL LIVE</span>
                  <span className="text-white/60 ml-1">({formatCallDuration(callDurationSeconds)})</span>
                </div>

                {/* Mic Mute Toggle */}
                <button
                  type="button"
                  id="btn-toggle-live-mic"
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    isLiveMicMuted
                      ? 'bg-red-950/60 text-red-300 border border-red-500/50 hover:bg-red-900/60'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/40'
                  }`}
                  title={isLiveMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isLiveMicMuted ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                      <span>MUTED</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>MIC ON</span>
                    </>
                  )}
                </button>

                {/* End Voice Call Button */}
                <button
                  type="button"
                  id="btn-leave-live-call"
                  onClick={handleLeaveVoiceCall}
                  className="px-2.5 py-1 rounded-sm bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/40 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1"
                  title="Leave voice call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">END CALL</span>
                </button>
              </div>
            )}

            {/* Speaking Status & Distance-Immune Signal Indicator */}
            <div className="hidden md:flex items-center gap-2 text-[10px] text-white/60">
              {activeSpeakers.length > 0 ? (
                <span className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-sm border border-cyan-500/30">
                  <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Speaking: {activeSpeakers.map((s) => `@${s.name}`).join(', ')}</span>
                </span>
              ) : (
                <span className="text-white/40">
                  {isLiveMicActive ? 'Listening for voices...' : 'Voice mesh active — Click Start to transmit'}
                </span>
              )}

              {/* Real-time Distance-Immune Signal Badge */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-mono transition-colors ${
                  isLiveMicActive 
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300' 
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}
                title="Adaptive Jitter Buffer & Opus In-Band FEC Active for Lossless Long Distance Calling"
              >
                <Wifi className={`w-3 h-3 ${isLiveMicActive ? 'text-cyan-400 animate-pulse' : 'text-white/40'}`} />
                <span className="font-bold">
                  {isLiveMicActive ? `${signalStats.quality} (${signalStats.jitterMs}ms JITTER)` : 'HD DISTANCE IMMUNE'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Audio Visualizer & Adjustable Call Volume Controls */}
          <div className="flex items-center gap-3">
            {/* Visualizer Waveform Canvas */}
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-sm border border-white/10">
              <canvas
                ref={visualizerCanvasRef}
                width={120}
                height={18}
                className="rounded-sm"
              />
            </div>

            {/* Call Volume Adjustable Trigger & Popover */}
            <div className="relative">
              <button
                type="button"
                id="btn-voice-volume-adjuster"
                onClick={() => {
                  sounds.playClick();
                  setShowVolumeControl((prev) => !prev);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                  callVolume === 0
                    ? 'bg-red-950/30 border-red-500/30 text-red-300'
                    : callVolume > 100
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    : 'bg-white/5 border-white/15 text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Adjust Voice Call Volume & Signal Booster"
              >
                {callVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : callVolume < 50 ? (
                  <Volume className="w-3.5 h-3.5 text-white/70" />
                ) : callVolume <= 100 ? (
                  <Volume1 className="w-3.5 h-3.5 text-cyan-300" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>VOL: {callVolume}%</span>
                {longDistanceBooster && (
                  <Zap className="w-3 h-3 text-cyan-300 fill-cyan-300/30" />
                )}
                <Sliders className="w-3 h-3 text-white/40" />
              </button>

              {/* Volume Adjustable Popover Card */}
              {showVolumeControl && (
                <div 
                  id="voice-call-volume-popover"
                  className="absolute right-0 top-full mt-2 w-80 p-4 bg-[#0d1017] border border-cyan-500/40 rounded-sm shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 holo-card"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                        Call Audio & Signal Booster
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowVolumeControl(false)}
                      className="text-white/40 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Long Distance Signal Booster Toggle */}
                  <div className="mb-3 p-2.5 rounded-sm bg-cyan-950/30 border border-cyan-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-3.5 h-3.5 ${longDistanceBooster ? 'text-cyan-400' : 'text-white/40'}`} />
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase">Long-Distance Booster</p>
                          <p className="text-[8px] text-white/50">Adaptive Jitter Buffer & Dynamic Leveling</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBooster}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-sm border transition-all cursor-pointer ${
                          longDistanceBooster
                            ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {longDistanceBooster ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    {/* Telemetry row */}
                    <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-1 text-[8px] font-mono text-center">
                      <div className="bg-black/40 p-1 rounded-sm">
                        <span className="text-white/40 block">LATENCY</span>
                        <span className="text-cyan-300 font-bold">~{signalStats.latencyMs}ms</span>
                      </div>
                      <div className="bg-black/40 p-1 rounded-sm">
                        <span className="text-white/40 block">JITTER</span>
                        <span className="text-emerald-400 font-bold">{signalStats.jitterMs}ms</span>
                      </div>
                      <div className="bg-black/40 p-1 rounded-sm">
                        <span className="text-white/40 block">STREAM</span>
                        <span className="text-white/80 font-bold">48kHz HD</span>
                      </div>
                    </div>
                  </div>

                  {/* Volume Slider Level */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/50 uppercase">Voice Level:</span>
                      <span className={`font-bold ${callVolume > 100 ? 'text-cyan-300' : callVolume === 0 ? 'text-red-400' : 'text-white'}`}>
                        {callVolume}% {callVolume > 100 ? '(BOOST)' : callVolume === 0 ? '(MUTED)' : ''}
                      </span>
                    </div>

                    <input
                      type="range"
                      id="input-voice-call-volume"
                      min={0}
                      max={200}
                      step={5}
                      value={callVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[
                      { label: '0%', val: 0 },
                      { label: '50%', val: 50 },
                      { label: '100%', val: 100 },
                      { label: '150%', val: 150 },
                      { label: '200%', val: 200 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handleVolumeChange(preset.val)}
                        className={`py-1 text-[9px] font-bold rounded-sm border transition-all cursor-pointer ${
                          callVolume === preset.val
                            ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Test Audio Feedback Button */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      id="btn-test-call-volume"
                      onClick={handleTestVolumeChime}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-sm text-[9px] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Volume2 className={`w-3 h-3 text-cyan-300 ${testingVolume ? 'animate-bounce' : ''}`} />
                      <span>Test Audio Volume</span>
                    </button>

                    <span className="text-[8px] text-white/40 uppercase">Auto-Saved</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN FULL-SCREEN WORKSPACE: CHAT AREA + RIGHT PARTICIPANTS SIDEBAR */}
      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        {/* LEFT / CENTER: CHAT MESSAGES & COMPOSER */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#08090d] relative overflow-hidden">
          {/* Scrollable Messages Area */}
          <div 
            id="chat-messages-container"
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 monolith-dot-bg flex flex-col"
          >
            {room.messages.length === 0 ? (
              /* Empty State */
              <div className="m-auto text-center py-16 px-4 select-none animate-in fade-in duration-300">
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs uppercase tracking-wider rounded-sm inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Room Link With Friend</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Messages Stream in Cyber Monolith Style */
              <div className="space-y-3 flex-1 select-text font-mono">
                {room.messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      id={`message-bubble-${msg.id}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in fade-in duration-150`}
                    >
                      {/* Sender Meta Info & 1-Click Copy */}
                      <div className="flex items-center justify-between w-full max-w-[85%] sm:max-w-md md:max-w-lg mb-1 px-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                          <span className="font-bold text-white/80">{isMe ? 'You' : msg.senderName}</span>
                          {msg.isHost && (
                            <span className="text-[8px] bg-purple-900/60 border border-purple-500/40 text-purple-300 px-1 py-0.2 rounded-sm uppercase">
                              Host
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Fast Copy Action Button */}
                        <button
                          type="button"
                          id={`btn-copy-msg-${msg.id}`}
                          onClick={() => handleCopyMessage(msg)}
                          className={`opacity-0 group-hover:opacity-100 transition-all p-0.5 px-1.5 rounded-sm flex items-center gap-1 text-[9px] cursor-pointer ${
                            copiedMessageId === msg.id
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 opacity-100'
                              : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10'
                          }`}
                          title="Copy message to clipboard [Ctrl+C]"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="font-mono text-[8px] uppercase text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span className="font-mono text-[8px] uppercase">Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Message Bubble Box */}
                      <div
                        className={`max-w-[85%] sm:max-w-md md:max-w-lg p-3.5 rounded-sm border transition-all ${
                          isMe
                            ? 'bg-white/10 border-white/25 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                            : 'bg-black/60 border-white/10 text-white/90 shadow-sm'
                        }`}
                      >
                        {/* 1. Attached Image */}
                        {msg.imageUrl && (
                          <div className="mb-2 relative rounded-sm overflow-hidden border border-white/15 bg-black/40">
                            <img
                              src={msg.imageUrl}
                              alt="Attachment"
                              onClick={() => setLightboxImage(msg.imageUrl || null)}
                              className="max-h-72 w-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}

                        {/* 2. Attached Voice Note Message */}
                        {msg.audioUrl && (
                          <div className="flex items-center gap-3 py-1 px-2 rounded-sm bg-black/50 border border-white/10 my-1">
                            <button
                              type="button"
                              onClick={() => handlePlayVoiceMessage(msg.id, msg.audioUrl!)}
                              className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95"
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="w-3.5 h-3.5 fill-black" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Volume2 className="w-3 h-3 animate-pulse" />
                                <span>Voice Memo</span>
                              </div>
                              <div className="text-[9px] text-white/40">
                                {msg.audioDuration ? `${msg.audioDuration}s` : 'Audio clip'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Attached Document / PDF */}
                        {msg.documentUrl && (
                          <div className="my-1.5 p-3 rounded-sm bg-black/60 border border-white/15 hover:border-white/30 transition-all group/doc">
                            <div className="flex items-start gap-3">
                              {/* File Badge Icon */}
                              <div className={`w-10 h-10 rounded-sm border flex flex-col items-center justify-center shrink-0 ${getFileBadge(msg.fileName, msg.fileType).color}`}>
                                <FileText className="w-5 h-5" />
                                <span className="text-[7px] font-bold tracking-tighter uppercase leading-none mt-0.5">
                                  {getFileBadge(msg.fileName, msg.fileType).label}
                                </span>
                              </div>

                              {/* File Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate group-hover/doc:text-cyan-300 transition-colors" title={msg.fileName || 'Document'}>
                                  {msg.fileName || 'Untitled Document'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/50">
                                  <span>{formatFileSize(msg.fileSize)}</span>
                                  <span>•</span>
                                  <span className="uppercase text-[8px] text-cyan-400/80">Encrypted Relay</span>
                                </div>
                              </div>
                            </div>

                            {/* Document Action Buttons */}
                            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2">
                              {/* Preview in App if PDF or text */}
                              {(msg.fileName?.toLowerCase().endsWith('.pdf') || msg.fileType?.includes('pdf') || msg.fileType?.includes('text')) && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDocument({
                                    url: msg.documentUrl!,
                                    name: msg.fileName || 'Document.pdf',
                                    size: msg.fileSize,
                                    type: msg.fileType,
                                  })}
                                  className="flex-1 py-1 px-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-sm text-[10px] text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-cyan-300" />
                                  <span>Preview</span>
                                </button>
                              )}

                              {/* Direct Download */}
                              <button
                                type="button"
                                onClick={() => handleDownloadDocument(msg.documentUrl!, msg.fileName || 'document')}
                                className="flex-1 py-1 px-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 text-[10px] text-cyan-200 font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-cyan-400" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 4. Text Message Content */}
                        {msg.text && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Typing Indicator Bar */}
          {typingPeers.length > 0 && (
            <div className="px-4 py-1 text-[10px] font-mono text-cyan-300/80 bg-black/40 border-t border-white/5 flex items-center gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {typingPeers.join(', ')} {typingPeers.length === 1 ? 'is' : 'are'} transmitting...
              </span>
            </div>
          )}

          {/* Image Upload Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-black/80 border-t border-white/10 flex items-center gap-3 shrink-0 font-mono">
              <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-cyan-500/50">
                <img src={selectedImage} alt="Upload preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setLastPastedSource(null);
                  }}
                  className="absolute top-0 right-0 p-0.5 bg-black/80 text-white rounded-bl-sm cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[10px] text-white/70 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Image attached</span>
                  {lastPastedSource === 'clipboard' && (
                    <span className="text-[8px] bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.2 rounded-xs uppercase tracking-wider font-semibold">
                      Pasted from Clipboard
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-white/40">Ready for secure relay • Press Enter or Send</p>
              </div>
            </div>
          )}

          {/* Document / PDF Upload Preview */}
          {selectedDocument && (
            <div className="px-4 py-2 bg-black/80 border-t border-white/10 flex items-center justify-between gap-3 shrink-0 font-mono">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-sm border flex flex-col items-center justify-center shrink-0 ${getFileBadge(selectedDocument.name, selectedDocument.type).color}`}>
                  <FileText className="w-4 h-4" />
                  <span className="text-[6px] font-bold uppercase mt-0.5">
                    {getFileBadge(selectedDocument.name, selectedDocument.type).label}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate" title={selectedDocument.name}>
                      {selectedDocument.name}
                    </p>
                    {lastPastedSource === 'clipboard' && (
                      <span className="text-[8px] bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.2 rounded-xs uppercase tracking-wider font-semibold shrink-0">
                        Pasted from Clipboard
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-white/50">
                    {formatFileSize(selectedDocument.size)} • Document staged for secure relay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDocument(null);
                  setLastPastedSource(null);
                }}
                className="p-1.5 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white rounded-sm cursor-pointer transition-colors"
                title="Remove attached document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Emoji Picker Popover */}
          {emojiPickerOpen && (
            <div className="relative">
              <EmojiPicker
                onSelectEmoji={handleSelectEmoji}
                onClose={() => setEmojiPickerOpen(false)}
              />
            </div>
          )}

          {/* BOTTOM COMPOSER BAR */}
          <div 
            id="chat-composer-bar"
            className="p-3 sm:p-4 bg-[#0d0e13] border-t border-white/10 shrink-0 font-mono"
          >
            {isRecordingVoice ? (
              /* Voice Recording In-Progress Bar */
              <div className="flex items-center justify-between gap-3 bg-red-950/40 border border-red-500/40 px-4 py-2.5 rounded-sm animate-pulse">
                <div className="flex items-center gap-2 text-red-300 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>RECORDING VOICE NOTE ({recordingSeconds}s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.stopRecording().catch(() => {});
                      setIsRecordingVoice(false);
                    }}
                    className="px-2.5 py-1 text-[10px] text-white/50 hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecording}
                    className="px-3 py-1 bg-red-500 hover:bg-red-400 text-black text-[10px] font-bold uppercase rounded-sm cursor-pointer shadow-sm transition-all"
                  >
                    Send Note
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Text / Image / Document / Emoji Composer */
              <div className="flex items-center gap-2">
                {/* 1. Image Attachment input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-attach-image"
                  onClick={() => {
                    sounds.playClick();
                    fileInputRef.current?.click();
                  }}
                  className="w-10 h-10 rounded-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Attach Image"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* 2. Document & PDF Attachment input */}
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocumentSelect}
                  accept=".pdf,.doc,.docx,.txt,.rtf,.csv,.xlsx,.xls,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.json,.md,.xml,.epub,application/*,text/*"
                  className="hidden"
                />
                <button
                  type="button"
                  id="btn-attach-document"
                  onClick={() => {
                    sounds.playClick();
                    docInputRef.current?.click();
                  }}
                  className={`w-10 h-10 rounded-sm border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    selectedDocument
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'
                  }`}
                  title="Share Document or PDF"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* 3. Paste from Clipboard Button (Text or Screenshot Image) */}
                <button
                  type="button"
                  id="btn-paste-clipboard"
                  onClick={handlePasteFromClipboard}
                  className="w-10 h-10 rounded-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Paste from Clipboard (Text or Image) [Ctrl+V]"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>

                {/* 4. Emoji Button */}
                <button
                  type="button"
                  id="btn-toggle-emoji"
                  onClick={() => {
                    sounds.playClick();
                    setEmojiPickerOpen((prev) => !prev);
                  }}
                  className={`w-10 h-10 rounded-sm border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    emojiPickerOpen
                      ? 'bg-white/20 text-white border-white/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'
                  }`}
                  title="Insert Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* 5. Message Text Input with Direct Paste Interception */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    ref={chatInputRef}
                    id="input-chat-message"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handleInputPaste}
                    placeholder={
                      selectedImage && lastPastedSource === 'clipboard'
                        ? 'Image pasted! Add a caption or press Send...'
                        : selectedDocument
                        ? `Add a message about ${selectedDocument.name}...`
                        : 'Type message or paste text/images [Ctrl+V]...'
                    }
                    className="w-full h-10 px-3 bg-black/60 border border-white/15 focus:border-white/40 rounded-sm text-xs text-white placeholder-white/30 outline-none transition-colors"
                  />
                </div>

                {/* 6. Voice Note Recording Button */}
                <button
                  type="button"
                  id="btn-record-voice-note"
                  onClick={handleToggleVoiceRecording}
                  className="w-10 h-10 rounded-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="Record Voice Memo"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* 7. Send Button */}
                <button
                  type="submit"
                  id="btn-send-message"
                  onClick={handleSend}
                  disabled={!inputText.trim() && !selectedImage && !selectedDocument}
                  className="w-10 h-10 rounded-sm bg-white hover:bg-white/90 text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Send Message [Enter]"
                >
                  <Send className="w-4 h-4 ml-0.5 text-black" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PERMANENT LIVE PARTICIPANTS & ACTIVITY AUDIT SIDEBAR (Desktop) */}
        <aside 
          id="chat-participants-sidebar"
          className="hidden md:flex md:w-72 lg:w-80 flex-col bg-[#0b0c10] border-l border-white/10 shrink-0 select-none font-mono h-full"
        >
          {/* Sidebar Top Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold tracking-wider text-white uppercase">
                Peer Manifest
              </h2>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-sm bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 uppercase">
              {room.participants.length} Active
            </span>
          </div>

          {/* Active Participants List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[9px] tracking-widest text-white/40 uppercase mb-1 px-1">
              CONNECTED PEERS ({room.participants.length})
            </div>

            {room.participants.map((p) => {
              const isMe = p.id === currentUserId;
              const isSpeaking = p.isSpeaking || (isMe && isLocalSpeaking);
              return (
                <div
                  key={p.id}
                  id={`sidebar-participant-${p.id}`}
                  className={`p-2.5 rounded-sm border transition-all flex items-center justify-between ${
                    isSpeaking
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : p.isHost
                      ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                      : 'bg-white/5 border-white/10 text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[10px] shrink-0 border relative ${
                        isSpeaking
                          ? 'bg-emerald-600/40 text-emerald-300 border-emerald-400 animate-pulse'
                          : p.isHost
                          ? 'bg-purple-600/30 text-purple-300 border-purple-400/40'
                          : 'bg-white/10 text-white border-white/20'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                      {isSpeaking && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate max-w-[100px]">
                          {p.name}
                        </span>
                        {p.isHost && (
                          <span className="px-1 py-0.2 rounded-sm text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            ★ HOST
                          </span>
                        )}
                        {isMe && (
                          <span className="px-1 py-0.2 rounded-sm text-[8px] bg-white/10 text-white/70 border border-white/15">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] text-white/40">
                        {isSpeaking ? (
                          <span className="text-emerald-400 font-bold uppercase">Speaking live</span>
                        ) : p.isMuted ? (
                          <span className="text-white/30">Muted</span>
                        ) : (
                          <span>Online</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mic / Voice status */}
                  <div className="shrink-0">
                    {isSpeaking ? (
                      <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 px-1.5 py-0.5 rounded-sm shadow-sm">
                        <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                        <span>LIVE</span>
                      </span>
                    ) : p.isMuted ? (
                      <MicOff className="w-3 h-3 text-white/30" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Join / Leave Live Activity Stream */}
          <div 
            id="chat-live-activity-stream"
            className="h-44 border-t border-white/10 bg-black/60 p-3 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[9px] tracking-wider text-white/60 uppercase font-bold">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Live Event Logs</span>
              </div>
              <span className="text-[8px] text-white/30 uppercase">Audit</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 text-[9px] pr-1">
              {eventLogs.length === 0 ? (
                <div className="text-white/30 text-center py-4 text-[9px]">
                  Listening for peer connections...
                </div>
              ) : (
                eventLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-1.5 text-white/70 font-mono py-0.5 leading-tight"
                  >
                    <span className="text-white/30 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <span className={log.type === 'join' ? 'text-emerald-400' : log.type === 'leave' ? 'text-red-400' : 'text-cyan-300'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Drawer (Visible on small screens when triggered) */}
      <ParticipantDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        participants={room.participants}
        currentUserId={currentUserId}
        isHost={isHost}
        roomName={room.name}
      />

      {/* Host Burn Confirmation Modal */}
      <BurnConfirmationModal
        isOpen={burnModalOpen}
        onClose={() => setBurnModalOpen(false)}
        onConfirmBurn={onBurnRoom}
        roomName={room.name}
      />

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Fullscreen attachment"
              className="max-w-full max-h-[85vh] object-contain rounded-sm border border-white/20"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-black text-white rounded-sm transition-colors cursor-pointer border border-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cyber Monolith In-App Document & PDF Viewer Modal */}
      {previewDocument && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200 font-mono select-none"
          onClick={() => setPreviewDocument(null)}
        >
          <div 
            className="w-full max-w-5xl h-[90vh] bg-[#0c0d12] border border-white/20 rounded-sm flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="p-3 sm:p-4 bg-black/80 border-b border-white/15 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-sm border shrink-0 ${getFileBadge(previewDocument.name, previewDocument.type).color}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">{previewDocument.name}</h3>
                  <p className="text-[9px] text-white/50">
                    {formatFileSize(previewDocument.size)} • Cyber Monolith Document Viewer
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDocument(previewDocument.url, previewDocument.name)}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold uppercase rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download copy to device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <a
                  href={previewDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-bold uppercase rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white rounded-sm cursor-pointer transition-colors"
                  title="Close viewer (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div className="flex-1 bg-black/90 p-1 sm:p-2 overflow-hidden flex flex-col items-center justify-center">
              {previewDocument.name.toLowerCase().endsWith('.pdf') || previewDocument.type?.includes('pdf') ? (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-full border-0 rounded-sm bg-white"
                  title={previewDocument.name}
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <FileText className="w-16 h-16 text-cyan-400 mx-auto opacity-80" />
                  <div>
                    <p className="text-white font-bold text-sm">{previewDocument.name}</p>
                    <p className="text-white/50 text-xs mt-1">
                      This file format is available for direct secure download.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(previewDocument.url, previewDocument.name)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase rounded-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File ({formatFileSize(previewDocument.size)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
