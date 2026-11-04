import React, { useState, useId } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Copy,
  Send,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  Square,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { Member, MotifKey, UserProfile, UserPermission } from '../types';
import { BatchItem } from './BatchConfirmationModal';

interface BatchOperationFormProps {
  members: Member[];
  motifs: MotifKey[];
  user?: UserProfile | null;
  userPermission?: UserPermission | null;
  onSignIn?: () => void;
  onSubmitBatch: (rows: BatchItem[]) => void;
  isLoading: boolean;
}

export const BatchOperationForm: React.FC<BatchOperationFormProps> = ({
  members,
  motifs,
  user,
  userPermission,
  onSignIn,
  onSubmitBatch,
  isLoading,
}) => {
  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const DEFAULT_MOTIF = 'Rando VTT non FFBC (+1 pts)';
  const DEFAULT_DESCRIPTION = 'Rando VTT non FFBC (+1 pts)';
  const DEFAULT_POINTS = 1;

  // Global default values that can be applied to new or existing rows
  const [defaultDate, setDefaultDate] = useState<string>(getTodayStr());
  const [defaultPoints, setDefaultPoints] = useState<number>(DEFAULT_POINTS);
  const [defaultMotif, setDefaultMotif] = useState<string>(DEFAULT_MOTIF);
  const [defaultKm, setDefaultKm] = useState<string>('');

  // Multi-select modal/popover state
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);
  const [selectedMemberNames, setSelectedMemberNames] = useState<string[]>([]);
  const [memberFilterText, setMemberFilterText] = useState<string>('');

  // Initial row : aucun membre sélectionné par défaut
  const [rows, setRows] = useState<BatchItem[]>(() => [
    {
      id: `batch-${Date.now()}-0`,
      membre: '',
      dateRando: getTodayStr(),
      points: DEFAULT_POINTS,
      motif: DEFAULT_MOTIF,
      km: '',
      description: DEFAULT_MOTIF,
    },
  ]);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Add a single blank row (aucun membre sélectionné)
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}-${prev.length}`,
        membre: '',
        dateRando: defaultDate || getTodayStr(),
        points: defaultPoints,
        motif: defaultMotif,
        km: defaultKm,
        description: defaultMotif,
      },
    ]);
  };

  // Duplicate last row
  const handleDuplicateLastRow = () => {
    if (rows.length === 0) {
      handleAddRow();
      return;
    }
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}-${prev.length}`,
        membre: '',
        dateRando: last.dateRando,
        points: last.points,
        motif: last.motif || defaultMotif,
        km: last.km !== undefined ? last.km : '',
        description: last.description || defaultMotif,
      },
    ]);
  };

  // Remove a row
  const handleRemoveRow = (id: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      return filtered.length > 0
        ? filtered
        : [
            {
              id: `batch-${Date.now()}`,
              membre: members[0]?.nom || '',
              dateRando: defaultDate || getTodayStr(),
              points: defaultPoints,
              motif: defaultMotif,
              km: defaultKm,
              description: defaultMotif,
            },
          ];
    });
  };

  // Update a field in a row
  const handleUpdateRow = (id: string, field: keyof BatchItem, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // If motif changes, also update points if motif has default points, and description if unchanged
        if (field === 'motif') {
          const found = motifs.find((m) => m.label === value);
          if (found?.defaultPoints !== undefined && !isNaN(found.defaultPoints)) {
            updated.points = found.defaultPoints;
          }
          if (!r.description || r.description === r.motif || r.description === DEFAULT_DESCRIPTION) {
            updated.description = value;
          }
        }
        return updated;
      })
    );
  };

  // Apply default parameters to all rows
  const handleApplyDefaultsToAll = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        dateRando: defaultDate || r.dateRando,
        points: defaultPoints !== undefined ? defaultPoints : r.points,
        motif: defaultMotif || r.motif || DEFAULT_MOTIF,
        km: defaultKm !== '' ? defaultKm : r.km,
        description: defaultMotif || r.description,
      }))
    );
  };

  // Multi-select bulk add
  const handleAddSelectedMembers = () => {
    if (selectedMemberNames.length === 0) {
      setIsMultiSelectOpen(false);
      return;
    }

    const newRows: BatchItem[] = selectedMemberNames.map((name, i) => ({
      id: `batch-${Date.now()}-${i}`,
      membre: name,
      dateRando: defaultDate || getTodayStr(),
      points: defaultPoints,
      motif: defaultMotif,
      km: defaultKm,
      description: defaultMotif,
    }));

    // If existing rows only has 1 row with empty member, replace it
    if (rows.length === 1 && !rows[0].membre) {
      setRows(newRows);
    } else {
      // Append only members not already in rows
      const existingMembers = new Set(rows.map((r) => r.membre));
      const filteredNew = newRows.filter((nr) => !existingMembers.has(nr.membre));
      if (filteredNew.length === 0) {
        setRows((prev) => [...prev, ...newRows]);
      } else {
        setRows((prev) => [...prev, ...filteredNew]);
      }
    }

    setSelectedMemberNames([]);
    setIsMultiSelectOpen(false);
  };

  const handleToggleSelectAllMembers = () => {
    const filtered = filteredMembers.map((m) => m.nom);
    if (selectedMemberNames.length === filtered.length) {
      setSelectedMemberNames([]);
    } else {
      setSelectedMemberNames(filtered);
    }
  };

  const handleToggleMemberSelect = (name: string) => {
    setSelectedMemberNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Submit batch
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!user) {
      setValidationError('Veuillez vous connecter avec votre compte Google.');
      return;
    }

    if (userPermission && !userPermission.canWrite) {
      setValidationError("Votre compte Google n'a pas les droits d'écriture sur le classeur Points RPA.");
      return;
    }

    if (rows.length === 0) {
      setValidationError('Veuillez ajouter au moins une ligne d’opération.');
      return;
    }

    // Validate each row
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.membre || r.membre.trim() === '') {
        setValidationError(`Ligne #${i + 1} : Veuillez choisir un membre RPA.`);
        return;
      }
      if (!r.dateRando || r.dateRando.trim() === '') {
        setValidationError(`Ligne #${i + 1} (${r.membre}) : La date de la rando est obligatoire.`);
        return;
      }
      if (typeof r.points !== 'number' || isNaN(r.points) || r.points === 0) {
        setValidationError(`Ligne #${i + 1} (${r.membre}) : Les points doivent être un nombre non nul.`);
        return;
      }
    }

    const validatedRows = rows.map((r) => ({
      ...r,
      motif: r.motif || DEFAULT_MOTIF,
      km: r.km !== undefined ? r.km : '',
      description: r.description || r.motif || DEFAULT_MOTIF,
    }));

    onSubmitBatch(validatedRows);
  };

  const totalPoints = rows.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  const filteredMembers = members.filter((m) =>
    m.nom.toLowerCase().includes(memberFilterText.toLowerCase())
  );

  return (
    <div className="rounded-2xl p-5 sm:p-6 border border-emerald-200/80 shadow-md space-y-6 transition-all bg-white">
      {/* Top Banner & Quick Setup Bar - Identique à la couleur de la box saisie unique */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-950 border border-emerald-400 px-2 py-0.5 rounded-full shadow-2xs">
                Saisie Multiple
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                Saisie en Série pour un Groupe de Membres
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Remplissez ou ajustez la ligne pour chaque participant, puis validez l'ensemble des opérations en un seul clic.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMultiSelectOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer active:scale-95"
          >
            <Users className="w-4 h-4 text-white" />
            <span>Sélection rapide de membres</span>
          </button>
        </div>

        {/* Global Presets / Paramètres par défaut */}
        <div className="bg-white/90 border border-emerald-200/90 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs shadow-2xs">
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Date par défaut
            </label>
            <input
              type="date"
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Points par défaut
            </label>
            <input
              type="number"
              value={defaultPoints}
              onChange={(e) => setDefaultPoints(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-black text-center focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Motif par défaut
            </label>
            <select
              value={defaultMotif}
              onChange={(e) => {
                const val = e.target.value;
                setDefaultMotif(val);
                const found = motifs.find((m) => m.label === val);
                if (found?.defaultPoints !== undefined && !isNaN(found.defaultPoints)) {
                  setDefaultPoints(found.defaultPoints);
                }
              }}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-xs"
            >
              {motifs.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Km par défaut
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={defaultKm}
              onChange={(e) => setDefaultKm(e.target.value)}
              placeholder="ex: 45"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyDefaultsToAll}
              className="w-full py-1.5 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              title="Appliquer cette date, ces points, ce motif et ces kilomètres à toutes les lignes existantes"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Appliquer à toutes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Rows Table */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead className="bg-gray-100/90 text-gray-700 uppercase font-black tracking-wider text-[10px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 w-52">Membre RPA *</th>
                  <th className="py-3 px-3 w-36">Date Rando *</th>
                  <th className="py-3 px-3 w-24 text-center">Points *</th>
                  <th className="py-3 px-3 w-48">Motif (Col D) *</th>
                  <th className="py-3 px-3 w-32 text-center">Km (Col E)</th>
                  <th className="py-3 px-3 w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-400 text-center">
                      {index + 1}
                    </td>

                    {/* Member */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.membre}
                        onChange={(e) => handleUpdateRow(row.id, 'membre', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      >
                        <option value="">-- Choisir un membre --</option>
                        {members.map((m) => (
                          <option key={m.nom} value={m.nom}>
                            {m.nom} {m.matricule ? `(${m.matricule})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3">
                      <input
                        type="date"
                        value={row.dateRando}
                        onChange={(e) => handleUpdateRow(row.id, 'dateRando', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      />
                    </td>

                    {/* Points */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={row.points}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'points', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 bg-white border border-gray-300 rounded-xl px-1.5 py-1.5 text-xs font-black text-center text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          required
                        />
                        <span className="text-[10px] font-bold text-gray-400">pts</span>
                      </div>
                    </td>

                    {/* Motif (Col D) */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.motif || row.description}
                        onChange={(e) => handleUpdateRow(row.id, 'motif', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-2 py-1.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      >
                        {row.motif && !motifs.some((m) => m.label === row.motif) && (
                          <option value={row.motif}>{row.motif}</option>
                        )}
                        {motifs.map((m, idx) => (
                          <option key={`${m.label}-${idx}`} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Km (Col E) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.km !== undefined ? row.km : ''}
                        onChange={(e) => handleUpdateRow(row.id, 'km', e.target.value)}
                        placeholder="ex: 45"
                        className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 font-semibold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Controls */}
          <div className="p-3 bg-gray-50/90 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:border-gray-400 font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ajouter une ligne</span>
              </button>

              <button
                type="button"
                onClick={handleDuplicateLastRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:border-gray-400 font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600" />
                <span>Dupliquer la dernière</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-500">
                {rows.length} ligne{rows.length > 1 ? 's' : ''} au total
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRows([
                      {
                        id: `batch-${Date.now()}`,
                        membre: members[0]?.nom || '',
                        dateRando: defaultDate || getTodayStr(),
                        points: defaultPoints,
                        motif: defaultMotif,
                        km: defaultKm,
                        description: defaultMotif,
                      },
                    ])
                  }
                  className="text-gray-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Submission Bar */}
        <div className="bg-slate-100 rounded-2xl p-4 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-600">Résumé de la mise à jour groupée</div>
              <div className="text-sm font-extrabold text-gray-900">
                {rows.length} membre{rows.length > 1 ? 's' : ''} concerné{rows.length > 1 ? 's' : ''} ·{' '}
                <span className="text-emerald-700 font-black">+{totalPoints} points</span> au total
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!user ? (
              <button
                type="button"
                onClick={onSignIn}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Connexion Google requise pour valider</span>
              </button>
            ) : userPermission && !userPermission.canWrite ? (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Accès en lecture seule sur le classeur</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 border border-emerald-600 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-amber-300" />
                <span>Enregistrer l'ensemble ({rows.length} membres)</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Multi-Select Members Modal */}
      {isMultiSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-emerald-950 text-white p-4 border-b-2 border-amber-500 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-white">Sélection multiple de membres RPA</h4>
                <p className="text-xs text-emerald-200">
                  Cochez les membres ayant participé à la même activité
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiSelectOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Search filter */}
              <input
                type="text"
                value={memberFilterText}
                onChange={(e) => setMemberFilterText(e.target.value)}
                placeholder="Rechercher un membre par nom..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                <button
                  type="button"
                  onClick={handleToggleSelectAllMembers}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  {selectedMemberNames.length === filteredMembers.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>
                <span className="font-medium">
                  {selectedMemberNames.length} sélectionné{selectedMemberNames.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Members Checklist */}
              <div className="border border-gray-200 rounded-xl overflow-y-auto flex-1 divide-y divide-gray-100 max-h-64">
                {filteredMembers.map((m) => {
                  const isChecked = selectedMemberNames.includes(m.nom);
                  return (
                    <label
                      key={m.nom}
                      onClick={() => handleToggleMemberSelect(m.nom)}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/80 font-bold text-emerald-950' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        <span>{m.nom}</span>
                      </div>
                      {m.matricule && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {m.matricule}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsMultiSelectOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddSelectedMembers}
                disabled={selectedMemberNames.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <span>Ajouter les {selectedMemberNames.length} membres sélectionnés</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
