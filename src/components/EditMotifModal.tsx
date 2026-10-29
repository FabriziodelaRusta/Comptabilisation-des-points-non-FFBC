import React, { useState, useEffect } from 'react';
import { X, Pencil, AlertCircle, Loader2, Tag } from 'lucide-react';
import { MotifKey } from '../types';

interface EditMotifModalProps {
  isOpen: boolean;
  currentMotif: MotifKey | null;
  onClose: () => void;
  onSubmit: (oldLabel: string, newLabel: string, defaultPoints?: number) => Promise<void>;
  isLoading: boolean;
}

export const EditMotifModal: React.FC<EditMotifModalProps> = ({
  isOpen,
  currentMotif,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [defaultPoints, setDefaultPoints] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentMotif) {
      setNewLabel(currentMotif.label || '');
      setDefaultPoints(
        currentMotif.defaultPoints !== undefined ? String(currentMotif.defaultPoints) : ''
      );
      setError(null);
    }
  }, [isOpen, currentMotif]);

  if (!isOpen || !currentMotif) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = (newLabel || '').trim();
    if (!cleanLabel) {
      setError('Le libellé du motif est requis.');
      return;
    }
    setError(null);
    try {
      const cleanPoints = (defaultPoints || '').trim();
      const pts = cleanPoints !== '' ? Number(cleanPoints) : undefined;
      await onSubmit(currentMotif.label || '', cleanLabel, pts);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la modification du motif.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-4 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Modifier le Motif</h2>
              <p className="text-xs text-amber-100">Table Keys (Form_Points_non_FFBC)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-amber-600/50 transition-colors"
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
              Libellé actuel
            </label>
            <div className="px-3.5 py-2 bg-gray-100 rounded-xl text-xs font-mono text-gray-600 border border-gray-200">
              {currentMotif.label}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nouveau libellé du motif <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Fléchage & Défléchage parcours"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
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
              placeholder="Ex: 5 ou -2"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  <span>Mettre à jour le Motif</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
