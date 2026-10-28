import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Loader2, Tag } from 'lucide-react';

interface NewMotifModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string, defaultPoints?: number) => Promise<void>;
  isLoading: boolean;
}

export const NewMotifModal: React.FC<NewMotifModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [label, setLabel] = useState('');
  const [defaultPoints, setDefaultPoints] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Le libellé du motif est requis.');
      return;
    }
    setError(null);
    try {
      const pts = defaultPoints.trim() !== '' ? Number(defaultPoints) : undefined;
      await onSubmit(label.trim(), pts);
      setLabel('');
      setDefaultPoints('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'ajout du motif.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-emerald-100 overflow-hidden transform animate-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white px-5 py-4 flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-emerald-950 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Nouveau Motif Non-FFBC</h2>
              <p className="text-xs text-emerald-200">Table Keys (Form_Points_non_FFBC)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Libellé de l'activité / Motif <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Aide logistique fléchage brevet"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Points suggérés par défaut (facultatif)
            </label>
            <input
              type="number"
              value={defaultPoints}
              onChange={(e) => setDefaultPoints(e.target.value)}
              placeholder="Ex: 3"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            Ce motif sera automatiquement classé sous la clé <code>Form_Points_non_FFBC</code> dans la feuille <strong>Keys</strong> de votre Google Sheet.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Ajouter le Motif</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
