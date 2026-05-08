import { useEffect, useState, useRef, DragEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

interface Evolution {
  id: string;
  date: string;
  observations: string;
  photoBefore: string | null;
  photoAfter: string | null;
  appointment: { date: string } | null;
}

interface Treatment {
  id: string;
  type: string;
  startDate: string;
  estimatedMonths: number;
  active: boolean;
  phases: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string };
  evolutions: Evolution[];
  payments: { amount: number }[];
}

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

function PhotoUploadZone({
  label,
  type,
  photo,
  dragOver,
  inputRef,
  onSelect,
  onRemove,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  type: 'before' | 'after';
  photo: { file: File; preview: string } | undefined;
  dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (type: 'before' | 'after', file: File) => void;
  onRemove: (type: 'before' | 'after') => void;
  onDragOver: (e: DragEvent, type: 'before' | 'after') => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent, type: 'before' | 'after') => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        onDragOver={e => onDragOver(e, type)}
        onDragLeave={onDragLeave}
        onDrop={e => onDrop(e, type)}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : photo
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onSelect(type, file);
            e.target.value = '';
          }}
        />

        {photo ? (
          <div className="relative">
            <img src={photo.preview} alt={label} className="max-h-36 mx-auto rounded-lg object-contain" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove(type); }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="py-4">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              <span className="text-blue-600 font-medium">Haz clic</span> o arrastra una foto
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP — hasta 2MB</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TreatmentDetail() {
  const { id } = useParams();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [showEvoModal, setShowEvoModal] = useState(false);
  const [editingEvolution, setEditingEvolution] = useState<Evolution | null>(null);
  const [evoForm, setEvoForm] = useState({ observations: '' });
  const [evoPhotos, setEvoPhotos] = useState<{ type: 'before' | 'after'; file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [evoExistingPhotos, setEvoExistingPhotos] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });
  const [keepBefore, setKeepBefore] = useState(true);
  const [keepAfter, setKeepAfter] = useState(true);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<'before' | 'after' | null>(null);

  useEffect(() => {
    if (id) {
      axios.get(`/api/treatments/${id}`).then(r => setTreatment(r.data)).catch(() => {});
    }
  }, [id]);

  const handlePhotoSelect = (type: 'before' | 'after', file: File) => {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, GIF o WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB');
      return;
    }
    const preview = URL.createObjectURL(file);
    setEvoPhotos(prev => {
      const filtered = prev.filter(p => p.type !== type);
      return [...filtered, { type, file, preview }];
    });
  };

  const handleRemovePhoto = (type: 'before' | 'after') => {
    setEvoPhotos(prev => {
      const removed = prev.find(p => p.type === type);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(p => p.type !== type);
    });
  };

  const handleDragOver = (e: DragEvent, type: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(type);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e: DragEvent, type: 'before' | 'after') => {
    e.preventDefault();
    setDragOver(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) handlePhotoSelect(type, files[0]);
  };

  const openEditEvo = (evo: Evolution) => {
    setEditingEvolution(evo);
    setEvoForm({ observations: evo.observations });
    setEvoPhotos([]);
    setEvoExistingPhotos({ before: evo.photoBefore, after: evo.photoAfter });
    setKeepBefore(!!evo.photoBefore);
    setKeepAfter(!!evo.photoAfter);
    setShowEvoModal(true);
  };

  const handleSubmitEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);

      let photoBeforeUrl: string | null = null;
      let photoAfterUrl: string | null = null;

      if (editingEvolution) {
        // Modo edición: determinar URLs finales
        if (keepBefore && evoExistingPhotos.before) {
          photoBeforeUrl = evoExistingPhotos.before;
        }
        if (keepAfter && evoExistingPhotos.after) {
          photoAfterUrl = evoExistingPhotos.after;
        }
      }

      // Subir fotos nuevas (reemplazan si no se mantienen las existentes)
      for (const p of evoPhotos) {
        const formData = new FormData();
        formData.append('photo', p.file);
        const res = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (p.type === 'before') photoBeforeUrl = res.data.url;
        else photoAfterUrl = res.data.url;
      }

      if (editingEvolution) {
        await axios.put(`/api/evolutions/${editingEvolution.id}`, {
          observations: evoForm.observations,
          photoBefore: photoBeforeUrl,
          photoAfter: photoAfterUrl,
        });
      } else {
        await axios.post('/api/evolutions', {
          treatmentId: id,
          observations: evoForm.observations,
          photoBefore: photoBeforeUrl,
          photoAfter: photoAfterUrl,
        });
      }

      setShowEvoModal(false);
      setEditingEvolution(null);
      setEvoForm({ observations: '' });
      evoPhotos.forEach(p => URL.revokeObjectURL(p.preview));
      setEvoPhotos([]);
      setEvoExistingPhotos({ before: null, after: null });
      const r = await axios.get(`/api/treatments/${id}`);
      setTreatment(r.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar evolución');
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('¿Estás seguro de finalizar este tratamiento?')) return;
    try {
      await axios.patch(`/api/treatments/${id}/complete`);
      const r = await axios.get(`/api/treatments/${id}`);
      setTreatment(r.data);
    } catch {
      alert('Error al finalizar tratamiento');
    }
  };

  // Encuentra foto para cada tipo
  const beforePhoto = evoPhotos.find(p => p.type === 'before');
  const afterPhoto = evoPhotos.find(p => p.type === 'after');

  if (!treatment) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      </Layout>
    );
  }

  const totalPaid = treatment.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/treatments" className="text-blue-600 hover:underline text-sm">&larr; Volver a Tratamientos</Link>
      </div>

      {/* Info del tratamiento */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Tratamiento</h1>
            <span className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mt-2">
              {treatmentLabels[treatment.type] || treatment.type}
            </span>
            {treatment.active ? (
              <span className="inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full ml-2">
                Activo
              </span>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1 rounded-full ml-2">
                Completado
              </span>
            )}
          </div>
          {treatment.active && (
            <button
              onClick={handleComplete}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
            >
              Finalizar Tratamiento
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Paciente</p>
            <p className="font-semibold">{treatment.patient.firstName} {treatment.patient.lastName}</p>
            <p className="text-sm text-gray-500">{treatment.patient.phone}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Inicio / Duración</p>
            <p className="font-semibold">{new Date(treatment.startDate).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">{treatment.estimatedMonths} meses estimados</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{treatment.evolutions.length} evoluciones</p>
          </div>
        </div>

        {treatment.phases && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Fases del tratamiento:</p>
            <div className="flex flex-wrap gap-2">
              {JSON.parse(treatment.phases).map((phase: string, i: number) => (
                <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full">
                  {i + 1}. {phase}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evoluciones */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Evoluciones</h2>
          {treatment.active && (
            <button
              onClick={() => setShowEvoModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              + Agregar Evolución
            </button>
          )}
        </div>

        <div className="space-y-4">
          {treatment.evolutions.map(evo => (
            <div key={evo.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {new Date(evo.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                {evo.appointment && (
                  <span className="text-xs text-gray-400">
                    Cita: {new Date(evo.appointment.date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{evo.observations}</p>

              {/* Fotos */}
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => openEditEvo(evo)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Editar
                </button>
              </div>

              {(evo.photoBefore || evo.photoAfter) && (
                <div className="flex gap-4 mt-3">
                  {evo.photoBefore && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Antes</p>
                      <img
                        src={evo.photoBefore.startsWith('http') ? evo.photoBefore : evo.photoBefore}
                        alt="Antes"
                        className="w-32 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(evo.photoBefore!, '_blank')}
                      />
                    </div>
                  )}
                  {evo.photoAfter && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Después</p>
                      <img
                        src={evo.photoAfter.startsWith('http') ? evo.photoAfter : evo.photoAfter}
                        alt="Después"
                        className="w-32 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(evo.photoAfter!, '_blank')}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {treatment.evolutions.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay evoluciones registradas</p>
          )}
        </div>
      </div>

      {/* Modal Nueva/Editar Evolución */}
      {showEvoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-xl mx-4">
            <h2 className="text-xl font-bold mb-4">{editingEvolution ? 'Editar Evolución' : 'Agregar Evolución'}</h2>
            <form onSubmit={handleSubmitEvolution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={evoForm.observations}
                  onChange={e => setEvoForm({ ...evoForm, observations: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe el progreso del paciente..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {/* Foto Antes */}
                  {editingEvolution && evoExistingPhotos.before && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Foto actual (Antes):</p>
                      <div className="relative">
                        <img
                          src={evoExistingPhotos.before}
                          alt="Antes actual"
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                      </div>
                      <label className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={keepBefore}
                          onChange={e => setKeepBefore(e.target.checked)}
                        />
                        Mantener foto actual
                      </label>
                    </div>
                  )}
                  <PhotoUploadZone
                    label={editingEvolution ? 'Nueva foto Antes (opcional)' : 'Foto Antes'}
                    type="before"
                    photo={beforePhoto}
                    dragOver={dragOver === 'before'}
                    inputRef={beforeInputRef}
                    onSelect={handlePhotoSelect}
                    onRemove={handleRemovePhoto}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                </div>
                <div>
                  {/* Foto Después */}
                  {editingEvolution && evoExistingPhotos.after && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Foto actual (Después):</p>
                      <div className="relative">
                        <img
                          src={evoExistingPhotos.after}
                          alt="Después actual"
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                      </div>
                      <label className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={keepAfter}
                          onChange={e => setKeepAfter(e.target.checked)}
                        />
                        Mantener foto actual
                      </label>
                    </div>
                  )}
                  <PhotoUploadZone
                    label={editingEvolution ? 'Nueva foto Después (opcional)' : 'Foto Después'}
                    type="after"
                    photo={afterPhoto}
                    dragOver={dragOver === 'after'}
                    inputRef={afterInputRef}
                    onSelect={handlePhotoSelect}
                    onRemove={handleRemovePhoto}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Subiendo...
                    </span>
                  ) : (
                    editingEvolution ? 'Guardar Cambios' : 'Guardar Evolución'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEvoModal(false);
                    setEditingEvolution(null);
                    evoPhotos.forEach(p => URL.revokeObjectURL(p.preview));
                    setEvoPhotos([]);
                    setEvoForm({ observations: '' });
                    setEvoExistingPhotos({ before: null, after: null });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 font-medium"
                >
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
