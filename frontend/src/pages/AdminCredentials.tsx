import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface ClinicUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface Clinic {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  ORTHODONTIST: 'Odontólogo',
  RECEPTIONIST: 'Recepcionista',
  EXTERNAL: 'Externo',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  ORTHODONTIST: 'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-green-100 text-green-700',
  EXTERNAL: 'bg-gray-100 text-gray-700',
};

export default function AdminCredentials() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    name: '', email: '', username: '', password: 'admin123', role: 'ORTHODONTIST', clinicId: '',
  });
  const [resetPass, setResetPass] = useState('');
  const [newUserResult, setNewUserResult] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/admin/clinics').then(r => setClinics(r.data)).catch(console.error);
  }, []);

  const loadUsers = async (clinicId: string) => {
    setLoading(true);
    setSelectedClinic(clinicId);
    try {
      const res = await axios.get(`/api/admin/clinics/${clinicId}/users`);
      setUsers(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createUser = async () => {
    try {
      await axios.post('/api/admin/users', { ...newForm, clinicId: selectedClinic });
      setNewUserResult(`${newForm.username} / ${newForm.password}`);
      setNewForm({ name: '', email: '', username: '', password: 'admin123', role: 'ORTHODONTIST', clinicId: '' });
      if (selectedClinic) loadUsers(selectedClinic);
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}/reset-password`, { newPassword: resetPass });
      setShowReset(null);
      setResetPass('');
      alert('Contraseña actualizada');
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const toggleUser = async (userId: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}/toggle`);
      if (selectedClinic) loadUsers(selectedClinic);
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔑 Credenciales de Acceso</h1>
        <p className="text-sm text-gray-500">Gestiona usuarios y accesos de cada clínica</p>
      </div>

      {/* Selector de clínica */}
      <div className="flex flex-wrap gap-2 mb-6">
        {clinics.map((c) => (
          <button
            key={c.id}
            onClick={() => loadUsers(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedClinic === c.id
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!selectedClinic && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
          <p className="text-4xl mb-3">👆</p>
          <p>Selecciona una clínica para ver sus usuarios</p>
        </div>
      )}

      {selectedClinic && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              {users.length} usuario{users.length !== 1 ? 's' : ''} en esta clínica
            </p>
            <button
              onClick={() => { setShowNew(true); setNewUserResult(null); }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
            >
              + Nuevo Usuario
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">Username</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-center px-4 py-3">Rol</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-right px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{u.username}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${roleColors[u.role] || 'bg-gray-100'}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleUser(u.id)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            u.active
                              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                              : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {u.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setShowReset(u.id); setResetPass(''); }}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          Resetear contraseña
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-400">Sin usuarios en esta clínica</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Nuevo Usuario */}
      {showNew && selectedClinic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {newUserResult ? (
              <div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 className="text-lg font-semibold text-gray-800">Usuario creado</h2>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-xs text-yellow-700 font-medium mb-2">📝 Credenciales:</p>
                  <p className="text-sm font-mono text-gray-800"><strong>{newUserResult}</strong></p>
                </div>
                <button
                  onClick={() => { setShowNew(false); setNewUserResult(null); }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Nuevo Usuario</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
                    <input
                      type="text"
                      value={newForm.name}
                      onChange={e => setNewForm({...newForm, name: e.target.value})}
                      placeholder="Dr. Juan Pérez"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Username</label>
                      <input
                        type="text"
                        value={newForm.username}
                        onChange={e => setNewForm({...newForm, username: e.target.value})}
                        placeholder="dr.juan"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={newForm.email}
                        onChange={e => setNewForm({...newForm, email: e.target.value})}
                        placeholder="dr.juan@clinica.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
                      <input
                        type="text"
                        value={newForm.password}
                        onChange={e => setNewForm({...newForm, password: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rol</label>
                      <select
                        value={newForm.role}
                        onChange={e => setNewForm({...newForm, role: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="ORTHODONTIST">Odontólogo</option>
                        <option value="RECEPTIONIST">Recepcionista</option>
                        <option value="EXTERNAL">Externo</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5 justify-end">
                  <button
                    onClick={() => setShowNew(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createUser}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Crear Usuario
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Resetear Contraseña */}
      {showReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Resetear Contraseña</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
              <input
                type="text"
                value={resetPass}
                onChange={e => setResetPass(e.target.value)}
                placeholder="nueva-contraseña-123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setShowReset(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => resetPassword(showReset)}
                disabled={!resetPass}
                className={`px-4 py-2 rounded-lg text-sm text-white ${
                  resetPass ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-400 cursor-not-allowed'
                }`}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
