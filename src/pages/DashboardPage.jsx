import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import TeamLeaderDashboard from './TeamLeaderDashboard';
import CampLeaderDashboard from './CampLeaderDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-cream dark:bg-bg-dark p-4 sm:p-6 md:p-8">
        <div className="spinner" style={{ borderTopColor: '#B8006C', width: 32, height: 32 }} />
      </div>
    );
  }

  // Route to the appropriate sub-dashboard component based on user role
  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'TEAM_LEADER':
      return <TeamLeaderDashboard />;
    case 'CAMP_LEADER':
      return <CampLeaderDashboard />;
    default:
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cream dark:bg-bg-dark font-[Cairo] text-red-500 p-4 sm:p-6 md:p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-4">دور وظيفي غير معروف / Unknown Role</h1>
          <p className="text-sm text-gray-500 mb-6">User role "{user.role}" does not match any dashboard view.</p>
          <p className="text-xs font-bold text-gray-400">Developed by:- Kirolos Kamal</p>
        </div>
      );
  }
}
