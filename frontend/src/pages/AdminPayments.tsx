import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface PaymentReceipt {
  id: string;
  clinicId: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  receiptUrl: string | null;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  clinic: { name: string };
}

interface Clinic {
  id: string;
  name: string;
}

const methodLabels: Record<string, string> = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  PAYPAL: 'PayPal',
  STRIPE: 'Stripe',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    clinicId: '', amount: 30, method: 'TRANSFER',
    reference: '', notes: '', status: 'PENDING',
    periodStart: '', periodEnd: '',
  });

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        axios.get('/api/admin/payments'),
        axios.get('/api/admin/clinics'),
      ]);
      setPayments(pRes.data);
      setClinics(cRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createPayment = async () => {
    if (!form.clinicId || !form.amount) return alert('Clínica y monto requeridos');
    try {
      await axios.post('/api/admin/payments', form);
      setShowNew(false);
      setForm({ clinicId: '', amount: 30, method: 'TRANSFER', reference: '', notes: '', status: 'PENDING', periodStart: '', periodEnd: '' });
      load();
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await axios.put(`/api/admin/payments/${id}/status`, { status });
      load();
    } catch (e: any) {
      alert('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const totalApproved = payments.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);

  if (loading) return <AdminLayout><div className="text-center py-12 text-gray-400">Cargando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">💳 Pagos y Comprobantes</h1>
            <p className="text-sm text-gray-500">Registro de pagos realizados por las clínicas</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <span>+</span> Registrar Pago
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pagos Registrados</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Aprobados</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${totalApproved.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">${totalPending.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Clínica</th>
              <th className="text-right px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-left px-4 py-3">Referencia</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="text-center px-4 py-3">Periodo</th>
              <th className="text-right px-4 py-3">Fecha</th>
              <th className="text-center px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.clinic.name}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">${p.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-600">{methodLabels[p.method] || p.method}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.reference || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status] || 'bg-gray-100'}`}>
                    {statusLabels[p.status] || p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {p.periodStart ? `${new Date(p.periodStart).toLocaleDateString('es-EC')}` : '—'}
                  {p.periodEnd ? ` - ${new Date(p.periodEnd).toLocaleDateString('es-EC')}` : ''}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString('es-EC')}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.status === 'PENDING' && (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => updateStatus(p.id, 'APPROVED')}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Aprobar
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => updateStatus(p.id, 'REJECTED')}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                  {p.status !== 'PENDING' && (
                    <span className="text-xs text-gray-400">
                      {p.status === 'APPROVED' ? '✅' : '❌'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">No hay pagos registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Pago */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar Pago / Comprobante</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Clínica *</label>
                <select
                  value={form.clinicId}
                  onChange={e => setForm({...form, clinicId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar clínica...</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monto ($) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Método de pago</label>
                  <select
                    value={form.method}
                    onChange={e => setForm({...form, method: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="STRIPE">Stripe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referencia / N° de comprobante</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={e => setForm({...form, reference: e.target.value})}
                  placeholder="Ej: TRANS-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Periodo inicio</label>
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={e => setForm({...form, periodStart: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Periodo fin</label>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={e => setForm({...form, periodEnd: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Comentarios adicionales..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Estado inicial</label>
                <select
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="APPROVED">Aprobado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={createPayment}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
