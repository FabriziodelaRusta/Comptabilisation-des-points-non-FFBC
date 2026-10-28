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
} from 'lucide-react';
import { OperationRecord, Member } from '../types';
import { parseOperationDateTime } from '../lib/googleSheets';

interface RecentOperationsListProps {
  operations: OperationRecord[];
  selectedMember: Member | null;
  spreadsheetName?: string;
  isGoogleConnected: boolean;
  onEditOperation: (op: OperationRecord) => void;
  onDeleteOperation: (op: OperationRecord) => void;
  onSelectMemberFilter?: (nom: string) => void;
}

export const RecentOperationsList: React.FC<RecentOperationsListProps> = ({
  operations,
  selectedMember,
  spreadsheetName,
  isGoogleConnected,
  onEditOperation,
  onDeleteOperation,
  onSelectMemberFilter,
}) => {
  const [filterText, setFilterText] = useState('');

  // 1. Filter by selected member (unless "Tous" or null)
  const isAllSelected = !selectedMember || selectedMember.nom === 'Tous';

  const memberFiltered = isAllSelected
    ? operations
    : operations.filter(
        (op) => op.membre.trim().toLowerCase() === selectedMember.nom.trim().toLowerCase()
      );

  // 2. Filter by search input
  const searchFiltered = memberFiltered.filter((op) => {
    const q = filterText.toLowerCase();
    return (
      op.membre.toLowerCase().includes(q) ||
      op.description.toLowerCase().includes(q) ||
      op.dateRando.includes(q) ||
      op.dateOperation.includes(q) ||
      (op.mail && op.mail.toLowerCase().includes(q))
    );
  });

  // 3. Tri descendant date heure operations (Col G)
  const sortedOperations = [...searchFiltered].sort(
    (a, b) => parseOperationDateTime(b.dateOperation) - parseOperationDateTime(a.dateOperation)
  );

  // Summary statistics
  const totalPoints = memberFiltered.reduce((sum, op) => sum + op.points, 0);
  const positiveCount = memberFiltered.filter((op) => op.points > 0).length;

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
                  ? 'Toutes les opérations (Feuille Opérations)'
                  : `Opérations de : ${selectedMember?.nom}`}
              </span>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {sortedOperations.length} opération{sortedOperations.length > 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Tri descendant par date et heure d'insertion (Col G) • Colonnes A à G
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

      {/* Summary Chips */}
      <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs">
        <div className="text-gray-700">
          <span className="text-gray-500">Total points {isAllSelected ? 'global' : 'du membre'} :</span>{' '}
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
        <div className="text-gray-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Colonnes : Date rando, Nom, Points, Description, Mail, Date opération</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {sortedOperations.length > 0 ? (
          <table className="w-full text-left text-xs divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3.5 py-3">Date Rando (Col A)</th>
                <th className="px-3.5 py-3">Nom Membre (Col B)</th>
                <th className="px-3.5 py-3 text-center">Points (Col C)</th>
                <th className="px-3.5 py-3">Descriptions (Col D)</th>
                <th className="px-3.5 py-3">Mail Utilisateur (Col F)</th>
                <th className="px-3.5 py-3">Date Opération (Col G)</th>
                <th className="px-3.5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {sortedOperations.map((op) => {
                const isPos = op.points >= 0;
                return (
                  <tr key={op.id} className="hover:bg-emerald-50/30 transition-colors group">
                    {/* Col A: Date rando */}
                    <td className="px-3.5 py-3 text-gray-800 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{op.dateRando}</span>
                      </div>
                    </td>

                    {/* Col B: Nom membre */}
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

                    {/* Col C: Points */}
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

                    {/* Col D: Description */}
                    <td className="px-3.5 py-3 text-gray-800 font-medium max-w-xs truncate">
                      {op.description}
                    </td>

                    {/* Col F: Mail utilisateur */}
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

                    {/* Col G: Date opérations d'insertion */}
                    <td className="px-3.5 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{op.dateOperation}</span>
                      </div>
                    </td>

                    {/* Actions: Crayon (Modifier) et Poubelle (Supprimer) */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Crayon pour recharger et permettre la modif */}
                        <button
                          type="button"
                          onClick={() => onEditOperation(op)}
                          title="Modifier cette opération (recharger dans le formulaire)"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Poubelle pour effacer */}
                        <button
                          type="button"
                          onClick={() => onDeleteOperation(op)}
                          title="Supprimer cette opération"
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors border border-red-200"
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
          <div className="p-8 text-center text-gray-500 text-xs space-y-2">
            <AlertCircle className="w-6 h-6 text-gray-300 mx-auto" />
            {filterText ? (
              <p>Aucune opération ne correspond à votre recherche « {filterText} ».</p>
            ) : selectedMember && selectedMember.nom !== 'Tous' ? (
              <p>
                Aucune opération enregistrée pour le membre <strong>{selectedMember.nom}</strong>. Utilisez le formulaire ci-dessus pour lui attribuer des points.
              </p>
            ) : (
              <p>Aucune opération trouvée dans la feuille Opérations.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
