import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

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
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [form, setForm] = useState({ patientId: '', type: 'METAL_BRACES', estimatedMonths: 12, phases: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

      {/* Grid de tratamientos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {treatments.map(t => (
          <Link
            key={t.id}
            to={`/treatments/${t.id}`}
            className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {treatmentLabels[t.type] || t.type}
              </span>
              {t.active && (
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  Activo
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {t.patient.firstName} {t.patient.lastName}
            </h3>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Inicio: {new Date(t.startDate).toLocaleDateString()}</p>
              <p>Duración: {t.estimatedMonths} meses</p>
              <p>Evoluciones: {t._count.evolutions}</p>
            </div>
          </Link>
        ))}
        {treatments.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No hay tratamientos {activeTab === 'active' ? 'activos' : 'completados'}
          </div>
        )}
      </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select
                  value={form.patientId}
                  onChange={e => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
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
