import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';

interface Clinic {
  id: string;
  name: string;
  active: boolean;
  subscription: {
    id: string;
    plan: string;
    amount: number;
    startDate: string;
    nextBilling: string;
    active: boolean;
  } | null;
}

interface Payment {
  id: string;
  clinicId: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  clinic: { name: string };
}

const planLabels: Record<string, string> = { MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', YEARLY: 'Anual' };
const methodLabels: Record<string, string> = { TRANSFER: 'Transferencia', CASH: 'Efectivo', CARD: 'Tarjeta', PAYPAL: 'PayPal', STRIPE: 'Stripe' };
const statusColors: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };
const statusLabels: Record<string, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado' };

export default function AdminSubscriptions() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'subscriptions' | 'payments'>('subscriptions');

  // Estados para editar suscripción
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({ plan: 'MONTHLY', amount: 30, nextBilling: '', active: true });

  // Estados para nuevo pago
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    clinicId: '', amount: 30, method: 'TRANSFER', reference: '', notes: '', status: 'PENDING', periodStart: '', periodEnd: '',
  });

  const load = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        axios.get('/api/admin/clinics'),
        axios.get('/api/admin/payments'),
      ]);
      setClinics(cRes.data);
      setPayments(pRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSubscription = async (clinicId: string) => {
    await axios.put(`/api/admin/clinics/${clinicId}/subscription`, subForm);
    setEditingSub(null);
    load();
  };

  const startEditSub = (clinic: Clinic) => {
    setSubForm({
      plan: clinic.subscription?.plan || 'MONTHLY',
      amount: clinic.subscription?.amount || 30,
      nextBilling: clinic.subscription?.nextBilling?.split('T')[0] || '',
      active: clinic.subscription?.active ?? true,
    });
    setEditingSub(clinic.id);
  };

  const createPayment = async () => {
    if (!paymentForm.clinicId) return alert('Selecciona una clínica');
    try {
      await axios.post('/api/admin/payments', paymentForm);
      setShowNewPayment(false);
      setPaymentForm({ clinicId: '', amount: 30, method: 'TRANSFER', reference: '', notes: '', status: 'PENDING', periodStart: '', periodEnd: '' });
      load();
    } catch (e: any) { alert('Error: ' + (e.response?.data?.error || e.message)); }
  };

  const updatePaymentStatus = async (id: string, status: string) => {
    try {
      await axios.put(`/api/admin/payments/${id}/status`, { status });
      load();
    } catch (e: any) { alert('Error: ' + (e.response?.data?.error || e.message)); }
  };

  const activeSubs = clinics.filter(c => c.subscription?.active);
  const totalMonthly = activeSubs.reduce((s, c) => s + (c.subscription?.amount || 0), 0);
  const overdue = clinics.filter(c => c.subscription && new Date(c.subscription.nextBilling) < new Date() && c.active);
  const approvedTotal = payments.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);

  if (loading) return <AdminLayout><div className="text-center py-12 text-gray-400">Cargando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">💰 Suscripciones y Pagos</h1>
            <p className="text-sm text-gray-500">Planes, montos y comprobantes de pago de las clínicas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewPayment(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              + Registrar Pago
            </button>
          </div>
        </div>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ingresos Mensuales</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${totalMonthly.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{activeSubs.length} suscripciones activas</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pagado (Aprobado)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">${approvedTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">en {payments.filter(p => p.status === 'APPROVED').length} comprobantes</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pendiente de pago</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">${pendingTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.filter(p => p.status === 'PENDING').length} por revisar</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Vencidos</p>
          <p className={`text-2xl font-bold mt-1 ${overdue.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdue.length}</p>
          <p className="text-xs text-gray-400 mt-1">{overdue.length > 0 ? '⚠️ Requieren atención' : 'Al día'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('subscriptions')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'subscriptions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Suscripciones ({clinics.length})
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'payments' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial de Pagos ({payments.length})
        </button>
      </div>

      {/* Tab: Suscripciones */}
      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Clínica</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Plan</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-center px-4 py-3">Próximo Cobro</th>
                <th className="text-right px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinics.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.active ? 'text-gray-400' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.subscription?.active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Activa</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Inactiva</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.subscription ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                        {planLabels[c.subscription.plan] || c.subscription.plan}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {c.subscription ? `$${c.subscription.amount.toFixed(2)}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-center text-xs ${
                    c.subscription && new Date(c.subscription.nextBilling) < new Date() ? 'text-red-600 font-bold' : 'text-gray-500'
                  }`}>
                    {c.subscription?.nextBilling
                      ? new Date(c.subscription.nextBilling).toLocaleDateString('es-EC')
                      : '—'}
                    {c.subscription && new Date(c.subscription.nextBilling) < new Date() && c.active && (
                      <span className="block text-xs text-red-500">⚠️ Vencido</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEditSub(c)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'payments' && (
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
                  <td className="px-4 py-3 text-right font-mono">${p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{methodLabels[p.method] || p.method}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status] || ''}`}>
                      {statusLabels[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {p.periodStart ? new Date(p.periodStart).toLocaleDateString('es-EC') : '—'}
                    {p.periodEnd ? ' → ' + new Date(p.periodEnd).toLocaleDateString('es-EC') : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('es-EC')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.status === 'PENDING' ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => updatePaymentStatus(p.id, 'APPROVED')} className="text-xs text-green-600 hover:text-green-800 font-medium">Aprobar</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => updatePaymentStatus(p.id, 'REJECTED')} className="text-xs text-red-600 hover:text-red-800 font-medium">Rechazar</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{p.status === 'APPROVED' ? '✅' : '❌'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No hay pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Editar Suscripción */}
      {editingSub && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Editar Suscripción</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plan</label>
                <select value={subForm.plan} onChange={e => setSubForm({...subForm, plan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="MONTHLY">Mensual</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monto ($)</label>
                <input type="number" value={subForm.amount} onChange={e => setSubForm({...subForm, amount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Próximo cobro</label>
                <input type="date" value={subForm.nextBilling} onChange={e => setSubForm({...subForm, nextBilling: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Suscripción activa</label>
                <button onClick={() => setSubForm({...subForm, active: !subForm.active})} className={`relative w-10 h-5 rounded-full transition-colors ${subForm.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${subForm.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setEditingSub(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Cancelar</button>
              <button onClick={() => saveSubscription(editingSub)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Pago */}
      {showNewPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar Pago / Comprobante</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Clínica *</label>
                <select value={paymentForm.clinicId} onChange={e => setPaymentForm({...paymentForm, clinicId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar clínica...</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monto ($) *</label>
                  <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} step={0.01} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Método</label>
                  <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CARD">Tarjeta</option>
                    <option value="PAYPAL">PayPal</option>
                    <option value="STRIPE">Stripe</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referencia / N° comprobante</label>
                <input type="text" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Ej: TRANS-001" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Periodo inicio</label>
                  <input type="date" value={paymentForm.periodStart} onChange={e => setPaymentForm({...paymentForm, periodStart: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Periodo fin</label>
                  <input type="date" value={paymentForm.periodEnd} onChange={e => setPaymentForm({...paymentForm, periodEnd: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas</label>
                <textarea value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Comentarios..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Estado inicial</label>
                <select value={paymentForm.status} onChange={e => setPaymentForm({...paymentForm, status: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="PENDING">Pendiente</option>
                  <option value="APPROVED">Aprobado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowNewPayment(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">Cancelar</button>
              <button onClick={createPayment} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Registrar Pago</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
