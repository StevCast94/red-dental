import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// ─── Interfaces ───────────────────────────────────────────────────────
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
  note?: string;
  patient: { firstName: string; lastName: string };
}

interface StatusCount { status: string; _count: number; }
interface TypeCount { type: string; _count: number; }
interface MonthlySum { month: string; total: number; }
interface MethodBreakdown { method: string; total: number; count: number; }
interface DailyClose {
  date: string; total: number; paymentCount: number; attendedAppointments: number;
  payments: Payment[]; byMethod: MethodBreakdown[];
}
interface MonthlyRevenue {
  current: number; previous: number; currentMonth: string; previousMonth: string;
  difference: number; percentChange: number;
}

interface DashboardData {
  clinicName?: string | null;
  stats: {
    totalPatients: number; totalTreatments: number; activeTreatments: number;
    scheduledAppointments: number; todayAppointments: number;
    totalRevenue: number; totalEvolutions: number;
  };
  upcomingAppointments: Appointment[];
  recentPayments: Payment[];
  monthlyPayments: MonthlySum[];
  appointmentsByStatus: StatusCount[];
  treatmentsByType: TypeCount[];
  dailyClose: DailyClose;
  monthlyRevenue: MonthlyRevenue;
}

interface DashboardMetrics {
  attendanceRate: number;
  avgTreatmentDays: number;
  newPatientsThisMonth: number;
  newPatientsThisYear: number;
  avgRevenuePerPatient: number;
  remainingAppointmentsToday: number;
  avgTreatmentDuration: number;
}

// ─── Labels ───────────────────────────────────────────────────────────
const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada', ATTENDED: 'Atendida',
  CANCELED: 'Cancelada', NO_SHOW: 'No Asistió',
};
const statusBadge: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-green-100 text-green-700',
  ATTENDED: 'bg-blue-100 text-blue-700', CANCELED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-600',
};
const statusColors: Record<string, string> = {
  SCHEDULED: '#EAB308', CONFIRMED: '#22C55E', ATTENDED: '#3B82F6',
  CANCELED: '#EF4444', NO_SHOW: '#6B7280',
};
const methodLabels: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', OTHER: 'Otro',
};
const treatmentLabels: Record<string, string> = {
  METAL_BRACES: 'Brackets Metálicos', ESTHETIC_BRACES: 'Brackets Estéticos',
  INVISIBLE_ALIGNERS: 'Alineadores Invisibles', LINGUAL_ORTHODONTICS: 'Ortodoncia Lingual',
  INTERCEPTIVE_ORTHODONTICS: 'Ortodoncia Interceptiva',
};

const chartColors = ['#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

// ─── Helpers ──────────────────────────────────────────────────────────
function formatMoney(n: number) { return '$' + n.toLocaleString('es-EC', { minimumFractionDigits: 0 }); }

function StatCard({ label, value, color, size, sub, icon }: { label: string; value: string | number; color: string; size?: string; sub?: string; icon?: string }) {
  const c: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200', green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200', orange: 'text-orange-600 bg-orange-50 border-orange-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200', indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    red: 'text-red-600 bg-red-50 border-red-200', teal: 'text-teal-600 bg-teal-50 border-teal-200',
    pink: 'text-pink-600 bg-pink-50 border-pink-200', cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  };
  return (
    <div className={`${c[color] || c.blue} border rounded-xl p-4 relative overflow-hidden`}>
      {icon && <span className="absolute right-3 top-3 text-2xl opacity-15">{icon}</span>}
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className={`font-bold mt-1 ${size === 'sm' ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Chart Options ────────────────────────────────────────────────────
const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => formatMoney(ctx.parsed.y as number) } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 }, callback: (v: any) => '$' + v } },
  },
};

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y} cita(s)` } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 }, stepSize: 1 } },
  },
};

const doughnutOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { font: { size: 10 }, boxWidth: 12, padding: 12 } },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${formatMoney(ctx.parsed)}` } },
  },
  cutout: '60%',
};

// ─── Component ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingExport, setLoadingExport] = useState<string | null>(null);

  // EXTERNAL → redirigir
  if (user?.role === 'EXTERNAL') return <Navigate to="/appointments" />;

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).catch(() => {});
    axios.get('/api/reports/metrics').then(r => setMetrics(r.data)).catch(() => {});
  }, []);

  // ── helpers de exportación ──
  const doExport = useCallback(async (endpoint: string, label: string) => {
    setLoadingExport(label);
    try {
      const r = await axios.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      const disp = r.headers['content-disposition'] || '';
      const match = disp.match(/filename="?(.+?)"?$/);
      a.download = match ? match[1] : `export-${label}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error', e);
    }
    setLoadingExport(null);
  }, []);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Métrica: 'Pacientes', Valor: data.stats.totalPatients },
      { Métrica: 'Tratamientos Activos', Valor: data.stats.activeTreatments },
      { Métrica: 'Citas Hoy', Valor: data.stats.todayAppointments },
      { Métrica: 'Citas Pendientes', Valor: data.stats.scheduledAppointments },
      { Métrica: 'Total Tratamientos', Valor: data.stats.totalTreatments },
      { Métrica: 'Evoluciones', Valor: data.stats.totalEvolutions },
      { Métrica: 'Ingresos Históricos', Valor: data.stats.totalRevenue },
      { Métrica: 'Ingresos del Mes', Valor: data.monthlyRevenue.current },
      { Métrica: 'Ingresos Mes Anterior', Valor: data.monthlyRevenue.previous },
      { Métrica: 'Tasa de Asistencia', Valor: metrics ? metrics.attendanceRate + '%' : '-' },
    ]), 'Resumen');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.recentPayments.map(p => ({ Fecha: new Date(p.date).toLocaleDateString(), Paciente: `${p.patient.firstName} ${p.patient.lastName}`, Monto: p.amount, Método: methodLabels[p.method] || p.method }))
    ), 'Pagos Recientes');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.upcomingAppointments.map(a => ({
        Fecha: new Date(a.date).toLocaleString(),
        Paciente: `${a.patient.firstName} ${a.patient.lastName}`,
        Ortodoncista: a.orthodontist.name,
        Estado: statusLabels[a.status] || a.status,
      }))
    ), 'Próximas Citas');

    XLSX.writeFile(wb, `dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [data, metrics]);

  const exportPDF = useCallback(() => {
    if (!data) return;
    const doc = new jsPDF();
    const pgW = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(18);
    doc.text('Dashboard - OrtodonciaPlus', pgW / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, pgW / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(11);
    doc.text('Resumen', 14, y); y += 6;
    autoTable(doc, {
      startY: y, head: [['Métrica', 'Valor']],
      body: [
        ['Pacientes', String(data.stats.totalPatients)],
        ['Tratamientos Activos', String(data.stats.activeTreatments)],
        ['Citas Hoy', String(data.stats.todayAppointments)],
        ['Citas Pendientes', String(data.stats.scheduledAppointments)],
        ['Ingresos Históricos', formatMoney(data.stats.totalRevenue)],
        ['Ingresos del Mes', formatMoney(data.monthlyRevenue.current)],
        ['Vs. Mes Anterior', `${data.monthlyRevenue.difference >= 0 ? '+' : ''}${formatMoney(data.monthlyRevenue.difference)} (${data.monthlyRevenue.percentChange}%)`],
        ['Evoluciones', String(data.stats.totalEvolutions)],
      ],
      styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Cierre diario
    doc.setFontSize(11);
    doc.text('Cierre de Caja', 14, y); y += 6;
    autoTable(doc, {
      startY: y, head: [['Métrica', 'Valor']],
      body: [
        ['Total', formatMoney(data.dailyClose.total)],
        ['Pagos', String(data.dailyClose.paymentCount)],
        ['Citas Atendidas', String(data.dailyClose.attendedAppointments)],
        ...data.dailyClose.byMethod.map(m => [methodLabels[m.method] || m.method, `${formatMoney(m.total)} (${m.count})`]),
      ],
      styles: { fontSize: 9 }, headStyles: { fillColor: [99, 102, 241] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Monthly chart data (table)
    if (data.monthlyPayments.length > 0) {
      doc.setFontSize(11);
      doc.text('Ingresos Mensuales', 14, y); y += 6;
      autoTable(doc, {
        startY: y, head: [['Mes', 'Total']],
        body: data.monthlyPayments.slice(0, 12).reverse().map(m => {
          const [yy, mm] = m.month.split('-');
          const monthName = new Date(+yy, +mm - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
          return [monthName, formatMoney(m.total)];
        }),
        styles: { fontSize: 9 }, headStyles: { fillColor: [16, 185, 129] },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Upcoming appointments
    if (data.upcomingAppointments.length > 0) {
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(11);
      doc.text('Próximas Citas (7 días)', 14, y); y += 6;
      autoTable(doc, {
        startY: y, head: [['Fecha', 'Paciente', 'Ortodoncista', 'Estado']],
        body: data.upcomingAppointments.map(a => [
          new Date(a.date).toLocaleString('es-EC', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          `${a.patient.firstName} ${a.patient.lastName}`,
          a.orthodontist.name,
          statusLabels[a.status] || a.status,
        ]),
        styles: { fontSize: 8 }, headStyles: { fillColor: [139, 92, 246] },
      });
    }

    doc.save(`dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [data]);

  if (!data) return (
    <Layout>
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 mt-3 text-sm">Cargando dashboard...</p>
      </div>
    </Layout>
  );

  const { stats, upcomingAppointments, recentPayments, appointmentsByStatus, treatmentsByType, dailyClose, monthlyRevenue } = data;

  // ─── Chart data ──────────────────────────────────────────────────
  const lineChartData = {
    labels: data.monthlyPayments.slice(0, 12).reverse().map((m: any) => {
      const [y, mm] = m.month.split('-');
      const d = new Date(+y, +mm - 1);
      return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Ingresos',
      data: data.monthlyPayments.slice(0, 12).reverse().map((m: any) => m.total),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5,
    }],
  };

  const barChartData = {
    labels: appointmentsByStatus.map(s => statusLabels[s.status] || s.status),
    datasets: [{
      label: 'Citas',
      data: appointmentsByStatus.map(s => s._count),
      backgroundColor: appointmentsByStatus.map(s => statusColors[s.status] || '#6B7280'),
      borderRadius: 4,
    }],
  };

  const doughnutData = {
    labels: dailyClose.byMethod.map(m => methodLabels[m.method] || m.method),
    datasets: [{
      data: dailyClose.byMethod.map(m => m.total),
      backgroundColor: chartColors.slice(0, dailyClose.byMethod.length),
      borderWidth: 0,
    }],
  };

  const closeDate = dailyClose.date
    ? new Date(dailyClose.date + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const revenueDirection = monthlyRevenue.difference >= 0 ? 'text-green-600' : 'text-red-600';
  const revenueArrow = monthlyRevenue.difference >= 0 ? '↑' : '↓';

  const attendedPct = dailyClose.paymentCount > 0
    ? Math.round((dailyClose.attendedAppointments / Math.max(dailyClose.paymentCount, dailyClose.attendedAppointments)) * 100)
    : 0;

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {data.clinicName ? `${data.clinicName} · ` : ''}Resumen general de la clínica
          </p>
        </div>

        {/* Botones de exportación */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => doExport('/api/export/patients', 'pacientes')}
            disabled={loadingExport === 'pacientes'}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-1 disabled:opacity-50"
          >
            {loadingExport === 'pacientes' ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : '📄'}
            Pacientes CSV
          </button>
          <button
            onClick={() => doExport('/api/export/appointments', 'citas')}
            disabled={loadingExport === 'citas'}
            className="text-xs px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
          >
            {loadingExport === 'citas' ? <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin inline-block mr-1" /> : '📅'}
            Citas CSV
          </button>
          <button
            onClick={() => doExport('/api/export/payments', 'pagos')}
            disabled={loadingExport === 'pagos'}
            className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
          >
            {loadingExport === 'pagos' ? <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block mr-1" /> : '💰'}
            Pagos CSV
          </button>
          <button
            onClick={exportExcel}
            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
          >
            📊 Excel
          </button>
          <button
            onClick={exportPDF}
            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition"
          >
            📕 PDF
          </button>
        </div>
      </div>

      {/* ── Métricas avanzadas ── */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Tasa Asistencia" value={`${metrics.attendanceRate}%`} color="green" size="sm" icon="✅" />
          <StatCard label="Duración Prom. Trat." value={`${metrics.avgTreatmentDays} días`} color="blue" size="sm" icon="⏱️" />
          <StatCard label="Nuevos Pac. (mes)" value={metrics.newPatientsThisMonth} color="purple" size="sm" icon="🆕" />
          <StatCard label="Nuevos Pac. (año)" value={metrics.newPatientsThisYear} color="indigo" size="sm" icon="📈" />
          <StatCard label="Prom. Ingreso/Pac" value={formatMoney(metrics.avgRevenuePerPatient)} color="teal" size="sm" icon="💵" />
          <StatCard label="Citas Restantes Hoy" value={metrics.remainingAppointmentsToday} color="orange" size="sm" icon="⏳" />
        </div>
      )}

      {/* ── Ingresos del Mes + Cierre de Caja ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Ingresos del mes */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">Ingresos del Mes</h3>
            <span className="text-white/80 text-xs">{monthlyRevenue.currentMonth}</span>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-green-600">{formatMoney(monthlyRevenue.current)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-400">Mes anterior</p>
                <p className="text-sm font-semibold mt-0.5">{formatMoney(monthlyRevenue.previous)}</p>
                <p className="text-[10px] text-gray-400">{monthlyRevenue.previousMonth}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Diferencia</p>
                <p className={`text-sm font-semibold mt-0.5 ${revenueDirection}`}>
                  {revenueArrow} {formatMoney(Math.abs(monthlyRevenue.difference))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cambio %</p>
                <p className={`text-sm font-semibold mt-0.5 ${revenueDirection}`}>
                  {monthlyRevenue.percentChange >= 0 ? '+' : ''}{monthlyRevenue.percentChange}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cierre de caja */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">Cierre de Caja Diario</h3>
            <span className="text-white/80 text-xs capitalize">{closeDate}</span>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-blue-600">{formatMoney(dailyClose.total)}</span>
              <span className="text-sm text-gray-400">{dailyClose.paymentCount} pago(s)</span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Actividad del día</span>
                <span>{dailyClose.attendedAppointments} atendidas / {dailyClose.paymentCount} pagos</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(attendedPct, 100)}%` }} />
              </div>
            </div>

            {dailyClose.byMethod && dailyClose.byMethod.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                {dailyClose.byMethod.map(m => (
                  <div key={m.method} className="flex justify-between text-sm">
                    <span className="text-gray-600">{methodLabels[m.method] || m.method}</span>
                    <span className="font-medium text-gray-800">{formatMoney(m.total)} ({m.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pacientes" value={stats.totalPatients} color="blue" icon="👤" />
        <StatCard label="Tratamientos Activos" value={stats.activeTreatments} color="purple" icon="🦷" />
        <StatCard label="Citas Hoy" value={stats.todayAppointments} color="green" icon="📅" />
        <StatCard label="Citas Pendientes" value={stats.scheduledAppointments} color="orange" icon="⏳" />
        <StatCard label="Total Tratamientos" value={stats.totalTreatments} color="gray" icon="📋" />
        <StatCard label="Evoluciones" value={stats.totalEvolutions} color="indigo" icon="📝" />
        <StatCard label="Ingresos Históricos" value={formatMoney(stats.totalRevenue)} color="teal" size="sm" icon="🏦" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Line Chart - Ingresos mensuales */}
        <div className="bg-white rounded-xl shadow p-5 lg:col-span-1">
          <h3 className="font-semibold text-gray-700 mb-3">Ingresos Mensuales</h3>
          <div className="h-56">
            {data.monthlyPayments.length > 0
              ? <Line data={lineChartData} options={lineOptions} />
              : <p className="text-sm text-gray-400 text-center pt-16">Sin datos de ingresos</p>
            }
          </div>
        </div>

        {/* Bar Chart - Citas por estado */}
        <div className="bg-white rounded-xl shadow p-5 lg:col-span-1">
          <h3 className="font-semibold text-gray-700 mb-3">Citas por Estado</h3>
          <div className="h-56">
            {appointmentsByStatus.length > 0
              ? <Bar data={barChartData} options={barOptions} />
              : <p className="text-sm text-gray-400 text-center pt-16">Sin datos de citas</p>
            }
          </div>
        </div>

        {/* Doughnut - Métodos de pago hoy */}
        <div className="bg-white rounded-xl shadow p-5 lg:col-span-1">
          <h3 className="font-semibold text-gray-700 mb-3">Métodos de Pago (Hoy)</h3>
          <div className="h-56 flex items-center justify-center">
            {dailyClose.byMethod.length > 0
              ? <Doughnut data={doughnutData} options={doughnutOptions} />
              : <p className="text-sm text-gray-400">Sin pagos hoy</p>
            }
          </div>
        </div>
      </div>

      {/* ── Status Bars / Treatmens by Type ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Distribución de Citas</h3>
          <div className="space-y-3">
            {appointmentsByStatus.map(s => {
              const total = appointmentsByStatus.reduce((a, b) => a + b._count, 0);
              const pct = total ? Math.round((s._count / total) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{statusLabels[s.status] || s.status}</span>
                    <span className="font-medium">{s._count} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: statusColors[s.status] || '#3B82F6' }}
                    />
                  </div>
                </div>
              );
            })}
            {appointmentsByStatus.length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Tratamientos Activos por Tipo</h3>
          <div className="space-y-2">
            {treatmentsByType.map((t, i) => (
              <div key={t.type} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                  <span className="text-sm text-gray-600">{treatmentLabels[t.type] || t.type}</span>
                </div>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{t._count}</span>
              </div>
            ))}
            {treatmentsByType.length === 0 && <p className="text-sm text-gray-400">Sin tratamientos activos</p>}
          </div>
        </div>
      </div>

      {/* ── Tables Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-5 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">Próximas Citas (7 días)</h3>
            <span className="text-white/80 text-xs">{upcomingAppointments.length} cita(s)</span>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {upcomingAppointments.map(a => (
              <div key={a.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.patient.firstName} {a.patient.lastName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">{a.orthodontist.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusBadge[a.status] || 'bg-gray-100'}`}>
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
            ))}
            {upcomingAppointments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay citas próximas</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">Pagos Recientes</h3>
            <span className="text-white/80 text-xs">{recentPayments.length} pago(s)</span>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {recentPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.patient.firstName} {p.patient.lastName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className="font-semibold text-green-600">${p.amount.toFixed(2)}</span>
              </div>
            ))}
            {recentPayments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay pagos recientes</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
