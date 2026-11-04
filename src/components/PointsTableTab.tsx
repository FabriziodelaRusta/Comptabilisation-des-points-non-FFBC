import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member, OperationRecord, SheetConfig } from '../types';
import { CLUB_COLORS } from './HeaderBanner';

interface PointsTableTabProps {
  members: Member[];
  operations: OperationRecord[];
  sheetConfig: SheetConfig;
  onRefreshData?: () => void;
  isLoading?: boolean;
}

export interface MemberPointsSummary {
  nom: string;
  matricule?: string;
  afficherMajManuelle: boolean;
  totalPoints: number;
  operationsCount: number;
  lastDateRando?: string;
}

export const PointsTableTab: React.FC<PointsTableTabProps> = ({
  members,
  operations,
  sheetConfig,
  onRefreshData,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'points' | 'nom'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Compute points summary for EVERY member (regardless of checkbox)
  const memberSummaries = useMemo<MemberPointsSummary[]>(() => {
    // 1. Map of points computed from operations list
    const opsMap = new Map<string, { totalPoints: number; count: number; lastDate?: string }>();

    for (const op of operations) {
      const cleanName = (op.membre || '').trim();
      if (!cleanName) continue;
      const current = opsMap.get(cleanName) || { totalPoints: 0, count: 0 };
      current.totalPoints += Number(op.points) || 0;
      current.count += 1;
      if (op.dateRando) {
        current.lastDate = op.dateRando;
      }
      opsMap.set(cleanName, current);
    }

    // 2. Build list for all registered members
    const handledNames = new Set<string>();
    const list: MemberPointsSummary[] = [];

    for (const m of members) {
      const cleanName = (m.nom || '').trim();
      if (!cleanName || cleanName === 'Tous') continue;
      handledNames.add(cleanName.toLowerCase());

      const opData = opsMap.get(cleanName);
      // If member has base points in sheet, use it or add operations
      const basePoints = typeof m.pointsActuels === 'number' ? m.pointsActuels : 0;
      const opsPoints = opData ? opData.totalPoints : 0;
      const totalPoints = basePoints > 0 && opsPoints === 0 ? basePoints : opsPoints;

      list.push({
        nom: cleanName,
        matricule: m.matricule,
        afficherMajManuelle: m.afficherMajManuelle,
        totalPoints: totalPoints,
        operationsCount: opData ? opData.count : 0,
        lastDateRando: opData?.lastDate,
      });
    }

    // 3. Include any member present in operations but not in members sheet
    for (const [name, opData] of opsMap.entries()) {
      if (!handledNames.has(name.toLowerCase())) {
        list.push({
          nom: name,
          afficherMajManuelle: false,
          totalPoints: opData.totalPoints,
          operationsCount: opData.count,
          lastDateRando: opData.lastDate,
        });
      }
    }

    return list;
  }, [members, operations]);

  // Filtered and sorted members
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...memberSummaries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.nom.toLowerCase().includes(q) ||
          (m.matricule && m.matricule.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'points') {
        comparison = a.totalPoints - b.totalPoints;
      } else if (sortField === 'nom') {
        comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [memberSummaries, searchQuery, sortField, sortOrder]);

  // Global totals
  const totalPointsAll = useMemo(
    () => memberSummaries.reduce((sum, m) => sum + m.totalPoints, 0),
    [memberSummaries]
  );
  const totalFilteredPoints = useMemo(
    () => filteredAndSortedMembers.reduce((sum, m) => sum + m.totalPoints, 0),
    [filteredAndSortedMembers]
  );

  const handleSort = (field: 'points' | 'nom') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nom' ? 'asc' : 'desc');
    }
  };

  // Convert remote image to base64 for embedding in jsPDF
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Export PDF with official club header
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // 1. Draw top club color stripes (Bleu ciel #009ee2, Blanc #ffffff, Vert #5daf32)
      // Height 3.5mm spanning across margins
      doc.setFillColor(0, 158, 226); // #009ee2
      doc.rect(margin, 12, 10, 16, 'F');
      doc.setFillColor(255, 255, 255); // Blanc
      doc.rect(margin + 10, 12, 5, 16, 'F');
      doc.setFillColor(93, 175, 50); // #5daf32
      doc.rect(margin + 15, 12, 5, 16, 'F');

      // Thin border around club color stripe
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(margin, 12, 20, 16);

      // 2. Fetch and draw Logo RPA
      const logoUrl = 'https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png';
      const logoBase64 = await getBase64ImageFromUrl(logoUrl);
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', margin + 23, 12, 16, 16);
        } catch {
          // Fallback text if logo fails
          doc.setFillColor(30, 58, 138);
          doc.rect(margin + 23, 12, 16, 16, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('RPA', margin + 26, 22);
        }
      }

      // 3. Title Box & Header Info (Box en haut à gauche)
      const textStartX = margin + 42;
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Comptabilisation des points non-FFBC', textStartX, 17);

      // Version badge
      doc.setFillColor(219, 234, 254); // blue-100
      doc.roundedRect(textStartX + 88, 13, 12, 5, 1, 1, 'F');
      doc.setTextColor(30, 64, 175); // blue-800
      doc.setFontSize(8);
      doc.text('v1.0', textStartX + 89.5, 16.8);

      // Subtitle
      doc.setTextColor(37, 99, 235); // blue-600
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("Roue Princière d'Allain", textStartX, 22);

      // Metadata line
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Club affilié FFBC · ${sheetConfig.spreadsheetName || 'Points RPA'}`, textStartX, 26);

      // Date of export on top right
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} à ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Exporté le : ${dateStr}`, pageWidth - margin, 17, { align: 'right' });
      doc.text(`Total membres : ${filteredAndSortedMembers.length}`, pageWidth - margin, 22, {
        align: 'right',
      });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(`Total points : ${totalFilteredPoints} pts`, pageWidth - margin, 26, {
        align: 'right',
      });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 31, pageWidth - margin, 31);

      // 4. AutoTable with ONLY Membre and Points
      const tableData = filteredAndSortedMembers.map((m) => [
        m.nom,
        `${m.totalPoints} pts`,
      ]);

      // Total row in footer
      const footRow = [
        `TOTAL DES POINTS (${filteredAndSortedMembers.length} membres)`,
        `${totalFilteredPoints} pts`,
      ];

      autoTable(doc, {
        startY: 34,
        margin: { left: margin, right: margin },
        head: [['Membre', 'Points']],
        body: tableData,
        foot: [footRow],
        theme: 'striped',
        headStyles: {
          fillColor: [30, 58, 138], // Dark Blue / RPA
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [30, 58, 138] },
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 10,
        },
        styles: {
          fontSize: 9,
          cellPadding: 2.8,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
          // Footer page number
          const str = `Page ${data.pageNumber}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        },
      });

      // Save PDF file
      const fileName = `Points_RPA_Tableau_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}.pdf`;
      doc.save(fileName);
    } catch (err: any) {
      console.error("Erreur lors de l'exportation du PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards & Actions Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title and stats pill */}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Tableau des points des membres RPA</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {memberSummaries.length} membre{memberSummaries.length > 1 ? 's' : ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Totalisation en temps réel de tous les membres (avec ou sans case Maj_auto)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Export Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                  Total des points
                </span>
                <span className="font-mono font-black text-blue-700 text-sm">
                  {totalPointsAll > 0 ? `+${totalPointsAll}` : totalPointsAll} pts
                </span>
              </div>
            </div>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                disabled={isLoading}
                title="Actualiser les données"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf || memberSummaries.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exporter en PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un membre par nom ou matricule..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Trier par :</span>
            <button
              type="button"
              onClick={() => handleSort('points')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 ${
                sortField === 'points'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Points</span>
              {sortField === 'points' &&
                (sortOrder === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </button>
            <button
              type="button"
              onClick={() => handleSort('nom')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 ${
                sortField === 'nom'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Nom A-Z</span>
              {sortField === 'nom' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                ))}
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] select-none">
              <tr>
                <th
                  onClick={() => handleSort('nom')}
                  className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Membre</span>
                    {sortField === 'nom' &&
                      (sortOrder === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('points')}
                  className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors w-44"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Points</span>
                    {sortField === 'points' &&
                      (sortOrder === 'desc' ? (
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUp className="w-3 h-3 text-blue-600" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Aucun membre trouvé</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Essayez de modifier votre recherche.'
                        : 'Connectez le classeur Google Sheets pour charger les membres.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedMembers.map((m, idx) => {
                  return (
                    <tr
                      key={m.nom}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      {/* Nom */}
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 text-sm">{m.nom}</span>
                      </td>

                      {/* Points */}
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg inline-block ${
                            m.totalPoints > 0
                              ? 'text-blue-700 bg-blue-50 border border-blue-200/60'
                              : m.totalPoints < 0
                              ? 'text-red-700 bg-red-50 border border-red-200/60'
                              : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {m.totalPoints > 0 ? `+${m.totalPoints}` : m.totalPoints} pts
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Row in Footer */}
            {filteredAndSortedMembers.length > 0 && (
              <tfoot className="bg-slate-100/95 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="px-5 py-4">
                    <span className="uppercase tracking-wider text-xs font-black text-slate-800">
                      Total des points
                    </span>
                    <span className="text-xs text-slate-500 font-semibold ml-2">
                      ({filteredAndSortedMembers.length} membre
                      {filteredAndSortedMembers.length > 1 ? 's' : ''})
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-black text-base text-blue-700">
                    {totalFilteredPoints > 0 ? `+${totalFilteredPoints}` : totalFilteredPoints} pts
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
