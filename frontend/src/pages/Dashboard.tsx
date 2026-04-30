import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

interface Appointment {
  id: string;
  date: string;
  type: string;
  status: string;
  patient: { firstName: string; lastName: string };
  orthodontist: { name: string };
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  patient: { firstName: string; lastName: string };
}

interface StatusCount { status: string; _count: number; }
interface TypeCount { type: string; _count: number; }
interface MonthlySum { month: string; total: number; }

interface MethodBreakdown {
  method: string;
  total: number;
  count: number;
}

interface DailyClose {
  date: string;
  total: number;
  paymentCount: number;
  attendedAppointments: number;
  payments: Payment[];
  byMethod: MethodBreakdown[];
}

interface MonthlyRevenue {
  current: number;
  previous: number;
  currentMonth: string;
  previousMonth: string;
  difference: number;
  percentChange: number;
}

interface DashboardData {
  stats: {
    totalPatients: number;
    totalTreatments: number;
    activeTreatments: number;
    scheduledAppointments: number;
    todayAppointments: number;
    totalRevenue: number;
    totalEvolutions: number;
  };
  upcomingAppointments: Appointment[];
  recentPayments: Payment[];
  monthlyPayments: MonthlySum[];
  appointmentsByStatus: StatusCount[];
  treatmentsByType: TypeCount[];
  dailyClose: DailyClose;
  monthlyRevenue: MonthlyRevenue;
}

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  ATTENDED: 'Atendida',
  CANCELED: 'Cancelada',
  NO_SHOW: 'No Asistió',
};

const statusBadge: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  ATTENDED: 'bg-blue-100 text-blue-700',
  CANCELED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-500',
  CONFIRMED: 'bg-green-500',
  ATTENDED: 'bg-blue-500',
  CANCELED: 'bg-red-500',
  NO_SHOW: 'bg-gray-500',
};

const methodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

const treatmentLabels: Record<string, string> = {
  METAL_BRACES: 'Brackets Metálicos',
  ESTHETIC_BRACES: 'Brackets Estéticos',
  INVISIBLE_ALIGNERS: 'Alineadores Invisibles',
  LINGUAL_ORTHODONTICS: 'Ortodoncia Lingual',
  INTERCEPTIVE_ORTHODONTICS: 'Ortodoncia Interceptiva',
};

function StatCard({ label, value, color, size, sub }: { label: string; value: string | number; color: string; size?: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    teal: 'text-teal-600 bg-teal-50 border-teal-200',
  };
  return (
    <div className={`${colorMap[color] || colorMap.blue} border rounded-xl p-4`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className={`font-bold mt-1 ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  // EXTERNAL redirigido a citas
  if (user?.role === 'EXTERNAL') {
    return <Navigate to="/appointments" />;
  }

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return (
    <Layout>
      <div className="text-center py-12 text-gray-400">Cargando...</div>
    </Layout>
  );

  const { stats, upcomingAppointments, recentPayments, appointmentsByStatus, treatmentsByType, dailyClose, monthlyRevenue } = data;

  // Formatear fecha del cierre
  const closeDate = dailyClose.date
    ? new Date(dailyClose.date + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen general de la clínica</p>
      </div>

      {/* Ingresos del mes vs anterior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3">
            <h3 className="text-white font-semibold text-sm">Ingresos del Mes</h3>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">${monthlyRevenue.current.toLocaleString()}</span>
              <span className="text-xs text-gray-400">{monthlyRevenue.currentMonth}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-xs text-gray-500">Mes anterior ({monthlyRevenue.previousMonth})</p>
                <p className="text-lg font-semibold text-gray-700">${monthlyRevenue.previous.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Diferencia</p>
                <p className={`text-lg font-semibold ${monthlyRevenue.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyRevenue.difference >= 0 ? '+' : ''}{monthlyRevenue.difference.toLocaleString()} ({monthlyRevenue.percentChange > 0 ? '+' : ''}{monthlyRevenue.percentChange}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cierre de caja diario */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3">
            <h3 className="text-white font-semibold text-sm">Cierre de Caja Diario</h3>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-400 capitalize mb-3">{closeDate}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">${dailyClose.total.toFixed(2)}</span>
              <span className="text-xs text-gray-400">{dailyClose.paymentCount} pago(s)</span>
            </div>

            {/* Métodos de pago */}
            {dailyClose.byMethod && dailyClose.byMethod.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                {dailyClose.byMethod.map((m) => (
                  <div key={m.method} className="flex justify-between text-sm">
                    <span className="text-gray-600">{methodLabels[m.method] || m.method}</span>
                    <span className="font-medium text-gray-800">${m.total.toFixed(2)} ({m.count})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-2">
              <span>Citas atendidas: {dailyClose.attendedAppointments}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pacientes" value={stats.totalPatients} color="blue" />
        <StatCard label="Tratamientos Activos" value={stats.activeTreatments} color="purple" />
        <StatCard label="Citas Hoy" value={stats.todayAppointments} color="green" />
        <StatCard label="Citas Pendientes" value={stats.scheduledAppointments} color="orange" />
        <StatCard label="Total Tratamientos" value={stats.totalTreatments} color="gray" />
        <StatCard label="Evoluciones" value={stats.totalEvolutions} color="indigo" />
        <StatCard label="Ingresos Históricos" value={`$${stats.totalRevenue.toLocaleString()}`} color="teal" size="sm" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Citas por estado */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Citas por Estado</h3>
          <div className="space-y-2">
            {appointmentsByStatus.map(s => {
              const total = appointmentsByStatus.reduce((a, b) => a + b._count, 0);
              const pct = total ? Math.round((s._count / total) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{statusLabels[s.status] || s.status}</span>
                    <span className="font-medium">{s._count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${statusColors[s.status] || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tratamientos activos por tipo */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Tratamientos Activos por Tipo</h3>
          <div className="space-y-2">
            {treatmentsByType.map(t => (
              <div key={t.type} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{treatmentLabels[t.type] || t.type}</span>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{t._count}</span>
              </div>
            ))}
            {treatmentsByType.length === 0 && <p className="text-sm text-gray-400">Sin tratamientos activos</p>}
          </div>
        </div>
      </div>

      {/* Próximas citas y pagos recientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Próximas Citas (7 días)</h3>
          <div className="space-y-3">
            {upcomingAppointments.map(a => (
              <div key={a.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-sm">{a.patient.firstName} {a.patient.lastName}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">{a.orthodontist.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[a.status] || 'bg-gray-100'}`}>
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
            ))}
            {upcomingAppointments.length === 0 && <p className="text-sm text-gray-400">No hay citas próximas</p>}
          </div>
        </div>

        {/* Últimos pagos */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Pagos Recientes</h3>
          <div className="space-y-3">
            {recentPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-sm">{p.patient.firstName} {p.patient.lastName}</p>
                  <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-green-600">${p.amount.toFixed(2)}</span>
              </div>
            ))}
            {recentPayments.length === 0 && <p className="text-sm text-gray-400">No hay pagos recientes</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
