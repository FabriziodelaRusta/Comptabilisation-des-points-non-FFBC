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
  rowNumber?: number; // Row index in Google Sheets (2-indexed)
  dateRando: string;   // Col A: Date rando (jj/mm/aaaa)
  membre: string;      // Col B: Nom membre
  points: number;      // Col C: Points attribués
  description: string; // Col D: Descriptions / Motif
  colE?: string;       // Col E: (ne rien mettre - vide)
  mail: string;        // Col F: Adresse mail de l'utilisateur
  dateOperation: string; // Col G: Date opérations d'insertion (jj/mm/aaaa hh:mm:ss)
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
