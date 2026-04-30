import { useState, useEffect } from 'react';
import axios from 'axios';

type ToothState = 'HEALTHY' | 'CARIES' | 'TREATED' | 'EXTRACTED' | 'ROOT_CANAL' | 'CROWN' | 'MISSING';

const STATUS_COLORS: Record<ToothState, string> = {
  HEALTHY: '#ffffff',
  CARIES: '#ef4444',
  TREATED: '#3b82f6',
  EXTRACTED: '#6b7280',
  ROOT_CANAL: '#f59e0b',
  CROWN: '#a855f7',
  MISSING: '#1f2937',
};

const STATUS_LABELS: Record<ToothState, string> = {
  HEALTHY: 'Clínicamente Sano',
  CARIES: 'Caries',
  TREATED: 'Tratado',
  EXTRACTED: 'Extraído',
  ROOT_CANAL: 'Endodoncia',
  CROWN: 'Corona',
  MISSING: 'Ausente',
};

const ADULT_ROWS = [
  { label: 'Superior Derecho', numbers: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: 'Superior Izquierdo', numbers: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: 'Inferior Izquierdo', numbers: [31, 32, 33, 34, 35, 36, 37, 38] },
  { label: 'Inferior Derecho', numbers: [41, 42, 43, 44, 45, 46, 47, 48] },
];

const CHILD_ROWS = [
  { label: 'Superior Derecho', numbers: [55, 54, 53, 52, 51] },
  { label: 'Superior Izquierdo', numbers: [61, 62, 63, 64, 65] },
  { label: 'Inferior Izquierdo', numbers: [71, 72, 73, 74, 75] },
  { label: 'Inferior Derecho', numbers: [81, 82, 83, 84, 85] },
];

const TOOTH_LABELS: Record<number, string> = {
  11: 'Incisivo Central Superior Derecho', 12: 'Incisivo Lateral Superior Derecho',
  13: 'Canino Superior Derecho', 14: 'Primer Premolar Superior Derecho',
  15: 'Segundo Premolar Superior Derecho', 16: 'Primer Molar Superior Derecho',
  17: 'Segundo Molar Superior Derecho', 18: 'Tercer Molar Superior Derecho',
  21: 'Incisivo Central Superior Izquierdo', 22: 'Incisivo Lateral Superior Izquierdo',
  23: 'Canino Superior Izquierdo', 24: 'Primer Premolar Superior Izquierdo',
  25: 'Segundo Premolar Superior Izquierdo', 26: 'Primer Molar Superior Izquierdo',
  27: 'Segundo Molar Superior Izquierdo', 28: 'Tercer Molar Superior Izquierdo',
  31: 'Incisivo Central Inferior Izquierdo', 32: 'Incisivo Lateral Inferior Izquierdo',
  33: 'Canino Inferior Izquierdo', 34: 'Primer Premolar Inferior Izquierdo',
  35: 'Segundo Premolar Inferior Izquierdo', 36: 'Primer Molar Inferior Izquierdo',
  37: 'Segundo Molar Inferior Izquierdo', 38: 'Tercer Molar Inferior Izquierdo',
  41: 'Incisivo Central Inferior Derecho', 42: 'Incisivo Lateral Inferior Derecho',
  43: 'Canino Inferior Derecho', 44: 'Primer Premolar Inferior Derecho',
  45: 'Segundo Premolar Inferior Derecho', 46: 'Primer Molar Inferior Derecho',
  47: 'Segundo Molar Inferior Derecho', 48: 'Tercer Molar Inferior Derecho',
  51: 'Incisivo Central', 52: 'Incisivo Lateral', 53: 'Canino',
  54: 'Primer Molar', 55: 'Segundo Molar',
  61: 'Incisivo Central', 62: 'Incisivo Lateral', 63: 'Canino',
  64: 'Primer Molar', 65: 'Segundo Molar',
  71: 'Incisivo Central', 72: 'Incisivo Lateral', 73: 'Canino',
  74: 'Primer Molar', 75: 'Segundo Molar',
  81: 'Incisivo Central', 82: 'Incisivo Lateral', 83: 'Canino',
  84: 'Primer Molar', 85: 'Segundo Molar',
};

interface ToothSquareProps {
  number: number;
  status: ToothState;
  onClick: (number: number, currentState: ToothState) => void;
}

function ToothSquare({ number, status, onClick }: ToothSquareProps) {
  const size = 44;
  return (
    <div className="relative inline-block m-0.5">
      <svg width={size + 2} height={size + 2} viewBox={`0 0 ${size + 2} ${size + 2}`}>
        <rect
          x="1" y="1"
          width={size} height={size}
          rx="4"
          fill={STATUS_COLORS[status]}
          stroke="#666"
          strokeWidth="1.2"
          onClick={() => onClick(number, status)}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        />
        <text
          x={(size + 2) / 2}
          y={(size + 2) / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fill={status === 'MISSING' ? '#fff' : '#333'}
          fontWeight="bold"
          pointerEvents="none"
        >
          {number}
        </text>
      </svg>
    </div>
  );
}

interface ArchRowProps {
  label: string;
  leftNumbers: number[];   // right side of mouth (displayed on left visually)
  rightNumbers: number[];  // left side of mouth (displayed on right visually)
  data: Record<number, ToothState>;
  onToothClick: (number: number, currentState: ToothState) => void;
}

function ArchRow({ label, leftNumbers, rightNumbers, data, onToothClick }: ArchRowProps) {
  return (
    <div className="flex items-center justify-center">
      <span className="text-[10px] text-gray-400 w-16 text-right mr-2 shrink-0">{label}</span>
      <div className="flex items-end">
        <div className="flex">
          {leftNumbers.map((n) => (
            <ToothSquare key={n} number={n} status={data[n] || 'HEALTHY'} onClick={onToothClick} />
          ))}
        </div>
        {/* small gap in midline */}
        <div className="w-3" />
        <div className="flex">
          {rightNumbers.map((n) => (
            <ToothSquare key={n} number={n} status={data[n] || 'HEALTHY'} onClick={onToothClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Odontogram({ patientId }: { patientId: string }) {
  const [toothData, setToothData] = useState<Record<number, ToothState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ToothState>('HEALTHY');
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/odontogram/${patientId}`).then((res) => {
      const mapped: Record<number, ToothState> = {};
      res.data.forEach((rec: any) => {
        mapped[rec.number] = rec.status;
      });
      setToothData(mapped);
    }).catch(() => setError('Error al cargar odontograma'))
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleToothClick = (number: number, currentState: ToothState) => {
    setSelectedTooth(number);
    setSelectedStatus(currentState);
    setShowPanel(true);
  };

  const handleStatusChange = async (newStatus: ToothState) => {
    if (selectedTooth === null) return;
    setToothData((prev) => ({ ...prev, [selectedTooth]: newStatus }));
    setSelectedStatus(newStatus);
    try {
      await axios.post(`/api/odontogram/${patientId}/single`, {
        number: selectedTooth,
        face: 'vestibular',
        status: newStatus,
      });
    } catch {
      setError('Error al guardar');
    }
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Cargando odontograma...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🦷 Odontograma</h3>
        <button
          onClick={() => setShowChildren(!showChildren)}
          className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
        >
          {showChildren ? 'Ocultar Dientes de Niño' : 'Mostrar Dientes de Niño'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max space-y-3">
          <ArchRow
            label="Superior"
            leftNumbers={ADULT_ROWS[0].numbers}
            rightNumbers={ADULT_ROWS[1].numbers}
            data={toothData}
            onToothClick={handleToothClick}
          />
          <div className="border-t-2 border-dashed border-gray-300 mx-8" />
          <ArchRow
            label="Inferior"
            leftNumbers={[...ADULT_ROWS[3].numbers].reverse()}
            rightNumbers={ADULT_ROWS[2].numbers}
            data={toothData}
            onToothClick={handleToothClick}
          />

          {showChildren && (
            <>
              <p className="text-amber-600 text-xs font-medium pt-3 text-center">🧒 Dientes de Niño / Temporales</p>
              <ArchRow
                label="Superior"
                leftNumbers={CHILD_ROWS[0].numbers}
                rightNumbers={CHILD_ROWS[1].numbers}
                data={toothData}
                onToothClick={handleToothClick}
              />
              <div className="border-t border-dashed border-gray-200 mx-8" />
              <ArchRow
                label="Inferior"
                leftNumbers={[...CHILD_ROWS[3].numbers].reverse()}
                rightNumbers={CHILD_ROWS[2].numbers}
                data={toothData}
                onToothClick={handleToothClick}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {(Object.keys(STATUS_COLORS) as ToothState[]).map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: STATUS_COLORS[key] }} />
            <span className="text-gray-600">{STATUS_LABELS[key]}</span>
          </div>
        ))}
      </div>

      {showPanel && selectedTooth !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPanel(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={(e: React.SyntheticEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-800">Diente {selectedTooth}</h4>
                <p className="text-xs text-gray-500">{TOOTH_LABELS[selectedTooth]}</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_COLORS) as ToothState[]).map((state) => (
                <button
                  key={state}
                  onClick={() => handleStatusChange(state)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                    selectedStatus === state ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="w-5 h-5 rounded border border-gray-300 flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[state] }} />
                  <span className="text-gray-700">{STATUS_LABELS[state]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
