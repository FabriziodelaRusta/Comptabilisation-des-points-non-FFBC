import React from 'react';
import {
  Users,
  Calendar,
  PlusCircle,
  Tag,
  CheckCircle,
  X,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

export interface BatchItem {
  id: string;
  membre: string;
  dateRando: string;
  points: number;
  motif?: string;
  km?: string | number;
  description?: string;
}

interface BatchConfirmationModalProps {
  isOpen: boolean;
  items: BatchItem[];
  spreadsheetName?: string;
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const BatchConfirmationModal: React.FC<BatchConfirmationModalProps> = ({
  isOpen,
  items,
  spreadsheetName = 'Points RPA',
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || items.length === 0) return null;

  const totalPoints = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden transform animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-5 border-b-2 border-amber-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-emerald-950 flex items-center justify-center shadow-md font-bold">
              <Users className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Confirmation de la Saisie Groupée
                <span className="text-xs bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full font-black">
                  {items.length} membre{items.length > 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-xs text-emerald-200 opacity-90">
                Feuille Google « <span className="font-semibold text-white">Opérations</span> » du classeur {spreadsheetName}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Vous vous apprêtez à enregistrer <strong>{items.length} opérations</strong> en une seule fois.
              </span>
            </div>
            <span className="font-black text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-xl text-xs shrink-0">
              +{totalPoints} pts au total
            </span>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700 uppercase font-black tracking-wider text-[10px] sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Membre RPA</th>
                    <th className="py-2.5 px-3">Date Rando</th>
                    <th className="py-2.5 px-3 text-center">Points</th>
                    <th className="py-2.5 px-3">Motif</th>
                    <th className="py-2.5 px-3 text-center">Km</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-gray-400 font-bold">{idx + 1}</td>
                       <td className="py-2.5 px-3 font-bold text-gray-900">{item.membre}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-600">{item.dateRando}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-xs">
                          +{item.points} pts
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 max-w-[150px] truncate" title={item.motif || item.description}>
                        {item.motif || item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-gray-800">
                        {item.km !== undefined && item.km !== '' ? `${item.km} km` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            Annuler et corriger
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-emerald-600 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Enregistrement groupé en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-amber-300" />
                <span>Valider l'ensemble ({items.length} membres)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
