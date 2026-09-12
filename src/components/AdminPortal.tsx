import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff,
  X, 
  RefreshCw, 
  Trash2, 
  LogOut, 
  Flame, 
  Users, 
  Globe, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Smartphone, 
  Monitor, 
  Activity, 
  Cpu, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Radio,
  Lock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import type { AdminMonitoringData, AdminActivityItem } from '../types';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  // Auth state - Password authentication (admin1234)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem('fc_admin_token') || null;
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Telemetry state
  const [data, setData] = useState<AdminMonitoringData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Selected date state for 14-day chart & stay duration calculation
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);

  // Collapsible Recent Activity state & time range filter
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | '1week' | '2weeks' | '1month'>('today');
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Send periodic telemetry ping from client
  useEffect(() => {
    const pingSession = async () => {
      try {
        let vId = localStorage.getItem('fc_visitor_id');
        if (!vId) {
          vId = 'v_' + Math.random().toString(36).substring(2, 11);
          localStorage.setItem('fc_visitor_id', vId);
        }
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        await fetch('/api/analytics/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId: vId, isMobile }),
        });
      } catch {}
    };

    pingSession();
    const interval = setInterval(pingSession, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch admin monitoring statistics
  const fetchStats = async () => {
    if (!adminToken) return;
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.status === 401) {
        setAdminToken(null);
        sessionStorage.removeItem('fc_admin_token');
        setErrorMsg('Session expired. Please enter clearance password.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load telemetry stats');
      const stats = await res.json();
      setData(stats);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with telemetry node');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll stats when open and authenticated
  useEffect(() => {
    if (isOpen && adminToken) {
      fetchStats();
      const timer = setInterval(fetchStats, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen, adminToken]);

  // Handle password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter the clearance password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Access denied: Invalid password');

      setAdminToken(json.token);
      sessionStorage.setItem('fc_admin_token', json.token);
      setPassword('');
      setSuccessMsg('Clearance granted.');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect password');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('fc_admin_token');
    setPassword('');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  // Reset telemetry data
  const handleResetData = async () => {
    if (!adminToken) return;
    if (!confirm('Are you sure you want to reset all telemetry and monitoring data?')) return;

    try {
      const res = await fetch('/api/admin/reset-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        await fetchStats();
        setSuccessMsg('Monitoring data reset successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {}
  };

  // Copy Room Link to clipboard
  const handleCopyLink = (linkId: string, url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkId(linkId);
    setTimeout(() => {
      setCopiedLinkId((prev) => (prev === linkId ? null : prev));
    }, 2500);
  };

  // Helper to ensure clean Host Name display without leaking email addresses
  const cleanHostName = (rawHost?: string) => {
    if (!rawHost || !rawHost.trim() || rawHost.trim().toLowerCase() === 'anonymous host') {
      return 'Room Host';
    }
    const trimmed = rawHost.trim();
    if (trimmed.includes('@')) {
      const handle = trimmed.split('@')[0];
      return handle.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return trimmed;
  };

  // Human readable time ago
  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  // Selected date record and duration computation
  const daysList = data?.visitorsLast14Days || [];
  const defaultLastIndex = Math.max(0, daysList.length - 1);
  const activeDateIndex = selectedDateIndex !== null && selectedDateIndex >= 0 && selectedDateIndex < daysList.length
    ? selectedDateIndex
    : defaultLastIndex;

  const selectedDateRecord = daysList[activeDateIndex] || null;
  const activeDuration = selectedDateRecord?.durationBuckets || data?.durationBuckets || {
    seconds: 0,
    minutes: 0,
    hours: 0,
    avgFormatted: '0m 00s',
  };

  const isTodaySelected = activeDateIndex === defaultLastIndex;

  // Calculate dynamic heights for the 3 stay duration columns
  const maxStayVal = Math.max(2, activeDuration.seconds, activeDuration.minutes, activeDuration.hours);
  const secondsHeightPx = activeDuration.seconds > 0 ? Math.max(24, (activeDuration.seconds / maxStayVal) * 128) : 12;
  const minutesHeightPx = activeDuration.minutes > 0 ? Math.max(24, (activeDuration.minutes / maxStayVal) * 128) : 12;
  const hoursHeightPx = activeDuration.hours > 0 ? Math.max(24, (activeDuration.hours / maxStayVal) * 128) : 12;

  // Filter recent activity logs by selected time filter
  const filteredActivities = (data?.recentActivity || []).filter((act) => {
    const now = Date.now();
    const diff = now - act.timestamp;
    const oneDay = 24 * 60 * 60 * 1000;

    if (timeFilter === 'today') {
      return diff <= oneDay;
    }
    if (timeFilter === 'yesterday') {
      return diff > oneDay && diff <= 2 * oneDay;
    }
    if (timeFilter === '1week') {
      return diff <= 7 * oneDay;
    }
    if (timeFilter === '2weeks') {
      return diff <= 14 * oneDay;
    }
    if (timeFilter === '1month') {
      return diff <= 30 * oneDay;
    }
    return true;
  });

  return (
    <div 
      id="admin-monitoring-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      {/* Cyber Neon HUD Modal Frame */}
      <div 
        id="admin-monitoring-modal"
        className="relative w-full max-w-7xl my-auto rounded-2xl bg-[#090b10]/95 border-2 border-cyan-500/60 shadow-[0_0_40px_rgba(6,182,212,0.35)] text-[#f4f4f5] overflow-hidden flex flex-col font-sans max-h-[94vh]"
      >
        {/* Holographic Glowing Border Corners & Micro Circuit Lines */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />
        
        {/* Holographic scanning line backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        {/* AUTHENTICATION VIEW (IF NOT LOGGED IN) */}
        {!adminToken ? (
          <div className="relative p-6 sm:p-10 flex flex-col items-center justify-center min-h-[480px]">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full max-w-md flex flex-col items-center text-center z-10">
              {/* Security Shield Icon */}
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-400/80 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-4 animate-pulse">
                <ShieldCheck className="w-8 h-8 text-cyan-300" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-[0.2em] uppercase text-white mb-1">
                Admin Clearance Portal
              </h2>
              <p className="text-xs text-cyan-300/70 font-mono tracking-widest uppercase mb-6">
                Live Monitoring & Telemetry Terminal
              </p>

              {errorMsg && (
                <div className="w-full mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="w-full mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Step 1: Direct Password Authentication */}
              <form onSubmit={handlePasswordLogin} className="w-full flex flex-col gap-4">
                <div className="text-left">
                  <label className="text-[11px] font-mono uppercase tracking-widest text-cyan-300/80 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Admin Clearance Password
                    </span>
                    <span className="text-[10px] text-cyan-400/60 font-mono">
                      (Password: admin1234)
                    </span>
                  </label>
                  
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter clearance password"
                      autoFocus
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/60 hover:text-cyan-300 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Authorize Clearance</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* FULL MONITORING PORTAL (MATCHING IMAGE 1 LAYOUT + IMAGE 2 CYBERPUNK HUD THEME) */
          <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">
            
            {/* Top Navigation & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Activity className="w-5 h-5 text-cyan-300 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-white flex items-center gap-2">
                    Monitoring Portal
                  </h1>
                  <p className="text-xs text-cyan-300/70 font-mono tracking-wide">
                    Site activity overview
                  </p>
                </div>
              </div>

              {/* Action Buttons: Live status, Refresh, Reset, Logout, Close */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Live Count Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{data?.liveNow ?? 0} live now</span>
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchStats}
                  disabled={isRefreshing}
                  title="Refresh Telemetry"
                  className="p-2 rounded-lg bg-black/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Reset Data */}
                <button
                  onClick={handleResetData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/40 hover:bg-rose-900/40 text-rose-300 font-mono text-xs cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset data</span>
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 text-white/80 font-mono text-xs cursor-pointer transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>

                {/* Close Portal */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Success / Info Toast Alert */}
            {successMsg && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-fadeIn">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {successMsg}
                </span>
                <button
                  onClick={() => setSuccessMsg(null)}
                  className="text-emerald-400/60 hover:text-emerald-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TOP METRICS 4-CARD ROW (Matches Image 1) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 z-10">
              {/* Card 1: TODAY */}
              <div className="p-4 rounded-xl bg-[#0d1117]/80 border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                  <span>Today</span>
                  <Flame className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono mb-1">
                  {data?.todayVisitors ?? 0}
                </div>
                <div className="text-[11px] text-white/50 font-mono">unique visitors</div>
              </div>

              {/* Card 2: THIS WEEK */}
              <div className="p-4 rounded-xl bg-[#0d1117]/80 border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                  <span>This Week</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono mb-1">
                  {data?.thisWeekVisitors ?? 0}
                </div>
                <div className="text-[11px] text-white/50 font-mono">unique visitors</div>
              </div>

              {/* Card 3: THIS MONTH */}
              <div className="p-4 rounded-xl bg-[#0d1117]/80 border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                  <span>This Month</span>
                  <Globe className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono mb-1">
                  {data?.thisMonthVisitors ?? 0}
                </div>
                <div className="text-[11px] text-white/50 font-mono">unique visitors</div>
              </div>

              {/* Card 4: LAST MONTH */}
              <div className="p-4 rounded-xl bg-[#0d1117]/80 border border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                  <span>Last Month</span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white/80 font-mono mb-1">
                  {data?.lastMonthVisitors ?? 0}
                </div>
                <div className="text-[11px] text-white/50 font-mono">unique visitors</div>
              </div>
            </div>

            {/* MIDDLE ROW: 2 MAIN CHARTS (Visitors per day & How long people stay) Styled with Image 2 Holographic Cyber Aesthetic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10">
              
              {/* Left Chart: Visitors per day – last 14 days (Interactive Date Selection) */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between relative overflow-hidden">
                {/* Circuit header accent */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                      Visitors per day – last 14 days
                    </h2>
                    <p className="text-[10px] font-mono text-cyan-400/60 uppercase">
                      Daily Active Visits • Select any date to view stay duration
                    </p>
                  </div>

                  {/* Active selected date indicator badge & reset */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-400/60 text-[10px] font-mono text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      <span>{selectedDateRecord?.label || 'Today'}</span>
                      {isTodaySelected && <span className="text-emerald-400 font-bold">(Today)</span>}
                    </div>

                    {!isTodaySelected && (
                      <button
                        onClick={() => setSelectedDateIndex(defaultLastIndex)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-white underline cursor-pointer"
                      >
                        Reset to Today
                      </button>
                    )}
                  </div>
                </div>

                {/* 14-Day Cyber Graph Bars */}
                <div className="relative h-44 sm:h-52 w-full flex items-end justify-between gap-1 sm:gap-2 pt-6 px-2">
                  {/* Grid horizontal backdrop lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-cyan-500/30 w-full" />
                    <div className="border-b border-cyan-500/30 w-full" />
                    <div className="border-b border-cyan-500/30 w-full" />
                    <div className="border-b border-cyan-500/30 w-full" />
                  </div>

                  {data?.visitorsLast14Days?.map((d, i) => {
                    const maxVal = 5;
                    const heightPercent = Math.max(8, (d.count / maxVal) * 90);
                    const isHovered = hoveredBar === d.date;
                    const isSelected = activeDateIndex === i;

                    return (
                      <button 
                        key={d.date || i}
                        type="button"
                        onClick={() => setSelectedDateIndex(i)}
                        onMouseEnter={() => setHoveredBar(d.date)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className={`flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer focus:outline-none transition-transform ${
                          isSelected ? 'scale-105' : 'hover:scale-102'
                        }`}
                      >
                        {/* Interactive Tooltip matching Image 2 HUD Box */}
                        {isHovered && (
                          <div className="absolute -top-16 z-30 px-3 py-2 rounded-lg bg-black/95 border border-cyan-400 text-[10px] font-mono shadow-[0_0_20px_rgba(6,182,212,0.8)] whitespace-nowrap pointer-events-none animate-fadeIn">
                            <div className="text-cyan-300 font-bold">{d.label} {i === defaultLastIndex ? '(Today)' : ''}</div>
                            <div className="text-emerald-300">Visitors: {d.count}</div>
                            <div className="text-pink-300">Avg Duration: {d.durationBuckets?.avgFormatted || '0m 00s'}</div>
                            <div className="text-cyan-400 text-[9px]">Click to inspect stay metrics</div>
                          </div>
                        )}

                        {/* Selected Indicator pointer dot */}
                        {isSelected && (
                          <div className="absolute -top-4 z-20 flex flex-col items-center animate-bounce">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                          </div>
                        )}

                        {/* Cyber glowing bar column with circuit wave texture */}
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[22px] rounded-t-md transition-all duration-300 relative overflow-hidden ${
                            isSelected
                              ? 'bg-gradient-to-t from-cyan-500 via-cyan-300 to-white border-t-2 border-white ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.9)]'
                              : d.count > 0 
                                ? 'bg-gradient-to-t from-cyan-600/40 via-cyan-400 to-cyan-200 border-t-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]' 
                                : 'bg-cyan-950/20 border-t border-cyan-800/40'
                          }`}
                        >
                          {/* Inner wireframe lattice */}
                          {(d.count > 0 || isSelected) && (
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%)] bg-[size:6px_6px] opacity-70" />
                          )}
                        </div>

                        {/* Date Label */}
                        <span className={`text-[9px] font-mono mt-2 truncate w-full text-center transition-colors ${
                          isSelected ? 'text-cyan-200 font-bold' : 'text-white/40 group-hover:text-cyan-300'
                        }`}>
                          {d.label.split(' ')[1] || d.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Chart: How long people stay (Dynamically updates based on selected date) */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                      How long people stay
                    </h2>
                    <p className="text-[10px] font-mono text-rose-300/60 uppercase">
                      Sessions on: <span className="text-cyan-300 font-semibold">{selectedDateRecord?.label || 'Today'}</span> {isTodaySelected ? '(Live Data)' : '(Archive Log)'}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300">
                    {selectedDateRecord ? `${selectedDateRecord.count} Visitor(s)` : 'Telemetry Live'}
                  </div>
                </div>

                {/* 3 Glowing Session Length Columns (Seconds, Minutes, Hours) */}
                <div className="grid grid-cols-3 gap-4 h-44 sm:h-52 items-end px-4 pb-2">
                  {/* Column 1: Seconds */}
                  <div className="flex flex-col items-center h-full justify-end">
                    <span className="text-xs font-mono font-bold text-cyan-200 mb-2">
                      {activeDuration.seconds}
                    </span>
                    <div 
                      style={{ height: `${secondsHeightPx}px` }}
                      className={`w-full max-w-[70px] rounded-t transition-all duration-500 relative overflow-hidden ${
                        activeDuration.seconds > 0
                          ? 'bg-gradient-to-t from-cyan-700 via-cyan-500 to-cyan-300 border-t-2 border-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                          : 'bg-cyan-950/40 border border-cyan-500/30'
                      }`}
                    >
                      {activeDuration.seconds > 0 && (
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%)] bg-[size:8px_8px]" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-white/70 mt-2 uppercase">Seconds</span>
                  </div>

                  {/* Column 2: Minutes (Pink Glow Column from Image 1 & 2) */}
                  <div className="flex flex-col items-center h-full justify-end">
                    <span className="text-xs font-mono font-bold text-pink-300 mb-2">
                      {activeDuration.minutes}
                    </span>
                    <div 
                      style={{ height: `${minutesHeightPx}px` }}
                      className={`w-full max-w-[70px] rounded-t-lg transition-all duration-500 relative overflow-hidden ${
                        activeDuration.minutes > 0
                          ? 'bg-gradient-to-t from-pink-600 via-pink-500 to-pink-300 border-t-2 border-pink-200 shadow-[0_0_20px_rgba(236,72,153,0.6)]'
                          : 'bg-pink-950/20 border border-pink-500/30'
                      }`}
                    >
                      {activeDuration.minutes > 0 && (
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%)] bg-[size:8px_8px]" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-pink-400 mt-2 font-semibold uppercase">Minutes</span>
                  </div>

                  {/* Column 3: Hours (Amber Glow Column from Image 1 & 2) */}
                  <div className="flex flex-col items-center h-full justify-end">
                    <span className="text-xs font-mono font-bold text-amber-300 mb-2">
                      {activeDuration.hours}
                    </span>
                    <div 
                      style={{ height: `${hoursHeightPx}px` }}
                      className={`w-full max-w-[70px] rounded-t-lg transition-all duration-500 relative overflow-hidden ${
                        activeDuration.hours > 0
                          ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 border-t-2 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                          : 'bg-amber-950/20 border border-amber-500/30'
                      }`}
                    >
                      {activeDuration.hours > 0 && (
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%)] bg-[size:8px_8px]" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 mt-2 font-semibold uppercase">Hours</span>
                  </div>
                </div>

                {/* Average Session Length Footer */}
                <div className="text-center pt-3 border-t border-cyan-500/20 text-xs font-mono text-white/70">
                  Average session length ({selectedDateRecord?.label || 'Today'}): <span className="text-cyan-300 font-bold">{activeDuration.avgFormatted}</span>
                </div>
              </div>
            </div>

            {/* LOWER ROW: 2 HOLOGRAPHIC DONUT / PIE CHARTS (Weekly Report & Monthly Report) Styled after Image 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10">
              
              {/* Weekly report (Donut HUD Chart with Days Breakdown) */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider">
                      Weekly report
                    </h2>
                    <p className="text-[10px] font-mono text-purple-300/60 uppercase">Visits per day this week</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                  {/* Holographic Donut Chart Circle */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Outer circuit track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-cyan-950/60"
                        strokeWidth="14"
                        fill="transparent"
                      />
                      {/* Active Glowing Donut Arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-pink-500 transition-all duration-1000"
                        strokeWidth="14"
                        strokeDasharray="238.76"
                        strokeDashoffset="0"
                        fill="transparent"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.8))' }}
                      />
                    </svg>

                    {/* Donut Center Hologram Hub */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold font-mono text-white">
                        {data?.weeklyReport?.reduce((sum, item) => sum + item.count, 0) ?? (data?.thisWeekVisitors || 0)}
                      </span>
                      <span className="text-[9px] font-mono text-cyan-300 uppercase">Visits</span>
                    </div>
                  </div>

                  {/* Day Legend List (Matches Image 1) */}
                  <div className="flex flex-col gap-1.5 text-xs font-mono">
                    {data?.weeklyReport?.map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: w.color, boxShadow: `0 0 6px ${w.color}` }}
                          />
                          <span className="text-white/80">{w.day}</span>
                        </div>
                        <span className="text-white/50">{w.count} ({w.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Monthly report (Donut HUD Chart with Weeks Breakdown) */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                      Monthly report
                    </h2>
                    <p className="text-[10px] font-mono text-amber-300/60 uppercase">Visits per week this month</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                  {/* Holographic Donut Chart Circle */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Outer track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-cyan-950/60"
                        strokeWidth="14"
                        fill="transparent"
                      />
                      {/* Purple Glowing Segment for Week 3 */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-purple-500 transition-all duration-1000"
                        strokeWidth="14"
                        strokeDasharray="238.76"
                        strokeDashoffset={(data?.thisMonthVisitors || 0) > 0 ? "0" : "238.76"}
                        fill="transparent"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' }}
                      />
                    </svg>

                    {/* Donut Center Hologram Hub */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold font-mono text-white">
                        {data?.monthlyReport?.reduce((sum, item) => sum + item.count, 0) ?? (data?.thisMonthVisitors || 0)}
                      </span>
                      <span className="text-[9px] font-mono text-purple-300 uppercase">Visits</span>
                    </div>
                  </div>

                  {/* Week Legend List */}
                  <div className="flex flex-col gap-1.5 text-xs font-mono">
                    {data?.monthlyReport?.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}` }}
                          />
                          <span className="text-white/80">{m.week}</span>
                        </div>
                        <span className="text-white/50">{m.count} ({m.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: DEVICE SPLIT & TOP ROOMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10">
              {/* Device split – last 30 days */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
                  <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                    Device split – last 30 days
                  </h2>
                  <span className="text-[10px] font-mono text-blue-300/60 uppercase">By Visitor Device</span>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Desktop */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-white/80 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-cyan-400" />
                        <span>Desktop</span>
                      </div>
                      <span>{data?.deviceSplit?.desktop ?? 0}</span>
                    </div>
                    <div className="h-3 w-full bg-cyan-950/40 rounded-full overflow-hidden border border-cyan-500/20">
                      <div 
                        style={{ width: `${data?.deviceSplit?.total ? ((data?.deviceSplit?.desktop ?? 0) / data.deviceSplit.total) * 100 : 0}%` }}
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-white/80 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span>Mobile</span>
                      </div>
                      <span>{data?.deviceSplit?.mobile ?? 0}</span>
                    </div>
                    <div className="h-3 w-full bg-cyan-950/40 rounded-full overflow-hidden border border-cyan-500/20">
                      <div 
                        style={{ width: `${data?.deviceSplit?.total ? ((data?.deviceSplit?.mobile ?? 0) / data.deviceSplit.total) * 100 : 0}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top rooms – last 30 days */}
              <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
                  <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    Top rooms – last 30 days
                  </h2>
                  <span className="text-[10px] font-mono text-emerald-300/60 uppercase">Most Visited Direct Links</span>
                </div>

                <div className="space-y-3 pt-2">
                  {(!data?.topRooms || data.topRooms.length === 0) ? (
                    <div className="text-center py-6 text-white/40 font-mono text-xs">
                      No active rooms recorded
                    </div>
                  ) : (
                    data?.topRooms?.map((r, idx) => (
                      <div key={r.id || idx}>
                        <div className="flex items-center justify-between text-xs font-mono text-white/80 mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400">
                              {idx + 1}
                            </span>
                            <span className="truncate text-cyan-200 font-semibold">{r.name}</span>
                            {r.hostName && <span className="text-white/40 text-[10px]">(Host: {cleanHostName(r.hostName)})</span>}
                          </div>
                          <span className="text-emerald-400 font-bold">{r.visits}</span>
                        </div>
                        <div className="h-3 w-full bg-cyan-950/40 rounded-full overflow-hidden border border-emerald-500/20">
                          <div className="h-full w-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE RECENT ACTIVITY SECTION WITH DOWNWARD ARROW MARK & TIME FILTERS */}
            <div className="p-5 rounded-2xl bg-[#0d1117]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] z-10 transition-all">
              
              {/* Header Toggle with Downward Arrow */}
              <button
                type="button"
                onClick={() => setIsRecentActivityOpen((prev) => !prev)}
                className="w-full flex items-center justify-between group cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-200">
                      <span>Recent Activity & Room Links</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-normal">
                        {data?.recentActivity?.length || 0} events
                      </span>
                    </h2>
                    <p className="text-[10px] font-mono text-cyan-400/60">
                      {isRecentActivityOpen ? 'Click to collapse activity log' : 'Click downward arrow to view room links & host names'}
                    </p>
                  </div>
                </div>

                {/* Downward Arrow Mark button */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 group-hover:border-cyan-300 group-hover:bg-cyan-900/60 text-cyan-300 transition-all">
                  <span className="text-xs font-mono uppercase hidden sm:inline">
                    {isRecentActivityOpen ? 'Hide Activity' : 'Show Activity'}
                  </span>
                  {isRecentActivityOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-cyan-300 animate-bounce" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {isRecentActivityOpen && (
                <div className="mt-5 pt-4 border-t border-cyan-500/20 space-y-4 animate-fadeIn">
                  
                  {/* Time Range Filter Bar: Today, Yesterday, 1 Week, 2 Weeks, 1 Month */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-2.5 rounded-xl border border-cyan-500/20">
                    <div className="text-xs font-mono text-cyan-400/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Filter By Time:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'today', label: 'Today' },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: '1week', label: '1 Week' },
                          { id: '2weeks', label: '2 Weeks' },
                          { id: '1month', label: '1 Month' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTimeFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                            timeFilter === tab.id
                              ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                              : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300/80 hover:text-white border border-cyan-500/20'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Room Activity List - Simple and clean with Room Name, Host Name, Room Link, Copy & Time */}
                  <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    {filteredActivities.length === 0 ? (
                      <div className="p-6 text-center rounded-xl bg-black/30 border border-cyan-500/20 text-xs font-mono text-cyan-400/60">
                        No activity records found for the selected timeframe ({timeFilter}).
                      </div>
                    ) : (
                      filteredActivities.map((act) => {
                        const roomLinkUrl = act.roomLink || (act.roomId ? `/room/${act.roomId}` : '/');
                        const isCopied = copiedLinkId === act.id;
                        const displayHost = cleanHostName(act.hostName);

                        return (
                          <div 
                            key={act.id} 
                            className="p-3 rounded-xl bg-black/50 border border-cyan-500/25 hover:border-cyan-400/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs font-mono"
                          >
                            {/* Left: Clean Room Name & Host Name badge */}
                            <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] shrink-0" />
                              
                              {/* Room Name */}
                              <span className="text-white font-bold text-sm text-cyan-200 truncate">
                                {act.roomName || act.title}
                              </span>

                              {/* Host Name Badge (Clean name only, no email) */}
                              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[11px] text-cyan-300 shrink-0">
                                Host: <span className="font-semibold text-white">{displayHost}</span>
                              </span>

                              {/* Room Link Display & Copy Button */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <code className="px-2 py-0.5 rounded bg-black/80 border border-cyan-500/30 text-[11px] text-cyan-300 font-mono select-all truncate max-w-[220px] sm:max-w-[340px]">
                                  {window.location.origin}{roomLinkUrl}
                                </code>

                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(act.id, roomLinkUrl)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-[10px] text-cyan-200 hover:text-white cursor-pointer transition-all shrink-0"
                                  title="Copy Room Link"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-300 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-cyan-400" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Right: Timestamp & Device */}
                            <div className="flex items-center gap-2 shrink-0 text-white/50 text-[11px] self-end md:self-center">
                              <span className="uppercase text-[10px] text-cyan-400/60">{act.device}</span>
                              <span>•</span>
                              <span className="text-white/70 font-semibold">{formatTimeAgo(act.timestamp)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
