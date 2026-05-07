import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface DashboardData {
  stats: {
    totalClinics: number;
    activeClinics: number;
    totalUsers: number;
    totalPatients: number;
  };
  clinics: Array<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
    userCount: number;
    patientCount: number;
    subscription: { plan: string; amount: number; nextBilling: string; active: boolean } | null;
  }>;
  revenue: {
    total: number;
    byClinic: Array<{ name: string; amount: number; status: string }>;
  };
  loginActivity: Array<{
    username: string;
    clinicName: string;
    success: boolean;
    ip: string;
    createdAt: string;
  }>;
}

export default function AdminPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/admin/dashboard');
        setData(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-red-400">Error al cargar datos</div>
      </AdminLayout>
    );
  }

  const { stats, clinics, revenue, loginActivity } = data;
  const maxAmount = Math.max(...revenue.byClinic.map((r) => r.amount), 1);
  const barColors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-violet-500', 'bg-fuchsia-500'];

  return (
    <AdminLayout>
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Clínicas Activas</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.activeClinics}</p>
          <p className="text-xs text-gray-400 mt-1">de {stats.totalClinics} totales</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Usuarios Totales</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pacientes Totales</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalPatients}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ingresos Mensuales</p>
          <p className="text-3xl font-bold text-green-600 mt-1">${revenue.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Clinics Table + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Clinics Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700 text-sm">Clínicas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-center px-4 py-2">Estado</th>
                  <th className="text-center px-4 py-2">Usuarios</th>
                  <th className="text-center px-4 py-2">Pacientes</th>
                  <th className="text-right px-4 py-2">Suscripción</th>
                  <th className="text-center px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${c.active ? 'bg-green-500' : 'bg-red-400'}`} />
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{c.userCount}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{c.patientCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                      {c.subscription ? `$${c.subscription.amount.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={async () => {
                            try {
                              const res = await axios.post(`/api/admin/impersonate/${c.id}`);
                              const { token } = res.data;
                              localStorage.setItem('token', token);
                              axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                              window.location.href = '/dashboard';
                            } catch (err: any) {
                              alert(err.response?.data?.error || 'Error al entrar a la clínica');
                            }
                          }}
                          className="text-amber-500 hover:text-amber-700 text-xs font-medium"
                          title="Entrar a la clínica como ADMIN"
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm('¿Eliminar toda la clínica? Esta acción no se puede deshacer. Se borrarán todos los pacientes, citas, tratamientos, pagos y usuarios.')) return;
                            axios.delete(`/api/admin/clinics/${c.id}`)
                              .then(() => window.location.reload())
                              .catch(err => alert(err.response?.data?.error || 'Error al eliminar'))
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Eliminar clínica"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Ingresos por Clínica</h3>
          {revenue.byClinic.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos de ingresos</p>
          ) : (
            <div className="space-y-3">
              {revenue.byClinic.map((r, i) => {
                const pct = maxAmount > 0 ? (r.amount / maxAmount) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium truncate">{r.name}</span>
                      <span className="text-gray-500 font-mono">${r.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColors[i % barColors.length]}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Login Activity */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">Últimos inicios de sesión</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Usuario</th>
                <th className="text-left px-4 py-2">Clínica</th>
                <th className="text-center px-4 py-2">Resultado</th>
                <th className="text-left px-4 py-2">IP</th>
                <th className="text-right px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loginActivity.slice(0, 10).map((l, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-gray-700">{l.username}</td>
                  <td className="px-4 py-2.5 text-gray-500">{l.clinicName}</td>
                  <td className="px-4 py-2.5 text-center">
                    {l.success ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-red-500 font-bold">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-gray-400">{l.ip}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">
                    {new Date(l.createdAt).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {loginActivity.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">Sin actividad registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
