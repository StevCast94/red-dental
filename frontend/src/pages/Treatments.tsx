import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Treatment {
  id: string;
  type: string;
  startDate: string;
  estimatedMonths: number;
  active: boolean;
  phases: string | null;
  patient: Patient;
  _count: { evolutions: number };
}

const treatmentLabels: Record<string, string> = {
  METAL_BRACES: 'Brackets Metálicos',
  ESTHETIC_BRACES: 'Brackets Estéticos',
  INVISIBLE_ALIGNERS: 'Alineadores Invisibles',
  LINGUAL_ORTHODONTICS: 'Ortodoncia Lingual',
  INTERCEPTIVE_ORTHODONTICS: 'Ortodoncia Interceptiva',
  EXODONCIA: 'Exodoncia',
  ENDODONCIA: 'Endodoncia',
  PROTESIS_REMOVIBLE: 'Prótesis Removible',
  PROTESIS_FIJA: 'Prótesis Fija',
  RADIOGRAFIA: 'Radiografía',
  OPERATORIO: 'Operatorio',
};

export default function Treatments() {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [form, setForm] = useState({ patientId: '', type: 'METAL_BRACES', estimatedMonths: 12, phases: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const patientSearchRef = useRef<HTMLDivElement>(null);

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(patientSearch.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (patient: Patient) => {
    setForm(f => ({ ...f, patientId: patient.id }));
    setPatientSearch(`${patient.firstName} ${patient.lastName}`);
    setSelectedPatientName(`${patient.firstName} ${patient.lastName}`);
    setShowPatientDropdown(false);
  };

  const handleDeleteTreatment = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este tratamiento? Se eliminarán todas las evoluciones, pagos y usos de inventario asociados.')) return;
    try {
      await axios.delete(`/api/treatments/${id}`);
      loadTreatments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar tratamiento');
    }
  };

  useEffect(() => {
    loadTreatments();
    axios.get('/api/patients').then(r => setPatients(r.data?.data ?? r.data)).catch(() => {});
  }, [activeTab, page]);

  const loadTreatments = () => {
    axios.get(`/api/treatments?active=${activeTab === 'active'}&page=${page}`)
      .then(r => {
        const { data, totalPages: tp } = r.data ?? { data: r.data, totalPages: 1 };
        setTreatments(data ?? r.data);
        setTotalPages(tp ?? 1);
      })
      .catch(() => {});
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/treatments', {
        ...form,
        phases: form.phases ? form.phases.split(',').map(p => p.trim()) : [],
      });
      setShowModal(false);
      setForm({ patientId: '', type: 'METAL_BRACES', estimatedMonths: 12, phases: '' });
      loadTreatments();
    } catch {
      alert('Error al crear tratamiento');
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tratamientos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          + Nuevo Tratamiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            activeTab === 'completed' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Completados
        </button>
      </div>

      {/* Active treatments: Table */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Inicio</th>
                <th className="text-center px-4 py-3">Duración</th>
                <th className="text-center px-4 py-3">Evoluciones</th>
                <th className="text-center px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {treatments.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/treatments/${t.id}`} className="text-blue-600 hover:underline font-medium">
                      {treatmentLabels[t.type] || t.type}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {t.patient.firstName} {t.patient.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {t.estimatedMonths} meses
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                      {t._count.evolutions}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      Activo
                    </span>
                  </td>
                </tr>
              ))}
              {treatments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No hay tratamientos activos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed treatments: Table/List */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Inicio</th>
                <th className="text-left px-4 py-3">Fin</th>
                <th className="text-center px-4 py-3">Duración</th>
                <th className="text-center px-4 py-3">Evoluciones</th>
                {user?.role === 'ADMIN' && <th className="text-center px-4 py-3">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {treatments.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/treatments/${t.id}`} className="text-blue-600 hover:underline font-medium">
                      {treatmentLabels[t.type] || t.type}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {t.patient.firstName} {t.patient.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    —
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {t.estimatedMonths} meses
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                      {t._count.evolutions}
                    </span>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteTreatment(t.id)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {treatments.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 7 : 6} className="text-center py-12 text-gray-500">
                    No hay tratamientos completados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 px-4 py-3 border-t border-gray-200 mt-6 bg-white rounded-xl shadow">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">Anterior</button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">Siguiente</button>
        </div>
      )}

      {/* Modal Nuevo Tratamiento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nuevo Tratamiento</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div ref={patientSearchRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setShowPatientDropdown(true);
                    setForm(f => ({ ...f, patientId: '' }));
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  placeholder="Buscar paciente..."
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  autoComplete="off"
                />
                {showPatientDropdown && patientSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectPatient(p)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                            form.patientId === p.id ? 'bg-blue-100 font-medium' : ''
                          }`}
                        >
                          {p.firstName} {p.lastName}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        {patients.length === 0 ? 'Cargando pacientes...' : 'Sin resultados'}
                      </div>
                    )}
                  </div>
                )}
                {form.patientId && selectedPatientName && !showPatientDropdown && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedPatientName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(treatmentLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meses estimados</label>
                <input
                  type="number"
                  value={form.estimatedMonths}
                  onChange={e => setForm({ ...form, estimatedMonths: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fases (separadas por coma)</label>
                <textarea
                  value={form.phases}
                  onChange={e => setForm({ ...form, phases: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Colocación, Alineación, Cierre espacios, Retiro"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
