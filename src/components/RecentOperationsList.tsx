import React, { useState } from 'react';
import {
  History,
  Calendar,
  User,
  PlusCircle,
  MinusCircle,
  Tag,
  Search,
  Pencil,
  Trash2,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Lock,
} from 'lucide-react';
import { OperationRecord, Member } from '../types';
import { parseOperationDateTime } from '../lib/googleSheets';

interface RecentOperationsListProps {
  operations: OperationRecord[];
  selectedMember: Member | null;
  spreadsheetName?: string;
  isGoogleConnected: boolean;
  canWrite?: boolean;
  onEditOperation: (op: OperationRecord) => void;
  onDeleteOperation: (op: OperationRecord) => void;
  onSelectMemberFilter?: (nom: string) => void;
  onLoadDemoData?: () => void;
}

type SortField = 'dateRando' | 'membre' | 'description' | 'dateOperation';
type SortDirection = 'asc' | 'desc';

export const RecentOperationsList: React.FC<RecentOperationsListProps> = ({
  operations,
  selectedMember,
  spreadsheetName,
  isGoogleConnected,
  canWrite = true,
  onEditOperation,
  onDeleteOperation,
  onSelectMemberFilter,
  onLoadDemoData,
}) => {
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateOperation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Toggle sort order
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'dateOperation' ? 'desc' : 'asc');
    }
  };

  // Helper to parse DD/MM/YYYY into timestamp
  const parseDateOnly = (str: string): number => {
    if (!str) return 0;
    const parts = str.trim().split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      return new Date(y, m - 1, d).getTime();
    }
    return new Date(str).getTime() || 0;
  };

  // 1. Filter by selected member (unless "Tous" or null)
  const isAllSelected = !selectedMember || selectedMember.nom === 'Tous';

  const memberFiltered = isAllSelected
    ? operations
    : operations.filter(
        (op) => (op.membre || '').trim().toLowerCase() === (selectedMember?.nom || '').trim().toLowerCase()
      );

  // 2. Filter by search input
  const searchFiltered = memberFiltered.filter((op) => {
    const q = filterText.toLowerCase();
    const membreStr = (op.membre || '').toLowerCase();
    const descStr = (op.description || '').toLowerCase();
    const dateRandoStr = op.dateRando || '';
    const dateOpStr = op.dateOperation || '';
    const mailStr = (op.mail || '').toLowerCase();
    return (
      membreStr.includes(q) ||
      descStr.includes(q) ||
      dateRandoStr.includes(q) ||
      dateOpStr.includes(q) ||
      mailStr.includes(q)
    );
  });

  // 3. Dynamic sorting based on sortField and sortDirection
  const sortedOperations = [...searchFiltered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'dateOperation') {
      cmp = parseOperationDateTime(a.dateOperation) - parseOperationDateTime(b.dateOperation);
    } else if (sortField === 'dateRando') {
      cmp = parseDateOnly(a.dateRando) - parseDateOnly(b.dateRando);
    } else if (sortField === 'membre') {
      cmp = (a.membre || '').localeCompare(b.membre || '', 'fr', { sensitivity: 'base' });
    } else if (sortField === 'description') {
      cmp = (a.description || '').localeCompare(b.description || '', 'fr', { sensitivity: 'base' });
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  // Summary statistics - Solde des points
  const totalPoints = memberFiltered.reduce((sum, op) => sum + op.points, 0);
  const positiveCount = memberFiltered.filter((op) => op.points > 0).length;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-700 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-700 ml-1 inline" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              isAllSelected ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isAllSelected ? <Users className="w-4 h-4" /> : <History className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>
                {isAllSelected
                  ? 'Toutes les opérations'
                  : `Opérations de : ${selectedMember?.nom}`}
              </span>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {sortedOperations.length} opération{sortedOperations.length > 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Historique des attributions de points • Cliquez sur les colonnes pour trier
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Rechercher date, nom, motif, mail..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Summary Chips - Solde des points */}
      <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs">
        <div className="text-gray-700">
          <span className="text-gray-500">Solde des points :</span>{' '}
          <strong className="text-emerald-800 font-extrabold text-sm ml-1">
            {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts
          </strong>
        </div>
        <div className="text-gray-400">•</div>
        <div className="text-gray-700">
          <span className="text-gray-500">Opérations positives :</span>{' '}
          <strong className="text-gray-800 font-semibold">{positiveCount}</strong>
        </div>
        <div className="text-gray-400">•</div>
        <div className="text-gray-700">
          <span className="text-gray-500">Total opérations :</span>{' '}
          <strong className="text-gray-800 font-semibold">{memberFiltered.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {sortedOperations.length > 0 ? (
          <table className="w-full text-left text-xs divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                {/* 1. Date Rando with sort */}
                <th
                  onClick={() => handleSort('dateRando')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>Date rando</span>
                    {renderSortIcon('dateRando')}
                  </div>
                </th>

                {/* 2. Nom Membre with sort */}
                <th
                  onClick={() => handleSort('membre')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>Nom membre</span>
                    {renderSortIcon('membre')}
                  </div>
                </th>

                {/* 3. Points */}
                <th className="px-3.5 py-3 text-center">
                  <span>Points</span>
                </th>

                {/* 4. Description with sort */}
                <th
                  onClick={() => handleSort('description')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>Description / Motif</span>
                    {renderSortIcon('description')}
                  </div>
                </th>

                {/* 5. Source (Col F) */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Source</span>
                </th>

                {/* 6. Mail Connexion (Col G) */}
                <th className="px-3.5 py-3">
                  <span>Mail connexion</span>
                </th>

                {/* 7. Date Opération with sort (Col H) */}
                <th
                  onClick={() => handleSort('dateOperation')}
                  className="px-3.5 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    <span>Date opération</span>
                    {renderSortIcon('dateOperation')}
                  </div>
                </th>

                {/* 8. Actions */}
                <th className="px-3.5 py-3 text-right">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {sortedOperations.map((op) => {
                const isPos = op.points >= 0;
                return (
                  <tr key={op.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-3.5 py-3 text-gray-800 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{op.dateRando}</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectMemberFilter && onSelectMemberFilter(op.membre)}
                        className="font-bold text-gray-900 hover:text-emerald-700 text-left hover:underline truncate max-w-[170px] block"
                        title={`Filtrer sur ${op.membre}`}
                      >
                        {op.membre}
                      </button>
                    </td>

                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-block font-black px-2 py-0.5 rounded-md text-xs ${
                          isPos
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isPos ? `+${op.points}` : op.points}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-gray-800 font-medium max-w-xs truncate">
                      {op.description}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        {op.source || 'WebApp RPA'}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-gray-500 text-[11px] font-mono whitespace-nowrap">
                      {op.mail ? (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[140px]" title={op.mail}>
                            {op.mail}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">-</span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{op.dateOperation}</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!op.isChecked && canWrite) onEditOperation(op);
                          }}
                          disabled={op.isChecked || !canWrite}
                          title={
                            op.isChecked
                              ? 'Opération validée (case cochée en colonne E) : modification verrouillée.'
                              : !canWrite
                              ? "Action désactivée : votre compte Google n'a pas les droits d'écriture (Éditeur) sur le classeur."
                              : 'Modifier cette opération (recharger dans le formulaire)'
                          }
                          className={`p-1.5 rounded-lg border transition-colors ${
                            op.isChecked || !canWrite
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200'
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!op.isChecked && canWrite) onDeleteOperation(op);
                          }}
                          disabled={op.isChecked || !canWrite}
                          title={
                            op.isChecked
                              ? 'Opération validée (case cochée en colonne E) : suppression verrouillée.'
                              : !canWrite
                              ? "Action désactivée : votre compte Google n'a pas les droits d'écriture (Éditeur) sur le classeur."
                              : 'Supprimer cette opération'
                          }
                          className={`p-1.5 rounded-lg border transition-colors ${
                            op.isChecked || !canWrite
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500 text-xs space-y-3">
            <AlertCircle className="w-6 h-6 text-gray-300 mx-auto" />
            {filterText ? (
              <p>Aucune opération ne correspond à votre recherche « {filterText} ».</p>
            ) : selectedMember && selectedMember.nom !== 'Tous' ? (
              <p>
                Aucune opération enregistrée pour le membre <strong>{selectedMember.nom}</strong>. Utilisez le formulaire ci-dessus pour lui attribuer des points.
              </p>
            ) : (
              <div className="space-y-2">
                <p>Aucune opération trouvée dans la feuille Opérations.</p>
                {onLoadDemoData && (
                  <button
                    type="button"
                    onClick={onLoadDemoData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-xs border border-emerald-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Charger des données de test (Démo locale)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
