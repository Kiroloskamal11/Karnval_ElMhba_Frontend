import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      login: 'دخول',
      register: 'تسجيل',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      letsGo: 'يلا نبدأ! ←',
      appName: 'كرنفال المحبة',
      church: 'كنيسة مار مرقس — أمبابة',
      selectRole: 'اختر دورك',
      fullName: 'الاسم الكامل',
      selectTeam: 'اختر الفريق',
      selectStation: 'اختر المحطة',
      pending: 'طلبك قيد المراجعة، انتظر موافقة المسؤول',
      rejected: 'تم رفض طلبك',
      submitRegister: 'إرسال الطلب',
      registerSuccess: 'تم إرسال طلبك، انتظر موافقة المسؤول ✓',
      admin: 'مسؤول',
      teamLeader: 'قائد فريق',
      campLeader: 'قائد محطة',
      dashboard: 'لوحة التحكم',
      comingSoon: 'قريبًا...',
      errorOccurred: 'حدث خطأ، حاول مرة أخرى',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      fillAllFields: 'يرجى ملء جميع الحقول',
    },
  },
  en: {
    translation: {
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      letsGo: "Let's Go! →",
      appName: 'Karneval El Mahaba',
      church: 'St. Mark Church — Imbaba',
      selectRole: 'Select your role',
      fullName: 'Full Name',
      selectTeam: 'Select Team',
      selectStation: 'Select Station',
      pending: 'Your request is under review, waiting for admin approval',
      rejected: 'Your request has been rejected',
      submitRegister: 'Submit Request',
      registerSuccess: 'Your request has been submitted, waiting for admin approval ✓',
      admin: 'Admin',
      teamLeader: 'Team Leader',
      campLeader: 'Camp Leader',
      dashboard: 'Dashboard',
      comingSoon: 'Coming Soon...',
      errorOccurred: 'An error occurred, please try again',
      invalidCredentials: 'Invalid email or password',
      fillAllFields: 'Please fill in all fields',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
