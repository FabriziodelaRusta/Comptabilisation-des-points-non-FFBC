import React, { useState } from 'react';
import {
  AlertTriangle,
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
} from 'lucide-react';
import { Member } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  member: Member | null;
  dateEvenement: string;
  points: number;
  motif: string;
  dateOperation: string;
  spreadsheetName?: string;
  isLoading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  member,
  dateEvenement,
  points,
  motif,
  dateOperation,
  spreadsheetName,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !member) return null;

  const isPositive = points >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-emerald-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 border-b-2 border-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center shadow-md">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmation de l'Opération</h3>
                <p className="text-xs text-emerald-200">
                  Écriture dans la feuille Google « <span className="text-amber-300 font-semibold">Opérations</span> »
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-emerald-300 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Êtes-vous sûr de vouloir enregistrer cette opération de points non FFBC dans votre classeur Google Sheets ?
          </p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
            {/* Member */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                Membre
              </span>
              <span className="font-bold text-gray-900">{member.nom}</span>
            </div>

            {/* Points */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                {isPositive ? (
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <MinusCircle className="w-4 h-4 text-red-600" />
                )}
                Points attribués
              </span>
              <span
                className={`font-black text-base px-2.5 py-0.5 rounded-lg ${
                  isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isPositive ? `+${points}` : points} pts
              </span>
            </div>

            {/* Motif */}
            <div className="flex items-start justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2 shrink-0">
                <Tag className="w-4 h-4 text-amber-600" />
                Motif
              </span>
              <span className="font-semibold text-gray-800 text-right ml-4">{motif}</span>
            </div>

            {/* Event date */}
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Date de l'événement
              </span>
              <span className="font-medium text-gray-800">{dateEvenement}</span>
            </div>

            {/* Insertion timestamp */}
            <div className="flex items-center justify-between py-1 text-xs">
              <span className="text-gray-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Date Opération (horodatage)
              </span>
              <span className="font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                {dateOperation}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cette action ajoute une nouvelle ligne horodatée dans la feuille Opérations.</span>
          </div>

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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement dans Sheets...</span>
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
