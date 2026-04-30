import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  ORTHODONTIST: 'Odontólogo',
  EXTERNAL: 'Odontólogo Externo',
  RECEPTIONIST: 'Recepcionista',
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  ORTHODONTIST: 'bg-blue-100 text-blue-700',
  EXTERNAL: 'bg-orange-100 text-orange-700',
  RECEPTIONIST: 'bg-gray-100 text-gray-700',
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ORTHODONTIST' });

  const load = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    try {
      if (editing) {
        await axios.put(`/api/users/${editing.id}`, { name: form.name, email: form.email, role: form.role });
      } else {
        await axios.post('/api/users', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', email: '', password: '', role: 'ORTHODONTIST' });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error al guardar');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await axios.put(`/api/users/${u.id}`, { active: !u.active });
      load();
    } catch {}
  };

  const startEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setShowForm(true);
  };

  if (loading) return <Layout><div className="text-center py-12 text-gray-400">Cargando...</div></Layout>;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Administración</h1>
          <p className="text-sm text-gray-500">Gestión de cuentas de usuario</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', email: '', password: '', role: 'ORTHODONTIST' }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {editing ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="ADMIN">Administrador</option>
                  <option value="ORTHODONTIST">Odontólogo</option>
                  <option value="EXTERNAL">Odontólogo Externo</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={handleSubmit}
                disabled={!form.name || !form.email || (!editing && !form.password)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {editing ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${roleColors[u.role] || 'bg-gray-100'}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {u.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(u)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
