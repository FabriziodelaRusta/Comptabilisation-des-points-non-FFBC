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
  motif?: string;        // Col D: Motif issu de la table Keys
  km?: number | string;  // Col E: Km (distance en kilomètres)
  description?: string;  // Compatibilité / description
  colE?: boolean | string; // Compatibilité précédente
  colF?: boolean | string; // Col F: Case à cocher de validation
  isChecked?: boolean;   // true si la case en colonne F (ou E en 8 cols) est cochée
  source?: string;       // Col G: "WebApp RPA" (auparavant Col F)
  mail: string;          // Col H: Adresse mail de connexion (auparavant Col G)
  dateOperation: string; // Col I: Date opération jj/mm/aaaa hh:mm:ss (auparavant Col H)
  syncedToGoogleSheets?: boolean;
}

export interface UserPermission {
  canWrite: boolean;
  role: 'OWNER' | 'EDITOR' | 'EDITOR_MEMBER' | 'VIEWER' | 'NONE' | 'FALLBACK' | 'ERROR';
  email?: string;
  reason?: string;
  warning?: string;
}

export interface SheetConfig {
  spreadsheetId?: string;
  spreadsheetName?: string;
  membresSheetName?: string;
  keysSheetName?: string;
  operationsSheetName?: string;
  isCustomConfigured: boolean;
  appsScriptUrl: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
