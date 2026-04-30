import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

interface Evolution {
  id: string;
  date: string;
  observations: string;
  photoBefore: string | null;
  photoAfter: string | null;
  appointment: { date: string } | null;
}

interface Treatment {
  id: string;
  type: string;
  startDate: string;
  estimatedMonths: number;
  active: boolean;
  phases: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string };
  evolutions: Evolution[];
  payments: { amount: number }[];
}

const treatmentLabels: Record<string, string> = {
  METAL_BRACES: 'Brackets Metálicos',
  ESTHETIC_BRACES: 'Brackets Estéticos',
  INVISIBLE_ALIGNERS: 'Alineadores Invisibles',
  LINGUAL_ORTHODONTICS: 'Ortodoncia Lingual',
  INTERCEPTIVE_ORTHODONTICS: 'Ortodoncia Interceptiva',
};

export default function TreatmentDetail() {
  const { id } = useParams();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [showEvoModal, setShowEvoModal] = useState(false);
  const [evoForm, setEvoForm] = useState({ observations: '', photoBefore: '', photoAfter: '' });

  useEffect(() => {
    if (id) {
      axios.get(`/api/treatments/${id}`).then(r => setTreatment(r.data)).catch(() => {});
    }
  }, [id]);

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/evolutions', {
        treatmentId: id,
        observations: evoForm.observations,
        photoBefore: evoForm.photoBefore || null,
        photoAfter: evoForm.photoAfter || null,
      });
      setShowEvoModal(false);
      setEvoForm({ observations: '', photoBefore: '', photoAfter: '' });
      const r = await axios.get(`/api/treatments/${id}`);
      setTreatment(r.data);
    } catch {
      alert('Error al agregar evolución');
    }
  };

  const handleComplete = async () => {
    if (!confirm('¿Estás seguro de finalizar este tratamiento?')) return;
    try {
      await axios.patch(`/api/treatments/${id}/complete`);
      const r = await axios.get(`/api/treatments/${id}`);
      setTreatment(r.data);
    } catch {
      alert('Error al finalizar tratamiento');
    }
  };

  if (!treatment) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      </Layout>
    );
  }

  const totalPaid = treatment.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/treatments" className="text-blue-600 hover:underline text-sm">&larr; Volver a Tratamientos</Link>
      </div>

      {/* Info del tratamiento */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Tratamiento</h1>
            <span className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mt-2">
              {treatmentLabels[treatment.type] || treatment.type}
            </span>
            {treatment.active ? (
              <span className="inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full ml-2">
                Activo
              </span>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1 rounded-full ml-2">
                Completado
              </span>
            )}
          </div>
          {treatment.active && (
            <button
              onClick={handleComplete}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              Finalizar Tratamiento
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Paciente</p>
            <p className="font-semibold">{treatment.patient.firstName} {treatment.patient.lastName}</p>
            <p className="text-sm text-gray-500">{treatment.patient.phone}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Inicio / Duración</p>
            <p className="font-semibold">{new Date(treatment.startDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">{treatment.estimatedMonths} meses estimados</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{treatment.evolutions.length} evoluciones</p>
          </div>
        </div>

        {treatment.phases && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Fases del tratamiento:</p>
            <div className="flex flex-wrap gap-2">
              {JSON.parse(treatment.phases).map((phase: string, i: number) => (
                <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full">
                  {i + 1}. {phase}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evoluciones */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Evoluciones</h2>
          {treatment.active && (
            <button
              onClick={() => setShowEvoModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              + Agregar Evolución
            </button>
          )}
        </div>

        <div className="space-y-4">
          {treatment.evolutions.map(evo => (
            <div key={evo.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {new Date(evo.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {evo.appointment && (
                  <span className="text-xs text-gray-400">
                    Cita: {new Date(evo.appointment.date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{evo.observations}</p>

              {/* Fotos */}
              {(evo.photoBefore || evo.photoAfter) && (
                <div className="flex gap-4 mt-3">
                  {evo.photoBefore && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Antes</p>
                      <img src={evo.photoBefore} alt="Antes" className="w-32 h-24 object-cover rounded-lg border" />
                    </div>
                  )}
                  {evo.photoAfter && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Después</p>
                      <img src={evo.photoAfter} alt="Después" className="w-32 h-24 object-cover rounded-lg border" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {treatment.evolutions.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay evoluciones registradas</p>
          )}
        </div>
      </div>

      {/* Modal Nueva Evolución */}
      {showEvoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Agregar Evolución</h2>
            <form onSubmit={handleAddEvolution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={evoForm.observations}
                  onChange={e => setEvoForm({ ...evoForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe el progreso del paciente..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Antes (URL)</label>
                <input
                  type="text"
                  value={evoForm.photoBefore}
                  onChange={e => setEvoForm({ ...evoForm, photoBefore: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ejemplo.com/foto-antes.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto Después (URL)</label>
                <input
                  type="text"
                  value={evoForm.photoAfter}
                  onChange={e => setEvoForm({ ...evoForm, photoAfter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ejemplo.com/foto-despues.jpg"
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Guardar
                </button>
                <button type="button" onClick={() => setShowEvoModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
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
