import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

function DateSelector({ selectedDate, onSelect }: {
  selectedDate: string;
  onSelect: (d: string) => void;
}) {
  const [startOffset, setStartOffset] = useState(0);
  const [countMap, setCountMap] = useState<Record<string, number>>({});

  // Generar 12 días desde startOffset (usando fecha local, no UTC)
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayLocal = new Date(todayStr + 'T12:00:00');
  const days = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(todayLocal);
    d.setDate(todayLocal.getDate() + startOffset + i);
    return d;
  });

  // Cargar conteo de citas para el rango visible
  useEffect(() => {
    const fmt = (d: Date) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const from = fmt(days[0]);
    const to = fmt(days[days.length - 1]);
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
          const fmt = (dd: Date) => dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0');
          const dateStr = fmt(d);
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
  // El teléfono ya viene con código de país desde la DB (ej: 593999999999)
  const cleaned = phone.replace(/[^\d]/g, '');

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

  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
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

function TimeSlotPicker({ selectedDate, selectedTime, duration, onSelect }: {
  selectedDate: string;
  selectedTime: string;
  duration: number;
  onSelect: (time: string) => void;
}) {
  const [occupiedSlots, setOccupiedSlots] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar slots ocupados cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    axios.get(`/api/appointments/slots?date=${selectedDate}`)
      .then(res => setOccupiedSlots(res.data || []))
      .catch(() => setOccupiedSlots([]))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const isOccupied = (hour: number, min: number): boolean => {
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    return occupiedSlots.some(slot => {
      // Check if this slot starts within an occupied range
      const [sH, sM] = slot.start.split(':').map(Number);
      const [eH, eM] = slot.end.split(':').map(Number);
      const slotStart = sH * 60 + sM;
      const slotEnd = eH * 60 + eM;
      const thisSlot = hour * 60 + min;
      return thisSlot >= slotStart && thisSlot < slotEnd;
    });
  };

  // Generar slots de 30 min de 7:00 a 18:30
  const rows: { label: string; hour: number; min: number }[] = [];
  for (let h = 7; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      rows.push({ label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, hour: h, min: m });
    }
  }

  if (!selectedDate) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-sm text-gray-400">Selecciona una fecha primero</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-sm text-gray-400">Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.map(({ label, hour, min }) => {
        const occ = isOccupied(hour, min);
        const sel = selectedTime === label;
        return (
          <button
            key={label}
            type="button"
            disabled={occ}
            onClick={() => onSelect(label)}
            className={`w-full h-10 rounded-lg text-sm font-medium transition-all border ${
              sel
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : occ
                  ? 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed line-through'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
            title={occ ? 'Horario ocupado' : label}
          >
            {label}
          </button>
        );
      })}
      {occupiedSlots.length > 0 && (
        <div className="col-span-4 mt-1">
          <p className="text-xs text-red-400">
            {occupiedSlots.length} horario{occupiedSlots.length !== 1 ? 's' : ''} ocupado{occupiedSlots.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orthodontists, setOrthodontists] = useState<Orthodontist[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    patientId: '',
    date: '',
    duration: 30,
    type: 'INITIAL_CONSULTATION',
    orthodontistId: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadOrthodontists();
  }, [selectedDate, page]);

  const loadAppointments = () => {
    axios.get(`/api/appointments?date=${selectedDate}&page=${page}`)
      .then(res => {
        const { data, totalPages: tp } = res.data ?? { data: res.data, totalPages: 1 };
        setAppointments(data ?? res.data);
        setTotalPages(tp ?? 1);
      })
      .catch(() => {});
  };

  const loadPatients = () => {
    axios.get('/api/patients')
      .then(res => setPatients(res.data?.data ?? res.data))
      .catch(() => {});
  };

  const loadOrthodontists = () => {
    axios.get('/api/users/dropdown?role=ORTHODONTIST')
      .then(res => setOrthodontists(res.data?.data ?? res.data))
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

  const openCreateModal = () => {
    setEditingAppointment(null);
    // Precargar exactamente la fecha que el usuario tiene seleccionada en las tarjetas
    const dateOnly = selectedDate || new Date().toLocaleDateString('en-CA');
    setForm({ patientId: '', date: dateOnly + 'T08:00', duration: 30, type: 'INITIAL_CONSULTATION', orthodontistId: '' });
    setShowModal(true);
  };

  const openEditModal = (apt: Appointment) => {
    setEditingAppointment(apt);
    // apt.date viene como ISO UTC del backend, convertir a hora local Ecuador
    const aptDate = new Date(apt.date);
    const y = aptDate.getFullYear();
    const m = String(aptDate.getMonth() + 1).padStart(2, '0');
    const d = String(aptDate.getDate()).padStart(2, '0');
    const hh = String(aptDate.getHours()).padStart(2, '0');
    const mm = String(aptDate.getMinutes()).padStart(2, '0');
    const localDateStr = `${y}-${m}-${d}T${hh}:${mm}`;

    setForm({
      patientId: apt.patient.id,
      date: localDateStr,
      duration: apt.duration,
      type: apt.type,
      orthodontistId: apt.orthodontist?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmitAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const localDate = form.date;
    const dateStr = localDate.length === 10 ? localDate + 'T08:00:00' : localDate + ':00';

    // Construir fecha interpretando dateStr como hora local de Ecuador (UTC-5)
    // En JavaScript "2026-05-12T14:00" se parsea como UTC si se pasa a new Date()
    // Extraemos partes manualmente para evitar ambigüedad
    const [dPart, tPart] = dateStr.split('T');
    const [y, m, day] = dPart.split('-').map(Number);
    const [hh, mm] = tPart.split(':').map(Number);
    // Creamos fecha UTC equivalente a la hora local de Ecuador (UTC-5 = +5h offset)
    // Si son las 14:00 en Ecuador, en UTC son las 19:00 del mismo día
    const utcDate = new Date(Date.UTC(y, m - 1, day, hh + 5, mm, 0));

    if (editingAppointment) {
      axios.put(`/api/appointments/${editingAppointment.id}`, { ...form, date: utcDate.toISOString() })
        .then(() => {
          setShowModal(false);
          setEditingAppointment(null);
          loadAppointments();
        })
        .catch(console.error);
    } else {
      axios.post('/api/appointments', { ...form, date: utcDate.toISOString() })
        .then(() => {
          setShowModal(false);
          loadAppointments();
        })
        .catch(console.error);
    }
  };

  const handleDeleteAppointment = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;
    axios.delete(`/api/appointments/${id}`)
      .then(() => loadAppointments())
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

  const formatDate = (d: string) => {
    // toLocaleTimeString con timeZone explícita para Ecuador
    return new Date(d).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' });
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
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>+</span> Nueva Cita
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />

        {/* Table view (desktop) */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortodoncista</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
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
                  <tr key={apt.id} className="hidden md:table-row hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(apt.date)}
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
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(apt)}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                        {apt.patient.phone && (
                          <a
                            href={getWhatsAppLink(apt.patient.phone, apt.patient.firstName, apt.date, apt.type)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            title="WhatsApp"
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

          {/* Mobile cards */}
          {appointments.length === 0 ? null : (
            <div className="block md:hidden p-4 space-y-3">
              {appointments.map(apt => (
                <div key={apt.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{apt.patient.firstName} {apt.patient.lastName}</p>
                      <p className="text-sm text-gray-500">{TYPE_LABELS[apt.type] || apt.type}</p>
                      <p className="text-xs text-gray-400">{new Date(apt.date).toLocaleString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-gray-400">{apt.orthodontist?.name ? `Dr. ${apt.orthodontist.name}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[apt.status]}`}>
                        {STATUS_LABELS[apt.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t flex-wrap">
                    <button
                      onClick={() => openEditModal(apt)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      title="Editar"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeleteAppointment(apt.id)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                      title="Eliminar"
                    >
                      🗑️ Eliminar
                    </button>
                    {apt.patient.phone && (
                      <a
                        href={getWhatsAppLink(apt.patient.phone, apt.patient.firstName, apt.date, apt.type)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
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

      {/* Modal Nueva/Editar Cita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmitAppointment} className="space-y-4">
              {/* Paciente */}
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

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Fecha</label>
                <input
                  type="date"
                  required
                  value={form.date?.split('T')[0] || selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => {
                    const newDate = e.target.value;
                    const currentTime = form.date?.split('T')[1] || '08:00';
                    setForm({ ...form, date: newDate + 'T' + currentTime });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Horarios como tarjetitas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horario Disponible</label>
                <TimeSlotPicker
                  selectedDate={form.date?.split('T')[0] || ''}
                  selectedTime={form.date?.split('T')[1] || ''}
                  duration={form.duration}
                  onSelect={(time) => setForm({ ...form, date: (form.date?.split('T')[0] || '') + 'T' + time })}
                />
              </div>

              {/* Duración */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setForm({ ...form, duration: mins })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                        form.duration === mins
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Consulta</label>
                <div className="grid grid-cols-2 gap-2">
                  {APPOINTMENT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                        form.type === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ortodoncista */}
              {orthodontists.length > 1 && (
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
              )}

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
                  {editingAppointment ? 'Guardar Cambios' : 'Crear Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
