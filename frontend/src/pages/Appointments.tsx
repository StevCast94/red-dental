import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

async function downloadCsv(url: string, filename: string) {
  const res = await axios.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
import { useAuth } from '../context/AuthContext';

function DateSelector({ selectedDate, onSelect }: {
  selectedDate: string;
  onSelect: (d: string) => void;
}) {
  const [startOffset, setStartOffset] = useState(0);
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  // Generar 14 días desde startOffset
  const today = new Date();
  const days = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + startOffset + i);
    return d;
  });

  // Cargar conteo de citas para el rango visible
  useEffect(() => {
    const from = days[0].toISOString().split('T')[0];
    const to = days[days.length - 1].toISOString().split('T')[0];
    axios.get(`/api/appointments/count?from=${from}&to=${to}`)
      .then((res) => setCountMap(res.data))
      .catch(() => {});
  }, [startOffset]);

  // Mes/año del rango visible
  const startMonth = days[0];
  const endMonth = days[days.length - 1];
  const monthLabel =
    startMonth.getMonth() === endMonth.getMonth() && startMonth.getFullYear() === endMonth.getFullYear()
      ? startMonth.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
      : `${startMonth.toLocaleDateString('es-EC', { month: 'short' })} - ${endMonth.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })}`;

  const isToday = (d: Date) => {
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setStartOffset((prev) => Math.max(prev - 12, -84))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          title="Anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={() => setStartOffset((prev) => prev + 12)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          title="Siguiente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day cards - visible sin scrollbar */}
      <div className="flex gap-2 overflow-hidden justify-center">
        {days.map((d) => {
          const dateStr = d.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const dayName = d.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '');
          const dayNum = d.getDate();
          const monthName = d.toLocaleDateString('es-EC', { month: 'short' }).replace('.', '');
          const isTodayFlag = isToday(d);
          const count = countMap[dateStr] || 0;

          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border-2 transition-all min-w-[80px] ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span className="text-xs uppercase tracking-wide font-medium">{dayName}</span>
              <span className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-blue-600' : ''}`}>{dayNum}</span>
              <span className="text-xs text-gray-400">{monthName}</span>
              {isTodayFlag && <span className="text-[10px] font-medium text-green-500 mt-0.5">Hoy</span>}
              <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full min-w-[40px] ${
                count > 0
                  ? isSelected ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'
                  : 'text-gray-300'
              }`}>
                {count > 0 ? `${count} ${count === 1 ? 'cita' : 'citas'}` : '0 citas'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getWhatsAppLink(phone: string, patientName: string, date: string, type: string) {
  const cleaned = phone.replace(/[^\d]/g, '');
  // Si no tiene código de país y empieza con 09, asumimos Ecuador (+593)
  const fullPhone = cleaned.startsWith('593') ? cleaned :
    cleaned.startsWith('09') ? '593' + cleaned.slice(1) :
    cleaned.startsWith('9') ? '593' + cleaned :
    '593' + cleaned;

  const formattedDate = new Date(date).toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const formattedTime = new Date(date).toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit'
  });

  const typeLabel: Record<string, string> = {
    INITIAL_CONSULTATION: 'consulta inicial',
    BRACKETS_PLACEMENT: 'colocacion de brackets',
    ADJUSTMENT: 'ajuste',
    REMOVAL: 'retiro',
    ALIGNER_DELIVERY: 'entrega de alineadores',
    CONTROL: 'control',
    EMERGENCY: 'emergencia',
  };

  const message = `Hola ${patientName}, te recordamos que tienes una cita de ${typeLabel[type] || type} el dia ${formattedDate} a las ${formattedTime}.`;

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Orthodontist {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  date: string;
  duration: number;
  type: string;
  status: string;
  patient: { id: string; firstName: string; lastName: string; phone: string };
  orthodontist: { id: string; name: string };
}

const APPOINTMENT_TYPES = [
  'INITIAL_CONSULTATION',
  'BRACKETS_PLACEMENT',
  'ADJUSTMENT',
  'REMOVAL',
  'ALIGNER_DELIVERY',
  'CONTROL',
  'EMERGENCY',
];

const TYPE_LABELS: Record<string, string> = {
  INITIAL_CONSULTATION: 'Consulta Inicial',
  BRACKETS_PLACEMENT: 'Colocación Brackets',
  ADJUSTMENT: 'Ajuste',
  REMOVAL: 'Retiro',
  ALIGNER_DELIVERY: 'Entrega Alineadores',
  CONTROL: 'Control',
  EMERGENCY: 'Emergencia',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  ATTENDED: 'Atendida',
  CANCELED: 'Cancelada',
  NO_SHOW: 'No Asistió',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  ATTENDED: 'bg-blue-100 text-blue-800',
  CANCELED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
};

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orthodontists, setOrthodontists] = useState<Orthodontist[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    date: '',
    duration: 30,
    type: 'INITIAL_CONSULTATION',
    orthodontistId: '',
  });

  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadOrthodontists();
  }, [selectedDate]);

  const loadAppointments = () => {
    axios.get(`/api/appointments?date=${selectedDate}`)
      .then(res => setAppointments(res.data))
      .catch(() => {});
  };

  const loadPatients = () => {
    axios.get('/api/patients')
      .then(res => setPatients(res.data))
      .catch(() => {});
  };

  const loadOrthodontists = () => {
    axios.get('/api/users/dropdown?role=ORTHODONTIST')
      .then(res => setOrthodontists(res.data))
      .catch(() => {
        // Fallback: usar users disponibles
        setOrthodontists([]);
      });
  };

  const handleStatusChange = (id: string, status: string) => {
    axios.patch(`/api/appointments/${id}/status`, { status })
      .then(() => loadAppointments())
      .catch(console.error);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTime = form.date ? new Date(form.date).toISOString() : new Date().toISOString();
    axios.post('/api/appointments', { ...form, date: dateTime })
      .then(() => {
        setShowModal(false);
        setForm({ patientId: '', date: '', duration: 30, type: 'INITIAL_CONSULTATION', orthodontistId: '' });
        loadAppointments();
      })
      .catch(console.error);
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      INITIAL_CONSULTATION: '🩺',
      BRACKETS_PLACEMENT: '🦷',
      ADJUSTMENT: '🔧',
      REMOVAL: '✅',
      ALIGNER_DELIVERY: '📦',
      CONTROL: '📋',
      EMERGENCY: '🚨',
    };
    return icons[type] || '📅';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Citas</h2>
            <p className="text-sm text-gray-500 mt-1">Gestiona las citas de tus pacientes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv('/api/export/appointments', 'citas.csv')}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span> Nueva Cita
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />

        {/* Appointments Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortodoncista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="text-4xl mb-2">📅</div>
                    <p>No hay citas para esta fecha</p>
                  </td>
                </tr>
              ) : (
                appointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(apt.date).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {apt.patient.firstName} {apt.patient.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {apt.orthodontist?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="flex items-center gap-1">
                        {getTypeIcon(apt.type)} {TYPE_LABELS[apt.type] || apt.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {apt.duration} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] || 'bg-gray-100'}`}>
                        {STATUS_LABELS[apt.status] || apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {apt.patient.phone && (
                          <a
                            href={getWhatsAppLink(apt.patient.phone, apt.patient.firstName, apt.date, apt.type)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center gap-1"
                          >
                            WhatsApp
                          </a>
                        )}
                        {apt.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            Confirmar
                          </button>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'ATTENDED')}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            Atender
                          </button>
                        )}
                        {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleStatusChange(apt.id, 'CANCELED')}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            Cancelar
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

      {/* Modal Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Nueva Cita</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select
                  required
                  value={form.patientId}
                  onChange={e => setForm({ ...form, patientId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                <select
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Consulta</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {APPOINTMENT_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ortodoncista</label>
                <select
                  value={form.orthodontistId}
                  onChange={e => setForm({ ...form, orthodontistId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar ortodoncista...</option>
                  {orthodontists.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
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
                  Crear Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
