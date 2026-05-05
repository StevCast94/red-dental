import { useState } from 'react';
import axios from 'axios';

interface HistoryFields {
  motivo: string;
  sintomatologia: string;
  antecedentes: string;
}

const SEP_PREFIX = '___HC_MOTIVO___';
const SEP_MID = '___HC_SINTOMAS___';
const SEP_SUF = '___HC_ANTEC__';

function parseHistory(raw: string | null): HistoryFields {
  if (!raw) return { motivo: '', sintomatologia: '', antecedentes: '' };
  // Check if stored in structured format
  if (raw.startsWith(SEP_PREFIX)) {
    const parts = raw.split(SEP_MID);
    const motivo = parts[0].replace(SEP_PREFIX, '').trim();
    const rest = parts[1] || '';
    const sintomasParts = rest.split(SEP_SUF);
    return {
      motivo,
      sintomatologia: sintomasParts[0].trim(),
      antecedentes: (sintomasParts[1] || '').trim(),
    };
  }
  // Legacy — todo free text treated as antecedentes personales
  return { motivo: '', sintomatologia: '', antecedentes: raw.trim() };
}

function joinHistory(fields: HistoryFields): string {
  return `${SEP_PREFIX}${fields.motivo.trim()}${SEP_MID}${fields.sintomatologia.trim()}${SEP_SUF}${fields.antecedentes.trim()}`;
}

export default function ClinicalHistory({ patientId, initialHistory }: { patientId: string; initialHistory: string | null }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<HistoryFields>(parseHistory(initialHistory));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key: keyof HistoryFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const text = joinHistory(fields);
      await axios.put(`/api/patients/${patientId}`, { clinicalHistory: text });
      setEditing(false);
    } catch {
      setError('Error al guardar');
    }
    setSaving(false);
  };

  const hasContent = fields.motivo || fields.sintomatologia || fields.antecedentes;
  const preview = fields.motivo || fields.sintomatologia || fields.antecedentes;

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition rounded-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-semibold text-gray-800">Historia Clínica</span>
          {hasContent && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {preview.length > 80 ? preview.slice(0, 80) + '...' : preview}
            </span>
          )}
        </div>
        <span className={`text-gray-400 transition ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {editing ? (
            <>
              {/* Motivo de la consulta */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Motivo de la Consulta</label>
                <textarea
                  value={fields.motivo}
                  onChange={(e) => updateField('motivo', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="¿Por qué consulta el paciente?"
                />
              </div>

              {/* Sintomatología */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sintomatología</label>
                <textarea
                  value={fields.sintomatologia}
                  onChange={(e) => updateField('sintomatologia', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dolor, molestias, signos clínicos..."
                />
              </div>

              {/* Antecedentes personales */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Antecedentes Personales</label>
                <textarea
                  value={fields.antecedentes}
                  onChange={(e) => updateField('antecedentes', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Antecedentes médicos, alergias, medicamentos, historia dental previa..."
                />
              </div>

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
                  onClick={() => { setEditing(false); setFields(parseHistory(initialHistory)); }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {hasContent ? (
                <>
                  {fields.motivo && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Motivo de la Consulta</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{fields.motivo}</p>
                    </div>
                  )}
                  {fields.sintomatologia && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Sintomatología</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{fields.sintomatologia}</p>
                    </div>
                  )}
                  {fields.antecedentes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Antecedentes Personales</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{fields.antecedentes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Paciente sin historia clínica registrada.</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ✏️ {hasContent ? 'Editar' : 'Agregar historia clínica'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
