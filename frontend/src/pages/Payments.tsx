import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  note: string | null;
  patient: { id: string; firstName: string; lastName: string };
  treatment: { id: string; type: string };
  appointment: { id: string; date: string } | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Treatment {
  id: string;
  type: string;
  patientId: string;
  patient: { firstName: string; lastName: string };
}

const methodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};

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

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({
    amount: '',
    method: 'CASH',
    date: new Date().toISOString().split('T')[0],
    note: '',
    patientId: '',
    treatmentId: '',
    appointmentId: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPayments();
    axios.get('/api/patients').then(r => setPatients(r.data?.data ?? r.data)).catch(() => {});
    axios.get('/api/treatments?active=true').then(r => setTreatments(r.data?.data ?? r.data)).catch(() => {});
  }, [page]);

  const loadPayments = () => {
    axios.get(`/api/payments?page=${page}`).then(r => {
      const { data, totalPages: tp } = r.data ?? { data: r.data, totalPages: 1 };
      setPayments(data ?? r.data);
      setTotalPages(tp ?? 1);
    }).catch(() => {});
  };

  const openNew = () => {
    setEditingPayment(null);
    setForm({ amount: '', method: 'CASH', date: new Date().toISOString().split('T')[0], note: '', patientId: '', treatmentId: '', appointmentId: '' });
    setShowModal(true);
  };

  const openEdit = (p: Payment) => {
    setEditingPayment(p);
    setForm({
      amount: String(p.amount),
      method: p.method,
      date: p.date.split('T')[0],
      note: p.note || '',
      patientId: p.patient.id,
      treatmentId: p.treatment.id,
      appointmentId: p.appointment?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        appointmentId: form.appointmentId || undefined,
        note: form.note || undefined,
      };
      if (editingPayment) {
        await axios.put(`/api/payments/${editingPayment.id}`, payload);
      } else {
        await axios.post('/api/payments', payload);
      }
      setShowModal(false);
      loadPayments();
    } catch {
      alert('Error al guardar pago');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      await axios.delete(`/api/payments/${id}`);
      loadPayments();
    } catch {
      alert('Error al eliminar pago');
    }
  };

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pagos</h1>
        <div className="flex gap-2">
<button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            + Registrar Pago
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <p className="text-sm text-gray-500">Total registrado</p>
        <p className="text-2xl font-bold text-green-600">${total.toFixed(2)}</p>
        <p className="text-sm text-gray-400">{payments.length} pagos</p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="hidden md:table-cell text-left px-4 py-3">Fecha</th>
              <th className="hidden md:table-cell text-left px-4 py-3">Paciente</th>
              <th className="hidden md:table-cell text-left px-4 py-3">Tratamiento</th>
              <th className="hidden md:table-cell text-left px-4 py-3">Monto</th>
              <th className="hidden md:table-cell text-left px-4 py-3">Método</th>
              <th className="hidden md:table-cell text-left px-4 py-3">Nota</th>
              <th className="hidden md:table-cell text-right px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map(p => (
              <tr key={p.id} className="hidden md:table-row hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium">{p.patient.firstName} {p.patient.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{treatmentLabels[p.treatment.type] || p.treatment.type}</td>
                <td className="px-4 py-3 font-semibold text-green-600">${p.amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {methodLabels[p.method] || p.method}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate">{p.note || '-'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr className="hidden md:table-row"><td colSpan={7} className="text-center py-8 text-gray-400">No hay pagos registrados</td></tr>
            )}
          </tbody>
        </table>

        {/* Mobile cards */}
        {payments.length > 0 && (
          <div className="block md:hidden p-4 space-y-3">
            {payments.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{p.patient.firstName} {p.patient.lastName}</p>
                    <p className="text-sm text-gray-500">{treatmentLabels[p.treatment.type] || p.treatment.type}</p>
                    <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${p.amount.toFixed(2)}</p>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {methodLabels[p.method] || p.method}
                    </span>
                  </div>
                </div>
                {p.note && <p className="text-xs text-gray-400 mt-1">{p.note}</p>}
                <div className="flex gap-2 mt-3 pt-2 border-t justify-end">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {payments.length === 0 && (
          <div className="block md:hidden text-center py-8 text-gray-400">No hay pagos registrados</div>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingPayment ? 'Editar Pago' : 'Registrar Pago'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Seleccionar...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                <select value={form.treatmentId} onChange={e => setForm({ ...form, treatmentId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Seleccionar...</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>
                      {treatmentLabels[t.type] || t.type} - {t.patient.firstName} {t.patient.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                  <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    {Object.entries(methodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Abono inicial, saldo, etc." />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingPayment ? 'Actualizar' : 'Registrar'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
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
