import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface LoginLog {
  id: string;
  username: string;
  success: boolean;
  ip: string | null;
  createdAt: string;
  clinic: { name: string } | null;
}

export default function AdminAccess() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const load = async () => {
    try {
      const res = await axios.get('/api/admin/login-logs');
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    if (filter === 'success') return l.success;
    if (filter === 'failed') return !l.success;
    return true;
  });

  if (loading) return <AdminLayout><div className="text-center py-12 text-gray-400">Cargando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔐 Accesos</h1>
        <p className="text-sm text-gray-500">Registro de inicios de sesión</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {(['all', 'success', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'success' ? 'Exitosos' : 'Fallidos'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Clínica</th>
              <th className="text-center px-4 py-3">Resultado</th>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-right px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-800">{l.username}</td>
                <td className="px-4 py-3 text-gray-600">{l.clinic?.name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {l.success ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Éxito
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      Fallo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{l.ip || '—'}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {new Date(l.createdAt).toLocaleString('es-EC')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No hay registros</div>
        )}
      </div>
    </AdminLayout>
  );
}
