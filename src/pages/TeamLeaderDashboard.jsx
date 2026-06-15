import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

// Audio alert utility using Web Audio API for station transitions
const playAlertSound = (type = 'chime') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    if (type === 'chime') {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gainNode.gain.setValueAtTime(0.3, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'triangle';
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(880, now); // A5
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.frequency.setValueAtTime(880, now + 0.2); // A5
      gainNode.gain.setValueAtTime(0.4, now + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.error("Audio API error:", err);
  }
};

export default function TeamLeaderDashboard() {
  const { i18n } = useTranslation();
  const { logout, user, darkMode, toggleDarkMode, toggleLanguage } = useAuth();
  const isAr = i18n.language === 'ar';

  // Team Leader specific details
  const teamId = user?.team?.id;

  // Data states
  const [liveStatus, setLiveStatus] = useState(null);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [children, setChildren] = useState([]);
  const [messages, setMessages] = useState([]);
  const [arrivals, setArrivals] = useState([]);

  // Loading states
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Countdown timer state
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Actions & UI feedback
  const [arrivalSuccess, setArrivalSuccess] = useState(false);
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [actionLoadingChild, setActionLoadingChild] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  // Modals state
  const [showChildModal, setShowChildModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingChild, setEditingChild] = useState(null);
  const [childName, setChildName] = useState('');
  const [childAgeGroup, setChildAgeGroup] = useState('UNDER_KG');

  // New message state
  const [msgContent, setMsgContent] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Timer interval reference
  const intervalRef = useRef(null);

  // Helper to show toasts
  const showToast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  }, []);

  // Fetch Live Status & Current Slot
  const fetchSchedule = useCallback(async () => {
    if (!teamId) return;
    try {
      // Live countdown and stations
      const statusRes = await axios.get(`${API_BASE}/schedule/team/${teamId}/live`);
      setLiveStatus(statusRes.data);
      if (statusRes.data && statusRes.data.timeRemainingSeconds !== null) {
        setTimerSeconds(statusRes.data.timeRemainingSeconds);
      } else {
        setTimerSeconds(0);
      }

      // Current slot to obtain the current stationId
      try {
        const slotRes = await axios.get(`${API_BASE}/schedule/team/${teamId}/current`);
        if (slotRes.status === 200 && slotRes.data) {
          setCurrentSlot(slotRes.data);
        } else {
          setCurrentSlot(null);
        }
      } catch {
        setCurrentSlot(null);
      }
    } catch (err) {
      console.error("Error fetching live schedule:", err);
    } finally {
      setLoadingSchedule(false);
    }
  }, [teamId]);

  // Fetch Children
  const fetchChildren = useCallback(async () => {
    if (!teamId) return;
    setLoadingChildren(true);
    try {
      const res = await axios.get(`${API_BASE}/children/team/${teamId}`);
      setChildren(res.data || []);
    } catch (err) {
      console.error("Error fetching children:", err);
    } finally {
      setLoadingChildren(false);
    }
  }, [teamId]);

  // Fetch Arrivals to see if we already checked in
  const fetchArrivals = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await axios.get(`${API_BASE}/arrivals/team/${teamId}`);
      setArrivals(res.data || []);
    } catch (err) {
      console.error("Error fetching arrivals:", err);
    }
  }, [teamId]);

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

  // Poll live schedule data and fetch everything initially
  useEffect(() => {
    fetchSchedule();
    fetchChildren();
    fetchArrivals();
    fetchMessages();
  }, [fetchSchedule, fetchChildren, fetchArrivals, fetchMessages]);

  // Countdown timer local effect with Audio + Visual Alerts for transition
  useEffect(() => {
    if (timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const nextVal = prev - 1;
          
          // 5 minutes remaining alert (300 seconds)
          if (nextVal === 300) {
            const stationName = liveStatus?.nextStationName || (isAr ? 'المحطة التالية' : 'next station');
            const alertMsg = isAr
              ? `تنبيه: باقي 5 دقائق للانتقال إلى محطة: ${stationName} ⏳`
              : `Alert: 5 minutes remaining to shift to: ${stationName} ⏳`;
            setTimeout(() => {
              showToast(alertMsg, 'success');
              playAlertSound('chime');
            }, 0);
          }
          
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            // Transition time reached alert!
            const stationName = liveStatus?.nextStationName || (isAr ? 'المحطة التالية' : 'next station');
            const alertMsg = isAr
              ? `تنبيه: حان وقت الانتقال الآن إلى محطة: ${stationName} 📢`
              : `Alert: Time to move now to: ${stationName} 📢`;
            setTimeout(() => {
              showToast(alertMsg, 'error');
              playAlertSound('warning');
              fetchSchedule();
            }, 0);
            return 0;
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerSeconds, fetchSchedule, liveStatus, isAr, showToast]);

  // Confirm arrival
  const handleConfirmArrival = async () => {
    const stationId = currentSlot?.station?.id;
    if (!teamId || !stationId) {
      showToast(isAr ? 'لا توجد محطة حالية لتسجيل الوصول إليها' : 'No current station to check in to', 'error');
      return;
    }

    setSubmittingArrival(true);
    try {
      await axios.post(`${API_BASE}/arrivals`, { teamId, stationId });
      setArrivalSuccess(true);
      showToast(isAr ? 'تم تأكيد الوصول بنجاح! ✓' : 'Arrival confirmed successfully! ✓');
      fetchArrivals();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل تسجيل الوصول' : 'Failed to confirm arrival');
      showToast(errorMsg, 'error');
    } finally {
      setSubmittingArrival(false);
    }
  };

  // Add / Edit child handler
  const handleChildSubmit = async (e) => {
    e.preventDefault();
    if (!childName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم الطفل' : 'Please enter child name', 'error');
      return;
    }

    setActionLoadingChild(true);
    try {
      if (modalMode === 'add') {
        await axios.post(`${API_BASE}/children`, {
          teamId,
          name: childName.trim(),
          ageGroup: childAgeGroup
        });
        showToast(isAr ? 'تم إضافة الطفل بنجاح ✓' : 'Child added successfully ✓');
      } else {
        await axios.put(`${API_BASE}/children/${editingChild.id}`, {
          name: childName.trim(),
          ageGroup: childAgeGroup
        });
        showToast(isAr ? 'تم تعديل بيانات الطفل بنجاح ✓' : 'Child updated successfully ✓');
      }
      setShowChildModal(false);
      setChildName('');
      setChildAgeGroup('UNDER_KG');
      fetchChildren();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل حفظ بيانات الطفل' : 'Failed to save child');
      showToast(errorMsg, 'error');
    } finally {
      setActionLoadingChild(false);
    }
  };

  // Delete child
  const handleDeleteChild = async (childId) => {
    const confirmDelete = window.confirm(
      isAr ? 'هل أنت متأكد من حذف هذا الطفل؟' : 'Are you sure you want to delete this child?'
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/children/${childId}`);
      showToast(isAr ? 'تم حذف الطفل بنجاح' : 'Child deleted successfully');
      fetchChildren();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل حذف الطفل' : 'Failed to delete child');
      showToast(errorMsg, 'error');
    }
  };

  // Send message to admin
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgContent.trim()) return;

    setSendingMsg(true);
    try {
      await axios.post(`${API_BASE}/messages`, {
        recipientType: 'BROADCAST',
        content: msgContent.trim()
      });
      setMsgContent('');
      showToast(isAr ? 'تم إرسال الرسالة إلى المسؤولين بنجاح ✓' : 'Message sent to admins successfully ✓');
      fetchMessages();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل إرسال الرسالة' : 'Failed to send message');
      showToast(errorMsg, 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  // Format countdown string
  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0 || isNaN(totalSeconds)) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Determine if check-in has already happened for current station
  const isCheckedInForCurrentStation = () => {
    if (!currentSlot?.station?.id) return false;
    return arrivals.some((arr) => arr.station?.id === currentSlot.station.id);
  };

  // Age group helper labels
  const getAgeGroupLabel = (group) => {
    const map = {
      UNDER_KG: isAr ? 'تحت الروضة' : 'Under KG',
      KG1: isAr ? 'كي جي 1' : 'KG 1',
      KG2: isAr ? 'كي جي 2' : 'KG 2',
      OTHER: isAr ? 'أخرى' : 'Other'
    };
    return map[group] || group;
  };

  // Open modal for editing
  const openEditModal = (child) => {
    setModalMode('edit');
    setEditingChild(child);
    setChildName(child.name);
    setChildAgeGroup(child.ageGroup);
    setShowChildModal(true);
  };

  // Open modal for adding
  const openAddModal = () => {
    setModalMode('add');
    setEditingChild(null);
    setChildName('');
    setChildAgeGroup('UNDER_KG');
    setShowChildModal(true);
  };

  // Role details badge helper
  const roleBadge = (role) => {
    const map = {
      TEAM_LEADER: {
        bg: 'bg-fuchsia/10 dark:bg-fuchsia/20',
        text: 'text-fuchsia dark:text-pink-300',
        label: isAr ? 'قائد فريق' : 'Team Leader'
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
      {/* Decorative background rules */}
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
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#B8006C] to-[#D4187E] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">directions_run</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1e1b17] dark:text-[#E0E0F0] truncate">
                {isAr ? 'مرحباً،' : 'Welcome,'} {user?.name || 'User'}
              </p>
              <div className="mt-0.5">
                {roleBadge('TEAM_LEADER')}
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

        {/* Global Toast Message */}
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

        {/* ================== LIVE STATUS & TIME TRANSITION ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fuchsia text-2xl">schedule</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'الموقع الحالي والجدول الزمني' : 'Current Location & Transition Schedule'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'الوقت الحقيقي للمحطة الحالية' : 'Real-time countdown to station shift'}
              </p>
            </div>
          </div>

          {loadingSchedule ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : liveStatus ? (
            <div className="space-y-6">
              {/* Current Station details */}
              <div className="text-center bg-[#fffbf7] dark:bg-[#1A1A2E]/50 p-6 rounded-2xl border border-fuchsia/5">
                <span className="text-xs uppercase font-bold text-fuchsia tracking-wider mb-1 block">
                  {isAr ? 'المحطة الحالية' : 'Current Station'}
                </span>
                <h3 className="text-3xl font-black text-[#1e1b17] dark:text-[#E0E0F0] mb-2">
                  {liveStatus.currentStationName || (isAr ? 'غير مجدول' : 'Not Scheduled')}
                </h3>
                <p className="text-xs text-[#9B8E82] dark:text-[#8888A0]">
                  {liveStatus.currentStationLocation || ''}
                </p>
              </div>

              {/* Countdown timer */}
              {liveStatus.currentStationName && (
                <div className="flex flex-col items-center justify-center py-2">
                  <span className="text-xs font-bold text-[#9B8E82] dark:text-[#8888A0] mb-1">
                    {isAr ? 'الوقت المتبقي للانتقال' : 'Time Remaining to Shift'}
                  </span>
                  <div
                    className={`text-6xl font-black font-mono tracking-wider transition-all duration-300 ${
                      timerSeconds < 60 ? 'text-red-500 animate-pulse scale-105' : 'text-[#1e1b17] dark:text-[#E0E0F0]'
                    }`}
                  >
                    {formatCountdown(timerSeconds)}
                  </div>
                </div>
              )}

              {/* Next station */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs text-[#9B8E82] dark:text-[#8888A0] block">
                    {isAr ? 'المحطة القادمة' : 'Next Station'}
                  </span>
                  <span className="font-bold text-[#1e1b17] dark:text-[#E0E0F0]">
                    {liveStatus.nextStationName || (isAr ? 'نهاية اليوم' : 'End of day')}
                  </span>
                </div>
                {liveStatus.nextStationLocation && (
                  <div className="text-end">
                    <span className="text-xs text-[#9B8E82] dark:text-[#8888A0] block">
                      {isAr ? 'الموقع' : 'Location'}
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {liveStatus.nextStationLocation}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm arrival action */}
              {liveStatus.currentStationName && currentSlot?.station?.id && (
                <div className="pt-2">
                  {isCheckedInForCurrentStation() ? (
                    <div className="w-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">check_circle</span>
                      {isAr ? 'تم تأكيد الوصول لهذه المحطة' : 'Arrival confirmed for this station'}
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirmArrival}
                      disabled={submittingArrival}
                      className="w-full btn-fuchsia text-white font-black text-sm min-h-[48px] py-3.5 px-6 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submittingArrival ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">where_to_vote</span>
                          {isAr ? 'لقد وصلنا للمحطة' : 'We Have Arrived'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'لا توجد بيانات للجدول الزمني حالياً.' : 'No schedule data currently available.'}
            </div>
          )}
        </section>

        {/* ================== CHILDREN LIST & MANAGEMENT ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-fuchsia text-2xl">child_care</span>
              </div>
              <div>
                <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                  {isAr ? 'أطفال الفريق' : 'Team Children'}
                </h2>
                <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                  {children.length} {isAr ? 'أطفال مسجلين' : 'registered children'}
                </p>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="bg-fuchsia hover:bg-fuchsia-light text-white font-bold text-xs py-2 px-3 sm:px-4 rounded-full flex items-center gap-1 cursor-pointer transition-colors shadow-sm min-h-[40px]"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              {isAr ? 'إضافة طفل' : 'Add Child'}
            </button>
          </div>

          {loadingChildren ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <span className="material-symbols-outlined text-[48px] text-gray-300 dark:text-gray-600 mb-2 block">group</span>
              <p className="text-sm font-bold text-[#9B8E82] dark:text-[#8888A0]">
                {isAr ? 'لا يوجد أطفال في فريقك بعد' : 'No children registered in your team yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors"
                  style={{
                    background: darkMode ? '#1E1B2E' : '#faf6f0',
                    borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(184,0,108,0.05)'
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#1e1b17] dark:text-[#E0E0F0] text-sm truncate">
                      {child.name}
                    </p>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia/5 text-fuchsia dark:bg-fuchsia/20 dark:text-pink-300 border border-fuchsia/10">
                      {getAgeGroupLabel(child.ageGroup)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(child)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer min-w-[36px] min-h-[36px]"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteChild(child.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer min-w-[36px] min-h-[36px]"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================== MESSAGES TO ADMIN ================== */}
        <section
          className="rounded-2xl p-5 sm:p-6 shadow-md border-2"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            borderColor: 'rgba(184, 0, 108, 0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-fuchsia text-2xl">chat</span>
            </div>
            <div>
              <h2 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {isAr ? 'الرسائل والتواصل' : 'Messages & Support'}
              </h2>
              <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                {isAr ? 'تواصل مع إدارة الكرنفال واستعرض البلاغات' : 'Reach out to camp admins and view communications'}
              </p>
            </div>
          </div>

          {/* Message form */}
          <form onSubmit={handleSendMessage} className="mb-6 space-y-3">
            <div>
              <textarea
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                placeholder={isAr ? 'اكتب رسالتك للمسؤول...' : 'Type a message to admin...'}
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
                disabled={sendingMsg || !msgContent.trim()}
                className="bg-fuchsia hover:bg-fuchsia-light disabled:opacity-50 text-white font-bold text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm min-h-[40px]"
              >
                {sendingMsg ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    {isAr ? 'إرسال للمسؤول' : 'Send to Admin'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* List messages */}
          {loadingMessages ? (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-fuchsia border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#9B8E82] dark:text-[#8888A0]">
              {isAr ? 'لا توجد رسائل سابقة.' : 'No messages found.'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isSentByMe = msg.sender?.id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border text-sm max-w-[85%] ${
                      isSentByMe
                        ? 'ms-auto bg-fuchsia/5 border-fuchsia/10 text-end'
                        : 'me-auto bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 justify-between">
                      <span className="text-[10px] font-bold text-[#9B8E82] dark:text-[#8888A0]">
                        {isSentByMe ? (isAr ? 'أنت' : 'You') : (msg.sender?.name || (isAr ? 'المسؤول' : 'Admin'))}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#1e1b17] dark:text-[#E0E0F0] break-words font-medium">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ====== CHILD ADD/EDIT MODAL ====== */}
      {showChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl p-5 border-2 animate-fade-in-up"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184,0,108,0.2)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-[#1e1b17] dark:text-[#E0E0F0]">
                {modalMode === 'add'
                  ? (isAr ? 'إضافة طفل جديد' : 'Add New Child')
                  : (isAr ? 'تعديل بيانات الطفل' : 'Edit Child Info')}
              </h3>
              <button
                onClick={() => setShowChildModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E82] dark:text-[#8888A0] bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-colors cursor-pointer min-w-[36px] min-h-[36px]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleChildSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#9B8E82] dark:text-[#8888A0]">
                  {isAr ? 'الاسم بالكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder={isAr ? 'اسم الطفل...' : "Child's name..."}
                  className="w-full text-sm font-medium outline-none transition-colors border-2 rounded-xl p-3 min-h-[48px]"
                  style={{
                    background: darkMode ? '#1A1A2E' : '#FFFFFF',
                    borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(184,0,108,0.1)',
                    color: darkMode ? '#E0E0F0' : '#1e1b17',
                  }}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#9B8E82] dark:text-[#8888A0]">
                  {isAr ? 'المرحلة العمرية' : 'Age Group'}
                </label>
                <select
                  value={childAgeGroup}
                  onChange={(e) => setChildAgeGroup(e.target.value)}
                  className="w-full text-sm font-medium outline-none transition-colors border-2 rounded-xl p-3 min-h-[48px]"
                  style={{
                    background: darkMode ? '#1A1A2E' : '#FFFFFF',
                    borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(184,0,108,0.1)',
                    color: darkMode ? '#E0E0F0' : '#1e1b17',
                  }}
                >
                  <option value="UNDER_KG">{isAr ? 'تحت الروضة' : 'Under KG'}</option>
                  <option value="KG1">{isAr ? 'كي جي 1' : 'KG 1'}</option>
                  <option value="KG2">{isAr ? 'كي جي 2' : 'KG 2'}</option>
                  <option value="OTHER">{isAr ? 'أخرى / أكبر' : 'Other'}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoadingChild}
                  className="flex-1 bg-fuchsia hover:bg-fuchsia-light text-white font-bold text-sm min-h-[48px] py-3 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {actionLoadingChild ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      {isAr ? 'حفظ البيانات' : 'Save'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChildModal(false)}
                  className="px-5 min-h-[48px] py-3 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
