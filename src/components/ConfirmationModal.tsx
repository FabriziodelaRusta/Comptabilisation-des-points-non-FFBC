import React from 'react';
import {
  Calendar,
  User,
  PlusCircle,
  MinusCircle,
  Tag,
  Clock,
  FileSpreadsheet,
  CheckCircle,
  X,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  actionType: 'insert' | 'update' | 'delete';
  memberName: string;
  dateRando: string;
  points: number;
  description: string;
  dateOperation: string;
  spreadsheetName?: string;
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  actionType,
  memberName,
  dateRando,
  points,
  description,
  dateOperation,
  spreadsheetName,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isPositive = points >= 0;
  const isDelete = actionType === 'delete';
  const isUpdate = actionType === 'update';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`text-white p-5 border-b-2 flex items-center justify-between ${
            isDelete
              ? 'bg-gradient-to-r from-red-900 to-red-800 border-red-500'
              : isUpdate
              ? 'bg-gradient-to-r from-amber-900 to-amber-800 border-amber-500'
              : 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 border-amber-500'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                isDelete ? 'bg-red-500 text-white' : 'bg-amber-500 text-emerald-950'
              }`}
            >
              {isDelete ? <Trash2 className="w-5 h-5" /> : isUpdate ? <Pencil className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isDelete
                  ? 'Suppression d\'une Opération'
                  : isUpdate
                  ? 'Modification d\'une Opération'
                  : 'Confirmation de l\'Insertion'}
              </h3>
              <p className="text-xs text-emerald-100 opacity-90">
                Feuille Google « <span className="font-semibold text-white">Opérations</span> »
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            {isDelete
              ? 'Êtes-vous sûr de vouloir supprimer définitivement cette opération de points non FFBC ?'
              : isUpdate
              ? 'Confirmez-vous les modifications apportées à cette opération ?'
              : 'Êtes-vous sûr de vouloir enregistrer cette nouvelle opération dans la feuille Opérations ?'}
          </p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
            {/* Member */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                Membre (Col B)
              </span>
              <span className="font-bold text-gray-900">{memberName}</span>
            </div>

            {/* Points */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                {isPositive ? (
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <MinusCircle className="w-4 h-4 text-red-600" />
                )}
                Points attribués (Col C)
              </span>
              <span
                className={`font-black text-base px-2.5 py-0.5 rounded-lg ${
                  isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isPositive ? `+${points}` : points} pts
              </span>
            </div>

            {/* Description */}
            <div className="flex items-start justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2 shrink-0">
                <Tag className="w-4 h-4 text-amber-600" />
                Description (Col D)
              </span>
              <span className="font-semibold text-gray-800 text-right ml-4">{description}</span>
            </div>

            {/* Date rando */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Date Rando (Col A)
              </span>
              <span className="font-medium text-gray-800">{dateRando}</span>
            </div>

            {/* Date operation */}
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-gray-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Date Opération (Col G)
              </span>
              <span className="font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                {dateOperation}
              </span>
            </div>
          </div>

          {isDelete && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Cette action effacera la ligne dans Google Sheets et réajustera le total du membre.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                isDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isUpdate
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : isDelete ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmer la suppression</span>
                </>
              ) : isUpdate ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmer la modification</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmer l'insertion</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
