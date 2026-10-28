import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  MinusCircle,
  Tag,
  Plus,
  Send,
  CornerDownLeft,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { Member, MotifKey } from '../types';

interface OperationFormProps {
  member: Member;
  motifs: MotifKey[];
  onOpenNewMotifModal: () => void;
  onSubmit: (operationData: {
    dateEvenement: string;
    points: number;
    motif: string;
  }) => void;
  isLoading: boolean;
}

export const OperationForm: React.FC<OperationFormProps> = ({
  member,
  motifs,
  onOpenNewMotifModal,
  onSubmit,
  isLoading,
}) => {
  // Today's date formatted as YYYY-MM-DD
  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [dateEvenement, setDateEvenement] = useState<string>(getTodayStr());
  const [points, setPoints] = useState<number>(3);
  const [selectedMotif, setSelectedMotif] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const pointsInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Set default motif when motifs change
  useEffect(() => {
    if (motifs.length > 0 && !selectedMotif) {
      setSelectedMotif(motifs[0].label);
      if (motifs[0].defaultPoints !== undefined) {
        setPoints(motifs[0].defaultPoints);
      }
    }
  }, [motifs, selectedMotif]);

  // Handle motif selection change
  const handleMotifChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMotifLabel = e.target.value;
    setSelectedMotif(newMotifLabel);
    const found = motifs.find((m) => m.label === newMotifLabel);
    if (found?.defaultPoints !== undefined && !isNaN(found.defaultPoints)) {
      setPoints(found.defaultPoints);
    }
  };

  // Quick date selector helpers
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setDateEvenement(`${y}-${m}-${day}`);
  };

  const handleQuickPoints = (val: number) => {
    setPoints(val);
  };

  const toggleSign = () => {
    setPoints((prev) => -prev);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    if (!selectedMotif) {
      setValidationError('Veuillez sélectionner un motif dans la liste.');
      return;
    }

    if (points === 0 || isNaN(points)) {
      setValidationError('Le nombre de points ne peut pas être zéro.');
      return;
    }

    onSubmit({
      dateEvenement,
      points,
      motif: selectedMotif,
    });
  };

  // Handle Enter key across inputs
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
      className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-200/80 shadow-md space-y-6"
    >
      {/* Active Member Callout */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 rounded-xl p-3.5 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {member.nom.charAt(0)}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-800">
              Saisie en cours pour le membre
            </div>
            <div className="text-base font-bold text-gray-900">{member.nom}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* The 3 fields row as requested:
          1. Petit calendrier pour choisir la date de l'opération
          2. Champ pour entrer le nombre de points (négatif ou positif)
          3. Champ pour introduire un motif (liste déroulante table Keys col1 = Form_Points_non_FFBC)
      */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Field 1: Mini Calendrier (Date de l'événement) */}
        <div className="md:col-span-4 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span>Date de l'événement</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Calendrier</span>
          </label>

          <div className="relative">
            <input
              type="date"
              required
              value={dateEvenement}
              onChange={(e) => setDateEvenement(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors shadow-xs"
            />
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                dateEvenement === getTodayStr()
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

        {/* Field 2: Points (+ ou -) */}
        <div className="md:col-span-3 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {points >= 0 ? (
                <PlusCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <MinusCircle className="w-4 h-4 text-red-600" />
              )}
              <span>Points (+ / -)</span>
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
                points >= 0
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}
              title="Basculer entre points positifs et négatifs"
            >
              {points >= 0 ? '+' : '-'}
            </button>
            <input
              ref={pointsInputRef}
              type="number"
              required
              step="1"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              placeholder="Ex: 5 ou -2"
              className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-base font-black text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs ${
                points >= 0
                  ? 'text-emerald-800 border-gray-300 focus:border-emerald-600'
                  : 'text-red-700 border-red-300 focus:border-red-500'
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

        {/* Field 3: Motif (table Keys col1 = Form_Points_non_FFBC) */}
        <div className="md:col-span-5 space-y-2">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>Motif (Keys: Form_Points_non_FFBC)</span>
              <span className="text-red-500 font-bold">*</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">{motifs.length} motifs</span>
          </label>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedMotif}
                onChange={handleMotifChange}
                className="w-full appearance-none px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 pr-9 transition-colors shadow-xs"
              >
                {motifs.length === 0 ? (
                  <option value="">Aucun motif disponible</option>
                ) : (
                  motifs.map((m, idx) => (
                    <option key={`${m.label}-${idx}`} value={m.label}>
                      {m.label} {m.defaultPoints !== undefined ? `(${m.defaultPoints > 0 ? '+' : ''}${m.defaultPoints} pts)` : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Button to open New Motif Form */}
            <button
              type="button"
              onClick={onOpenNewMotifModal}
              title="Ajouter un nouveau motif dans la table Keys"
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-emerald-950 font-bold shadow-md hover:shadow-lg transition-all duration-150 shrink-0 border border-amber-600/40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[11px] text-gray-500 flex items-center justify-between pt-0.5">
            <span>Motif actif pour l'insertion</span>
            <button
              type="button"
              onClick={onOpenNewMotifModal}
              className="text-emerald-700 hover:underline font-medium"
            >
              + Nouveau motif
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Submit bar with Enter key indicator */}
      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          <CornerDownLeft className="w-3.5 h-3.5 text-gray-400" />
          <span>
            Astuce : Appuyez sur la touche <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-semibold text-gray-700">Entrée ↵</kbd> pour valider et insérer directement dans Google Sheets.
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading || !selectedMotif}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Valider et Enregistrer l'Opération</span>
          <span className="text-[10px] bg-emerald-900/40 px-1.5 py-0.5 rounded font-mono">
            ↵ Enter
          </span>
        </button>
      </div>
    </form>
  );
};
