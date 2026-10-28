import { Member, MotifKey, OperationRecord } from '../types';
import { getAccessToken } from './firebase';

export const LOCAL_STORAGE_SHEET_KEY = 'rpa_sheets_config_v1';
export const LOCAL_STORAGE_SAVED_OPERATIONS = 'rpa_cached_operations_v1';

export const SAMPLE_APPS_SCRIPT_CODE = `// ========================================================
// Code Google Apps Script (Code.gs) pour la WebApp RPA Points Non-FFBC
// Copiez ce code dans Extensions > Apps Script de votre classeur RPA
// ========================================================

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e && e.parameter && e.parameter.action) || 'status';

  if (action === 'getMembers') {
    const sheet = ss.getSheetByName('Membres');
    if (!sheet) return jsonResponse({ success: false, error: "Feuille Membres introuvable" });
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ success: true, members: [] });
    
    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    let nomIdx = headers.findIndex(h => h.includes('nom') || h === 'membre');
    if (nomIdx === -1) nomIdx = 0;
    const majIdx = headers.findIndex(h => h.includes('maj') || h.includes('manuelle') || h === 'afficher');
    const matriculeIdx = headers.findIndex(h => h.includes('matricule') || h.includes('id'));
    
    const members = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nom = row[nomIdx];
      if (!nom || String(nom).trim() === '') continue;
      
      let isMaj = true;
      if (majIdx !== -1) {
        const val = row[majIdx];
        isMaj = val === true || String(val).toUpperCase() === 'TRUE' || String(val).toUpperCase() === 'VRAI' || val === 1 || val === '1';
      }
      
      if (isMaj) {
        members.push({
          nom: String(nom).trim(),
          matricule: matriculeIdx !== -1 && row[matriculeIdx] ? String(row[matriculeIdx]) : ''
        });
      }
    }
    return jsonResponse({ success: true, members: members });
  }

  if (action === 'getKeys') {
    const sheet = ss.getSheetByName('Keys');
    if (!sheet) return jsonResponse({ success: true, motifs: [] });
    const data = sheet.getDataRange().getValues();
    const motifs = [];
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === 'Form_Points_non_FFBC') {
        motifs.push({
          key: 'Form_Points_non_FFBC',
          label: String(data[i][1]).trim(),
          defaultPoints: data[i][2] ? Number(data[i][2]) : undefined
        });
      }
    }
    return jsonResponse({ success: true, motifs: motifs });
  }

  return jsonResponse({ success: true, status: 'OK', title: ss.getName() });
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'addOperation') {
      let sheet = ss.getSheetByName('Opérations');
      if (!sheet) {
        sheet = ss.insertSheet('Opérations');
        sheet.appendRow(['Date Opération', 'Date Événement', 'Membre', 'Points', 'Motif', 'Saisi par']);
      }
      sheet.appendRow([
        body.dateOperation,
        body.dateEvenement,
        body.membre,
        body.points,
        body.motif,
        body.saisiPar || 'WebApp RPA'
      ]);
      return jsonResponse({ success: true });
    }

    if (body.action === 'addMember') {
      let sheet = ss.getSheetByName('Membres');
      if (!sheet) sheet = ss.insertSheet('Membres');
      sheet.appendRow([body.nom, body.matricule || '', true, 'Ajouté via WebApp']);
      return jsonResponse({ success: true });
    }

    if (body.action === 'addMotif') {
      let sheet = ss.getSheetByName('Keys');
      if (!sheet) sheet = ss.insertSheet('Keys');
      sheet.appendRow(['Form_Points_non_FFBC', body.label, body.points || '']);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: 'Action inconnue' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Call Apps Script Web App
 */
export async function fetchFromAppsScript(url: string, action: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const fullUrl = `${url}${url.includes('?') ? '&' : '?'}${query}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Erreur Apps Script (${res.status})`);
  return await res.json();
}

export async function postToAppsScript(url: string, payload: any) {
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
  });
  if (!res.ok) throw new Error(`Erreur écriture Apps Script (${res.status})`);
  return await res.json().catch(() => ({ success: true }));
}


export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export function formatBelgianDateTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatBelgianDate(dateStr: string): string {
  if (!dateStr) return '';
  // if format is YYYY-MM-DD
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

export interface SheetMetadataInfo {
  title: string;
  sheets: string[];
}

export async function fetchSpreadsheetMetadata(spreadsheetId: string): Promise<SheetMetadataInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié. Veuillez vous connecter avec Google.');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erreur de chargement de la feuille (${res.status})`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Classeur RPA';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return { title, sheets };
}

/**
 * Fetch members from the 'Membres' sheet
 * Filters for rows where column 'Afficher MAJ Manuelle' is checked / TRUE
 */
export async function fetchMembersFromSheet(
  spreadsheetId: string,
  sheetName: string = 'Membres'
): Promise<Member[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié.');

  const encodedRange = encodeURIComponent(`${sheetName}!A1:Z500`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Impossible de lire l'onglet ${sheetName}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length === 0) return [];

  // Parse header row
  const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
  
  // Find Nom column index
  let nomIdx = headers.findIndex((h: string) => h === 'nom' || h.startsWith('nom') || h === 'membre' || h.includes('nom membre'));
  if (nomIdx === -1) nomIdx = 0; // Default to first col

  // Find Prenom column index if separate
  const prenomIdx = headers.findIndex((h: string) => h === 'prénom' || h === 'prenom');

  // Find 'Afficher MAJ Manuelle' column index
  let majIdx = headers.findIndex((h: string) => 
    h.includes('maj manuelle') || 
    h.includes('maj_manuelle') || 
    h.includes('afficher maj') || 
    h === 'afficher' ||
    h === 'maj' ||
    h.includes('manuelle')
  );

  // Find Matricule if present
  const matriculeIdx = headers.findIndex((h: string) => h.includes('matricule') || h.includes('id') || h.includes('code'));
  // Find points if present
  const pointsIdx = headers.findIndex((h: string) => h.includes('total points') || h.includes('points') || h.includes('solde'));

  const members: Member[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawNom = row[nomIdx];
    if (!rawNom || String(rawNom).trim() === '') continue;

    const prenom = prenomIdx !== -1 && row[prenomIdx] ? String(row[prenomIdx]).trim() : '';
    const fullName = prenom && !String(rawNom).includes(prenom)
      ? `${String(rawNom).trim()} ${prenom}`
      : String(rawNom).trim();

    // Check MAJ Manuelle flag
    let isMajChecked = false;
    if (majIdx !== -1) {
      const val = row[majIdx];
      isMajChecked = val === true || 
        String(val).trim().toUpperCase() === 'TRUE' || 
        String(val).trim().toUpperCase() === 'VRAI' || 
        val === 1 || 
        val === '1' || 
        String(val).trim().toUpperCase() === 'OUI';
    } else {
      // If column doesn't exist, show all by default
      isMajChecked = true;
    }

    if (isMajChecked) {
      members.push({
        id: `mem-${i}`,
        nom: fullName,
        prenom,
        afficherMajManuelle: true,
        matricule: matriculeIdx !== -1 && row[matriculeIdx] ? String(row[matriculeIdx]) : undefined,
        pointsActuels: pointsIdx !== -1 && typeof row[pointsIdx] === 'number' ? row[pointsIdx] : undefined,
        rowNumber: i + 1,
      });
    }
  }

  // Sort alphabetically by Nom
  return members.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
}

/**
 * Fetch motifs from the 'Keys' sheet where col1 = Form_Points_non_FFBC
 */
export async function fetchMotifsFromSheet(
  spreadsheetId: string,
  sheetName: string = 'Keys'
): Promise<MotifKey[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié.');

  const encodedRange = encodeURIComponent(`${sheetName}!A1:E200`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Impossible de lire l'onglet ${sheetName}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length === 0) return [];

  const motifs: MotifKey[] = [];
  const TARGET_KEY = 'Form_Points_non_FFBC';

  // Check structure:
  // Pattern 1: Row has col0 = 'Form_Points_non_FFBC' and col1 = Label
  // Pattern 2: Column header at row 0 is 'Form_Points_non_FFBC' and cells below are motifs
  const headerIdx = rows[0]?.findIndex(
    (h: any) => String(h || '').trim().toLowerCase() === TARGET_KEY.toLowerCase()
  );

  if (headerIdx !== -1 && headerIdx !== undefined && headerIdx >= 0) {
    // Motifs are in that column
    for (let r = 1; r < rows.length; r++) {
      const val = rows[r]?.[headerIdx];
      if (val && String(val).trim()) {
        motifs.push({
          key: TARGET_KEY,
          label: String(val).trim(),
        });
      }
    }
  }

  // Also check Pattern 1 (col A = Form_Points_non_FFBC, col B = motif)
  for (let r = 0; r < rows.length; r++) {
    const colA = String(rows[r]?.[0] || '').trim();
    if (colA.toLowerCase() === TARGET_KEY.toLowerCase()) {
      const colB = String(rows[r]?.[1] || '').trim();
      const colC = Number(rows[r]?.[2]);
      if (colB && !motifs.some((m) => m.label.toLowerCase() === colB.toLowerCase())) {
        motifs.push({
          key: TARGET_KEY,
          label: colB,
          defaultPoints: !isNaN(colC) ? colC : undefined,
        });
      }
    }
  }

  return motifs;
}

/**
 * Fetch recent operations from the 'Opérations' sheet
 */
export async function fetchRecentOperationsFromSheet(
  spreadsheetId: string,
  sheetName: string = 'Opérations'
): Promise<OperationRecord[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const encodedRange = encodeURIComponent(`${sheetName}!A1:F100`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const rows: any[][] = data.values || [];
  if (rows.length <= 1) return [];

  const ops: OperationRecord[] = [];
  // Parse rows (ignoring header row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;
    ops.push({
      id: `op-sheet-${i}`,
      dateOperation: String(row[0] || ''),
      dateEvenement: String(row[1] || ''),
      membre: String(row[2] || ''),
      points: Number(row[3]) || 0,
      motif: String(row[4] || ''),
      saisiPar: String(row[5] || ''),
      syncedToGoogleSheets: true,
    });
  }

  // Return most recent first
  return ops.reverse();
}

/**
 * Insert an operation into the 'Opérations' sheet
 */
export async function insertOperationToSheet(
  spreadsheetId: string,
  sheetName: string = 'Opérations',
  op: {
    dateOperation: string;
    dateEvenement: string;
    membre: string;
    points: number;
    motif: string;
    saisiPar?: string;
  }
): Promise<{ success: boolean; updatedRange?: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié.');

  // First, verify if the sheet has a header row
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${sheetName}!A1:E1`
    )}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (checkRes.ok) {
    const checkData = await checkRes.json();
    if (!checkData.values || checkData.values.length === 0) {
      // Add default header row
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          `${sheetName}!A1:F1`
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              ['Date Opération', 'Date Événement', 'Membre', 'Points', 'Motif', 'Saisi par'],
            ],
          }),
        }
      );
    }
  }

  // Append operation row
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    `${sheetName}!A:F`
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const bodyData = {
    values: [
      [
        op.dateOperation,
        formatBelgianDate(op.dateEvenement),
        op.membre,
        op.points,
        op.motif,
        op.saisiPar || 'WebApp RPA',
      ],
    ],
  };

  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Erreur lors de l\'enregistrement dans Google Sheets.');
  }

  const result = await appendRes.json();
  return { success: true, updatedRange: result.updates?.updatedRange };
}

/**
 * Append a new member to 'Membres' sheet
 */
export async function addMemberToSheet(
  spreadsheetId: string,
  sheetName: string = 'Membres',
  member: {
    nom: string;
    prenom?: string;
    matricule?: string;
  }
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié.');

  // Append new member with 'Afficher MAJ Manuelle' = TRUE
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    `${sheetName}!A:D`
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const fullName = member.prenom
    ? `${member.nom.toUpperCase()} ${member.prenom}`
    : member.nom.toUpperCase();

  const bodyData = {
    values: [[fullName, member.matricule || '', 'TRUE', 'Membre ajouté via WebApp']],
  };

  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Erreur lors de l\'ajout du membre dans Google Sheets.');
  }

  return true;
}

/**
 * Append a new motif to 'Keys' sheet under Form_Points_non_FFBC
 */
export async function addMotifToSheet(
  spreadsheetId: string,
  sheetName: string = 'Keys',
  motifLabel: string,
  defaultPoints?: number
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Non authentifié.');

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    `${sheetName}!A:C`
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const bodyData = {
    values: [['Form_Points_non_FFBC', motifLabel, defaultPoints || '']],
  };

  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Erreur lors de l\'ajout du motif dans Google Sheets.');
  }

  return true;
}
