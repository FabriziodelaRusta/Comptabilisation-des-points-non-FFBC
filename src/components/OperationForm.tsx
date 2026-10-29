import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  MinusCircle,
  Tag,
  Plus,
  Send,
  ChevronDown,
  Info,
  Pencil,
  X,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { Member, MotifKey, OperationRecord } from '../types';

interface OperationFormProps {
  member: Member;
  motifs: MotifKey[];
  editingOperation?: OperationRecord | null;
  onCancelEdit?: () => void;
  onOpenNewMotifModal: () => void;
  onOpenEditMotifModal: (motifLabel?: string) => void;
  onSubmit: (operationData: {
    dateRando: string;
    points: number;
    description: string;
  }) => void;
  isLoading: boolean;
}

export const OperationForm: React.FC<OperationFormProps> = ({
  member,
  motifs,
  editingOperation,
  onCancelEdit,
  onOpenNewMotifModal,
  onOpenEditMotifModal,
  onSubmit,
  isLoading,
}) => {
  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseToInputDate = (dateStr: string): string => {
    if (!dateStr) return getTodayStr();
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const [dateRando, setDateRando] = useState<string>(
    editingOperation ? parseToInputDate(editingOperation.dateRando) : ''
  );
  const [points, setPoints] = useState<number | ''>(
    editingOperation && typeof editingOperation.points === 'number' ? editingOperation.points : ''
  );
  const [description, setDescription] = useState<string>(
    editingOperation ? editingOperation.description || '' : ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const pointsInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevMemberIdRef = useRef<string>(member.id);

  // Synchronize when editing operation changes
  useEffect(() => {
    if (editingOperation) {
      setDateRando(parseToInputDate(editingOperation.dateRando));
      setPoints(typeof editingOperation.points === 'number' ? editingOperation.points : '');
      setDescription(editingOperation.description || '');
      setValidationError(null);
    } else {
      setDateRando('');
      setPoints('');
      setDescription('');
      setValidationError(null);
    }
  }, [editingOperation]);

  // When member changes, completely clear all fields
  useEffect(() => {
    if (prevMemberIdRef.current !== member.id) {
      prevMemberIdRef.current = member.id;
      setDateRando('');
      setPoints('');
      setDescription('');
      setValidationError(null);
      if (editingOperation && onCancelEdit) {
        onCancelEdit();
      }
    }
  }, [member.id, editingOperation, onCancelEdit]);

  // Reset all fields to blank / fresh state
  const handleResetForm = () => {
    setDateRando('');
    setPoints('');
    setDescription('');
    setValidationError(null);
    if (editingOperation && onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleMotifSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDescription(val);
    const found = motifs.find((m) => m.label === val);
    if (found?.defaultPoints !== undefined && !isNaN(found.defaultPoints)) {
      setPoints(found.defaultPoints);
    }
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setDateRando(`${y}-${m}-${day}`);
  };

  const handleQuickPoints = (val: number) => {
    setPoints(val);
  };

  const toggleSign = () => {
    if (typeof points === 'number' && points !== 0) {
      setPoints(-points);
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (!dateRando) {
      setValidationError('Veuillez sélectionner une date de rando dans le calendrier.');
      return;
    }

    const numPoints = typeof points === 'number' ? points : Number(points);
    if (points === '' || isNaN(numPoints) || numPoints === 0) {
      setValidationError('Le nombre de points doit être renseigné et différent de zéro.');
      return;
    }

    const safeDesc = (description || '').trim();
    if (!safeDesc) {
      setValidationError('Veuillez sélectionner une description / un motif.');
      return;
    }

    onSubmit({
      dateRando,
      points: numPoints,
      description: safeDesc,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleFormSubmit}
      onKeyDown={handleKeyDown}
      className={`rounded-2xl p-5 sm:p-6 border shadow-md space-y-6 transition-all ${
        editingOperation
          ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-300/40'
          : 'bg-white border-emerald-200/80'
      }`}
    >
      {/* Active Member or Edit Mode Callout */}
      <div
        className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 shadow-xs transition-all ${
          editingOperation
            ? 'bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-50 border-amber-300 ring-2 ring-amber-300/50'
            : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm ${
              editingOperation ? 'bg-amber-600' : 'bg-emerald-700'
            }`}
          >
            {editingOperation ? <Pencil className="w-5 h-5" /> : member.nom.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {editingOperation ? (
                <div className="animate-pulse inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-400 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
                  <span>Modification en cours</span>
                </div>
              ) : (
                <div className="animate-pulse inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 border border-emerald-400 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>Saisie en cours</span>
                </div>
              )}
            </div>
            <div className="text-base font-extrabold text-gray-900 mt-1">{member.nom}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editingOperation ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center gap-1.5 text-xs bg-white text-gray-700 hover:text-red-700 px-3.5 py-1.5 rounded-xl border border-gray-300 font-semibold shadow-2xs hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Annuler la modification</span>
            </button>
          ) : (
            <>
              {member.matricule && (
                <span className="text-xs bg-white text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 font-mono shadow-2xs">
                  {member.matricule}
                </span>
              )}
              {member.pointsActuels !== undefined && (
                <span className="text-xs bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                  Solde : {member.pointsActuels} pts
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* The 3 fields row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Field 1: Date Rando */}
        <div className="md:col-span-4 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span>Date rando</span>
              <span className="text-red-500 font-bold">*</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Calendrier</span>
          </label>

          <input
            type="date"
            required
            value={dateRando}
            onChange={(e) => setDateRando(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors shadow-xs"
          />

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                dateRando === getTodayStr()
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Hier
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(3)}
              className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Dimanche
            </button>
          </div>
        </div>

        {/* Field 2: Points */}
        <div className="md:col-span-3 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {typeof points === 'number' && points < 0 ? (
                <MinusCircle className="w-4 h-4 text-red-600" />
              ) : (
                <PlusCircle className="w-4 h-4 text-emerald-600" />
              )}
              <span>Points</span>
              <span className="text-red-500 font-bold">*</span>
            </span>
            <button
              type="button"
              onClick={toggleSign}
              className="text-[11px] text-emerald-700 hover:underline font-semibold"
            >
              Inverser +/-
            </button>
          </label>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSign}
              className={`px-2.5 py-2.5 rounded-xl font-bold text-sm border transition-colors ${
                typeof points === 'number' && points < 0
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title="Basculer entre points positifs et négatifs"
            >
              {typeof points === 'number' && points < 0 ? '-' : '+'}
            </button>
            <input
              ref={pointsInputRef}
              type="number"
              required
              step="1"
              value={points}
              onChange={(e) => {
                const val = e.target.value;
                setPoints(val === '' ? '' : Number(val));
              }}
              placeholder="Ex: 5"
              className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-base font-black text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs ${
                typeof points === 'number' && points < 0
                  ? 'text-red-700 border-red-300 focus:border-red-500'
                  : 'text-emerald-800 border-gray-300 focus:border-emerald-600'
              }`}
            />
          </div>

          {/* Quick Point chips */}
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickPoints(val)}
                className={`text-[11px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
                  points === val
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                +{val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleQuickPoints(-2)}
              className={`text-[11px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
                points === -2
                  ? 'bg-red-700 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              -2
            </button>
          </div>
        </div>

        {/* Field 3: Descriptions with Add and Modify motif buttons */}
        <div className="md:col-span-5 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>Descriptions</span>
              <span className="text-red-500 font-bold">*</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenEditMotifModal(description || '')}
                className="text-amber-700 hover:underline font-medium text-[11px] flex items-center gap-0.5"
              >
                <Pencil className="w-3 h-3" />
                <span>Modifier</span>
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={onOpenNewMotifModal}
                className="text-emerald-700 hover:underline font-medium text-[11px] flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Nouveau</span>
              </button>
            </div>
          </label>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select
                value={description || ''}
                onChange={handleMotifSelect}
                className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 pr-9 transition-colors shadow-xs"
              >
                <option value="">Sélectionner un motif de la table Keys...</option>
                {motifs.map((m, idx) => (
                  <option key={`${m.label}-${idx}`} value={m.label}>
                    {m.label} {m.defaultPoints !== undefined ? `(${m.defaultPoints > 0 ? '+' : ''}${m.defaultPoints} pts)` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Modifier motif existant */}
            <button
              type="button"
              onClick={() => onOpenEditMotifModal(description || '')}
              title="Modifier le motif sélectionné"
              className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold shadow-xs transition-all duration-150 shrink-0 border border-amber-300"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Ajouter nouveau motif */}
            <button
              type="button"
              onClick={onOpenNewMotifModal}
              title="Ajouter un nouveau motif dans la table Keys"
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all duration-150 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Submit bar */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <button
            type="button"
            onClick={handleResetForm}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs font-semibold transition-colors border border-gray-200 shadow-2xs"
            title="Vider les champs pour repartir sur une saisie vierge"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Vider la saisie</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {editingOperation && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !(description || '').trim() ||
              points === '' ||
              points === 0 ||
              isNaN(Number(points)) ||
              !dateRando
            }
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              editingOperation
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
                : 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800'
            }`}
          >
            {editingOperation ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>{editingOperation ? "Mettre à jour l'opération" : "Valider et Enregistrer l'Opération"}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
