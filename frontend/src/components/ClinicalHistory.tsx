import { useState } from 'react';
import axios from 'axios';

export default function ClinicalHistory({ patientId, initialHistory }: { patientId: string; initialHistory: string | null }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialHistory || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.put(`/api/patients/${patientId}`, { clinicalHistory: text });
      setEditing(false);
    } catch {
      setError('Error al guardar');
    }
    setSaving(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition rounded-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-semibold text-gray-800">Historia Clínica</span>
          {text && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {text.length > 80 ? text.slice(0, 80) + '...' : text}
            </span>
          )}
        </div>
        <span className={`text-gray-400 transition ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {editing ? (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Antecedentes médicos, alergias, medicamentos, historia dental previa..."
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditing(false); setText(initialHistory || ''); }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              {text ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{text}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Paciente sin historia clínica registrada.</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ✏️ {text ? 'Editar' : 'Agregar historia clínica'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
