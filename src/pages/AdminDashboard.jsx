import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

// Team colors fallback hex mapping
const COLOR_HEX_MAP = {
  RED: '#EF4444',
  BLUE: '#3B82F6',
  YELLOW: '#EAB308',
  GREEN: '#22C55E',
  PINK: '#EC4899',
  WHITE: '#F8FAFC'
};

export default function AdminDashboard() {
  const { i18n } = useTranslation();
  const { logout, user, darkMode, toggleDarkMode, toggleLanguage } = useAuth();
  const isAr = i18n.language === 'ar';

  // Data states
  const [liveStatuses, setLiveStatuses] = useState([]);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Loading states
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  // Dictionary for countdowns (teamId -> seconds remaining)
  const [countdowns, setCountdowns] = useState({});

  // Actions & UI Feedback
  const [broadcastContent, setBroadcastContent] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const intervalRef = useRef(null);

  // Helper to show toasts
  const showToast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  }, []);

  // Fetch Live Statuses
  const fetchLiveStatuses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/schedule/live`);
      const data = res.data || [];
      setLiveStatuses(data);

      // Populate countdown values
      const initialCountdowns = {};
      data.forEach((status) => {
        if (status.teamId && status.timeRemainingSeconds !== null) {
          initialCountdowns[status.teamId] = status.timeRemainingSeconds;
        }
      });
      setCountdowns(initialCountdowns);
    } catch (err) {
      console.error("Error fetching live statuses:", err);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  // Fetch Children Statistics
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get(`${API_BASE}/children/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching children stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Messages
  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await axios.get(`${API_BASE}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const res = await axios.get(`${API_BASE}/arrivals`);
      // Sort newest first
      const sorted = (res.data || []).sort((a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt));
      setTimeline(sorted);
    } catch (err) {
      console.error("Error fetching arrivals timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  // Load all data
  useEffect(() => {
    fetchLiveStatuses();
    fetchStats();
    fetchMessages();
    fetchTimeline();
  }, [fetchLiveStatuses, fetchStats, fetchMessages, fetchTimeline]);

  // Global ticked countdown interval for all teams
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdowns((prev) => {
        const updated = { ...prev };
        let hasChanges = false;
        let needsRefresh = false;

        Object.keys(updated).forEach((teamId) => {
          if (updated[teamId] > 0) {
            updated[teamId] = updated[teamId] - 1;
            hasChanges = true;
            if (updated[teamId] === 0) {
              needsRefresh = true;
            }
          }
        });

        if (needsRefresh) {
          fetchLiveStatuses();
        }

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLiveStatuses]);

  // Send Broadcast Message
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastContent.trim()) return;

    setSendingBroadcast(true);
    try {
      await axios.post(`${API_BASE}/messages`, {
        recipientType: 'BROADCAST',
        content: broadcastContent.trim()
      });
      setBroadcastContent('');
      showToast(isAr ? 'تم إرسال الإعلان العام بنجاح! 📢' : 'Announcement broadcasted successfully! 📢');
      fetchMessages();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل إرسال الإعلان' : 'Failed to send broadcast announcement');
      showToast(errorMsg, 'error');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Format countdown string
  const formatCountdown = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds <= 0 || isNaN(totalSeconds)) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Helper to determine text readability color on custom team background
  const getContrastTextColor = (teamColorName) => {
    const name = (teamColorName || '').toUpperCase();
    if (name === 'WHITE' || name === 'YELLOW') {
      return '#1E1B17'; // dark text for light colors
    }
    return '#FFFFFF'; // white text for red, blue, green, pink
  };

  // Helper to determine hex color code for card background
  const getTeamColorHex = (status) => {
    if (status.teamColorHex) return status.teamColorHex;
    const name = (status.teamColor || '').toUpperCase();
    return COLOR_HEX_MAP[name] || '#B8006C';
  };

  // Role details badge helper
  const roleBadge = (role) => {
    const map = {
      ADMIN: {
        bg: 'bg-yellow-100 dark:bg-yellow-950/40',
        text: 'text-yellow-700 dark:text-yellow-300',
        label: isAr ? 'مسؤول الكرنفال' : 'Camp Admin'
      }
    };
    const info = map[role] || { bg: 'bg-gray-100', text: 'text-gray-600', label: role };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${info.bg} ${info.text}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div
      className="min-h-screen w-full font-[Cairo] transition-colors duration-500 pb-28"
      style={{ background: darkMode ? '#1A1A2E' : '#fff8f1' }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {styleTag(darkMode)}

      {/* ====== HEADER ====== */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-500"
        style={{
          background: darkMode ? 'rgba(42,42,62,0.92)' : 'rgba(255,248,241,0.92)',
          borderColor: darkMode ? 'rgba(184,0,108,0.15)' : 'rgba(184,0,108,0.1)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#EAB308] to-[#CA8A04] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0] truncate">
                {isAr ? 'مرحباً،' : 'Welcome,'} {user?.name || 'User'}
              </p>
              <div className="mt-0.5">
                {roleBadge('ADMIN')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleLanguage}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 min-w-[36px] min-h-[36px]"
              style={{
                background: darkMode ? '#2A2A3E' : '#f4ede5',
                color: darkMode ? '#E0E0F0' : '#1e1b17',
              }}
            >
              <span className="font-bold text-xs">{isAr ? 'EN' : 'ع'}</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 min-w-[36px] min-h-[36px]"
              style={{
                background: darkMode ? '#2A2A3E' : '#f4ede5',
                color: darkMode ? '#E0E0F0' : '#1e1b17',
              }}
            >
              <span className="material-symbols-outlined text-lg">{darkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer min-w-[36px] min-h-[36px]"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">

        {toastMsg && (
          <div
            className={`border p-3 rounded-xl text-sm font-bold text-center animate-fade-in-up ${
              toastType === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
            }`}
          >
            {toastMsg}
          </div>
        )}

        {/* ================== LIVE TEAM SCHEDULE GRID MAP ================== */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">map</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'خريطة مواقع الفرق الحية' : 'Live Team Locations'}
              </h2>
              <p className="text-xs text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'حالة موقع وتوقيت جميع الفرق الـ 6 بالكرنفال' : 'Current station, next station, and remaining slot timers for all 6 teams'}
              </p>
            </div>
          </div>

          {loadingLive ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : liveStatuses.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-gray-150">
              <p className="text-sm text-gray-400">{isAr ? 'لا توجد بيانات حركة للفرق حالياً.' : 'No team schedules active.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStatuses.map((status) => {
                const teamBg = getTeamColorHex(status);
                const teamText = getContrastTextColor(status.teamColor);
                const secondsLeft = countdowns[status.teamId] || 0;

                return (
                  <div
                    key={status.teamId}
                    className="rounded-2xl p-5 shadow-md flex flex-col justify-between border-2 transition-transform hover:-translate-y-1 duration-300"
                    style={{
                      borderColor: teamBg === '#F8FAFC' ? 'rgba(184,0,108,0.1)' : teamBg,
                      background: darkMode ? '#2A2A3E' : '#FFFFFF'
                    }}
                  >
                    {/* Header: Name and color badge */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                        {status.teamName}
                      </h3>
                      <span
                        className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm border border-black/5"
                        style={{
                          backgroundColor: teamBg,
                          color: teamText
                        }}
                      >
                        {status.teamColor}
                      </span>
                    </div>

                    {/* Stations visual workflow */}
                    <div className="space-y-4 my-2">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-green-500 text-lg shrink-0 mt-0.5">location_on</span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-[#9B8E82] dark:text-[#8888A0] block">
                            {isAr ? 'المحطة الحالية' : 'Current Station'}
                          </span>
                          <span className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0] truncate block">
                            {status.timeRemainingSeconds === null || status.timeRemainingSeconds <= 0
                              ? (isAr ? 'انتهى اليوم' : 'Day Ended')
                              : (status.currentStationName || (isAr ? 'غير مجدول' : 'Not Scheduled'))}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-fuchsia text-lg shrink-0 mt-0.5">next_plan</span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black text-[#9B8E82] dark:text-[#8888A0] block">
                            {isAr ? 'المحطة القادمة' : 'Next Station'}
                          </span>
                          <span className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0] truncate block">
                            {status.nextStationName || (isAr ? 'نهاية الكرنفال' : 'End of Day')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timer Footer */}
                    <div className="border-t dark:border-gray-800/80 pt-4.5 mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#9B8E82] dark:text-[#8888A0] uppercase tracking-wider block">
                        {isAr ? 'الوقت المتبقي' : 'Time Remaining'}
                      </span>
                      {status.timeRemainingSeconds !== null && status.timeRemainingSeconds > 0 ? (
                        <div
                          className={`font-mono text-xl font-black ${
                            secondsLeft < 60 ? 'text-red-500 animate-pulse' : 'text-[#1e1b17] dark:text-[#E0E0F0]'
                          }`}
                        >
                          {formatCountdown(secondsLeft)}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{isAr ? 'انتهى اليوم' : 'Day Ended'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================== EVENT STATISTICS ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fuchsia text-2xl">analytics</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'إحصائيات الكرنفال العامة' : 'Camp Statistics'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'إجمالي عدد الأطفال وتقسيم المراحل العمرية للكرنفال بالكامل' : 'Total event attendees breakdown and statistics'}
              </p>
            </div>
          </div>

          {loadingStats ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Total count bubble */}
              <div className="bg-[#fffbf7] dark:bg-[#1E1B2E]/50 p-6 rounded-2xl border border-fuchsia/10 text-center flex flex-col justify-center min-h-[140px] md:col-span-1">
                <span className="text-xs uppercase font-bold text-fuchsia tracking-wider mb-1 block">
                  {isAr ? 'إجمالي الأطفال بالكرنفال' : 'Total Registered Children'}
                </span>
                <span className="text-5xl font-black text-[#1e1b17] dark:text-[#E0E0F0] mt-1.5 block">
                  {stats.total || 0}
                </span>
              </div>

              {/* Breakdown detail list */}
              <div className="md:col-span-2 space-y-4">
                <span className="text-xs font-black text-[#9B8E82] dark:text-[#8888A0] tracking-wider uppercase block">
                  {isAr ? 'حسب المراحل العمرية' : 'Age Group Distribution'}
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-850 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1e1b17] dark:text-[#E0E0F0]">
                      {isAr ? 'تحت الروضة' : 'Under KG'}
                    </span>
                    <span className="font-black text-fuchsia bg-white dark:bg-card-dark px-2.5 py-1 rounded-lg border">
                      {stats.byAgeGroup?.UNDER_KG || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-850 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1e1b17] dark:text-[#E0E0F0]">
                      {isAr ? 'كي جي 1' : 'KG 1'}
                    </span>
                    <span className="font-black text-fuchsia bg-white dark:bg-card-dark px-2.5 py-1 rounded-lg border">
                      {stats.byAgeGroup?.KG1 || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-850 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1e1b17] dark:text-[#E0E0F0]">
                      {isAr ? 'كي جي 2' : 'KG 2'}
                    </span>
                    <span className="font-black text-fuchsia bg-white dark:bg-card-dark px-2.5 py-1 rounded-lg border">
                      {stats.byAgeGroup?.KG2 || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-850 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1e1b17] dark:text-[#E0E0F0]">
                      {isAr ? 'مراحل أخرى' : 'Other Groups'}
                    </span>
                    <span className="font-black text-fuchsia bg-white dark:bg-card-dark px-2.5 py-1 rounded-lg border">
                      {stats.byAgeGroup?.OTHER || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'فشل تحميل بيانات الإحصائيات.' : 'Could not pull event statistics.'}
            </div>
          )}
        </section>

        {/* ================== TIMELINE OF MOVEMENTS ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">history</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'سجل تحركات الفرق' : 'Timeline of Movements'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'متابعة لحظية لوصول الفرق للمحطات' : 'Live tracking of team arrivals at stations'}
              </p>
            </div>
          </div>

          {loadingTimeline ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-6 text-sm text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'لم يتم تسجيل أي تحركات بعد.' : 'No team movements recorded yet.'}
            </div>
          ) : (
            <div className="relative border-s-2 border-gray-200 dark:border-gray-700/50 ms-3 space-y-6">
              {timeline.slice(0, 50).map((arrival) => {
                const teamBg = arrival.team?.colorHex || '#B8006C';
                const teamText = getContrastTextColor(arrival.team?.color);
                
                return (
                  <div key={arrival.id} className="relative ps-6">
                    <span 
                      className="absolute flex items-center justify-center w-6 h-6 rounded-full -start-3 ring-4 ring-white dark:ring-[#2A2A3E]"
                      style={{ backgroundColor: teamBg }}
                    >
                      <span className="material-symbols-outlined text-white text-[12px]">location_on</span>
                    </span>
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-850">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm border border-black/5"
                            style={{ backgroundColor: teamBg, color: teamText }}
                          >
                            {arrival.team?.name || 'فريق'}
                          </span>
                          <span className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0]">
                            {isAr ? 'وصل إلى' : 'arrived at'}
                          </span>
                          <span className="text-sm font-black text-fuchsia">
                            {arrival.station?.name || 'محطة'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-[#9B8E82] dark:text-[#8888A0]">
                          {new Date(arrival.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                        {isAr ? 'تم التأكيد بواسطة:' : 'Confirmed by:'} {arrival.confirmedBy?.name || 'مجهول'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================== CENTRAL ANNOUNCEMENTS / SUPPORT MESSAGES ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fuchsia text-2xl">campaign</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'مركز الإعلانات العام والتعليمات' : 'Announcement & Broadcast Center'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'إرسال إعلانات عامة لجميع القادة واستعراض الرسائل الواردة' : 'Broadcast official alerts and view communications'}
              </p>
            </div>
          </div>

          {/* Send Broadcast form */}
          <form onSubmit={handleSendBroadcast} className="mb-6 space-y-3">
            <div>
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder={isAr ? 'اكتب إعلاناً عاماً لجميع قادة المجموعات والمحطات بالكرنفال...' : 'Type a general announcement for all leaders...'}
                className="w-full text-sm outline-none transition-colors border-2 rounded-xl p-3 resize-none h-24"
                style={{
                  background: darkMode ? '#1A1A2E' : '#FFFFFF',
                  borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(184,0,108,0.1)',
                  color: darkMode ? '#E0E0F0' : '#1e1b17',
                }}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sendingBroadcast || !broadcastContent.trim()}
                className="bg-fuchsia hover:bg-fuchsia-light disabled:opacity-50 text-white font-bold text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm min-h-[40px]"
              >
                {sendingBroadcast ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm font-bold">send</span>
                    {isAr ? 'إرسال إعلان عام' : 'Broadcast Announcement'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* List Messages */}
          {loadingMessages ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'لا توجد رسائل سابقة.' : 'No messages found.'}
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isBroadcast = msg.recipientType === 'BROADCAST';
                const isSentByMe = msg.sender?.id === user?.id;
                const isHelpRequest = (msg.content || '').startsWith('طلب مساعدة') || (msg.content || '').startsWith('Assistance Request');

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border text-sm max-w-[90%] transition-colors ${
                      isSentByMe
                        ? 'ms-auto bg-fuchsia/5 border-fuchsia/10 text-end'
                        : isHelpRequest
                        ? 'me-auto bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-300'
                        : 'me-auto bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 justify-between flex-wrap">
                      <span className="text-[10px] font-black text-fuchsia flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">
                          {isBroadcast ? 'campaign' : 'mail'}
                        </span>
                        {isSentByMe
                          ? (isAr ? 'أنت' : 'You')
                          : msg.sender?.name || (isAr ? 'مرسل مجهول' : 'Unknown Sender')}
                        <span className="font-normal text-gray-400">
                          ({msg.sender?.role === 'CAMP_LEADER' ? (isAr ? 'مسؤول محطة' : 'Camp Leader') : msg.sender?.role === 'TEAM_LEADER' ? (isAr ? 'قائد فريق' : 'Team Leader') : (isAr ? 'مسؤول' : 'Admin')})
                        </span>
                      </span>
                      <span className="text-[9px] text-[#9B8E82] dark:text-[#8888A0]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#1e1b17] dark:text-[#E0E0F0] font-bold break-words">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ====== FOOTER ====== */}
      <footer
        className="fixed bottom-0 left-0 right-0 text-center py-3 border-t transition-colors duration-500 z-40"
        style={{
          background: darkMode ? 'rgba(42,42,62,0.95)' : 'rgba(255,248,241,0.95)',
          borderColor: darkMode ? 'rgba(184,0,108,0.1)' : 'rgba(184,0,108,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p className="text-xs font-bold text-[#9B8E82] dark:text-[#8888A0] tracking-wide">
          Developed by:- <span className="text-[#B8006C] dark:text-pink-300">Kirolos Kamal</span>
        </p>
      </footer>
    </div>
  );
}

// Styling configurations helper
function styleTag(darkMode) {
  return (
    <style>{`
      body {
        background-color: ${darkMode ? '#1A1A2E' : '#fff8f1'};
        background-image: ${darkMode
          ? 'radial-gradient(#2A2A3E 1.5px, transparent 1.5px), radial-gradient(#232340 1.5px, transparent 1.5px)'
          : 'radial-gradient(#ffd9e4 1.5px, transparent 1.5px), radial-gradient(#ffdea8 1.5px, transparent 1.5px)'};
        background-size: 40px 40px;
        background-position: 0 0, 20px 20px;
        transition: background-color 0.5s ease;
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
    `}</style>
  );
}
