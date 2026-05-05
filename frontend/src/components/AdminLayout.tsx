import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Tab = 'dashboard' | 'clinics' | 'subscriptions' | 'credentials' | 'access';

type TabRoute = Tab;

export default function AdminLayout({
  children,
  activeTab,
  onTabChange,
}: {
  children: ReactNode;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'clinics', label: 'Clínicas', icon: '🏥' },
    { key: 'subscriptions', label: 'Suscripciones', icon: '💰' },
    { key: 'credentials', label: 'Credenciales', icon: '🔑' },
    { key: 'access', label: 'Accesos', icon: '🔐' },
  ];

  // Determinar tab activa según ruta si no se pasa prop
  const currentTab: Tab = activeTab || (() => {
    const path = location.pathname;
    if (path === '/admin/clinics') return 'clinics';
    if (path === '/admin/subscriptions') return 'subscriptions';
    if (path === '/admin/payments') return 'subscriptions';
    if (path === '/admin/credentials') return 'credentials';
    if (path === '/admin/access') return 'access';
    return 'dashboard';
  })();

  const handleTabClick = (tab: Tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      const paths: Record<TabRoute, string> = {
        dashboard: '/admin',
        clinics: '/admin/clinics',
        subscriptions: '/admin/subscriptions',
        credentials: '/admin/credentials',
        access: '/admin/access',
      };
      navigate(paths[tab]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-indigo-900 to-indigo-800 text-white flex flex-col shadow-xl">
        <div className="px-5 py-6 border-b border-indigo-700">
          <h1 className="text-lg font-bold tracking-tight">Red Dental</h1>
          <p className="text-xs text-indigo-300 mt-0.5">Panel de Administración</p>
        </div>

        <nav className="flex-1 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`w-full text-left px-5 py-3 text-sm flex items-center gap-3 transition-colors ${
                currentTab === tab.key
                  ? 'bg-indigo-700 text-white border-r-2 border-indigo-300'
                  : 'text-indigo-200 hover:bg-indigo-700/50 hover:text-white'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-indigo-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-indigo-300 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-indigo-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>←</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
