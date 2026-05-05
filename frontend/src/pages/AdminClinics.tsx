import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface ClinicSubscription {
  id: string;
  plan: string;
  amount: number;
  startDate: string;
  nextBilling: string;
  active: boolean;
}

interface Clinic {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  _count: { users: number; patients: number };
  subscription: ClinicSubscription | null;
}

const planLabels: Record<string, string> = {
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

export default function AdminClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteClinic = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await axios.delete(`/api/admin/clinics/${id}`);
      load();
      alert('Clínica eliminada correctamente');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar clínica');
    }
  };
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ plan: 'MONTHLY', amount: 30, nextBilling: '', active: true });
  const [confirmToggle, setConfirmToggle] = useState<string | null>(null);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [clinicForm, setClinicForm] = useState({ name: '', address: '', phone: '', contactEmail: '' });
  const [showNewClinic, setShowNewClinic] = useState(false);
  const [newClinicForm, setNewClinicForm] = useState({ name: '', slug: '' });
  const [newClinicLoading, setNewClinicLoading] = useState(false);
  const [newClinicResult, setNewClinicResult] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await axios.get('/api/admin/clinics');
      setClinics(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleClinic = async (id: string) => {
    await axios.put(`/api/admin/clinics/${id}/toggle`);
    setConfirmToggle(null);
    load();
  };

  const saveClinic = async () => {
    if (!editingClinic) return;
    try {
      await axios.put(`/api/admin/clinics/${editingClinic.id}`, clinicForm);
      setEditingClinic(null);
      load();
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const openClinicEdit = (clinic: Clinic) => {
    setClinicForm({
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      contactEmail: clinic.contactEmail || '',
    });
    setEditingClinic(clinic);
  };

  const saveSubscription = async (clinicId: string) => {
    await axios.put(`/api/admin/clinics/${clinicId}/subscription`, subForm);
    setEditingSub(null);
    load();
  };

  const createNewClinic = async () => {
    setNewClinicLoading(true);
    try {
      await axios.post('/api/admin/clinics', newClinicForm);
      // Crear usuario admin para la clínica (necesitamos recargar para obtener el clinicId)
      load();
      setNewClinicResult(`${newClinicForm.name} creada correctamente`);
      setNewClinicForm({ name: '', slug: '' });
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
    setNewClinicLoading(false);
  };

  const startEditSub = (clinic: Clinic) => {
    const sub = clinic.subscription;
    setSubForm({
      plan: sub?.plan || 'MONTHLY',
      amount: sub?.amount || 30,
      nextBilling: sub?.nextBilling ? sub.nextBilling.split('T')[0] : '',
      active: sub?.active ?? true,
    });
    setEditingSub(clinic.id);
  };

  if (loading) return <AdminLayout><div className="text-center py-12 text-gray-400">Cargando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏥 Clínicas</h1>
            <p className="text-sm text-gray-500">Gestión de clínicas — activar/inactivar, editar datos y suscripciones</p>
          </div>
          <button
            onClick={() => setShowNewClinic(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <span>+</span> Nueva Clínica
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Clínica</th>
              <th className="text-left px-4 py-3">Contacto</th>
              <th className="text-center px-4 py-3 w-28">Estado</th>
              <th className="text-center px-4 py-3">Usuarios</th>
              <th className="text-center px-4 py-3">Pacientes</th>
              <th className="text-center px-4 py-3">Plan</th>
              <th className="text-right px-4 py-3">Monto</th>
              <th className="text-center px-4 py-3">Próx. Cobro</th>
              <th className="text-right px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clinics.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 ${!c.active ? 'bg-gray-50/50' : ''}`}>
                <td className={`px-4 py-3 font-medium ${c.active ? 'text-gray-800' : 'text-gray-400'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.active ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div>
                      <div>{c.name}</div>
                      {c.address && <div className="text-xs text-gray-400 font-normal">{c.address}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-xs font-medium flex items-center gap-1"
                      title="Abrir WhatsApp"
                    >
                      <span>📱</span> {c.phone}
                    </a>
                  )}
                  {c.contactEmail && (
                    <div className="text-xs text-gray-400 mt-0.5">{c.contactEmail}</div>
                  )}
                  {!c.phone && !c.contactEmail && <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {confirmToggle === c.id ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => toggleClinic(c.id)}
                        className={`px-2 py-1 rounded text-xs font-medium text-white ${
                          c.active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {c.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => setConfirmToggle(null)}
                        className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-600 hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmToggle(c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        c.active
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {c.active ? 'Activo' : 'Inactivo'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{c._count.users}</td>
                <td className="px-4 py-3 text-center text-gray-600">{c._count.patients}</td>
                <td className="px-4 py-3 text-center">
                  {c.subscription ? (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                      {planLabels[c.subscription.plan] || c.subscription.plan}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {c.subscription ? `$${c.subscription.amount.toFixed(2)}` : '—'}
                </td>
                <td className={`px-4 py-3 text-center text-xs ${c.subscription && new Date(c.subscription.nextBilling) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {c.subscription?.nextBilling
                    ? new Date(c.subscription.nextBilling).toLocaleDateString('es-EC')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openClinicEdit(c)}
                      className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => startEditSub(c)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Suscripción
                    </button>
                    {deleteConfirm === c.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDeleteClinic(c.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-400 hover:text-gray-600 text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                        title="Eliminar clínica"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Clínica */}
      {showNewClinic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            {newClinicResult ? (
              <div>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 className="text-lg font-semibold text-gray-800">Clínica creada</h2>
                  <p className="text-sm text-gray-500 mt-1">{newClinicResult}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-xs text-blue-700">
                    💡 Ahora puedes ir a <strong>Credenciales</strong> para crear usuarios para esta clínica.
                  </p>
                </div>
                <button
                  onClick={() => { setShowNewClinic(false); setNewClinicResult(null); load(); }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">🏥 Crear Nueva Clínica</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nombre de la clínica</label>
                    <input
                      type="text"
                      value={newClinicForm.name}
                      onChange={e => {
                        setNewClinicForm({
                          name: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                        });
                      }}
                      placeholder="Ej: Dental Care Center"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Slug (identificador único)</label>
                    <input
                      type="text"
                      value={newClinicForm.slug}
                      onChange={e => setNewClinicForm({ ...newClinicForm, slug: e.target.value })}
                      placeholder="dental-care-center"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 justify-end">
                  <button
                    onClick={() => { setShowNewClinic(false); setNewClinicForm({ name: '', slug: '' }); }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createNewClinic}
                    disabled={!newClinicForm.name || !newClinicForm.slug || newClinicLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                      !newClinicForm.name || !newClinicForm.slug || newClinicLoading
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {newClinicLoading ? 'Creando...' : 'Crear Clínica'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal editar clínica */}
      {editingClinic && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">✏️ Editar {editingClinic.name}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre de la clínica</label>
                <input
                  type="text"
                  value={clinicForm.name}
                  onChange={e => setClinicForm({...clinicForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                <input
                  type="text"
                  value={clinicForm.address}
                  onChange={e => setClinicForm({...clinicForm, address: e.target.value})}
                  placeholder="Av. Principal 123, Quito"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={clinicForm.phone}
                    onChange={e => setClinicForm({...clinicForm, phone: e.target.value})}
                    placeholder="+593 99 999 9999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {clinicForm.phone && (
                    <a
                      href={`https://wa.me/${clinicForm.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:text-green-800 mt-1 inline-block"
                    >
                      📱 Abrir WhatsApp
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email de contacto</label>
                  <input
                    type="email"
                    value={clinicForm.contactEmail}
                    onChange={e => setClinicForm({...clinicForm, contactEmail: e.target.value})}
                    placeholder="admin@clinica.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setEditingClinic(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={saveClinic}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar suscripción */}
      {editingSub && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Editar Suscripción</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plan</label>
                <select
                  value={subForm.plan}
                  onChange={e => setSubForm({...subForm, plan: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="MONTHLY">Mensual — $30</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monto ($)</label>
                <input
                  type="number"
                  value={subForm.amount}
                  onChange={e => setSubForm({...subForm, amount: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Próximo cobro</label>
                <input
                  type="date"
                  value={subForm.nextBilling}
                  onChange={e => setSubForm({...subForm, nextBilling: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Suscripción activa</label>
                <button
                  onClick={() => setSubForm({...subForm, active: !subForm.active})}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    subForm.active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      subForm.active ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveSubscription(editingSub)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
