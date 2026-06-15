import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

const COLOR_HEX_MAP = {
  RED: '#EF4444',
  BLUE: '#3B82F6',
  YELLOW: '#EAB308',
  GREEN: '#22C55E',
  PINK: '#EC4899',
  WHITE: '#F8FAFC'
};

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const { logout, user, darkMode, toggleDarkMode, toggleLanguage } = useAuth();
  const isAr = i18n.language === 'ar';

  // Active Tab: 'users' | 'teams' | 'stations' | 'schedule'
  const [activeTab, setActiveTab] = useState('users');

  // Data states
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stations, setStations] = useState([]);
  const [eventConfig, setEventConfig] = useState(null);
  const [schedule, setSchedule] = useState({});

  // Loading states
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  // Action / Feedback states
  const [broadcastContent, setBroadcastContent] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch pending users
  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await axios.get(`${API_BASE}/users`, { params: { status: 'PENDING' } });
      setPendingUsers(res.data || []);
    } catch {
      setPendingUsers([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Fetch all users
  const fetchAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setAllUsers(res.data || []);
    } catch {
      setAllUsers([]);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await axios.get(`${API_BASE}/teams`);
      setTeams(res.data || []);
    } catch {
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    setLoadingStations(true);
    try {
      const res = await axios.get(`${API_BASE}/stations`);
      setStations(res.data || []);
    } catch {
      setStations([]);
    } finally {
      setLoadingStations(false);
    }
  }, []);

  // Fetch event config
  const fetchEventConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/config`);
      setEventConfig(res.data);
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  }, []);

  // Fetch schedule
  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const res = await axios.get(`${API_BASE}/schedule`);
      setSchedule(res.data || {});
    } catch {
      setSchedule({});
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

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
      const sorted = (res.data || []).sort((a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt));
      setTimeline(sorted);
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

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
      setSuccessMsg(isAr ? 'تم إرسال الإعلان العام بنجاح! 📢' : 'Announcement broadcasted successfully! 📢');
      fetchMessages();
    } catch (err) {
      const errorMsg = err.response?.data?.message || (isAr ? 'فشل إرسال الإعلان' : 'Failed to send broadcast announcement');
      setErrorMsg(errorMsg);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Load all initial data on mount
  useEffect(() => {
    fetchPending();
    fetchAll();
    fetchTeams();
    fetchStations();
    fetchEventConfig();
    fetchSchedule();
    fetchMessages();
    fetchTimeline();
  }, [fetchPending, fetchAll, fetchTeams, fetchStations, fetchEventConfig, fetchSchedule, fetchMessages, fetchTimeline]);

  // Clear toast feedback automatically
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // ==========================================
  // USER ACTIONS
  // ==========================================
  async function handleApprove(userId) {
    setActionLoading(userId);
    setErrorMsg('');
    try {
      await axios.put(`${API_BASE}/users/${userId}/approve`);
      setSuccessMsg(isAr ? 'تمت الموافقة بنجاح ✓' : 'User approved successfully ✓');
      fetchPending();
      fetchAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء الموافقة' : 'Error approving user'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(userId) {
    if (!rejectReason.trim()) {
      setErrorMsg(isAr ? 'يرجى كتابة سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    setActionLoading(userId);
    setErrorMsg('');
    try {
      await axios.put(`${API_BASE}/users/${userId}/reject`, { reason: rejectReason });
      setSuccessMsg(isAr ? 'تم رفض المستخدم ✓' : 'User rejected successfully ✓');
      setRejectingUser(null);
      setRejectReason('');
      fetchPending();
      fetchAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء الرفض' : 'Error rejecting user'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(userId) {
    const confirmed = window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?');
    if (!confirmed) return;
    setActionLoading(userId);
    setErrorMsg('');
    try {
      await axios.delete(`${API_BASE}/users/${userId}`);
      setSuccessMsg(isAr ? 'تم حذف المستخدم ✓' : 'User deleted successfully ✓');
      fetchPending();
      fetchAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء الحذف' : 'Error deleting user'));
    } finally {
      setActionLoading(null);
    }
  }

  // Edit User profile modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('TEAM_LEADER');
  const [editTeamId, setEditTeamId] = useState('');
  const [editStationId, setEditStationId] = useState('');

  const openEditUserModal = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'TEAM_LEADER');
    setEditTeamId(u.team?.id || '');
    setEditStationId(u.station?.id || '');
    setShowUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setErrorMsg(isAr ? 'يرجى كتابة الاسم' : 'Please provide a name');
      return;
    }
    setActionLoading(editingUser.id);
    setErrorMsg('');
    try {
      const payload = {
        name: editName.trim(),
        role: editRole,
        team: editRole === 'TEAM_LEADER' && editTeamId ? { id: editTeamId } : null,
        station: editRole === 'CAMP_LEADER' && editStationId ? { id: editStationId } : null,
      };

      await axios.put(`${API_BASE}/users/${editingUser.id}`, payload);
      setSuccessMsg(isAr ? 'تم تحديث بيانات المستخدم بنجاح ✓' : 'User updated successfully ✓');
      setShowUserModal(false);
      fetchPending();
      fetchAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء حفظ البيانات' : 'Error updating user'));
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // TEAM CRUD ACTIONS
  // ==========================================
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalMode, setTeamModalMode] = useState('add');
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('RED');

  const openAddTeamModal = () => {
    setTeamModalMode('add');
    setEditingTeam(null);
    setTeamName('');
    setTeamColor('RED');
    setShowTeamModal(true);
  };

  const openEditTeamModal = (t) => {
    setTeamModalMode('edit');
    setEditingTeam(t);
    setTeamName(t.name || '');
    setTeamColor(t.color || 'RED');
    setShowTeamModal(true);
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم الفريق' : 'Please provide team name');
      return;
    }
    setErrorMsg('');
    try {
      const payload = { name: teamName.trim(), color: teamColor };
      if (teamModalMode === 'add') {
        await axios.post(`${API_BASE}/teams`, payload);
        setSuccessMsg(isAr ? 'تم إضافة الفريق بنجاح ✓' : 'Team added successfully ✓');
      } else {
        await axios.put(`${API_BASE}/teams/${editingTeam.id}`, payload);
        setSuccessMsg(isAr ? 'تم تعديل الفريق بنجاح ✓' : 'Team updated successfully ✓');
      }
      setShowTeamModal(false);
      fetchTeams();
      fetchSchedule();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل حفظ الفريق' : 'Failed to save team'));
    }
  };

  const handleDeleteTeam = async (id) => {
    const confirmed = window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الفريق؟' : 'Are you sure you want to delete this team?');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/teams/${id}`);
      setSuccessMsg(isAr ? 'تم حذف الفريق بنجاح ✓' : 'Team deleted successfully ✓');
      fetchTeams();
      fetchSchedule();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل حذف الفريق' : 'Failed to delete team'));
    }
  };

  // ==========================================
  // STATION CRUD ACTIONS
  // ==========================================
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationModalMode, setStationModalMode] = useState('add');
  const [editingStation, setEditingStation] = useState(null);
  const [stationName, setStationName] = useState('');
  const [stationDesc, setStationDesc] = useState('');
  const [stationLocation, setStationLocation] = useState('');

  const openAddStationModal = () => {
    setStationModalMode('add');
    setEditingStation(null);
    setStationName('');
    setStationDesc('');
    setStationLocation('');
    setShowStationModal(true);
  };

  const openEditStationModal = (s) => {
    setStationModalMode('edit');
    setEditingStation(s);
    setStationName(s.name || '');
    setStationDesc(s.description || '');
    setStationLocation(s.locationHint || '');
    setShowStationModal(true);
  };

  const handleStationSubmit = async (e) => {
    e.preventDefault();
    if (!stationName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم المحطة' : 'Please provide station name');
      return;
    }
    setErrorMsg('');
    try {
      const payload = {
        name: stationName.trim(),
        description: stationDesc.trim(),
        locationHint: stationLocation.trim()
      };
      if (stationModalMode === 'add') {
        await axios.post(`${API_BASE}/stations`, payload);
        setSuccessMsg(isAr ? 'تم إضافة المحطة بنجاح ✓' : 'Station added successfully ✓');
      } else {
        await axios.put(`${API_BASE}/stations/${editingStation.id}`, payload);
        setSuccessMsg(isAr ? 'تم تعديل المحطة بنجاح ✓' : 'Station updated successfully ✓');
      }
      setShowStationModal(false);
      fetchStations();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل حفظ المحطة' : 'Failed to save station'));
    }
  };

  const handleDeleteStation = async (id) => {
    const confirmed = window.confirm(isAr ? 'هل أنت متأكد من حذف هذه المحطة؟' : 'Are you sure you want to delete this station?');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE}/stations/${id}`);
      setSuccessMsg(isAr ? 'تم حذف المحطة بنجاح ✓' : 'Station deleted successfully ✓');
      fetchStations();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل حذف المحطة' : 'Failed to delete station'));
    }
  };

  // ==========================================
  // CONFIG & TIMETABLE ACTIONS
  // ==========================================
  const [cfgEventName, setCfgEventName] = useState('');
  const [cfgEventDate, setCfgEventDate] = useState('');
  const [cfgAlertMinutes, setCfgAlertMinutes] = useState(5);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (eventConfig) {
      setCfgEventName(eventConfig.eventName || '');
      setCfgEventDate(eventConfig.eventDate || '');
      setCfgAlertMinutes(eventConfig.alertMinutes || 5);
    }
  }, [eventConfig]);

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setErrorMsg('');
    try {
      const payload = {
        eventName: cfgEventName,
        eventDate: cfgEventDate,
        alertMinutes: parseInt(cfgAlertMinutes)
      };
      await axios.put(`${API_BASE}/config`, payload);
      setSuccessMsg(isAr ? 'تم حفظ إعدادات الكرنفال بنجاح ✓' : 'Event configuration saved successfully ✓');
      fetchEventConfig();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل حفظ الإعدادات' : 'Failed to save event config'));
    } finally {
      setSavingConfig(false);
    }
  };

  // Edit Time Slot modal state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  const openEditSlotModal = (slot) => {
    setEditingSlot(slot);
    setSlotStart(slot.startTime || '');
    setSlotEnd(slot.endTime || '');
    setShowSlotModal(true);
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    if (!slotStart || !slotEnd) {
      setErrorMsg(isAr ? 'يرجى إدخال وقت البداية والنهاية' : 'Please enter start and end time');
      return;
    }
    setSavingSlot(true);
    setErrorMsg('');
    try {
      await axios.put(`${API_BASE}/schedule/slots/${editingSlot.id}`, {
        startTime: slotStart,
        endTime: slotEnd
      });
      setSuccessMsg(isAr ? 'تم تعديل الفترة الزمنية بنجاح ✓' : 'Schedule slot updated successfully ✓');
      setShowSlotModal(false);
      fetchSchedule();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (isAr ? 'فشل تعديل الفترة الزمنية' : 'Failed to update slot'));
    } finally {
      setSavingSlot(false);
    }
  };

  // ==========================================
  // BADGES & CARD WRAPPERS
  // ==========================================
  const roleBadge = (role) => {
    const map = {
      SUPER_ADMIN: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: isAr ? 'مسؤول عام' : 'Super Admin' },
      ADMIN: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: isAr ? 'مسؤول' : 'Admin' },
      TEAM_LEADER: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: isAr ? 'قائد فريق' : 'Team Leader' },
      CAMP_LEADER: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: isAr ? 'قائد محطة' : 'Camp Leader' },
    };
    const info = map[role] || { bg: 'bg-gray-100', text: 'text-gray-600', label: role };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${info.bg} ${info.text}`}>
        {info.label}
      </span>
    );
  };

  const statusBadge = (status) => {
    const map = {
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', label: isAr ? 'قيد الانتظار' : 'Pending' },
      APPROVED: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: isAr ? 'مقبول' : 'Approved' },
      REJECTED: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', label: isAr ? 'مرفوض' : 'Rejected' },
    };
    const info = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${info.bg} ${info.text}`}>
        {info.label}
      </span>
    );
  };

  const Spinner = useMemo(() => () => (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 border-3 border-[#B8006C] border-t-transparent rounded-full animate-spin"></div>
    </div>
  ), []);

  const Card = useMemo(() => ({ children, className = '' }) => (
    <div
      className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 ${className}`}
      style={{
        background: darkMode ? '#2A2A3E' : '#FFFFFF',
        border: '2px solid rgba(184,0,108,0.12)',
        boxShadow: '0 4px 24px rgba(184,0,108,0.06)',
      }}
    >
      {children}
    </div>
  ), [darkMode]);

  return (
    <div
      className="min-h-screen w-full font-[Cairo] transition-colors duration-500 pb-28 text-[#1e1b17] dark:text-[#E0E0F0]"
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
        className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-500"
        style={{
          background: darkMode ? 'rgba(42,42,62,0.92)' : 'rgba(255,248,241,0.92)',
          borderColor: darkMode ? 'rgba(184,0,108,0.15)' : 'rgba(184,0,108,0.1)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#B8006C] to-[#D4187E] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {isAr ? 'مرحباً،' : 'Welcome,'} {user?.name || 'User'}
              </p>
              <div className="mt-0.5">
                {roleBadge('SUPER_ADMIN')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleLanguage}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-85"
              style={{
                background: darkMode ? '#2A2A3E' : '#f4ede5',
                color: darkMode ? '#E0E0F0' : '#1e1b17',
              }}
            >
              <span className="font-bold text-xs">{isAr ? 'EN' : 'ع'}</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-85"
              style={{
                background: darkMode ? '#2A2A3E' : '#f4ede5',
                color: darkMode ? '#E0E0F0' : '#1e1b17',
              }}
            >
              <span className="material-symbols-outlined text-lg">{darkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ====== TAB NAVIGATION ====== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex p-1 bg-[#f4ede5] dark:bg-[#1e1b17] rounded-2xl overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
              activeTab === 'users' ? 'bg-[#B8006C] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-base">group</span>
              {isAr ? 'الأعضاء والطلبات' : 'Users & Approvals'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
              activeTab === 'teams' ? 'bg-[#B8006C] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-base">palette</span>
              {isAr ? 'إدارة الفرق' : 'Teams'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
              activeTab === 'stations' ? 'bg-[#B8006C] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-base">storefront</span>
              {isAr ? 'المحطات' : 'Stations'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
              activeTab === 'schedule' ? 'bg-[#B8006C] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              {isAr ? 'الجدول والإعدادات' : 'Schedule & Settings'}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('messages');
              fetchMessages();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
              activeTab === 'messages' ? 'bg-[#B8006C] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-base">campaign</span>
              {isAr ? 'الرسائل العامة' : 'Broadcasts & Support'}
            </span>
          </button>
        </div>
      </div>

      {/* ====== MAIN CONTENT AREA ====== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Global Toast Alerts */}
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 p-3.5 rounded-xl text-sm font-bold text-center animate-fade-in-up">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-sm font-bold text-center animate-fade-in-up">
            {errorMsg}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: USERS & APPROVALS */}
        {/* ========================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Pending Approvals Section */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">pending_actions</span>
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {isAr ? 'طلبات التسجيل المعلقة' : 'Pending Registrations'}
                  </h2>
                  <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                    {pendingUsers.length} {isAr ? 'طلب في الانتظار' : 'pending'}
                  </p>
                </div>
              </div>

              {loadingPending ? (
                <Spinner />
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-[48px] text-[#d4d0cb] dark:text-[#4A4A6A] mb-2 block">task_alt</span>
                  <p className="text-sm font-bold text-[#9B8E82] dark:text-[#8888A0]">
                    {isAr ? 'لا توجد طلبات معلقة 🎉' : 'No pending requests 🎉'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-700/30">
                  {pendingUsers.map((u, idx) => (
                    <div key={u.id} className={`pt-3 ${idx === 0 ? 'pt-0' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate">{u.name}</p>
                          <p className="text-xs text-[#9B8E82] dark:text-[#8888A0] truncate mt-1">{u.email}</p>
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            {roleBadge(u.role)}
                            {u.role === 'TEAM_LEADER' && u.team && (
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white border border-black/5"
                                style={{ backgroundColor: u.team.colorHex || '#ccc' }}
                              >
                                {isAr ? u.team.name : u.team.color}
                              </span>
                            )}
                            {u.role === 'CAMP_LEADER' && u.station && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300">
                                {u.station.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rejection input block */}
                        {rejectingUser === u.id && (
                          <div className="w-full sm:max-w-xs my-2">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder={isAr ? 'سبب الرفض...' : 'Rejection reason...'}
                              className="w-full text-xs font-medium outline-none border-2 p-2 rounded-xl"
                              style={{
                                borderColor: 'rgba(239,68,68,0.3)',
                                background: darkMode ? '#1A1A2E' : '#FFFFFF',
                                color: darkMode ? '#E0E0F0' : '#1e1b17',
                              }}
                              autoFocus
                            />
                          </div>
                        )}

                        <div className="flex gap-2 shrink-0">
                          {rejectingUser === u.id ? (
                            <>
                              <button
                                onClick={() => handleReject(u.id)}
                                disabled={actionLoading === u.id}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm flex items-center justify-center gap-1"
                              >
                                {actionLoading === u.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-xs">send</span>
                                    {isAr ? 'تأكيد الرفض' : 'Confirm'}
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => { setRejectingUser(null); setRejectReason(''); }}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-gray-100 dark:bg-gray-800 text-[#9B8E82] cursor-pointer"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading === u.id}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {isAr ? 'موافقة' : 'Approve'}
                              </button>
                              <button
                                onClick={() => { setRejectingUser(u.id); setRejectReason(''); }}
                                disabled={actionLoading === u.id}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                {isAr ? 'رفض' : 'Reject'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Users Directory List */}
            <Card>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-fuchsia text-xl">group</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black">{isAr ? 'جميع المستخدمين' : 'All Users'}</h2>
                    <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                      {allUsers.length} {isAr ? 'أعضاء مسجلين' : 'users'}
                    </p>
                  </div>
                </div>
              </div>

              {loadingAll ? (
                <Spinner />
              ) : allUsers.length === 0 ? (
                <p className="text-center py-6 text-sm text-[#9B8E82]">{isAr ? 'لا يوجد مستخدمون' : 'No users found'}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border dark:border-gray-800">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/40 text-[#9B8E82]">
                        <th className="px-4 py-3 font-black text-start">{isAr ? 'الاسم' : 'Name'}</th>
                        <th className="px-4 py-3 font-black text-start">{isAr ? 'البريد' : 'Email'}</th>
                        <th className="px-4 py-3 font-black text-start">{isAr ? 'الدور' : 'Role'}</th>
                        <th className="px-4 py-3 font-black text-start">{isAr ? 'التفاصيل' : 'Details'}</th>
                        <th className="px-4 py-3 font-black text-start">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {allUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                          <td className="px-4 py-3.5 font-bold">{u.name}</td>
                          <td className="px-4 py-3.5 text-[#9B8E82] dark:text-[#8888A0]">{u.email}</td>
                          <td className="px-4 py-3.5">{roleBadge(u.role)}</td>
                          <td className="px-4 py-3.5">
                            {u.role === 'TEAM_LEADER' && u.team && (
                              <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: u.team.colorHex || '#ccc' }} />
                                <span className="font-bold">{isAr ? u.team.name : u.team.color}</span>
                              </div>
                            )}
                            {u.role === 'CAMP_LEADER' && u.station && (
                              <span className="font-bold text-orange-600 dark:text-orange-400">{u.station.name}</span>
                            )}
                            {u.role !== 'TEAM_LEADER' && u.role !== 'CAMP_LEADER' && '-'}
                          </td>
                          <td className="px-4 py-3.5">{statusBadge(u.status)}</td>
                          <td className="px-4 py-3.5 text-end">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  disabled={actionLoading === u.id}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {actionLoading === u.id ? (
                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: TEAMS CRUD */}
        {/* ========================================== */}
        {activeTab === 'teams' && (
          <div className="space-y-6 animate-fade-in-up">
            <Card>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-fuchsia text-xl">palette</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black">{isAr ? 'الفرق المشاركة' : 'Event Teams'}</h2>
                    <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                      {teams.length} {isAr ? 'فرق مسجلة' : 'teams'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={openAddTeamModal}
                  className="bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  {isAr ? 'إضافة فريق' : 'Add Team'}
                </button>
              </div>

              {loadingTeams ? (
                <Spinner />
              ) : teams.length === 0 ? (
                <p className="text-center py-6 text-sm text-[#9B8E82]">{isAr ? 'لا توجد فرق' : 'No teams found'}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm"
                      style={{
                        background: darkMode ? '#1E1B2E' : '#faf6f0',
                        borderLeft: `5px solid ${t.colorHex || '#B8006C'}`,
                        borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(184,0,108,0.05)'
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate">{t.name}</h3>
                          <span className="text-[10px] text-[#9B8E82] tracking-wider block mt-1 uppercase font-bold">
                            {t.color}
                          </span>
                        </div>
                        <span
                          className="w-5 h-5 rounded-full border border-black/5 shrink-0"
                          style={{ backgroundColor: t.colorHex || '#ccc' }}
                        />
                      </div>

                      <div className="flex items-center gap-2 justify-end border-t dark:border-gray-800/60 pt-2.5">
                        <button
                          onClick={() => openEditTeamModal(t)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: STATIONS CRUD */}
        {/* ========================================== */}
        {activeTab === 'stations' && (
          <div className="space-y-6 animate-fade-in-up">
            <Card>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-fuchsia text-xl">storefront</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black">{isAr ? 'محطات الكرنفال' : 'Activity Stations'}</h2>
                    <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                      {stations.length} {isAr ? 'محطات مضافة' : 'stations'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={openAddStationModal}
                  className="bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  {isAr ? 'إضافة محطة' : 'Add Station'}
                </button>
              </div>

              {loadingStations ? (
                <Spinner />
              ) : stations.length === 0 ? (
                <p className="text-center py-6 text-sm text-[#9B8E82]">{isAr ? 'لا توجد محطات' : 'No stations found'}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stations.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 rounded-xl border flex flex-col justify-between gap-4 transition-colors"
                      style={{
                        background: darkMode ? '#1E1B2E' : '#FFFFFF',
                        borderColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(184,0,108,0.08)',
                        boxShadow: '0 2px 12px rgba(184,0,108,0.02)'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-sm text-[#B8006C] dark:text-pink-300">{s.name}</h3>
                          {s.locationHint && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-600 dark:text-green-300">
                              {s.locationHint}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9B8E82] dark:text-[#8888A0] line-clamp-2 leading-relaxed">
                          {s.description || (isAr ? 'لا يوجد وصف للمحطة.' : 'No description provided.')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 justify-end border-t dark:border-gray-800/60 pt-2.5">
                        <button
                          onClick={() => openEditStationModal(s)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStation(s.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: SCHEDULE & EVENT CONFIG */}
        {/* ========================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Event Configurations Form */}
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-fuchsia text-xl">settings</span>
                </div>
                <div>
                  <h2 className="text-base font-black">{isAr ? 'إعدادات الكرنفال العامة' : 'Global Settings'}</h2>
                  <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                    {isAr ? 'ضبط اسم وتوقيت وتنبيهات الكرنفال' : 'Set event name, date, and alert transitions'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfigSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'اسم الكرنفال' : 'Event Name'}</label>
                  <input
                    type="text"
                    value={cfgEventName}
                    onChange={(e) => setCfgEventName(e.target.value)}
                    required
                    className="w-full text-xs font-medium outline-none border p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'تاريخ الفعالية' : 'Event Date'}</label>
                  <input
                    type="date"
                    value={cfgEventDate}
                    onChange={(e) => setCfgEventDate(e.target.value)}
                    required
                    className="w-full text-xs font-medium outline-none border p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'وقت تنبيه الانتقال (دقائق)' : 'Alert Pre-Transition (Minutes)'}</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={cfgAlertMinutes}
                    onChange={(e) => setCfgAlertMinutes(e.target.value)}
                    required
                    className="w-full text-xs font-medium outline-none border p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="bg-fuchsia hover:bg-fuchsia/90 disabled:opacity-50 text-white text-xs font-black py-3 px-6 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm min-h-[40px]"
                  >
                    {savingConfig ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">save</span>
                        {isAr ? 'حفظ التغييرات' : 'Save Configurations'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>

            {/* Timetable schedule slot list */}
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-fuchsia/10 dark:bg-fuchsia/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-fuchsia text-xl">calendar_month</span>
                </div>
                <div>
                  <h2 className="text-base font-black">{isAr ? 'الجدول الزمني للفرق والتدوير' : 'Timetable Rotations'}</h2>
                  <p className="text-[11px] text-[#9B8E82] dark:text-[#8888A0] font-bold">
                    {isAr ? 'إدارة توقيت فترات التدوير للفرق والمجموعات' : 'View full grid and adjust start/end slot timings'}
                  </p>
                </div>
              </div>

              {loadingSchedule ? (
                <Spinner />
              ) : Object.keys(schedule).length === 0 ? (
                <p className="text-center py-6 text-sm text-[#9B8E82]">{isAr ? 'لا توجد فترات مجدولة' : 'No schedule slots configured'}</p>
              ) : (
                <div className="space-y-6">
                  {Object.keys(schedule).map((teamId) => {
                    const slots = schedule[teamId] || [];
                    if (slots.length === 0) return null;
                    const firstSlot = slots[0];
                    const teamColorHex = firstSlot.team?.colorHex || '#B8006C';

                    return (
                      <div
                        key={teamId}
                        className="rounded-xl p-4 border dark:border-gray-800"
                        style={{
                          borderLeft: `4px solid ${teamColorHex}`
                        }}
                      >
                        <div className="flex items-center justify-between mb-3 border-b dark:border-gray-800 pb-2.5">
                          <h4 className="font-black text-xs">{firstSlot.team?.name}</h4>
                          <span
                            className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white border border-black/5"
                            style={{ backgroundColor: teamColorHex }}
                          >
                            {firstSlot.team?.color}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {slots.map((s) => (
                            <div
                              key={s.id}
                              className="p-3 rounded-lg border dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/40 text-xs flex flex-col justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] text-[#9B8E82] block font-bold">
                                  {isAr ? `الفترة ${s.slotOrder}` : `Slot ${s.slotOrder}`}
                                </span>
                                <span className="font-bold text-[#B8006C] dark:text-pink-300 block truncate mt-0.5">
                                  {s.station?.name}
                                </span>
                                <span className="text-[10px] text-gray-500 font-bold block mt-1.5">
                                  ⏱ {s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}
                                </span>
                              </div>
                              <button
                                onClick={() => openEditSlotModal(s)}
                                className="w-full mt-1.5 py-1 px-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-xs">edit</span>
                                {isAr ? 'تعديل الوقت' : 'Edit Time'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ================== TIMELINE OF MOVEMENTS ================== */}
            <Card>
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
                <div className="relative border-s-2 border-gray-200 dark:border-gray-700/50 ms-3 space-y-6 max-h-[400px] overflow-y-auto pr-2">
                  {timeline.slice(0, 50).map((arrival) => {
                    const teamBg = arrival.team?.colorHex || '#B8006C';
                    const teamText = ['WHITE', 'YELLOW'].includes((arrival.team?.color || '').toUpperCase()) ? '#1E1B17' : '#FFFFFF';
                    
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
            </Card>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW: BROADCASTS & SUPPORT MESSAGES */}
        {/* ========================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in-up">
            <Card>
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
                    className="bg-[#B8006C] hover:bg-[#B8006C]/90 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm min-h-[40px]"
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
                <Spinner />
              ) : messages.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#9B8E82] dark:text-[#8888A0]">
                  {isAr ? 'لا توجد رسائل سابقة.' : 'No messages found.'}
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
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
            </Card>
          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL: EDIT USER */}
      {/* ========================================== */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl p-5 border-2 animate-fade-in-up"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184,0,108,0.2)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black">
                {isAr ? 'تعديل بيانات المستخدم' : 'Edit User Profile'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E82] dark:text-[#8888A0] bg-gray-100 dark:bg-gray-800 hover:opacity-85 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'الدور الوظيفي' : 'User Role'}</label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    setEditRole(e.target.value);
                    setEditTeamId('');
                    setEditStationId('');
                  }}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  required
                >
                  <option value="SUPER_ADMIN">{isAr ? 'مسؤول عام' : 'Super Admin'}</option>
                  <option value="ADMIN">{isAr ? 'مسؤول' : 'Admin'}</option>
                  <option value="TEAM_LEADER">{isAr ? 'قائد فريق' : 'Team Leader'}</option>
                  <option value="CAMP_LEADER">{isAr ? 'مسؤول محطة' : 'Camp Leader'}</option>
                </select>
              </div>

              {editRole === 'TEAM_LEADER' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'لون الفريق' : 'Team Color'}</label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                    required
                  >
                    <option value="" disabled>{isAr ? 'اختر الفريق...' : 'Select team...'}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.color})</option>
                    ))}
                  </select>
                </div>
              )}

              {editRole === 'CAMP_LEADER' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'المحطة المخصصة' : 'Assigned Station'}</label>
                  <select
                    value={editStationId}
                    onChange={(e) => setEditStationId(e.target.value)}
                    className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                    required
                  >
                    <option value="" disabled>{isAr ? 'اختر المحطة...' : 'Select station...'}</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.locationHint})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading === editingUser.id}
                  className="flex-1 bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black min-h-[48px] py-3 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {actionLoading === editingUser.id ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      {isAr ? 'حفظ البيانات' : 'Save Changes'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-5 min-h-[48px] py-3 rounded-xl text-xs font-black bg-gray-100 dark:bg-gray-800 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TEAM ADD/EDIT */}
      {/* ========================================== */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl p-5 border-2 animate-fade-in-up"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184,0,108,0.2)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black">
                {teamModalMode === 'add'
                  ? (isAr ? 'إضافة فريق جديد' : 'Add New Team')
                  : (isAr ? 'تعديل بيانات الفريق' : 'Edit Team Info')}
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E82] dark:text-[#8888A0] bg-gray-100 dark:bg-gray-800 hover:opacity-85 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'اسم الفريق' : 'Team Name'}</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={isAr ? 'أدخل اسم الفريق...' : 'Team name...'}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'اللون التقديري للمجموعة' : 'Team Color'}</label>
                <select
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  required
                >
                  <option value="RED">{isAr ? 'أحمر / RED' : 'RED'}</option>
                  <option value="BLUE">{isAr ? 'أزرق / BLUE' : 'BLUE'}</option>
                  <option value="YELLOW">{isAr ? 'أصفر / YELLOW' : 'YELLOW'}</option>
                  <option value="GREEN">{isAr ? 'أخضر / GREEN' : 'GREEN'}</option>
                  <option value="PINK">{isAr ? 'وردي / PINK' : 'PINK'}</option>
                  <option value="WHITE">{isAr ? 'أبيض / WHITE' : 'WHITE'}</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black min-h-[48px] py-3 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {isAr ? 'حفظ البيانات' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-5 min-h-[48px] py-3 rounded-xl text-xs font-black bg-gray-100 dark:bg-gray-800 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: STATION ADD/EDIT */}
      {/* ========================================== */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl p-5 border-2 animate-fade-in-up"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184,0,108,0.2)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black">
                {stationModalMode === 'add'
                  ? (isAr ? 'إضافة محطة جديدة' : 'Add New Station')
                  : (isAr ? 'تعديل بيانات المحطة' : 'Edit Station Info')}
              </h3>
              <button
                onClick={() => setShowStationModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E82] dark:text-[#8888A0] bg-gray-100 dark:bg-gray-800 hover:opacity-85 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleStationSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'اسم المحطة / اللعبة' : 'Station Name'}</label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder={isAr ? 'أدخل اسم المحطة...' : 'Station name...'}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'مكان المحطة التقديري (تلميح الموقع)' : 'Location Hint'}</label>
                <input
                  type="text"
                  value={stationLocation}
                  onChange={(e) => setStationLocation(e.target.value)}
                  placeholder={isAr ? 'مثال: الدور الثاني، مسرح العرائس...' : 'e.g. 2nd Floor, Marionette Hall...'}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'وصف المحطة / اللعبة' : 'Description'}</label>
                <textarea
                  value={stationDesc}
                  onChange={(e) => setStationDesc(e.target.value)}
                  placeholder={isAr ? 'أدخل وصف تفصيلي للعبة أو النشاط...' : 'Describe the activity...'}
                  className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800 h-20 resize-none"
                  style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black min-h-[48px] py-3 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {isAr ? 'حفظ البيانات' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-5 min-h-[48px] py-3 rounded-xl text-xs font-black bg-gray-100 dark:bg-gray-800 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT SCHEDULE TIMING SLOT */}
      {/* ========================================== */}
      {showSlotModal && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl shadow-xl p-5 border-2 animate-fade-in-up"
            style={{
              background: darkMode ? '#2A2A3E' : '#FFFFFF',
              borderColor: 'rgba(184,0,108,0.2)'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black">
                {isAr ? 'تعديل وقت الفترة الزمنية' : 'Edit Slot Time'}
              </h3>
              <button
                onClick={() => setShowSlotModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9B8E82] dark:text-[#8888A0] bg-gray-100 dark:bg-gray-800 hover:opacity-85 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSlotSubmit} className="space-y-4">
              <div className="text-xs p-3 bg-gray-50 dark:bg-gray-850/40 rounded-xl space-y-1">
                <p><strong>{isAr ? 'المجموعة:' : 'Team:'}</strong> {editingSlot.team?.name}</p>
                <p><strong>{isAr ? 'المحطة:' : 'Station:'}</strong> {editingSlot.station?.name}</p>
                <p><strong>{isAr ? 'الفترة:' : 'Slot Order:'}</strong> {editingSlot.slotOrder}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'بداية الفترة' : 'Start Time'}</label>
                  <input
                    type="time"
                    value={slotStart.substring(0, 5)}
                    onChange={(e) => setSlotStart(e.target.value)}
                    required
                    className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#9B8E82] dark:text-[#8888A0]">{isAr ? 'نهاية الفترة' : 'End Time'}</label>
                  <input
                    type="time"
                    value={slotEnd.substring(0, 5)}
                    onChange={(e) => setSlotEnd(e.target.value)}
                    required
                    className="w-full text-xs font-medium outline-none border-2 p-3 rounded-xl dark:border-gray-800"
                    style={{ background: darkMode ? '#1A1A2E' : '#FFFFFF' }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="flex-1 bg-fuchsia hover:bg-fuchsia/90 text-white text-xs font-black min-h-[48px] py-3 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {savingSlot ? (
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
                  onClick={() => setShowSlotModal(false)}
                  className="px-5 min-h-[48px] py-3 rounded-xl text-xs font-black bg-gray-100 dark:bg-gray-800 transition-colors cursor-pointer"
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
