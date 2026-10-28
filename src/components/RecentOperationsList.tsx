import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  Calendar,
  User,
  PlusCircle,
  MinusCircle,
  Tag,
  CheckCircle2,
  Search,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { OperationRecord } from '../types';

interface RecentOperationsListProps {
  operations: OperationRecord[];
  spreadsheetName?: string;
  isGoogleConnected: boolean;
  onSelectMemberFilter?: (nom: string) => void;
}

export const RecentOperationsList: React.FC<RecentOperationsListProps> = ({
  operations,
  spreadsheetName,
  isGoogleConnected,
  onSelectMemberFilter,
}) => {
  const [filterText, setFilterText] = useState('');

  const filtered = operations.filter((op) => {
    const q = filterText.toLowerCase();
    return (
      op.membre.toLowerCase().includes(q) ||
      op.motif.toLowerCase().includes(q) ||
      op.dateOperation.includes(q) ||
      op.dateEvenement.includes(q)
    );
  });

  // Calculate summary stats
  const totalPoints = operations.reduce((sum, op) => sum + op.points, 0);
  const positiveCount = operations.filter((op) => op.points > 0).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Opérations Récemment Insérées</span>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {operations.length} enregistrement{operations.length > 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Feuille Google « <strong className="text-emerald-700">Opérations</strong> » avec horodatage automatique (jj/mm/AAAA HH:MM:SS)
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrer membre, motif..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Summary Chips */}
      <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center gap-4 text-xs">
        <div className="text-gray-700">
          <span className="text-gray-500">Total points attribués :</span>{' '}
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
          <span>Synchronisation Google Sheets active</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filtered.length > 0 ? (
          <table className="w-full text-left text-xs divide-y divide-gray-100">
            <thead className="bg-gray-50 text-gray-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Date Opération (Horodatage)</th>
                <th className="px-4 py-3">Date Événement</th>
                <th className="px-4 py-3">Membre RPA</th>
                <th className="px-4 py-3 text-center">Points</th>
                <th className="px-4 py-3">Motif (Form_Points_non_FFBC)</th>
                <th className="px-4 py-3 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filtered.map((op) => {
                const isPos = op.points >= 0;
                return (
                  <tr key={op.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-700 whitespace-nowrap">
                      {op.dateOperation}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {op.dateEvenement}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectMemberFilter && onSelectMemberFilter(op.membre)}
                        className="font-bold text-gray-900 hover:text-emerald-700 text-left hover:underline"
                        title="Sélectionner ce membre"
                      >
                        {op.membre}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block font-extrabold px-2 py-0.5 rounded-md ${
                          isPos
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isPos ? `+${op.points}` : op.points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium max-w-xs truncate">
                      {op.motif}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Inséré</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500 text-xs">
            {filterText ? (
              <p>Aucune opération ne correspond à votre recherche « {filterText} ».</p>
            ) : (
              <p>Aucune opération enregistrée pour le moment. Choisissez un membre ci-dessus pour débuter la saisie.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
