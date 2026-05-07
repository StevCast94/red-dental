import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isExternal = user?.role === 'EXTERNAL';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="flex items-center">
                  <img src="/logo.png" alt="Red Dental" className="h-10 w-auto" />
                </Link>
              </div>
              <div className="ml-6 flex space-x-4">
                <Link to="/patients" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Pacientes
                </Link>
                <Link to="/treatments" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Tratamientos
                </Link>
                {!isExternal && (
                  <>
                    <Link to="/appointments" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Citas
                    </Link>
                    <Link to="/payments" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Pagos
                    </Link>
                    <Link to="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                      Dashboard
                    </Link>
                  </>
                )}
                {/* Admin link removed — clinics manage users themselves */}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="text-sm text-gray-600 hover:text-blue-600">{user?.name} {isExternal && <span className="text-xs text-orange-500 ml-1">(Externo)</span>}</Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
