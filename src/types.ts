export interface Member {
  id?: string;
  nom: string;
  prenom?: string;
  afficherMajManuelle: boolean;
  matricule?: string;
  pointsActuels?: number;
  rowNumber?: number;
}

export interface MotifKey {
  key: string;
  label: string;
  defaultPoints?: number;
}

export interface OperationRecord {
  id: string;
  dateOperation: string; // jj/mm/AAAA HH:MM:SS
  dateEvenement: string;  // jj/mm/AAAA or YYYY-MM-DD
  membre: string;
  points: number;
  motif: string;
  saisiPar?: string;
  syncedToGoogleSheets?: boolean;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName?: string;
  membresSheetName: string;
  keysSheetName: string;
  operationsSheetName: string;
  isCustomConfigured: boolean;
  appsScriptUrl?: string;
  syncMode?: 'oauth' | 'apps_script' | 'demo';
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
