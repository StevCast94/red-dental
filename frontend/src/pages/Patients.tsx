import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

async function downloadCsv(url: string, filename: string) {
  const res = await axios.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate?: string | null;
  address?: string | null;
  createdAt?: string;
  orthodontist?: { name: string } | null;
  treatments?: { id: string; type: string; active: boolean }[];
}

const emptyForm = {
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  email: '',
  address: '',
};

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadPatients();
  }, [search]);

  const loadPatients = () => {
    const url = search ? `/api/patients?search=${encodeURIComponent(search)}` : '/api/patients';
    axios.get(url)
      .then(res => setPatients(res.data))
      .catch(() => {});
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null };

    if (editingPatient) {
      axios.put(`/api/patients/${editingPatient.id}`, payload)
        .then(() => {
          setShowModal(false);
          loadPatients();
        })
        .catch(console.error);
    } else {
      axios.post('/api/patients', payload)
        .then(() => {
          setShowModal(false);
          loadPatients();
        })
        .catch(console.error);
    }
  };

  const handleDelete = (id: string) => {
    axios.delete(`/api/patients/${id}`)
      .then(() => {
        setDeleteConfirm(null);
        loadPatients();
      })
      .catch(console.error);
  };

  const formatDate = (d?: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-EC');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
            <p className="text-sm text-gray-500 mt-1">Gestiona la información de tus pacientes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv('/api/export/patients', 'pacientes.csv')}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span> Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Nacimiento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tratamientos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortodoncista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">👥</div>
                    <p>{search ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}</p>
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {p.firstName} {p.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(p.birthDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.treatments && p.treatments.length > 0 ? (
                        <span className="text-blue-600">
                          {p.treatments.filter(t => t.active).length} activos
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.orthodontist?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar paciente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    required
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input
                    required
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  required
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  {editingPatient ? 'Guardar Cambios' : 'Crear Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">¿Eliminar paciente?</h3>
              <p className="text-sm text-gray-600 mb-6">Esta acción no se puede deshacer. Se eliminarán todos los datos del paciente.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
