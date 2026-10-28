import { Member, MotifKey, OperationRecord } from '../types';

export const DEFAULT_MEMBERS: Member[] = [
  { nom: 'BEAURIEUX Daniel', prenom: 'Daniel', afficherMajManuelle: true, matricule: 'RPA-104', pointsActuels: 24 },
  { nom: 'COLMANT Jean-Pierre', prenom: 'Jean-Pierre', afficherMajManuelle: true, matricule: 'RPA-112', pointsActuels: 42 },
  { nom: 'DE VOS Marc', prenom: 'Marc', afficherMajManuelle: true, matricule: 'RPA-205', pointsActuels: 18 },
  { nom: 'DUPONT Philippe', prenom: 'Philippe', afficherMajManuelle: true, matricule: 'RPA-108', pointsActuels: 35 },
  { nom: 'EVRARD Michel', prenom: 'Michel', afficherMajManuelle: true, matricule: 'RPA-221', pointsActuels: 12 },
  { nom: 'FONTAINE Claudine', prenom: 'Claudine', afficherMajManuelle: true, matricule: 'RPA-145', pointsActuels: 28 },
  { nom: 'GENCE Jacques', prenom: 'Jacques', afficherMajManuelle: true, matricule: 'RPA-160', pointsActuels: 50 },
  { nom: 'LEBRUN Christine', prenom: 'Christine', afficherMajManuelle: true, matricule: 'RPA-178', pointsActuels: 31 },
  { nom: 'LEROY Patrick', prenom: 'Patrick', afficherMajManuelle: true, matricule: 'RPA-189', pointsActuels: 15 },
  { nom: 'MAHIEU Luc', prenom: 'Luc', afficherMajManuelle: true, matricule: 'RPA-201', pointsActuels: 20 },
  { nom: 'POTTIER Bernard', prenom: 'Bernard', afficherMajManuelle: true, matricule: 'RPA-230', pointsActuels: 45 },
  { nom: 'RENARD Alain', prenom: 'Alain', afficherMajManuelle: true, matricule: 'RPA-241', pointsActuels: 38 },
  { nom: 'VANDERVEKEN Sylvie', prenom: 'Sylvie', afficherMajManuelle: true, matricule: 'RPA-255', pointsActuels: 22 },
  { nom: 'WATTIEZ Eric', prenom: 'Eric', afficherMajManuelle: true, matricule: 'RPA-280', pointsActuels: 19 },
  // Some members with afficherMajManuelle = false to test filtering
  { nom: 'ANONYME Testeur', prenom: 'Testeur', afficherMajManuelle: false, matricule: 'RPA-999', pointsActuels: 0 },
  { nom: 'DORMANT Paul', prenom: 'Paul', afficherMajManuelle: false, matricule: 'RPA-998', pointsActuels: 5 },
];

export const DEFAULT_MOTIFS: MotifKey[] = [
  { key: 'Form_Points_non_FFBC', label: 'Fléchage & Défléchage parcours', defaultPoints: 5 },
  { key: 'Form_Points_non_FFBC', label: 'Tenue bar / Accueil inscriptions', defaultPoints: 3 },
  { key: 'Form_Points_non_FFBC', label: 'Aide Ravitaillement brevet RPA', defaultPoints: 4 },
  { key: 'Form_Points_non_FFBC', label: 'Encadrement sortie club / Capitaine de route', defaultPoints: 2 },
  { key: 'Form_Points_non_FFBC', label: 'Entretien sentiers & Matériel club', defaultPoints: 4 },
  { key: 'Form_Points_non_FFBC', label: 'Préparation salle / Réunion comité', defaultPoints: 2 },
  { key: 'Form_Points_non_FFBC', label: 'Organisation événement spécial RPA', defaultPoints: 6 },
  { key: 'Form_Points_non_FFBC', label: 'Bonus assiduité bénévole', defaultPoints: 5 },
  { key: 'Form_Points_non_FFBC', label: 'Correction / Ajustement manuel (-)', defaultPoints: -2 },
  { key: 'Form_Points_non_FFBC', label: 'Autre prestation bénévole RPA', defaultPoints: 3 },
];

export const DEFAULT_OPERATIONS: OperationRecord[] = [
  {
    id: 'op-1',
    rowNumber: 2,
    dateRando: '25/10/2026',
    membre: 'COLMANT Jean-Pierre',
    points: 5,
    description: 'Fléchage & Défléchage parcours',
    colE: '',
    mail: 'secretaire@rpa.be',
    dateOperation: '28/10/2026 09:15:20',
    syncedToGoogleSheets: true,
  },
  {
    id: 'op-2',
    rowNumber: 3,
    dateRando: '25/10/2026',
    membre: 'FONTAINE Claudine',
    points: 4,
    description: 'Aide Ravitaillement brevet RPA',
    colE: '',
    mail: 'secretaire@rpa.be',
    dateOperation: '28/10/2026 10:42:05',
    syncedToGoogleSheets: true,
  },
  {
    id: 'op-3',
    rowNumber: 4,
    dateRando: '27/10/2026',
    membre: 'GENCE Jacques',
    points: 3,
    description: 'Tenue bar / Accueil inscriptions',
    colE: '',
    mail: 'secretaire@rpa.be',
    dateOperation: '28/10/2026 11:05:48',
    syncedToGoogleSheets: true,
  },
];
