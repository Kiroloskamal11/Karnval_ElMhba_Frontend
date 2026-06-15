import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export default function CampLeaderDashboard() {
  const { i18n } = useTranslation();
  const { logout, user, darkMode, toggleDarkMode, toggleLanguage } = useAuth();
  const isAr = i18n.language === 'ar';

  const stationId = user?.station?.id;

  // Data states
  const [station, setStation] = useState(null);
  const [incomingTeam, setIncomingTeam] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [messages, setMessages] = useState([]);

  // Loading states
  const [loadingStation, setLoadingStation] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Timer countdown state
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Actions & UI Feedback
  const [helpMsg, setHelpMsg] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);
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

  // Fetch Station Details
  const fetchStation = useCallback(async () => {
    if (!stationId) {
      setLoadingStation(false);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/stations/${stationId}`);
      setStation(res.data);
    } catch (err) {
      console.error("Error fetching station details:", err);
    } finally {
      setLoadingStation(false);
    }
  }, [stationId]);

  // Fetch Incoming Team & Live Statuses
  const fetchLiveStatus = useCallback(async (stationName) => {
    if (!stationName) return;
    setLoadingLive(true);
    try {
      const res = await axios.get(`${API_BASE}/schedule/live`);
      const allLiveStatuses = res.data || [];

      // Find team whose next station matches current station name
      const matchingTeam = allLiveStatuses.find(
        (t) => t.nextStationName && t.nextStationName.trim().toLowerCase() === stationName.trim().toLowerCase()
      );

      // Find team currently at the station
      const currentAtStation = allLiveStatuses.find(
        (t) => t.currentStationName && t.currentStationName.trim().toLowerCase() === stationName.trim().toLowerCase()
      );
      setCurrentTeam(currentAtStation || null);

      if (matchingTeam) {
        setIncomingTeam(matchingTeam);
        setTimerSeconds(matchingTeam.timeRemainingSeconds || 0);

        // Fetch children stats for this incoming team
        try {
          const statsRes = await axios.get(`${API_BASE}/children/team/${matchingTeam.teamId}/stats`);
          setTeamStats(statsRes.data);
        } catch {
          setTeamStats(null);
        }
      } else {
        setIncomingTeam(null);
        setTeamStats(null);
        setTimerSeconds(0);
      }
    } catch (err) {
      console.error("Error fetching live status:", err);
    } finally {
      setLoadingLive(false);
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

  // Load Initial Data
  useEffect(() => {
    fetchStation();
    fetchMessages();
  }, [fetchStation, fetchMessages]);

  // Fetch live schedule after station details are available
  useEffect(() => {
    if (station?.name) {
      fetchLiveStatus(station.name);
    }
  }, [station, fetchLiveStatus]);

  // Countdown timer for incoming team's ETA
  useEffect(() => {
    if (timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            // Refresh live schedule status
            if (station?.name) {
              fetchLiveStatus(station.name);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerSeconds, station, fetchLiveStatus]);

  // Submit help request
  const handleSendHelpRequest = async (e) => {
    e.preventDefault();
    if (!helpMsg.trim()) return;

    setSendingHelp(true);
    try {
      await axios.post(`${API_BASE}/messages`, {
        recipientType: 'BROADCAST',
        content: "طلب مساعدة: " + helpMsg.trim()
      });
      setHelpMsg('');
      showToast(isAr ? 'تم إرسال طلب المساعدة بنجاح! 📢' : 'Help request broadcasted successfully! 📢');
      fetchMessages();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل إرسال طلب المساعدة' : 'Failed to send help request');
      showToast(errorMsg, 'error');
    } finally {
      setSendingHelp(false);
    }
  };

  // Format timer
  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0 || isNaN(totalSeconds)) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Filter messages for admin broadcasts (BROADCAST)
  const broadcastMessages = messages.filter((m) => m.recipientType === 'BROADCAST');

  const roleBadge = (role) => {
    const map = {
      CAMP_LEADER: {
        bg: 'bg-green-100 dark:bg-green-950/40',
        text: 'text-green-600 dark:text-green-300',
        label: isAr ? 'مسؤول محطة' : 'Camp Leader'
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
      {/* Decorative polka dot background */}
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

      {/* ====== HEADER ====== */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-500"
        style={{
          background: darkMode ? 'rgba(42,42,62,0.92)' : 'rgba(255,248,241,0.92)',
          borderColor: darkMode ? 'rgba(184,0,108,0.15)' : 'rgba(184,0,108,0.1)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">storefront</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0] truncate">
                {isAr ? 'مرحباً،' : 'Welcome,'} {user?.name || 'User'}
              </p>
              <div className="mt-0.5">
                {roleBadge('CAMP_LEADER')}
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6">

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

        {/* ================== HERO STATION HEADER ================== */}
        <section
          className="rounded-3xl p-6 sm:p-8 text-center text-white relative overflow-hidden shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #B8006C, #D4187E)'
          }}
        >
          {/* Subtle background glow decorative circle */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-black/10 rounded-full blur-2xl" />

          {loadingStation ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : station ? (
            <div className="relative z-10 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3.5 py-1 rounded-full">
                {isAr ? 'المحطة النشطة' : 'Active Station'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black">{station.name}</h1>
              {station.locationHint && (
                <p className="text-xs text-pink-100 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {station.locationHint}
                </p>
              )}
              {station.description && (
                <p className="text-xs text-pink-50 max-w-lg mx-auto pt-2 opacity-90 leading-relaxed">
                  {station.description}
                </p>
              )}
            </div>
          ) : (
            <div className="relative z-10 py-4">
              <h1 className="text-xl font-bold">{isAr ? 'لم يتم ربطك بمحطة بعد' : 'Not Assigned to a Station'}</h1>
              <p className="text-xs text-pink-100 mt-2">
                {isAr ? 'يرجى التواصل مع مسؤول النظام لربط حسابك بمحطة الكرنفال.' : 'Please coordinate with admin to assign a station.'}
              </p>
            </div>
          )}
        </section>

        {/* ================== CURRENT TEAM AT STATION ================== */}
        {station && currentTeam && (
          <section
            className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184, 0, 108, 0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500 text-2xl">group</span>
              </div>
              <div>
                <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                  {isAr ? 'الفريق المتواجد حالياً' : 'Current Team at Station'}
                </h2>
                <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                  {isAr ? 'الفريق الذي يقوم بالنشاط الآن في محطتك' : 'The team currently doing the activity at your station'}
                </p>
              </div>
            </div>

            <div
              className="p-5 rounded-2xl border-2 flex items-center gap-4"
              style={{
                borderColor: currentTeam.teamColorHex || '#3B82F6',
                background: darkMode ? '#1E1B2E' : '#FCFDFE'
              }}
            >
              <div
                className="w-5 h-5 rounded-full border shadow-sm shrink-0"
                style={{ backgroundColor: currentTeam.teamColorHex || '#3B82F6' }}
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase text-[#9B8E82] dark:text-[#8888A0] tracking-wider block">
                  {isAr ? 'اسم الفريق' : 'Team Name'}
                </span>
                <h3 className="text-xl font-black text-[#1e1b17] dark:text-[#E0E0F0] mt-0.5 truncate">
                  {currentTeam.teamName}
                </h3>
              </div>
              <div className="text-end shrink-0">
                <span className="text-[10px] font-black uppercase text-[#9B8E82] dark:text-[#8888A0] tracking-wider block">
                  {isAr ? 'اللون' : 'Color'}
                </span>
                <span className="font-bold text-[#1e1b17] dark:text-[#E0E0F0]">
                  {currentTeam.teamColor}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ================== INCOMING TEAM ETA ================== */}
        {station && (
          <section
            className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184, 0, 108, 0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-2xl">transfer_within_a_station</span>
              </div>
              <div>
                <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                  {isAr ? 'الفريق القادم التالي' : 'Incoming Rotation Status'}
                </h2>
                <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                  {isAr ? 'معلومات وتوقيت وصول الفريق القادم لمحطتك' : 'ETA and breakdown of the team rotating next into your station'}
                </p>
              </div>
            </div>

            {loadingLive ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : incomingTeam ? (
              <div className="space-y-6">
                {/* Incoming Team Hero Card */}
                <div
                  className="p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4"
                  style={{
                    borderColor: incomingTeam.teamColorHex || '#B8006C',
                    background: darkMode ? '#1E1B2E' : '#FCFDFE'
                  }}
                >
                  <div className="flex items-center gap-3.5 text-center sm:text-start">
                    {/* Visual color dot */}
                    <div
                      className="w-5 h-5 rounded-full border shadow-sm"
                      style={{ backgroundColor: incomingTeam.teamColorHex || '#B8006C' }}
                    />
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#9B8E82] dark:text-[#8888A0] tracking-wider block">
                        {isAr ? 'الفريق القادم' : 'Arriving Next'}
                      </span>
                      <h3 className="text-xl font-black text-[#1e1b17] dark:text-[#E0E0F0] mt-0.5">
                        {incomingTeam.teamName}
                      </h3>
                    </div>
                  </div>

                  <div className="text-center sm:text-end">
                    <span className="text-[10px] font-black uppercase text-[#9B8E82] dark:text-[#8888A0] tracking-wider block">
                      {isAr ? 'الوقت المتوقع للوصول (ETA)' : 'Estimated Arrival (ETA)'}
                    </span>
                    <div
                      className={`text-3xl font-black font-mono mt-0.5 tracking-wide ${
                        timerSeconds < 60 ? 'text-red-500 animate-pulse' : 'text-[#1e1b17] dark:text-[#E0E0F0]'
                      }`}
                    >
                      {formatCountdown(timerSeconds)}
                    </div>
                  </div>
                </div>

                {/* Incoming Team Child statistics */}
                <div className="bg-[#fffbf7] dark:bg-[#1E1B2E]/40 p-5 rounded-xl border border-fuchsia/5 space-y-4">
                  <h4 className="text-xs font-black text-[#1e1b17] dark:text-[#E0E0F0] uppercase tracking-wider">
                    {isAr ? 'تقسيم أعداد الأطفال للفريق القادم' : 'Child Count Breakdown'}
                  </h4>

                  {teamStats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white dark:bg-card-dark p-3.5 rounded-xl text-center border dark:border-gray-800">
                        <span className="text-[10px] font-bold text-[#9B8E82] dark:text-[#8888A0] block">
                          {isAr ? 'تحت الروضة' : 'Under KG'}
                        </span>
                        <span className="text-xl font-black text-fuchsia block mt-1">
                          {teamStats.UNDER_KG || 0}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-card-dark p-3.5 rounded-xl text-center border dark:border-gray-800">
                        <span className="text-[10px] font-bold text-[#9B8E82] dark:text-[#8888A0] block">
                          {isAr ? 'كي جي 1' : 'KG 1'}
                        </span>
                        <span className="text-xl font-black text-fuchsia block mt-1">
                          {teamStats.KG1 || 0}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-card-dark p-3.5 rounded-xl text-center border dark:border-gray-800">
                        <span className="text-[10px] font-bold text-[#9B8E82] dark:text-[#8888A0] block">
                          {isAr ? 'كي جي 2' : 'KG 2'}
                        </span>
                        <span className="text-xl font-black text-fuchsia block mt-1">
                          {teamStats.KG2 || 0}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-card-dark p-3.5 rounded-xl text-center border dark:border-gray-800">
                        <span className="text-[10px] font-bold text-[#9B8E82] dark:text-[#8888A0] block">
                          {isAr ? 'أخرى' : 'Other'}
                        </span>
                        <span className="text-xl font-black text-fuchsia block mt-1">
                          {teamStats.OTHER || 0}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs text-gray-400">
                      {isAr ? 'لا توجد بيانات إحصائية للفريق.' : 'No stats details for the incoming team.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <span className="material-symbols-outlined text-[48px] text-gray-300 dark:text-gray-600 mb-2 block">hourglass_empty</span>
                <p className="text-sm font-bold text-[#9B8E82] dark:text-[#8888A0]">
                  {isAr ? 'لا توجد فرق قادمة حالياً لمحطتك.' : 'No incoming teams scheduled next to your station.'}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ================== HELP REQUEST (EMERGENCY SUPPORT) ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-2xl">emergency</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'طلب مساعدة طارئة' : 'Emergency Assistance'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'أرسل بلاغاً فورياً للجنة التنظيمية والمسؤولين' : 'Send an immediate assistance request to administrators'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSendHelpRequest} className="space-y-4">
            <div>
              <input
                type="text"
                value={helpMsg}
                onChange={(e) => setHelpMsg(e.target.value)}
                placeholder={isAr ? 'اكتب ما تحتاجه في المحطة (مثال: نحتاج مياه، طفل متعب)...' : 'Describe your need (e.g. need water, tired child)...'}
                className="w-full text-sm font-medium outline-none transition-colors border-2 rounded-xl p-3 min-h-[48px]"
                style={{
                  background: darkMode ? '#1A1A2E' : '#FFFFFF',
                  borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(184,0,108,0.1)',
                  color: darkMode ? '#E0E0F0' : '#1e1b17',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={sendingHelp || !helpMsg.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-sm min-h-[48px] py-3.5 px-6 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              {sendingHelp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined">campaign</span>
                  {isAr ? 'طلب مساعدة عاجلة' : 'Need Assistance'}
                </>
              )}
            </button>
          </form>
        </section>

        {/* ================== ANNOUNCEMENTS FROM ADMIN ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fuchsia text-2xl">campaign</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'إعلانات الإدارة والتعليمات' : 'Admin Broadcasts'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'أحدث التعليمات والتبليغات العامة' : 'General camp alerts and administration details'}
              </p>
            </div>
          </div>

          {loadingMessages ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : broadcastMessages.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'لا توجد إعلانات إدارية بعد.' : 'No admin announcements found.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {broadcastMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 rounded-xl border border-dashed text-sm bg-fuchsia/5 border-fuchsia/20 relative"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-fuchsia flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">notifications_active</span>
                      {msg.sender?.name || (isAr ? 'إعلان عام' : 'Broadcast')}
                    </span>
                    <span className="text-[9px] text-[#9B8E82] dark:text-[#8888A0]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#1e1b17] dark:text-[#E0E0F0] font-bold break-words">
                    {msg.content}
                  </p>
                </div>
              ))}
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
