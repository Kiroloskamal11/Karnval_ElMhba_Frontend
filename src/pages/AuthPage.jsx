import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZGRocnVzcnh5cmNveWVhbHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTg4OTQsImV4cCI6MjA5NjM5NDg5NH0.MZFdwJG-3WELvklpHnEoI5oJN8F0xF71aINb4jJqhrg';

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { login, register, darkMode, toggleDarkMode, toggleLanguage } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regTeamId, setRegTeamId] = useState('');
  const [regStationId, setRegStationId] = useState('');

  // Fetched data
  const [teams, setTeams] = useState([]);
  const [stations, setStations] = useState([]);

  const isAr = i18n.language === 'ar';

  // Fetch teams and stations when registering
  useEffect(() => {
    if (activeTab === 'register') {
      axios
        .get(`${API_BASE}/teams`, { headers: { Authorization: `Bearer ${ANON_KEY}` } })
        .then((res) => setTeams(res.data))
        .catch(() => setTeams([]));
      
      axios
        .get(`${API_BASE}/stations`, { headers: { Authorization: `Bearer ${ANON_KEY}` } })
        .then((res) => setStations(res.data))
        .catch(() => setStations([]));
    }
  }, [activeTab]);

  // Clear errors on tab switch
  useEffect(() => {
    setError('');
    setRegisterSuccess(false);
  }, [activeTab]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (!loginEmail || !loginPassword) {
      setError(t('fillAllFields'));
      return;
    }

    setFormLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message;
      if (serverMsg && typeof serverMsg === 'string' && serverMsg.includes('قيد المراجعة')) {
        setError(isAr ? 'حسابك قيد المراجعة. انتظر موافقة المسؤول.' : 'Your account is under review. Please wait for admin approval.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError(t('invalidCredentials'));
      } else {
        setError(serverMsg || t('errorOccurred'));
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (!regName || !regEmail || !regPassword || !regRole) {
      setError(t('fillAllFields'));
      return;
    }

    if (regRole === 'TEAM_LEADER' && !regTeamId) {
      setError(t('selectTeam'));
      return;
    }

    if (regRole === 'CAMP_LEADER' && !regStationId) {
      setError(t('selectStation'));
      return;
    }

    const payload = {
      name: regName, // Back-end expects 'name' instead of 'fullName'
      email: regEmail,
      password: regPassword,
      role: regRole,
    };

    if (regRole === 'TEAM_LEADER') payload.teamId = regTeamId;
    if (regRole === 'CAMP_LEADER') payload.stationId = regStationId;

    setFormLoading(true);
    try {
      await register(payload);
      setRegisterSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || t('errorOccurred'));
    } finally {
      setFormLoading(false);
    }
  }

  const roles = [
    { value: 'ADMIN', label: t('admin') },
    { value: 'TEAM_LEADER', label: t('teamLeader') },
    { value: 'CAMP_LEADER', label: t('campLeader') },
  ];

  // Common styles for inputs to ensure consistency with requirements (py-3.5, px-4)
  const inputStyle = {
    border: '2px solid rgba(184,0,108,0.2)',
    background: darkMode ? '#1E1B17' : '#FFFFFF',
    paddingTop: '14px', // py-3.5 is 14px
    paddingBottom: '14px',
    paddingLeft: '44px', // pl-11 is 44px (prevents icon overlap)
    paddingRight: '16px', // px-4 is 16px
    borderRadius: '12px',
    fontSize: '16px',
    width: '100%',
    outline: 'none'
  };

  // Select dropdowns have the absolute icon on the left (pl-11) and expand arrow on the right (pr-11)
  const selectStyle = {
    ...inputStyle,
    paddingRight: '44px' // pr-11 is 44px
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #B8006C, #D4187E)',
    boxShadow: darkMode ? '0 4px 0 0 #52002e' : '0 4px 0 0 #8d0051'
  };

  return (
    <div className="page-container flex items-center justify-center relative overflow-hidden text-[#1e1b17] dark:text-[#E0E0F0] font-[Tajawal] transition-colors duration-500">
      
      {/* Decorative CSS Styles */}
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

        .btn-bubbly {
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-bubbly:active {
          transform: translateY(4px);
          box-shadow: 0 0 0 0 !important;
        }

        .floating-element {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {/* Decorative Background Elements */}
      <div className="fixed top-10 left-10 text-[#ffd9e4] dark:text-[#3A3A5E] floating-element opacity-40 sm:opacity-60 pointer-events-none scale-75 sm:scale-100 transition-transform" style={{ animationDelay: '0s' }}>
        <span className="material-symbols-outlined text-[80px]">cloud</span>
      </div>
      <div className="fixed top-32 right-20 text-[#ffdea8] dark:text-[#2A2A4E] floating-element opacity-40 sm:opacity-60 pointer-events-none scale-75 sm:scale-100 transition-transform" style={{ animationDelay: '2s' }}>
        <span className="material-symbols-outlined text-[100px]">cloud</span>
      </div>
      <div className="fixed bottom-10 left-20 text-[#dfd9d1] dark:text-[#2A2A4E] floating-element opacity-40 sm:opacity-60 pointer-events-none scale-75 sm:scale-100 transition-transform" style={{ animationDelay: '1s' }}>
        <span className="material-symbols-outlined text-[60px]">favorite</span>
      </div>
      <div className="fixed top-1/4 right-10 text-[#b30069] floating-element opacity-10 sm:opacity-20 pointer-events-none scale-75 sm:scale-100 transition-transform" style={{ animationDelay: '3s' }}>
        <span className="material-symbols-outlined text-[50px]">festival</span>
      </div>

      {/* Top Controls (Language & Theme) */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={toggleLanguage}
          className="bg-white dark:bg-[#2A2A3E] text-[#1e1b17] dark:text-[#E0E0F0] p-2 rounded-full shadow-sm border border-[#e8e1da] dark:border-[#3A3A5E] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10 cursor-pointer"
        >
          <span className="font-[Cairo] font-bold text-sm">{isAr ? 'EN' : 'ع'}</span>
        </button>
        <button 
          onClick={toggleDarkMode}
          className="bg-white dark:bg-[#2A2A3E] text-[#1e1b17] dark:text-[#E0E0F0] p-2 rounded-full shadow-sm border border-[#e8e1da] dark:border-[#3A3A5E] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10 cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">{darkMode ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#df0e84] text-white rounded-full mb-3 shadow-md border-4 border-white dark:border-[#3A3A5E] floating-element">
            <span className="material-symbols-outlined text-[40px]">church</span>
          </div>
          <h1 className="font-[Cairo] text-3xl font-black text-[#b30069] dark:text-[#ffd9e4] mb-4">
            {t('appName')}
          </h1>
          <p className="font-[Cairo] text-sm text-[#7c5800] dark:text-[#ffdea8] font-bold mb-2">
            {t('church')}
          </p>
        </div>

        {/* Main Card */}
        <div 
          className="w-full rounded-2xl p-5 sm:p-6 transition-colors duration-500"
          style={{
            background: darkMode ? '#2A2A3E' : '#FFFFFF',
            border: '2px solid rgba(184,0,108,0.15)',
            boxShadow: '0 8px 40px rgba(184,0,108,0.12)'
          }}
        >
          
          {/* Tabs */}
          <div className="flex p-1 bg-[#f4ede5] dark:bg-[#1e1b17] rounded-full mb-6">
            <button 
              className={`flex-1 py-3 px-4 rounded-full font-[Cairo] text-sm font-bold text-center transition-all whitespace-nowrap cursor-pointer ${activeTab === 'login' ? 'bg-[#b30069] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'}`}
              onClick={() => setActiveTab('login')}
            >
              {isAr ? 'دخول / Login' : 'Login / دخول'}
            </button>
            <button 
              className={`flex-1 py-3 px-4 rounded-full font-[Cairo] text-sm font-bold text-center transition-all whitespace-nowrap cursor-pointer ${activeTab === 'register' ? 'bg-[#b30069] text-white shadow-md' : 'text-[#594048] dark:text-gray-400 hover:bg-[#e8e1da]/50'}`}
              onClick={() => setActiveTab('register')}
            >
              {isAr ? 'تسجيل / Register' : 'Register / تسجيل'}
            </button>
          </div>

          {/* ====== LOGIN FORM ====== */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                  <input 
                    type="email"
                    required
                    placeholder={isAr ? 'اسم المستخدم / البريد الإلكتروني' : 'Username / Email'}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={inputStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                  <input 
                    type="password"
                    required
                    placeholder={isAr ? 'كلمة المرور' : 'Password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={inputStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[#ffdad6] text-[#93000a] dark:bg-[#93000a]/30 dark:text-[#ffdad6] p-3 rounded-2xl text-xs font-bold text-center animate-pulse border border-[#ba1a1a]">
                  {error}
                </div>
              )}

              <div className="mt-4">
                <button 
                  type="submit" 
                  disabled={formLoading}
                  style={buttonStyle}
                  className="btn-bubbly w-full text-white font-[Cairo] text-base font-black min-h-[48px] py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isAr ? 'يلا بينا!' : "Let's Go!"}</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ====== REGISTRATION FORM ====== */}
          {activeTab === 'register' && !registerSuccess && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">badge</span>
                  </div>
                  <input 
                    type="text"
                    required
                    placeholder={isAr ? 'الاسم الكامل' : 'Full Name'}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    style={inputStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </div>
                  <input 
                    type="email"
                    required
                    placeholder={isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={inputStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                  <input 
                    type="password"
                    required
                    placeholder={isAr ? 'كلمة المرور' : 'Password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={inputStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">engineering</span>
                  </div>
                  <select 
                    required
                    value={regRole}
                    onChange={(e) => {
                      setRegRole(e.target.value);
                      setRegTeamId('');
                      setRegStationId('');
                    }}
                    style={selectStyle}
                    className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] appearance-none cursor-pointer outline-none"
                  >
                    <option value="" disabled>{isAr ? 'اختر دورك الوظيفي...' : 'Select your role...'}</option>
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#5a5a71]">
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Conditional Field: Team Color (for Team Leaders) */}
              {regRole === 'TEAM_LEADER' && (
                <div className="space-y-2 py-1">
                  <label className="block font-[Cairo] text-xs font-bold text-[#1e1b17] dark:text-[#E0E0F0] px-1 text-start">
                    {isAr ? 'اختر الفريق (اللون)' : 'Select Team Color'}
                  </label>
                  {teams.length === 0 ? (
                    <p className="text-xs text-gray-500 text-start">{isAr ? 'جاري تحميل الفرق...' : 'Loading teams...'}</p>
                  ) : (
                    <div className="grid grid-cols-6 gap-2 px-1">
                      {teams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setRegTeamId(t.id)}
                          style={{ backgroundColor: t.colorHex || '#ccc' }}
                          className={`w-full aspect-square rounded-full border-4 transition-all duration-200 transform hover:scale-105 cursor-pointer shadow-sm ${regTeamId === t.id ? 'border-[#FFB800] scale-110' : 'border-transparent'}`}
                          title={isAr ? t.name : t.color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Field: Station Assignment (for Camp Leaders) */}
              {regRole === 'CAMP_LEADER' && (
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#5a5a71]">
                      <span className="material-symbols-outlined text-lg">location_on</span>
                    </div>
                    <select 
                      required
                      value={regStationId}
                      onChange={(e) => setRegStationId(e.target.value)}
                      style={selectStyle}
                      className="w-full text-base font-medium text-[#1e1b17] dark:text-[#E0E0F0] appearance-none cursor-pointer outline-none"
                    >
                      <option value="" disabled>{isAr ? 'اختر المحطة...' : 'Choose a station...'}</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.locationHint})</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[#5a5a71]">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-[#ffdad6] text-[#93000a] dark:bg-[#93000a]/30 dark:text-[#ffdad6] p-3 rounded-2xl text-xs font-bold text-center border border-[#ba1a1a]">
                  {error}
                </div>
              )}

              <div className="mt-4">
                <button 
                  type="submit" 
                  disabled={formLoading}
                  style={buttonStyle}
                  className="btn-bubbly w-full text-white font-[Cairo] text-base font-black min-h-[48px] py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isAr ? 'سجل معنا!' : 'Join the Fun!'}</span>
                      <span className="material-symbols-outlined text-lg">celebration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ====== REGISTRATION SUCCESS ====== */}
          {activeTab === 'register' && registerSuccess && (
            <div className="text-center py-6 animate-fade-in-up">
              <div className="w-16 h-16 bg-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#22C55E]">
                <span className="material-symbols-outlined text-[#22C55E] text-3xl font-bold">check</span>
              </div>
              <h3 className="text-lg font-[Cairo] font-bold text-[#22C55E] mb-2">
                {isAr ? 'تم إرسال طلبك بنجاح!' : 'Request Sent Successfully!'}
              </h3>
              <p className="text-sm text-[#594048] dark:text-gray-300 font-medium">
                {isAr 
                  ? 'حسابك الآن قيد الانتظار لمراجعة المسؤول والموافقة عليه.' 
                  : 'Your account is pending review and approval by the administrator.'}
              </p>
              <button
                onClick={() => {
                  setRegisterSuccess(false);
                  setActiveTab('login');
                }}
                className="mt-6 font-[Cairo] text-[#b30069] dark:text-[#ffd9e4] text-sm font-bold underline cursor-pointer"
              >
                {isAr ? 'العودة للدخول' : 'Go back to Login'}
              </button>
            </div>
          )}

          {/* Developed By Attribution Inside the Card */}
          <div className="border-t border-[#e8e1da] dark:border-[#3A3A5E] mt-6 pt-4 text-center mb-0">
            <p className="font-[Cairo] text-xs font-bold text-[#9B8E82] dark:text-[#8888A0] tracking-wide">
              Developed by:- <span className="text-[#b30069] dark:text-[#ffd9e4]">Kirolos Kamal</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
