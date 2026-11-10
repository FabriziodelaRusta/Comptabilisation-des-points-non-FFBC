/**
 * Module de chargement et calcul des participations et points FFBC
 * Source : https://github.com/FabriziodelaRusta/Extract_data_from_FFBC_site/tree/main/data/participations
 * Règle de calcul : 1 point max par semaine active quel que soit le nombre de randos
 */

export interface FfbcParticipation {
  id: string;
  dateStr: string;
  parsedDate: Date;
  randoName: string;
  nom: string;
  parcours: string;
  km: number;
  challenges?: string;
  homologuee?: string;
  weekKey: string;
  weekNumber: number;
  weekYear: number;
  sourceFile: string;
}

export interface MemberFfbcSummary {
  nom: string;
  pointsFfbc: number;       // 1 point max par semaine active
  totalKmFfbc: number;      // Somme des kilomètres
  totalRandosFfbc: number;  // Nombre total de participations
  activeWeeksCount: number; // Nombre de semaines distinctes
  participations: FfbcParticipation[];
  participationsByWeek: Record<string, FfbcParticipation[]>;
}

export interface FfbcSeasonData {
  seasonYear: number;
  seasonStartDate: Date;
  seasonEndDate: Date;
  filesLoaded: string[];
  allParticipations: FfbcParticipation[];
  membersMap: Map<string, MemberFfbcSummary>;
  lastFetchedAt: Date;
}

/**
 * Calcule l'année de la saison active :
 * - Du 1er novembre au 31 décembre : saison = année civile + 1 (ex: Nov 2026 -> Saison 2027)
 * - Du 1er janvier au 31 octobre : saison = année civile en cours (ex: Mars 2027 -> Saison 2027)
 */
export function getCurrentSeasonYear(refDate: Date = new Date()): number {
  const month = refDate.getMonth(); // 0 = Janvier ... 10 = Novembre, 11 = Décembre
  const year = refDate.getFullYear();
  return month >= 10 ? year + 1 : year;
}

/**
 * Retourne la période stricte d'une saison cycliste RPA / FFBC :
 * Du 01/11/(seasonYear - 1) 00:00:00 au 01/11/seasonYear 00:00:00 (exclusif)
 */
export function getSeasonDateRange(seasonYear: number): { start: Date; end: Date } {
  const start = new Date(seasonYear - 1, 10, 1, 0, 0, 0, 0);
  const end = new Date(seasonYear, 10, 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Vérifie si une date appartient à la saison demandée
 */
export function isDateInSeason(d: Date, seasonYear: number): boolean {
  const { start, end } = getSeasonDateRange(seasonYear);
  const t = d.getTime();
  return t >= start.getTime() && t < end.getTime();
}

/**
 * Parse une date au format YYYY/MM/DD, YYYY-MM-DD, ou DD/MM/YYYY
 */
export function parseFfbcDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/["']/g, '').trim();

  // YYYY/MM/DD ou YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(y, m, d, 12, 0, 0);
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const frMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (frMatch) {
    const d = parseInt(frMatch[1], 10);
    const m = parseInt(frMatch[2], 10) - 1;
    const y = parseInt(frMatch[3], 10);
    return new Date(y, m, d, 12, 0, 0);
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Calcule le numéro de semaine ISO 8601 (la semaine débute strictement le lundi)
 */
export function getIsoWeek(d: Date): { weekNumber: number; year: number; weekKey: string } {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Lundi = 0, Dimanche = 6
  target.setDate(target.getDate() - dayNr + 3); // Jeudi le plus proche
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
  return { weekNumber, year, weekKey };
}

/**
 * Extrait la distance en kilomètres d'une chaîne parcours ou rando (ex: "ROUTE 150" -> 150, "EASY 45" -> 45)
 */
export function extractKm(parcours: string, randoName = ''): number {
  const pMatch = (parcours || '').match(/(\d+(?:[.,]\d+)?)/);
  if (pMatch) {
    const val = parseFloat(pMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  const rMatch = (randoName || '').match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
  if (rMatch) {
    const val = parseFloat(rMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  return 0;
}

/**
 * Normalise un nom pour la comparaison robuste (retrait accents, casse, inversion prénom/nom)
 */
export function normalizeNameForMatch(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vérifie si deux noms désignent le même membre RPA
 */
export function areMemberNamesEqual(a: string, b: string): boolean {
  const normA = normalizeNameForMatch(a);
  const normB = normalizeNameForMatch(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Comparaison par mots désordonnés (ex: "Fabrizio Podrecca" vs "Podrecca Fabrizio")
  const wordsA = normA.split(' ').sort().join(' ');
  const wordsB = normB.split(' ').sort().join(' ');
  if (wordsA === wordsB) return true;

  // Inclusion de nom de famille complet si >= 4 caractères
  if (wordsA.length >= 4 && wordsB.length >= 4) {
    if (wordsA.includes(wordsB) || wordsB.includes(wordsA)) return true;
  }

  return false;
}

/**
 * Découpe une ligne CSV avec délimiteur ';'
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;
  while (i < len) {
    while (i < len && (line[i] === ' ' || line[i] === '\t')) i++;
    if (i >= len) break;
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val.trim());
      while (i < len && line[i] !== ';') i++;
      if (i < len && line[i] === ';') {
        i++;
        if (i === len) fields.push('');
      }
    } else {
      let val = '';
      while (i < len && line[i] !== ';') {
        val += line[i];
        i++;
      }
      fields.push(val.trim());
      if (i < len && line[i] === ';') {
        i++;
        if (i === len) fields.push('');
      }
    }
  }
  return fields;
}

/**
 * Charge les fichiers CSV de participations FFBC depuis GitHub pour la saison donnée.
 * Règle utilisateur stricte :
 * - Saison 2027 : du 01/11/2026 au 31/10/2027.
 * - Aujourd'hui (Nov 2026), on lit RPA_participations_2026.csv (lignes >= 01/11/2026).
 * - Au 1er Janvier 2027, on lit RPA_participations_2026.csv ET RPA_participations_2027.csv.
 */
export async function loadFfbcParticipations(
  seasonYear: number = getCurrentSeasonYear()
): Promise<FfbcSeasonData> {
  const prevYear = seasonYear - 1;
  const currYear = seasonYear;

  // Liste des fichiers à interroger : [yyyy-1, yyyy]
  const targetFiles = [
    `RPA_participations_${prevYear}.csv`,
    `RPA_participations_${currYear}.csv`,
  ];

  const filesLoaded: string[] = [];
  const rawParticipations: FfbcParticipation[] = [];
  const { start, end } = getSeasonDateRange(seasonYear);

  for (const filename of targetFiles) {
    const rawUrl = `https://raw.githubusercontent.com/FabriziodelaRusta/Extract_data_from_FFBC_site/main/data/participations/${filename}`;
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) {
        // Fichier pas encore créé (ex: 2027.csv en novembre 2026) -> normal, on continue
        continue;
      }
      const text = await res.text();
      filesLoaded.push(filename);

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (idx === 0 && line.toLowerCase().includes('date')) continue; // Ligne d'en-tête

        const fields = parseCsvLine(line);
        if (fields.length < 3) continue;

        const dateStr = fields[0] || '';
        const parsedDate = parseFfbcDate(dateStr);
        if (!parsedDate) continue;

        // Filtrage strict : la participation doit appartenir à la saison
        if (!isDateInSeason(parsedDate, seasonYear)) continue;

        const randoName = (fields[1] || 'Rando').trim();
        const rawNom = (fields[2] || '').trim();
        if (!rawNom) continue;

        const parcours = (fields[3] || '').trim();
        const challenges = (fields[4] || '').trim();
        const homologuee = (fields[5] || '').trim();
        const km = extractKm(parcours, randoName);
        const { weekNumber, year: weekYear, weekKey } = getIsoWeek(parsedDate);

        rawParticipations.push({
          id: `ffbc-${filename}-${idx}-${dateStr}-${rawNom}`,
          dateStr,
          parsedDate,
          randoName,
          nom: rawNom,
          parcours,
          km,
          challenges,
          homologuee,
          weekKey,
          weekNumber,
          weekYear,
          sourceFile: filename,
        });
      }
    } catch (err) {
      console.warn(`Erreur lors du chargement de ${filename} depuis GitHub:`, err);
    }
  }

  // Déduplication exacte (même date, même membre, même rando)
  const dedupMap = new Map<string, FfbcParticipation>();
  for (const p of rawParticipations) {
    const key = `${p.parsedDate.getTime()}___${normalizeNameForMatch(p.nom)}___${normalizeNameForMatch(p.randoName)}___${p.km}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, p);
    }
  }
  const deduplicated = Array.from(dedupMap.values()).sort(
    (a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()
  );

  // Regroupement par membre et calcul des points (1 point max par semaine active)
  const membersMap = new Map<string, MemberFfbcSummary>();

  for (const part of deduplicated) {
    const normKey = normalizeNameForMatch(part.nom);
    if (!membersMap.has(normKey)) {
      membersMap.set(normKey, {
        nom: part.nom,
        pointsFfbc: 0,
        totalKmFfbc: 0,
        totalRandosFfbc: 0,
        activeWeeksCount: 0,
        participations: [],
        participationsByWeek: {},
      });
    }

    const summary = membersMap.get(normKey)!;
    summary.participations.push(part);
    summary.totalRandosFfbc += 1;
    summary.totalKmFfbc = Math.round((summary.totalKmFfbc + part.km) * 10) / 10;

    if (!summary.participationsByWeek[part.weekKey]) {
      summary.participationsByWeek[part.weekKey] = [];
    }
    summary.participationsByWeek[part.weekKey].push(part);
  }

  // Application de la règle : 1 point max par semaine active
  for (const summary of membersMap.values()) {
    summary.activeWeeksCount = Object.keys(summary.participationsByWeek).length;
    summary.pointsFfbc = summary.activeWeeksCount; // 1 point par semaine active
  }

  return {
    seasonYear,
    seasonStartDate: start,
    seasonEndDate: end,
    filesLoaded,
    allParticipations: deduplicated,
    membersMap,
    lastFetchedAt: new Date(),
  };
}

/**
 * Trouve le résumé FFBC correspondant à un nom de membre donné
 */
export function findMemberFfbcSummary(
  memberName: string,
  ffbcMembersMap: Map<string, MemberFfbcSummary>
): MemberFfbcSummary | null {
  if (!memberName || ffbcMembersMap.size === 0) return null;
  const norm = normalizeNameForMatch(memberName);

  // 1. Recherche par clé directe
  if (ffbcMembersMap.has(norm)) {
    return ffbcMembersMap.get(norm)!;
  }

  // 2. Recherche par comparaison floue
  for (const [key, summary] of ffbcMembersMap.entries()) {
    if (areMemberNamesEqual(memberName, summary.nom) || areMemberNamesEqual(norm, key)) {
      return summary;
    }
  }

  return null;
}
