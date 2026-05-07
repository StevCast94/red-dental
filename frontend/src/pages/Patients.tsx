import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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

function getDaysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

const COUNTRY_CODES = [
  { code: '+593', label: '🇪🇨 Ecuador', flag: 'EC' },
  { code: '+1', label: '🇺🇸 EE.UU./Canadá', flag: 'US' },
  { code: '+52', label: '🇲🇽 México', flag: 'MX' },
  { code: '+34', label: '🇪🇸 España', flag: 'ES' },
  { code: '+54', label: '🇦🇷 Argentina', flag: 'AR' },
  { code: '+56', label: '🇨🇱 Chile', flag: 'CL' },
  { code: '+57', label: '🇨🇴 Colombia', flag: 'CO' },
  { code: '+51', label: '🇵🇪 Perú', flag: 'PE' },
  { code: '+58', label: '🇻🇪 Venezuela', flag: 'VE' },
  { code: '+507', label: '🇵🇦 Panamá', flag: 'PA' },
  { code: '+506', label: '🇨🇷 Costa Rica', flag: 'CR' },
  { code: '+502', label: '🇬🇹 Guatemala', flag: 'GT' },
  { code: '+503', label: '🇸🇻 El Salvador', flag: 'SV' },
  { code: '+504', label: '🇭🇳 Honduras', flag: 'HN' },
  { code: '+505', label: '🇳🇮 Nicaragua', flag: 'NI' },
  { code: '+44', label: '🇬🇧 Reino Unido', flag: 'GB' },
  { code: '+33', label: '🇫🇷 Francia', flag: 'FR' },
  { code: '+49', label: '🇩🇪 Alemania', flag: 'DE' },
  { code: '+39', label: '🇮🇹 Italia', flag: 'IT' },
  { code: '+55', label: '🇧🇷 Brasil', flag: 'BR' },
  { code: '+598', label: '🇺🇾 Uruguay', flag: 'UY' },
  { code: '+595', label: '🇵🇾 Paraguay', flag: 'PY' },
  { code: '+591', label: '🇧🇴 Bolivia', flag: 'BO' },
];

const emptyForm = {
  firstName: '',
  lastName: '',
  birthDate: '',
  phonePrefix: '+593',
  phoneNumber: '',
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadPatients();
  }, [search, page]);

  const loadPatients = () => {
    let url = `/api/patients?page=${page}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    axios.get(url)
      .then(res => {
        const { data, totalPages: tp } = res.data ?? { data: res.data, totalPages: 1 };
        setPatients(data ?? res.data);
        setTotalPages(tp ?? 1);
      })
      .catch(() => {});
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    // Separar el teléfono en prefijo + número
    let pPrefix = '+593';
    let pNumber = patient.phone || '';
    for (const cc of COUNTRY_CODES) {
      if (patient.phone?.startsWith(cc.code.replace('+', ''))) {
        pPrefix = cc.code;
        pNumber = patient.phone.slice(cc.code.length - 1);
        break;
      }
    }
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
      phonePrefix: pPrefix,
      phoneNumber: pNumber,
      email: patient.email || '',
      address: patient.address || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const birthStr = form.birthDate;
    const isComplete = birthStr && birthStr.split('-').filter(Boolean).length === 3;
    // Combinar prefijo + número en phone (limpiar el + para guardar solo dígitos)
    const cleanPhone = (form.phonePrefix + form.phoneNumber).replace(/^\+|\D/g, '');
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: cleanPhone,
      email: form.email || undefined,
      address: form.address || undefined,
      birthDate: isComplete ? new Date(birthStr + 'T12:00:00').toISOString() : null,
    };

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
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Nacimiento</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tratamientos</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortodoncista</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
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
                  <tr key={p.id} className="hidden md:table-row hover:bg-gray-50">
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

          {/* Mobile cards */}
          {patients.length > 0 && (
            <div className="block md:hidden p-4 space-y-3">
              {patients.map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/patients/${p.id}`} className="font-medium text-blue-600 hover:underline">
                        {p.firstName} {p.lastName}
                      </Link>
                      <p className="text-sm text-gray-500">{p.phone}</p>
                      <p className="text-xs text-gray-400">{p.email || '-'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-gray-400 flex justify-between">
                    <span>Ortodoncista: {p.orthodontist?.name || '-'}</span>
                    <span>{p.treatments?.filter(t => t.active).length || 0} trat. activos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 px-4 py-3 border-t border-gray-200">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                <div className="flex gap-2">
                  <select
                    value={form.birthDate ? form.birthDate.split('-')[0] || '' : ''}
                    onChange={e => {
                      const parts = form.birthDate ? form.birthDate.split('-') : ['', '', ''];
                      const y = e.target.value;
                      const m = parts[1] || '';
                      const d = parts[2] || '';
                      // Reset day if not valid for new year+month
                      const maxDay = getDaysInMonth(Number(m), Number(y));
                      const validDay = d && Number(d) <= maxDay ? d : '';
                      setForm({ ...form, birthDate: validDay && m && y ? `${y}-${m}-${validDay}` : `${y || ''}-${m || ''}-${validDay || ''}` });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Año</option>
                    {Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={form.birthDate ? form.birthDate.split('-')[1] || '' : ''}
                    onChange={e => {
                      const parts = form.birthDate ? form.birthDate.split('-') : ['', '', ''];
                      const y = parts[0] || '';
                      const m = e.target.value;
                      const d = parts[2] || '';
                      // Reset day if not valid for this month
                      const maxDay = getDaysInMonth(Number(m), Number(y));
                      const validDay = d && Number(d) <= maxDay ? d : '';
                      setForm({ ...form, birthDate: validDay && m && y ? `${y}-${m}-${validDay}` : `${y || ''}-${m || ''}-${validDay || ''}` });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Mes</option>
                    {[
                      { v: '01', l: 'Enero' },
                      { v: '02', l: 'Febrero' },
                      { v: '03', l: 'Marzo' },
                      { v: '04', l: 'Abril' },
                      { v: '05', l: 'Mayo' },
                      { v: '06', l: 'Junio' },
                      { v: '07', l: 'Julio' },
                      { v: '08', l: 'Agosto' },
                      { v: '09', l: 'Septiembre' },
                      { v: '10', l: 'Octubre' },
                      { v: '11', l: 'Noviembre' },
                      { v: '12', l: 'Diciembre' },
                    ].map(m => (
                      <option key={m.v} value={m.v}>{m.l}</option>
                    ))}
                  </select>
                  <select
                    value={form.birthDate ? form.birthDate.split('-')[2] || '' : ''}
                    onChange={e => {
                      const parts = form.birthDate ? form.birthDate.split('-') : ['', '', ''];
                      const y = parts[0] || '';
                      const m = parts[1] || '';
                      const d = e.target.value;
                      setForm({ ...form, birthDate: d && m && y ? `${y}-${m}-${d}` : `${y || ''}-${m || ''}-${d || ''}` });
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Día</option>
                    {(() => {
                      const parts = form.birthDate ? form.birthDate.split('-') : ['', '', ''];
                      const m = Number(parts[1]) || 0;
                      const y = Number(parts[0]) || 0;
                      const days = getDaysInMonth(m, y);
                      return Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <div className="flex gap-2">
                  <select
                    value={form.phonePrefix}
                    onChange={e => setForm({ ...form, phonePrefix: e.target.value })}
                    className="w-2/5 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {COUNTRY_CODES.map(cc => (
                      <option key={cc.code} value={cc.code}>{cc.code} {cc.label}</option>
                    ))}
                  </select>
                  <input
                    required
                    type="tel"
                    placeholder="Número de celular"
                    value={form.phoneNumber}
                    onChange={e => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, '') })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
