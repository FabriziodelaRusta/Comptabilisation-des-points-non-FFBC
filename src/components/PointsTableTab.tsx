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
  Check,
  Bike,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member, OperationRecord, SheetConfig } from '../types';
import { CLUB_COLORS } from './HeaderBanner';
import {
  getCurrentSeasonYear,
  findMemberFfbcSummary,
  areMemberNamesEqual,
  FfbcSeasonData,
  MemberFfbcSummary,
} from '../lib/ffbcLoader';

interface PointsTableTabProps {
  members: Member[];
  operations: OperationRecord[];
  sheetConfig: SheetConfig;
  ffbcData?: FfbcSeasonData | null;
  isLoadingFfbc?: boolean;
  selectedMemberName?: string | null;
  onSelectMember?: (memberName: string | null) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
}

export interface MemberPointsSummary {
  nom: string;
  matricule?: string;
  afficherMajManuelle: boolean;
  pointsFfbc: number;          // 1 point max par semaine active (FFBC GitHub)
  pointsNonFfbcRando: number;  // Opérations Google Sheets dont le motif contient "rando"
  pointsAutres: number;        // Opérations Google Sheets pour les autres motifs
  pointsNonFfbc: number;       // pointsNonFfbcRando + pointsAutres (compatibilité)
  totalPoints: number;         // pointsFfbc + pointsNonFfbcRando + pointsAutres
  ffbcRandosCount: number;     // Total participations FFBC dans la saison
  ffbcKm: number;              // Total kilomètres FFBC
  ffbcWeeksCount: number;      // Nombre de semaines actives
  ffbcSummary?: MemberFfbcSummary | null;
  operationsCount: number;     // Opérations non-FFBC
  lastDateRando?: string;
}

export const PointsTableTab: React.FC<PointsTableTabProps> = ({
  members,
  operations,
  sheetConfig,
  ffbcData,
  isLoadingFfbc,
  selectedMemberName,
  onSelectMember,
  onRefreshData,
  isLoading,
}) => {
  const currentSeasonYear = useMemo(() => getCurrentSeasonYear(), []);
  const seasonYear = ffbcData?.seasonYear || currentSeasonYear;
  const previousYear = seasonYear - 1;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'total' | 'ffbc' | 'rando' | 'autres' | 'nom'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showFfbcDetails, setShowFfbcDetails] = useState(true);
  const [showNonFfbcDetails, setShowNonFfbcDetails] = useState(true);

  // Compute points summary for EVERY member (combining FFBC + Non-FFBC Rando + Autres)
  const memberSummaries = useMemo<MemberPointsSummary[]>(() => {
    // 1. Map of Google Sheet points split into Rando and Autres
    const opsMap = new Map<
      string,
      { randoPoints: number; autresPoints: number; totalPoints: number; count: number; lastDate?: string }
    >();

    for (const op of operations) {
      const cleanName = (op.membre || '').trim();
      if (!cleanName) continue;
      const current = opsMap.get(cleanName) || {
        randoPoints: 0,
        autresPoints: 0,
        totalPoints: 0,
        count: 0,
      };

      const pts = Number(op.points) || 0;
      const motifText = `${op.motif || ''} ${op.description || ''}`.toLowerCase();
      const hasRando = motifText.includes('rando');
      const hasNonFfbc =
        motifText.includes('non ffbc') ||
        motifText.includes('non-ffbc') ||
        motifText.includes('nonffbc') ||
        motifText.includes('non_ffbc');
      const isNonFfbc = hasRando && hasNonFfbc;

      if (isNonFfbc) {
        current.randoPoints += pts;
      } else {
        current.autresPoints += pts;
      }
      current.totalPoints += pts;
      current.count += 1;
      if (op.dateRando) {
        current.lastDate = op.dateRando;
      }
      opsMap.set(cleanName, current);
    }

    const handledNames = new Set<string>();
    const list: MemberPointsSummary[] = [];
    const ffbcMap = ffbcData?.membersMap || new Map<string, MemberFfbcSummary>();

    // 2. Build list for all registered members in Google Sheet
    for (const m of members) {
      const cleanName = (m.nom || '').trim();
      if (!cleanName || cleanName === 'Tous') continue;
      handledNames.add(cleanName.toLowerCase());

      const opData = opsMap.get(cleanName);
      const basePoints = typeof m.pointsActuels === 'number' ? m.pointsActuels : 0;
      const pointsNonFfbcRando = opData ? opData.randoPoints : 0;
      const pointsAutres = opData ? opData.autresPoints : basePoints;
      const pointsNonFfbc = pointsNonFfbcRando + pointsAutres;

      // Match with FFBC participations (1 point max per week)
      const ffbcSummary = findMemberFfbcSummary(cleanName, ffbcMap);
      const pointsFfbc = ffbcSummary ? ffbcSummary.pointsFfbc : 0;
      const totalPoints = pointsFfbc + pointsNonFfbcRando + pointsAutres;

      list.push({
        nom: cleanName,
        matricule: m.matricule,
        afficherMajManuelle: m.afficherMajManuelle,
        pointsFfbc,
        pointsNonFfbcRando,
        pointsAutres,
        pointsNonFfbc,
        totalPoints,
        ffbcRandosCount: ffbcSummary ? ffbcSummary.totalRandosFfbc : 0,
        ffbcKm: ffbcSummary ? ffbcSummary.totalKmFfbc : 0,
        ffbcWeeksCount: ffbcSummary ? ffbcSummary.activeWeeksCount : 0,
        ffbcSummary,
        operationsCount: opData ? opData.count : 0,
        lastDateRando: opData?.lastDate,
      });
    }

    // 3. Include any member present in FFBC data but not in members sheet
    for (const [key, ffbcSummary] of ffbcMap.entries()) {
      const alreadyHandled = Array.from(handledNames).some(
        (name) => name === ffbcSummary.nom.toLowerCase() || name.includes(key) || key.includes(name)
      );
      if (!alreadyHandled) {
        handledNames.add(ffbcSummary.nom.toLowerCase());
        const opData = opsMap.get(ffbcSummary.nom);
        const pointsNonFfbcRando = opData ? opData.randoPoints : 0;
        const pointsAutres = opData ? opData.autresPoints : 0;
        const pointsNonFfbc = pointsNonFfbcRando + pointsAutres;
        const totalPoints = ffbcSummary.pointsFfbc + pointsNonFfbcRando + pointsAutres;

        list.push({
          nom: ffbcSummary.nom,
          afficherMajManuelle: false,
          pointsFfbc: ffbcSummary.pointsFfbc,
          pointsNonFfbcRando,
          pointsAutres,
          pointsNonFfbc,
          totalPoints,
          ffbcRandosCount: ffbcSummary.totalRandosFfbc,
          ffbcKm: ffbcSummary.totalKmFfbc,
          ffbcWeeksCount: ffbcSummary.activeWeeksCount,
          ffbcSummary,
          operationsCount: opData ? opData.count : 0,
          lastDateRando: opData?.lastDate,
        });
      }
    }

    // 4. Include any member present in operations but not yet handled
    for (const [name, opData] of opsMap.entries()) {
      if (!handledNames.has(name.toLowerCase())) {
        const ffbcSummary = findMemberFfbcSummary(name, ffbcMap);
        const pointsFfbc = ffbcSummary ? ffbcSummary.pointsFfbc : 0;
        const pointsNonFfbcRando = opData.randoPoints;
        const pointsAutres = opData.autresPoints;
        const pointsNonFfbc = pointsNonFfbcRando + pointsAutres;
        const totalPoints = pointsFfbc + pointsNonFfbcRando + pointsAutres;

        list.push({
          nom: name,
          afficherMajManuelle: false,
          pointsFfbc,
          pointsNonFfbcRando,
          pointsAutres,
          pointsNonFfbc,
          totalPoints,
          ffbcRandosCount: ffbcSummary ? ffbcSummary.totalRandosFfbc : 0,
          ffbcKm: ffbcSummary ? ffbcSummary.totalKmFfbc : 0,
          ffbcWeeksCount: ffbcSummary ? ffbcSummary.activeWeeksCount : 0,
          ffbcSummary,
          operationsCount: opData.count,
          lastDateRando: opData.lastDate,
        });
      }
    }

    return list;
  }, [members, operations, ffbcData]);

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
      if (sortField === 'total') {
        comparison = a.totalPoints - b.totalPoints;
      } else if (sortField === 'ffbc') {
        comparison = a.pointsFfbc - b.pointsFfbc;
      } else if (sortField === 'rando') {
        comparison = a.pointsNonFfbcRando - b.pointsNonFfbcRando;
      } else if (sortField === 'autres') {
        comparison = a.pointsAutres - b.pointsAutres;
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
  const totalFfbcAll = useMemo(
    () => memberSummaries.reduce((sum, m) => sum + m.pointsFfbc, 0),
    [memberSummaries]
  );
  const totalRandoAll = useMemo(
    () => memberSummaries.reduce((sum, m) => sum + m.pointsNonFfbcRando, 0),
    [memberSummaries]
  );
  const totalAutresAll = useMemo(
    () => memberSummaries.reduce((sum, m) => sum + m.pointsAutres, 0),
    [memberSummaries]
  );

  const totalFilteredPoints = useMemo(
    () => filteredAndSortedMembers.reduce((sum, m) => sum + m.totalPoints, 0),
    [filteredAndSortedMembers]
  );
  const totalFilteredFfbc = useMemo(
    () => filteredAndSortedMembers.reduce((sum, m) => sum + m.pointsFfbc, 0),
    [filteredAndSortedMembers]
  );
  const totalFilteredRando = useMemo(
    () => filteredAndSortedMembers.reduce((sum, m) => sum + m.pointsNonFfbcRando, 0),
    [filteredAndSortedMembers]
  );
  const totalFilteredAutres = useMemo(
    () => filteredAndSortedMembers.reduce((sum, m) => sum + m.pointsAutres, 0),
    [filteredAndSortedMembers]
  );

  // Selected member details
  const selectedMemberSummary = useMemo(() => {
    if (!selectedMemberName) return null;
    return (
      memberSummaries.find(
        (m) => m.nom.trim().toLowerCase() === selectedMemberName.trim().toLowerCase()
      ) || null
    );
  }, [selectedMemberName, memberSummaries]);

  // Selected member non-FFBC operations (sorties comptabilisées dans la colonne NON-FFBC)
  const selectedMemberNonFfbcOperations = useMemo<OperationRecord[]>(() => {
    if (!selectedMemberName) return [];
    return operations.filter((op) => {
      if (!areMemberNamesEqual(op.membre, selectedMemberName)) return false;
      const motifText = `${op.motif || ''} ${op.description || ''}`.toLowerCase();
      const hasRando = motifText.includes('rando');
      const hasNonFfbc =
        motifText.includes('non ffbc') ||
        motifText.includes('non-ffbc') ||
        motifText.includes('nonffbc') ||
        motifText.includes('non_ffbc');
      return hasRando && hasNonFfbc;
    });
  }, [selectedMemberName, operations]);

  const handleSort = (field: 'total' | 'ffbc' | 'rando' | 'autres' | 'nom') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nom' ? 'asc' : 'desc');
    }
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (filteredAndSortedMembers.length === 0) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // 1. Les 3 bandes tricolores du club RPA à gauche du logo (hauteur du logo : 16mm)
      const logoTop = 10;
      const logoHeight = 16;
      const logoWidth = 16;

      // Bande bleu ciel (#009ee2)
      doc.setFillColor(0, 158, 226);
      doc.rect(margin, logoTop, 2.5, logoHeight, 'F');

      // Bande blanche (#ffffff) avec bordure discrète
      doc.setFillColor(255, 255, 255);
      doc.rect(margin + 2.5, logoTop, 1.4, logoHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.rect(margin + 2.5, logoTop, 1.4, logoHeight, 'S');

      // Bande verte (#5daf32)
      doc.setFillColor(93, 175, 50);
      doc.rect(margin + 3.9, logoTop, 1.4, logoHeight, 'F');

      // 2. Logo RPA à droite des bandes tricolores
      const logoX = margin + 7.5;
      const logoUrl = 'https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png';
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });
        doc.addImage(img, 'PNG', logoX, logoTop, logoWidth, logoHeight);
      } catch {
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(logoX, logoTop, logoWidth, logoHeight, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('RPA', logoX + 4, logoTop + 10);
      }

      // 3. Header Texts (à droite du logo)
      const textStartX = logoX + logoWidth + 5;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Comptabilisation des points · Saison ${seasonYear}`, textStartX, 15);

      // Subtitle
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text("Roue Princière d'Allain", textStartX, 20);

      // Metadata line
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Période : 01/11/${previousYear} au 31/10/${seasonYear} · FFBC + NON-FFBC + AUTRES`,
        textStartX,
        24.5
      );

      // Date of export on top right
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} à ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Exporté le : ${dateStr}`, pageWidth - margin, 15, { align: 'right' });
      doc.text(`Membres : ${filteredAndSortedMembers.length}`, pageWidth - margin, 19.5, {
        align: 'right',
      });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(`Total points : ${totalFilteredPoints} pts`, pageWidth - margin, 24, {
        align: 'right',
      });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // 4. AutoTable with 5 columns: Membre, FFBC, NON-FFBC, AUTRES, Total
      const tableData = filteredAndSortedMembers.map((m) => [
        m.nom,
        `${m.pointsFfbc} pts`,
        `${m.pointsNonFfbcRando > 0 ? `+${m.pointsNonFfbcRando}` : m.pointsNonFfbcRando} pts`,
        `${m.pointsAutres > 0 ? `+${m.pointsAutres}` : m.pointsAutres} pts`,
        `${m.totalPoints > 0 ? `+${m.totalPoints}` : m.totalPoints} pts`,
      ]);

      const footRow = [
        `TOTAL (${filteredAndSortedMembers.length} membres)`,
        `${totalFilteredFfbc} pts`,
        `${totalFilteredRando > 0 ? `+${totalFilteredRando}` : totalFilteredRando} pts`,
        `${totalFilteredAutres > 0 ? `+${totalFilteredAutres}` : totalFilteredAutres} pts`,
        `${totalFilteredPoints > 0 ? `+${totalFilteredPoints}` : totalFilteredPoints} pts`,
      ];

      autoTable(doc, {
        startY: 31,
        margin: { left: margin, right: margin },
        head: [['Membre', 'FFBC', 'NON-FFBC', 'AUTRES', `Total ${seasonYear}`]],
        body: tableData,
        foot: [footRow],
        theme: 'striped',
        headStyles: {
          fillColor: [0, 158, 226],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold', halign: 'left' },
          1: { cellWidth: 36, halign: 'right' },
          2: { cellWidth: 34, halign: 'right' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [30, 64, 175] },
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        didParseCell: (data) => {
          if (data.section === 'foot') {
            if (data.column.index === 0) {
              data.cell.styles.halign = 'left';
            } else {
              // Aligner strictement les totaux en dessous des nombres dans les colonnes
              data.cell.styles.halign = 'right';
            }
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      const fileName = `Points_RPA_Saison_${seasonYear}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err);
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
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Tableau des points RPA</span>
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                    Saison {seasonYear}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {memberSummaries.length} membre{memberSummaries.length > 1 ? 's' : ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Période du 01/11/{previousYear} au 31/10/{seasonYear} • FFBC (1 pt max / semaine) + Saisies club NON-FFBC et AUTRES
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Export Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Metric 1: FFBC */}
            <div className="flex items-center bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200/70 text-xs shadow-2xs">
              <div>
                <span className="text-blue-700 block text-[10px] font-bold uppercase tracking-wider">
                  FFBC
                </span>
                <span className="font-mono font-black text-blue-900 text-sm">
                  {totalFfbcAll} pts
                </span>
              </div>
            </div>

            {/* Metric 2: NON-FFBC */}
            <div className="flex items-center bg-emerald-50/70 px-3 py-1.5 rounded-xl border border-emerald-200/70 text-xs shadow-2xs">
              <div>
                <span className="text-emerald-700 block text-[10px] font-bold uppercase tracking-wider">
                  NON-FFBC
                </span>
                <span className="font-mono font-black text-emerald-900 text-sm">
                  {totalRandoAll > 0 ? `+${totalRandoAll}` : totalRandoAll} pts
                </span>
              </div>
            </div>

            {/* Metric 3: AUTRES */}
            <div className="flex items-center bg-purple-50/70 px-3 py-1.5 rounded-xl border border-purple-200/70 text-xs shadow-2xs">
              <div>
                <span className="text-purple-700 block text-[10px] font-bold uppercase tracking-wider">
                  AUTRES
                </span>
                <span className="font-mono font-black text-purple-900 text-sm">
                  {totalAutresAll > 0 ? `+${totalAutresAll}` : totalAutresAll} pts
                </span>
              </div>
            </div>

            {/* Metric 4: Total */}
            <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-700 px-3.5 py-1.5 rounded-xl text-white text-xs shadow-2xs">
              <div>
                <span className="text-blue-100 block text-[10px] font-black uppercase tracking-wider">
                  Total {seasonYear}
                </span>
                <span className="font-mono font-black text-white text-sm">
                  {totalPointsAll > 0 ? `+${totalPointsAll}` : totalPointsAll} pts
                </span>
              </div>
            </div>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                disabled={isLoading || isLoadingFfbc}
                title="Actualiser les données Google Sheets et GitHub"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-all active:scale-95 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading || isLoadingFfbc ? 'animate-spin text-blue-600' : ''}`}
                />
              </button>
            )}

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf || memberSummaries.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exporter PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Sort bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un membre par nom ou prénom..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold">Trier par :</span>
            <button
              type="button"
              onClick={() => handleSort('total')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
                sortField === 'total'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Total {seasonYear}</span>
              {sortField === 'total' &&
                (sortOrder === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </button>
            <button
              type="button"
              onClick={() => handleSort('ffbc')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
                sortField === 'ffbc'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>FFBC</span>
              {sortField === 'ffbc' &&
                (sortOrder === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </button>
            <button
              type="button"
              onClick={() => handleSort('rando')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
                sortField === 'rando'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>NON-FFBC</span>
              {sortField === 'rando' &&
                (sortOrder === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </button>
            <button
              type="button"
              onClick={() => handleSort('autres')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
                sortField === 'autres'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>AUTRES</span>
              {sortField === 'autres' &&
                (sortOrder === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </button>
            <button
              type="button"
              onClick={() => handleSort('nom')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
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

        {/* Selected Member Notification & FFBC Breakdown Banner */}
        {selectedMemberName && (
          <div className="mt-3 space-y-2 animate-in fade-in duration-150">
            <div className="p-3 rounded-2xl bg-blue-50/90 border border-blue-200/90 flex flex-wrap items-center justify-between gap-2.5 text-xs text-blue-950">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="font-semibold text-slate-600">Membre sélectionné :</span>
                <span className="font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {selectedMemberName}
                </span>
                {selectedMemberSummary && (
                  <span className="font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                    Total : {selectedMemberSummary.totalPoints} pts (
                    {selectedMemberSummary.pointsFfbc} FFBC + {selectedMemberSummary.pointsNonFfbcRando} NON-FFBC + {selectedMemberSummary.pointsAutres} AUTRES)
                  </span>
                )}
                <span className="text-slate-500 text-[11px]">
                  (Détail complet des opérations ci-dessous)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedMemberSummary && selectedMemberSummary.ffbcRandosCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFfbcDetails(!showFfbcDetails)}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-300 hover:border-blue-400 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Bike className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {showFfbcDetails ? 'Masquer sorties FFBC' : `Voir ${selectedMemberSummary.ffbcRandosCount} sorties FFBC`}
                    </span>
                    {showFfbcDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {selectedMemberNonFfbcOperations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNonFfbcDetails(!showNonFfbcDetails)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 hover:border-emerald-400 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Bike className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {showNonFfbcDetails
                        ? 'Masquer sorties NON-FFBC'
                        : `Voir ${selectedMemberNonFfbcOperations.length} sorties NON-FFBC`}
                    </span>
                    {showNonFfbcDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {onSelectMember && (
                  <button
                    type="button"
                    onClick={() => onSelectMember(null)}
                    className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
                  >
                    Afficher tous les membres
                  </button>
                )}
              </div>
            </div>

            {/* Expandable FFBC Participations Card for the selected member */}
            {selectedMemberSummary &&
              selectedMemberSummary.ffbcSummary &&
              selectedMemberSummary.ffbcSummary.participations.length > 0 &&
              showFfbcDetails && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <Bike className="w-4 h-4 text-blue-600" />
                      <span>
                        Sorties FFBC Saison {seasonYear} ({selectedMemberSummary.pointsFfbc} point
                        {selectedMemberSummary.pointsFfbc > 1 ? 's' : ''} sur{' '}
                        {selectedMemberSummary.ffbcWeeksCount} semaine
                        {selectedMemberSummary.ffbcWeeksCount > 1 ? 's' : ''} active
                        {selectedMemberSummary.ffbcWeeksCount > 1 ? 's' : ''} •{' '}
                        {selectedMemberSummary.ffbcKm} km au total)
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-700 font-semibold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                      Règle : 1 point max / semaine
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-xl border border-blue-100 bg-white">
                    <table className="w-full text-center text-xs divide-y divide-blue-50">
                      <thead className="bg-[#009ee2] text-white font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2 text-center">Date</th>
                          <th className="px-3 py-2 text-center">Randonnée</th>
                          <th className="px-3 py-2 text-center">Parcours</th>
                          <th className="px-3 py-2 text-center">Distance</th>
                          <th className="px-3 py-2 text-center">Semaine ISO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMemberSummary.ffbcSummary.participations.map((part) => (
                          <tr key={part.id} className="hover:bg-blue-50/30">
                            <td className="px-3 py-2 font-mono text-slate-700">{part.dateStr}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{part.randoName}</td>
                            <td className="px-3 py-2 text-slate-600">{part.parcours || '—'}</td>
                            <td className="px-3 py-2 text-center font-bold text-blue-700">
                              {part.km > 0 ? `${part.km} km` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                S{part.weekNumber}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Expandable NON-FFBC Participations Card for the selected member */}
            {selectedMemberNonFfbcOperations.length > 0 && showNonFfbcDetails && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-emerald-600" />
                    <span>
                      Sorties NON-FFBC ({selectedMemberSummary?.pointsNonFfbcRando || 0} point
                      {(selectedMemberSummary?.pointsNonFfbcRando || 0) > 1 ? 's' : ''} •{' '}
                      {selectedMemberNonFfbcOperations.length} sortie
                      {selectedMemberNonFfbcOperations.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    Saisie classeur Google Sheets
                  </span>
                </div>

                <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-xl border border-emerald-100 bg-white">
                  <table className="w-full text-center text-xs divide-y divide-emerald-50">
                    <thead className="bg-[#5daf32] text-white font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-center">Date</th>
                        <th className="px-3 py-2 text-center">Description / Motif</th>
                        <th className="px-3 py-2 text-center">Distance</th>
                        <th className="px-3 py-2 text-center">Points</th>
                        <th className="px-3 py-2 text-center">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMemberNonFfbcOperations.map((op, idx) => (
                        <tr key={op.id || `${op.dateRando}-${idx}`} className="hover:bg-emerald-50/30">
                          <td className="px-3 py-2 font-mono text-slate-700">{op.dateRando}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {op.description || op.motif || 'Rando non-FFBC'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700">
                            {op.km ? `${op.km} km` : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              +{op.points} pt{Number(op.points) > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] text-slate-500">
                            {op.source || 'Google Sheets'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-[#009ee2] text-white font-bold uppercase tracking-wider text-[11px] select-none">
              <tr>
                {/* 1. Membre */}
                <th
                  onClick={() => handleSort('nom')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-[#008cc9] transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Membre</span>
                    {sortField === 'nom' &&
                      (sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      ))}
                  </div>
                </th>

                {/* 2. FFBC */}
                <th
                  onClick={() => handleSort('ffbc')}
                  className="px-4 py-3.5 text-center cursor-pointer hover:bg-[#008cc9] transition-colors w-40"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>FFBC</span>
                    {sortField === 'ffbc' &&
                      (sortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ))}
                  </div>
                </th>

                {/* 3. NON-FFBC */}
                <th
                  onClick={() => handleSort('rando')}
                  className="px-4 py-3.5 text-center cursor-pointer hover:bg-[#008cc9] transition-colors w-40"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>NON-FFBC</span>
                    {sortField === 'rando' &&
                      (sortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ))}
                  </div>
                </th>

                {/* 4. AUTRES */}
                <th
                  onClick={() => handleSort('autres')}
                  className="px-4 py-3.5 text-center cursor-pointer hover:bg-[#008cc9] transition-colors w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>AUTRES</span>
                    {sortField === 'autres' &&
                      (sortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ))}
                  </div>
                </th>

                {/* 5. Total Points Saison */}
                <th
                  onClick={() => handleSort('total')}
                  className="px-5 py-3.5 text-center cursor-pointer hover:bg-[#008cc9] transition-colors w-40"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total {seasonYear}</span>
                    {sortField === 'total' &&
                      (sortOrder === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
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
                  const isSelected =
                     Boolean(selectedMemberName) &&
                     selectedMemberName?.trim().toLowerCase() === m.nom.trim().toLowerCase();
                  return (
                    <tr
                      key={m.nom}
                      onClick={() => onSelectMember && onSelectMember(isSelected ? null : m.nom)}
                      title={
                        onSelectMember
                          ? isSelected
                            ? 'Cliquer pour afficher toutes les opérations'
                            : `Cliquer pour afficher le détail des opérations de ${m.nom} dans la liste ci-dessous`
                          : undefined
                      }
                      className={`transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-100/90 border-l-4 border-l-[#009ee2] font-medium shadow-2xs'
                          : idx % 2 === 1
                          ? 'bg-slate-50/30 hover:bg-blue-50/60'
                          : 'bg-white hover:bg-blue-50/60'
                      }`}
                    >
                      {/* 1. Nom */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              isSelected ? 'text-blue-900' : 'text-slate-900'
                            }`}
                          >
                            {m.nom}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#009ee2] text-white px-2 py-0.5 rounded-md shadow-2xs">
                              Détail affiché
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Points FFBC */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                              m.pointsFfbc > 0
                                ? 'text-blue-800 bg-blue-50 border border-blue-200/70'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                          >
                            {m.pointsFfbc} pt{m.pointsFfbc > 1 ? 's' : ''}
                          </span>
                          {m.ffbcRandosCount > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {m.ffbcRandosCount} sortie{m.ffbcRandosCount > 1 ? 's' : ''} · {m.ffbcKm} km
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. NON-FFBC */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block ${
                            m.pointsNonFfbcRando > 0
                              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200/70'
                              : m.pointsNonFfbcRando < 0
                              ? 'text-red-700 bg-red-50 border border-red-200/60'
                              : 'text-slate-400 bg-slate-50'
                          }`}
                        >
                          {m.pointsNonFfbcRando > 0 ? `+${m.pointsNonFfbcRando}` : m.pointsNonFfbcRando} pt
                          {Math.abs(m.pointsNonFfbcRando) > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 4. AUTRES */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md inline-block ${
                            m.pointsAutres > 0
                              ? 'text-purple-800 bg-purple-50 border border-purple-200/70'
                              : m.pointsAutres < 0
                              ? 'text-red-700 bg-red-50 border border-red-200/60'
                              : 'text-slate-400 bg-slate-50'
                          }`}
                        >
                          {m.pointsAutres > 0 ? `+${m.pointsAutres}` : m.pointsAutres} pt
                          {Math.abs(m.pointsAutres) > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 5. Total Points */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg inline-block ${
                            m.totalPoints > 0
                              ? isSelected
                                ? 'text-blue-950 bg-blue-200/80 border border-blue-300'
                                : 'text-blue-700 bg-blue-50 border border-blue-200/60'
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
                      Total Saison {seasonYear}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold ml-2">
                      ({filteredAndSortedMembers.length} membre
                      {filteredAndSortedMembers.length > 1 ? 's' : ''})
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-black text-xs text-blue-800">
                    {totalFilteredFfbc} pts
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-black text-xs text-emerald-800">
                    {totalFilteredRando > 0 ? `+${totalFilteredRando}` : totalFilteredRando} pts
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-black text-xs text-purple-800">
                    {totalFilteredAutres > 0 ? `+${totalFilteredAutres}` : totalFilteredAutres} pts
                  </td>
                  <td className="px-5 py-4 text-center font-mono font-black text-base text-blue-700">
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
