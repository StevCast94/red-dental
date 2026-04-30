import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import Odontogram from '../components/Odontogram';
import ClinicalHistory from '../components/ClinicalHistory';

interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string | null;
  address: string | null;
  clinicalHistory: string | null;
  orthodontist: { name: string };
  appointments: {
    id: string;
    date: string;
    type: string;
    status: string;
    orthodontist: { name: string };
  }[];
  treatments: {
    id: string;
    type: string;
    startDate: string;
    active: boolean;
    evolutions: { id: string }[];
  }[];
  payments: {
    id: string;
    amount: number;
    method: string;
    date: string;
  }[];
}

const treatmentLabels: Record<string, string> = {
  METAL_BRACES: 'Brackets Metálicos',
  ESTHETIC_BRACES: 'Brackets Estéticos',
  INVISIBLE_ALIGNERS: 'Alineadores Invisibles',
  LINGUAL_ORTHODONTICS: 'Ortodoncia Lingual',
  INTERCEPTIVE_ORTHODONTICS: 'Ortodoncia Interceptiva',
};

const statusBadge: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  ATTENDED: 'bg-blue-100 text-blue-700',
  CANCELED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', ATTENDED: 'Atendida', CANCELED: 'Cancelada', NO_SHOW: 'No Asistió',
};

export default function PatientProfile() {
  const { id } = useParams();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<'odontogram' | 'clinical'>('odontogram');

  useEffect(() => {
    if (id) axios.get(`/api/patients/${id}`).then(r => setPatient(r.data)).catch(() => {});
  }, [id]);

  if (!patient) return (
    <Layout><div className="text-center py-12 text-gray-400">Cargando...</div></Layout>
  );

  const totalPaid = patient.payments.reduce((s, p) => s + p.amount, 0);
  const activeTreatments = patient.treatments.filter(t => t.active);
  const age = Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 86400000));

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/patients" className="text-blue-600 hover:underline text-sm">&larr; Volver a Pacientes</Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
              <p className="text-sm text-gray-500">{age} años · Ortodoncista: {patient.orthodontist.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Total pagado</p>
          </div>
        </div>

        {/* Tabs: Odontograma e Historia Clínica */}
        <div className="flex gap-2 mt-6 border-b border-gray-200">
          <button
            onClick={() => setTab('odontogram')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition ${
              tab === 'odontogram'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >🦷 Odontograma</button>
          <button
            onClick={() => setTab('clinical')}
            className={`pb-2 px-4 text-sm font-medium border-b-2 transition ${
              tab === 'clinical'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >📋 Historia Clínica</button>
        </div>

        {/* Tab content */}
        {tab === 'odontogram' && (
          <div className="mt-4">
            <Odontogram patientId={patient.id} />
          </div>
        )}

        {tab === 'clinical' && (
          <div className="mt-4">
            <ClinicalHistory patientId={patient.id} initialHistory={patient.clinicalHistory} />
          </div>
        )}

      {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <InfoItem label="Teléfono" value={patient.phone} />
          <InfoItem label="Email" value={patient.email || '-'} />
          <InfoItem label="Dirección" value={patient.address || '-'} />
          <InfoItem label="Tratamientos" value={`${activeTreatments.length} activos · ${patient.treatments.length} total`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tratamientos */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Tratamientos</h2>
          <div className="space-y-3">
            {patient.treatments.map(t => (
              <Link key={t.id} to={`/treatments/${t.id}`} className="block p-3 border rounded-lg hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{treatmentLabels[t.type] || t.type}</p>
                    <p className="text-xs text-gray-400">Inicio: {new Date(t.startDate).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{t.evolutions.length} evoluciones</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.active ? 'Activo' : 'Completado'}
                  </span>
                </div>
              </Link>
            ))}
            {patient.treatments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin tratamientos</p>}
          </div>
        </div>

        {/* Citas */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Citas Recientes</h2>
          <div className="space-y-2">
            {patient.appointments.slice(0, 8).map(a => (
              <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium">{new Date(a.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-gray-400">{new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {a.orthodontist.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[a.status]}`}>{statusLabels[a.status]}</span>
              </div>
            ))}
            {patient.appointments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin citas</p>}
          </div>
        </div>
      </div>

      {/* Pagos */}
      <div className="bg-white rounded-xl shadow p-5 mt-6">
        <h2 className="font-semibold text-gray-800 mb-4">Historial de Pagos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-left px-4 py-2">Método</th>
                <th className="text-right px-4 py-2">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patient.payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-gray-500">{p.method}</td>
                  <td className="px-4 py-2 text-right font-medium text-green-600">${p.amount.toFixed(2)}</td>
                </tr>
              ))}
              {patient.payments.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray-400">Sin pagos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-700 truncate">{value}</p>
    </div>
  );
}
