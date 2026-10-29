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
  rowNumber?: number;    // Ligne dans Google Sheets (indexée à partir de 2)
  dateRando: string;     // Col A: Date rando (jj/mm/aaaa)
  membre: string;        // Col B: Nom du membre
  points: number;        // Col C: Points
  description: string;   // Col D: Description ou motif
  colE?: string;         // Col E: (laisser vide)
  source?: string;       // Col F: "WebApp RPA"
  mail: string;          // Col G: Adresse mail de connexion
  dateOperation: string; // Col H: Date opération (jj/mm/aaaa hh:mm:ss)
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
