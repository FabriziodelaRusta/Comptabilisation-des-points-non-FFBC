/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Users,
  Calendar,
  PlusCircle,
  Tag,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { Member, MotifKey, OperationRecord, SheetConfig, UserProfile, UserPermission } from './types';
import {
  DEFAULT_MEMBERS,
  DEFAULT_MOTIFS,
  DEFAULT_OPERATIONS,
} from './lib/defaultData';
import {
  initAuth,
  googleSignIn,
  logout,
} from './lib/firebase';
import {
  DEFAULT_APPS_SCRIPT_URL,
  LOCAL_STORAGE_SHEET_KEY,
  LOCAL_STORAGE_SAVED_OPERATIONS,
  formatBelgianDateTime,
  formatBelgianDate,
  fetchFromAppsScript,
  postToAppsScript,
  parseOperationDateTime,
  checkUserSheetPermission,
  batchInsertOperationsViaAppsScript,
} from './lib/googleSheets';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberSelector, ALL_MEMBERS_OPTION } from './components/MemberSelector';
import { OperationForm } from './components/OperationForm';
import { BatchOperationForm } from './components/BatchOperationForm';
import { PointsTableTab } from './components/PointsTableTab';
import { BatchConfirmationModal, BatchItem } from './components/BatchConfirmationModal';
import { NewMemberModal } from './components/NewMemberModal';
import { NewMotifModal } from './components/NewMotifModal';
import { EditMotifModal } from './components/EditMotifModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RecentOperationsList } from './components/RecentOperationsList';
import { SpreadsheetSettingsModal } from './components/SpreadsheetSettingsModal';
import { Footer } from './components/Footer';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [userPermission, setUserPermission] = useState<UserPermission | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState<boolean>(false);

  // Spreadsheet configuration state
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SHEET_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration automatique : si l'URL est vide ou correspond à l'un des anciens tests, on applique la vraie URL officielle
        if (
          !parsed.appsScriptUrl ||
          parsed.appsScriptUrl.trim() === '' ||
          parsed.appsScriptUrl.includes('AKfycbxmzlZg') ||
          parsed.appsScriptUrl.includes('AKfycbz3t7By')
        ) {
          parsed.appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
          try {
            localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, JSON.stringify({ ...parsed, appsScriptUrl: DEFAULT_APPS_SCRIPT_URL }));
          } catch {}
        }
        if (!parsed.spreadsheetName || parsed.spreadsheetName.includes('Calcul des Points')) {
          parsed.spreadsheetName = 'Points RPA';
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      spreadsheetName: 'Points RPA',
      membresSheetName: 'Membres',
      keysSheetName: 'Keys',
      operationsSheetName: 'Opérations',
      isCustomConfigured: true,
      appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
    };
  });

  // App data state
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [motifs, setMotifs] = useState<MotifKey[]>([]);
  const [operations, setOperations] = useState<OperationRecord[]>([]);

  // Active selections
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingOperation, setEditingOperation] = useState<OperationRecord | null>(null);

  // Calcul dynamique et réactif du solde des points pour chaque membre à partir de la liste des opérations
  const membersWithPoints = useMemo(() => {
    return members.map((m) => {
      const totalPoints = operations
        .filter((op) => (op.membre || '').trim().toLowerCase() === (m.nom || '').trim().toLowerCase())
        .reduce((sum, op) => sum + (Number(op.points) || 0), 0);
      return {
        ...m,
        pointsActuels: totalPoints,
      };
    });
  }, [members, operations]);

  const currentSelectedMemberWithPoints = useMemo(() => {
    if (!selectedMember) return null;
    if (selectedMember.nom === 'Tous') return selectedMember;
    const found = membersWithPoints.find(
      (m) => m.nom.trim().toLowerCase() === selectedMember.nom.trim().toLowerCase()
    );
    return found || selectedMember;
  }, [selectedMember, membersWithPoints]);

  // Loading & syncing states
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [formResetKey, setFormResetKey] = useState<number>(0);

  // Modals state
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [newMemberInitialName, setNewMemberInitialName] = useState<string>('');
  const [isNewMotifModalOpen, setIsNewMotifModalOpen] = useState<boolean>(false);
  const [isEditMotifModalOpen, setIsEditMotifModalOpen] = useState<boolean>(false);
  const [currentMotifToEdit, setCurrentMotifToEdit] = useState<MotifKey | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // 3 Tabs : 1) Tableau des points, 2) Saisie unique (par défaut au chargement), 3) Saisie multiple
  const [activeTab, setActiveTab] = useState<'points-table' | 'single' | 'batch'>('single');
  const [batchConfirmationItems, setBatchConfirmationItems] = useState<BatchItem[] | null>(null);
  const [batchFormResetKey, setBatchFormResetKey] = useState<number>(0);

  // Confirmation Modal state for mutating operations
  const [confirmationData, setConfirmationData] = useState<{
    actionType: 'insert' | 'update' | 'delete';
    operation: {
      id?: string;
      rowNumber?: number;
      dateRando: string;
      membre: string;
      points: number;
      motif?: string;
      km?: string | number;
      description?: string;
      mail: string;
      dateOperation: string;
    };
  } | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Sync operations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_OPERATIONS, JSON.stringify(operations));
    } catch {
      // ignore
    }
  }, [operations]);

  // Sync sheetConfig to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, JSON.stringify(sheetConfig));
    } catch {
      // ignore
    }
  }, [sheetConfig]);

  // Contrôle des permissions Google Sheets en écriture (Propriétaire ou Éditeur Drive)
  // Centralisation du contrôle des permissions pour éviter les requêtes en boucle
  const verifyIncomingPermission = useCallback(
    async (email: string | null | undefined) => {
      if (!email || !sheetConfig.appsScriptUrl) {
        setUserPermission(null);
        return;
      }
      setIsCheckingPermission(true);
      try {
        const perm = await checkUserSheetPermission(sheetConfig.appsScriptUrl, email);
        setUserPermission(perm);
      } catch (err) {
        console.warn('Erreur vérification permission:', err);
        setUserPermission(null);
      } finally {
        setIsCheckingPermission(false);
      }
    },
    [sheetConfig.appsScriptUrl]
  );

  // Initialize Firebase Auth listener : gère l'utilisateur et sa permission en une seule fois
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        setIsGoogleConnected(true);

        if (user.email) {
          verifyIncomingPermission(user.email);
        }
      },
      () => {
        setCurrentUser(null);
        setIsGoogleConnected(false);
        setUserPermission(null);
      }
    );
    return () => unsubscribe();
  }, [verifyIncomingPermission]);

  // Si l'URL du script change manuellement dans les réglages
  useEffect(() => {
    if (currentUser?.email) {
      verifyIncomingPermission(currentUser.email);
    }
  }, [sheetConfig.appsScriptUrl, verifyIncomingPermission, currentUser?.email]);

  // Fetch or reload data from Google Sheets via Apps Script
  const loadDataFromGoogleSheets = useCallback(
    async (silent = false) => {
      if (!sheetConfig.appsScriptUrl) return;

      setIsSyncing(true);
      try {
        setIsLoadingMembers(true);
        const membersRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getMembers');
        if (membersRes?.success) {
          if (Array.isArray(membersRes.members)) {
            setMembers(
              membersRes.members.map((m: any, i: number) => ({
                id: `mem-as-${i}`,
                nom: m.nom,
                matricule: m.matricule,
                afficherMajManuelle: true,
              }))
            );
          }
          if (Array.isArray(membersRes.allMembers)) {
            setAllMembers(
              membersRes.allMembers.map((m: any, i: number) => ({
                id: `mem-all-${i}`,
                nom: m.nom,
                matricule: m.matricule,
                afficherMajManuelle: Boolean(m.afficherMajManuelle),
              }))
            );
          } else if (Array.isArray(membersRes.members)) {
            setAllMembers(
              membersRes.members.map((m: any, i: number) => ({
                id: `mem-all-${i}`,
                nom: m.nom,
                matricule: m.matricule,
                afficherMajManuelle: true,
              }))
            );
          }
        }

        const keysRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getKeys');
        if (keysRes?.success && Array.isArray(keysRes.motifs)) {
          setMotifs(keysRes.motifs);
        }

        const opsRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getOperations');
        if (opsRes?.success && Array.isArray(opsRes.operations)) {
          setOperations(
            opsRes.operations
              .map((op: any, i: number) => {
                const isChecked = Boolean(
                  op.isChecked ||
                  op.colF === true ||
                  String(op.colF).toUpperCase() === 'TRUE' ||
                  String(op.colF).toUpperCase() === 'VRAI' ||
                  op.colE === true ||
                  String(op.colE).toUpperCase() === 'TRUE' ||
                  String(op.colE).toUpperCase() === 'VRAI' ||
                  op.colE === 1 ||
                  op.colE === '1'
                );
                return {
                  id: `op-as-${i}`,
                  rowNumber: op.rowNumber,
                  dateRando: String(op.dateRando || ''),
                  membre: String(op.membre || ''),
                  points: Number(op.points) || 0,
                  motif: String(op.motif || ''),
                  km: op.km !== undefined && op.km !== null && String(op.km).trim() !== '' ? String(op.km) : '',
                  description: String(op.description || op.motif || ''),
                  colF: isChecked,
                  isChecked: isChecked,
                  source: String(op.source || 'WebApp RPA'),
                  mail: String(op.mail || ''),
                  dateOperation: String(op.dateOperation || ''),
                  syncedToGoogleSheets: true,
                };
              })
              .sort(
                (a: OperationRecord, b: OperationRecord) =>
                  parseOperationDateTime(b.dateOperation) - parseOperationDateTime(a.dateOperation)
              )
          );
        }

        if (!silent) {
          showToast('Données synchronisées avec succès depuis Points RPA !', 'success');
        }
      } catch (err: any) {
        console.error('Erreur Apps Script:', err);
        showToast(err?.message || 'Erreur lors de la synchronisation avec le script Apps Script.', 'error');
      } finally {
        setIsSyncing(false);
        setIsLoadingMembers(false);
      }
    },
    [sheetConfig.appsScriptUrl]
  );

  // Charger les données une seule fois quand l'URL du script est définie
  useEffect(() => {
    if (sheetConfig.appsScriptUrl) {
      loadDataFromGoogleSheets(true);
    }
  }, [sheetConfig.appsScriptUrl, loadDataFromGoogleSheets]);

  // Sign In handler
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        const profile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        };
        setCurrentUser(profile);
        setIsGoogleConnected(true);
        showToast(`Connecté avec le compte ${res.user.email}`, 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Échec de la connexion Google.', 'error');
    }
  };

  // Sign Out handler
  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setIsGoogleConnected(false);
    setUserPermission(null);
    showToast('Déconnecté du compte Google.', 'info');
  };

  // Add Member handler
  const handleAddMember = async (memberData: { nom: string; prenom?: string; matricule?: string }) => {
    if (!currentUser) {
      showToast('Veuillez vous connecter avec votre compte Google.', 'error');
      return;
    }
    if (userPermission && !userPermission.canWrite) {
      showToast("Votre compte n'a pas les droits d'écriture sur le classeur Google Sheets.", 'error');
      return;
    }

    setActionLoading(true);
    try {
      const fullName = memberData.prenom
        ? `${memberData.nom} ${memberData.prenom}`
        : memberData.nom;

      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'addMember',
          nom: fullName,
          matricule: memberData.matricule || '',
          mail: currentUser.email,
        });
      }

      const newMember: Member = {
        id: `mem-new-${Date.now()}`,
        nom: fullName,
        prenom: memberData.prenom,
        matricule: memberData.matricule,
        afficherMajManuelle: true,
        pointsActuels: 0,
      };

      setMembers((prev) => [newMember, ...prev.filter((m) => m.nom !== fullName)]);
      setSelectedMember(newMember);
      showToast(`Membre « ${fullName} » créé et sélectionné avec succès !`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la création du membre.', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Add Motif handler
  const handleAddMotif = async (label: string, defaultPoints?: number) => {
    if (!currentUser) {
      showToast('Veuillez vous connecter avec votre compte Google.', 'error');
      return;
    }
    if (userPermission && !userPermission.canWrite) {
      showToast("Votre compte n'a pas les droits d'écriture sur le classeur Google Sheets.", 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'addMotif',
          label,
          points: defaultPoints,
          mail: currentUser.email,
        });
      }

      const newMotif: MotifKey = {
        key: 'Form_Points_non_FFBC',
        label,
        defaultPoints,
      };

      setMotifs((prev) => [newMotif, ...prev]);
      showToast(`Motif « ${label} » ajouté sous Form_Points_non_FFBC !`, 'success');
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de l'ajout du motif.", 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Motif modal
  const handleOpenEditMotif = (motifLabel?: string) => {
    let target = motifs.find(
      (m) => (m.label || '').trim().toLowerCase() === (motifLabel || '').trim().toLowerCase()
    );
    if (!target && motifs.length > 0) {
      target = motifs[0];
    }
    if (!target) {
      target = {
        key: 'Form_Points_non_FFBC',
        label: motifLabel || 'Nouveau motif',
        defaultPoints: 3,
      };
    }
    setCurrentMotifToEdit(target);
    setIsEditMotifModalOpen(true);
  };

  // Update Motif handler
  const handleUpdateMotif = async (oldLabel: string, newLabel: string, defaultPoints?: number) => {
    if (!currentUser) {
      showToast('Veuillez vous connecter avec votre compte Google.', 'error');
      return;
    }
    if (userPermission && !userPermission.canWrite) {
      showToast("Votre compte n'a pas les droits d'écriture sur le classeur Google Sheets.", 'error');
      return;
    }

    setActionLoading(true);
    try {
      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'updateMotif',
          oldLabel,
          newLabel,
          points: defaultPoints,
          mail: currentUser.email,
        });
      }

      setMotifs((prev) =>
        prev.map((m) =>
          m.label === oldLabel
            ? { ...m, label: newLabel, defaultPoints: defaultPoints !== undefined ? defaultPoints : m.defaultPoints }
            : m
        )
      );

      setOperations((prev) =>
        prev.map((op) => (op.description === oldLabel ? { ...op, description: newLabel } : op))
      );

      showToast(`Motif « ${newLabel} » modifié avec succès !`, 'success');
    } catch (err: any) {
      console.error('Erreur mise à jour motif:', err);
      showToast(err?.message || 'Erreur lors de la modification du motif.', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Submit from OperationForm (Insert or Update)
  const handleFormSubmit = (data: {
    dateRando: string;
    points: number;
    motif: string;
    km: string | number;
    description?: string;
  }) => {
    if (!currentUser || !currentUser.email) {
      showToast('Veuillez vous connecter avec votre compte Google pour enregistrer des points.', 'error');
      return;
    }

    if (userPermission && !userPermission.canWrite) {
      showToast(
        userPermission.reason || "Votre compte Google n'est pas autorisé en écriture sur le classeur Points RPA.",
        'error'
      );
      return;
    }

    if (!selectedMember || selectedMember.nom === 'Tous') {
      showToast('Veuillez sélectionner un membre spécifique pour cette opération.', 'error');
      return;
    }

    const currentTimestamp = formatBelgianDateTime(new Date());
    const verifiedUserMail = currentUser.email;

    if (editingOperation) {
      // Update action
      setConfirmationData({
        actionType: 'update',
        operation: {
          id: editingOperation.id,
          rowNumber: editingOperation.rowNumber,
          dateRando: formatBelgianDate(data.dateRando),
          membre: selectedMember.nom,
          points: data.points,
          motif: data.motif || '',
          km: data.km !== undefined ? data.km : '',
          description: data.description || data.motif || '',
          mail: verifiedUserMail,
          dateOperation: editingOperation.dateOperation || currentTimestamp,
        },
      });
    } else {
      // Insert action
      setConfirmationData({
        actionType: 'insert',
        operation: {
          dateRando: formatBelgianDate(data.dateRando),
          membre: selectedMember.nom,
          points: data.points,
          motif: data.motif || '',
          km: data.km !== undefined ? data.km : '',
          description: data.description || data.motif || '',
          mail: verifiedUserMail,
          dateOperation: currentTimestamp,
        },
      });
    }
  };

  // 1b. Batch Submit from BatchOperationForm
  const handleBatchSubmit = (rows: BatchItem[]) => {
    if (!currentUser || !currentUser.email) {
      showToast('Veuillez vous connecter avec votre compte Google pour enregistrer des points.', 'error');
      return;
    }

    if (userPermission && !userPermission.canWrite) {
      showToast(
        userPermission.reason || "Votre compte Google n'est pas autorisé en écriture sur le classeur Points RPA.",
        'error'
      );
      return;
    }

    if (!rows || rows.length === 0) {
      showToast('Veuillez saisir au moins une ligne d’opération.', 'error');
      return;
    }

    setBatchConfirmationItems(rows);
  };

  // 1c. Execute Confirmed Batch Insert
  const handleExecuteConfirmedBatch = async () => {
    if (!batchConfirmationItems || batchConfirmationItems.length === 0) return;
    if (!currentUser || !currentUser.email) {
      showToast('Compte Google non connecté.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const currentTimestamp = formatBelgianDateTime(new Date());
      const verifiedUserMail = currentUser.email;

      const formattedOps = batchConfirmationItems.map((item) => ({
        dateRando: formatBelgianDate(item.dateRando),
        membre: item.membre,
        points: Number(item.points) || 0,
        motif: item.motif || '',
        km: item.km !== undefined ? item.km : '',
        description: item.description || item.motif || '',
        mail: verifiedUserMail,
        dateOperation: currentTimestamp,
      }));

      if (sheetConfig.appsScriptUrl) {
        const res = await batchInsertOperationsViaAppsScript(sheetConfig.appsScriptUrl, formattedOps);
        if (res?.success === false) {
          throw new Error('Refusé par Google Sheets');
        }
      }

      // Add them locally to operations state in reverse to maintain chronological ordering
      const newOpRecords: OperationRecord[] = formattedOps.map((op, idx) => ({
        id: `op-batch-${Date.now()}-${idx}`,
        dateRando: op.dateRando,
        membre: op.membre,
        points: op.points,
        motif: op.motif,
        km: op.km,
        description: op.description,
        colF: false,
        isChecked: false,
        source: 'WebApp RPA',
        mail: op.mail,
        dateOperation: op.dateOperation,
        syncedToGoogleSheets: true,
      }));

      setOperations((prev) => [...newOpRecords, ...prev]);
      showToast(
        `${formattedOps.length} opération${formattedOps.length > 1 ? 's' : ''} enregistrée${formattedOps.length > 1 ? 's' : ''} avec succès dans Points RPA !`,
        'success'
      );
      setBatchConfirmationItems(null);
      setBatchFormResetKey((k) => k + 1);
    } catch (err: any) {
      console.error('Erreur insertion groupée:', err);
      showToast(err?.message || "Erreur lors de l'enregistrement groupé.", 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Trigger edit from list row (Pencil button)
  const handleEditOperation = (op: OperationRecord) => {
    if (op.isChecked) {
      showToast('Cette opération est validée dans Google Sheets (case cochée). Modification verrouillée.', 'error');
      return;
    }
    if (!currentUser) {
      showToast('Connectez-vous avec votre compte Google pour modifier une opération.', 'error');
      return;
    }
    if (userPermission && !userPermission.canWrite) {
      showToast("Votre compte n'a pas les droits d'écriture sur le classeur Google Sheets.", 'error');
      return;
    }

    setActiveTab('single');
    setEditingOperation(op);
    const found = membersWithPoints.find((m) => m.nom.toLowerCase() === op.membre.toLowerCase());
    if (found) {
      setSelectedMember(found);
    } else {
      setSelectedMember({
        nom: op.membre,
        afficherMajManuelle: true,
      });
    }
    window.scrollTo({ top: 180, behavior: 'smooth' });
    showToast(`Opération de ${op.membre} rechargée pour modification.`, 'info');
  };

  // 3. Trigger delete from list row (Trash button)
  const handleDeleteOperation = (op: OperationRecord) => {
    if (op.isChecked) {
      showToast('Cette opération est validée dans Google Sheets (case cochée). Suppression verrouillée.', 'error');
      return;
    }
    if (!currentUser) {
      showToast('Connectez-vous avec votre compte Google pour supprimer une opération.', 'error');
      return;
    }
    if (userPermission && !userPermission.canWrite) {
      showToast("Votre compte n'a pas les droits d'écriture sur le classeur Google Sheets.", 'error');
      return;
    }

    setConfirmationData({
      actionType: 'delete',
      operation: {
        id: op.id,
        rowNumber: op.rowNumber,
        dateRando: op.dateRando,
        membre: op.membre,
        points: op.points,
        motif: op.motif || '',
        km: op.km !== undefined ? op.km : '',
        description: op.description || op.motif || '',
        mail: currentUser.email || op.mail,
        dateOperation: op.dateOperation,
      },
    });
  };

  // 4. Confirm action in ConfirmationModal (Insert, Update, or Delete)
  const handleExecuteConfirmedAction = async () => {
    if (!confirmationData) return;

    setActionLoading(true);
    const { actionType, operation: op } = confirmationData;

    try {
      if (actionType === 'update' || actionType === 'delete') {
        const existing = operations.find(
          (item) => item.id === op.id || (op.rowNumber && item.rowNumber === op.rowNumber)
        );
        if (existing?.isChecked) {
          showToast('Opération validée dans Google Sheets (case cochée) : action verrouillée.', 'error');
          setConfirmationData(null);
          return;
        }
      }

      if (actionType === 'insert') {
        let assignedRowNumber = operations.length + 2;

        if (sheetConfig.appsScriptUrl) {
          const res = await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'addOperation',
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            motif: op.motif || '',
            km: op.km !== undefined ? op.km : '',
            description: op.description || '',
            mail: op.mail,
            dateOperation: op.dateOperation,
          });

          if (res?.success === false) {
            throw new Error(res.error || "Refusé par Google Sheets");
          }

          if (res?.rowNumber && typeof res.rowNumber === 'number') {
            assignedRowNumber = res.rowNumber;
          }
        }

        const newOpRecord: OperationRecord = {
          id: `op-${Date.now()}`,
          rowNumber: assignedRowNumber,
          dateRando: op.dateRando,
          membre: op.membre,
          points: op.points,
          motif: op.motif || '',
          km: op.km,
          description: op.description,
          colF: false,
          isChecked: false,
          source: 'WebApp RPA',
          mail: op.mail,
          dateOperation: op.dateOperation,
          syncedToGoogleSheets: true,
        };

        setOperations((prev) => [newOpRecord, ...prev]);
        setFormResetKey((k) => k + 1);

        showToast(
          `Opération enregistrée dans Points RPA pour ${op.membre} (${op.points > 0 ? '+' : ''}${op.points} pts) !`,
          'success'
        );
      } else if (actionType === 'update') {
        if (sheetConfig.appsScriptUrl) {
          const res = await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'updateOperation',
            rowNumber: op.rowNumber,
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            motif: op.motif || '',
            km: op.km !== undefined ? op.km : '',
            description: op.description || '',
            mail: op.mail,
            dateOperation: op.dateOperation,
          });

          if (res?.success === false) {
            throw new Error(res.error || "Refusé par Google Sheets");
          }
        }

        setOperations((prev) =>
          prev.map((item) =>
            item.id === op.id || (op.rowNumber && item.rowNumber === op.rowNumber)
              ? {
                  ...item,
                  dateRando: op.dateRando,
                  points: op.points,
                  motif: op.motif || '',
                  km: op.km,
                  description: op.description,
                  mail: op.mail,
                  syncedToGoogleSheets: true,
                }
              : item
          )
        );

        setEditingOperation(null);
        showToast('Opération modifiée avec succès dans Points RPA !', 'success');
      } else if (actionType === 'delete') {
        if (sheetConfig.appsScriptUrl) {
          const res = await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'deleteOperation',
            rowNumber: op.rowNumber,
            mail: op.mail,
          });

          if (res?.success === false) {
            throw new Error(res.error || "Refusé par Google Sheets");
          }
        }

        setOperations((prev) =>
          prev.filter((item) => item.id !== op.id && (op.rowNumber ? item.rowNumber !== op.rowNumber : true))
        );

        if (editingOperation && editingOperation.id === op.id) {
          setEditingOperation(null);
        }

        showToast('Opération supprimée avec succès !', 'info');
      }

      setConfirmationData(null);
    } catch (err: any) {
      console.error('Erreur exécution action:', err);
      showToast(err?.message || 'Erreur lors du traitement.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoadDemoData = () => {
    loadDataFromGoogleSheets();
    showToast('Actualisation des données depuis la feuille Points RPA...', 'info');
  };

  const isAllMembersSelected = selectedMember?.nom === 'Tous';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold border ${
              toast.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-600'
                : toast.type === 'error'
                ? 'bg-red-800 text-white border-red-600'
                : 'bg-gray-800 text-white border-gray-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-300" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-300" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-300" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <HeaderBanner
        user={currentUser}
        sheetConfig={sheetConfig}
        userPermission={userPermission}
        isCheckingPermission={isCheckingPermission}
        isGoogleConnected={isGoogleConnected}
        isSyncing={isSyncing}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefreshData={loadDataFromGoogleSheets}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {/* Navigation des 3 Onglets Principaux */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200/90 shadow-sm">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse hidden sm:inline-block"></span>
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">
              Module :
            </span>
            <span className="text-xs font-bold text-gray-900">
              {activeTab === 'points-table' && 'Tableau récapitulatif des points & Export PDF'}
              {activeTab === 'single' && 'Saisie individuelle de points'}
              {activeTab === 'batch' && 'Saisie groupée pour plusieurs membres'}
            </span>
          </div>

          {/* 3 Tabs Pill Buttons with Hover and Click Animations */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-gray-200 shrink-0 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('points-table')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all transform duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none ${
                activeTab === 'points-table'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Tableau des points</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all transform duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none ${
                activeTab === 'single'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              <User className="w-4 h-4 text-emerald-300" />
              <span>Saisie unique</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('batch');
                setBatchFormResetKey((k) => k + 1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all transform duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none ${
                activeTab === 'batch'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>Saisie multiple</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Tableau des points (premier onglet avec liste des membres & export PDF) */}
        {activeTab === 'points-table' && (
          <div className="animate-in fade-in duration-200">
            <PointsTableTab
              members={allMembers.length > 0 ? allMembers : membersWithPoints}
              operations={operations}
              sheetConfig={sheetConfig}
              selectedMemberName={
                selectedMember && selectedMember.nom !== 'Tous' ? selectedMember.nom : null
              }
              onSelectMember={(memberName) => {
                if (!memberName) {
                  setSelectedMember(ALL_MEMBERS_OPTION);
                  return;
                }
                const found = members.find(
                  (m) => m.nom.trim().toLowerCase() === memberName.trim().toLowerCase()
                );
                if (found) {
                  setSelectedMember(found);
                } else {
                  setSelectedMember({
                    id: `mem-${memberName}`,
                    nom: memberName,
                    afficherMajManuelle: true,
                  });
                }
                setTimeout(() => {
                  const listEl = document.getElementById('recent-operations-section');
                  if (listEl) {
                    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 50);
              }}
              onRefreshData={() => loadDataFromGoogleSheets()}
              isLoading={isLoadingMembers || isSyncing}
            />
          </div>
        )}

        {/* TAB 2: Saisie unique */}
        {activeTab === 'single' && (
          <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                {isAllMembersSelected && (
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block mb-1">
                    Consultation Globale
                  </span>
                )}
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                  {isAllMembersSelected
                    ? 'Historique Global des Points Non-FFBC'
                    : "Saisie d'une Opération de Points Non-FFBC"}
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Member Selector */}
              <div className="space-y-3">
                <MemberSelector
                  members={membersWithPoints}
                  selectedMember={currentSelectedMemberWithPoints}
                  onSelectMember={(mem) => {
                    setSelectedMember(mem);
                    setEditingOperation(null);
                  }}
                  onOpenNewMemberModal={(initialName) => {
                    setNewMemberInitialName(initialName || '');
                    setIsNewMemberModalOpen(true);
                  }}
                  isLoading={isLoadingMembers}
                />
              </div>

              {/* If 'Tous' is selected: DO NOT display input form, only show overview notice */}
              {isAllMembersSelected ? (
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center font-bold shrink-0">
                      <Users className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Mode consultation : Tous les membres sélectionnés</h4>
                      <p className="text-xs text-amber-800/90 mt-0.5">
                        Les champs de saisie sont masqués. Toutes les opérations de la feuille <strong>Opérations</strong> sont listées ci-dessous par ordre antéchronologique. Pour saisir des points, choisissez un membre individuel dans la liste déroulante.
                      </p>
                    </div>
                  </div>
                </div>
              ) : currentSelectedMemberWithPoints ? (
                /* Specific member selected: display the fields underneath */
                <div className="pt-2 animate-in fade-in duration-200">
                  <OperationForm
                    key={`${currentSelectedMemberWithPoints.nom}-${editingOperation ? editingOperation.id : `create-${formResetKey}`}`}
                    member={currentSelectedMemberWithPoints}
                    motifs={motifs}
                    user={currentUser}
                    userPermission={userPermission}
                    onSignIn={handleSignIn}
                    editingOperation={editingOperation}
                    onCancelEdit={() => setEditingOperation(null)}
                    onOpenNewMotifModal={() => setIsNewMotifModalOpen(true)}
                    onOpenEditMotifModal={handleOpenEditMotif}
                    onSubmit={handleFormSubmit}
                    isLoading={actionLoading}
                  />
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-gray-50/70 border border-dashed border-gray-300 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto font-bold">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-gray-800">
                      Choisissez un membre RPA ou « Tous » dans la liste ci-dessus
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Sélectionnez un membre pour lui attribuer des points (date rando, points, motif, description) ou choisissez <strong>« Tous »</strong> pour consulter l'ensemble des opérations du club.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: Saisie multiple pour une série de membres */}
        {activeTab === 'batch' && (
          <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                  Saisie Multiple pour une Série de Membres
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Remplissez une ligne par membre (date, membre, points, motif, description) puis validez l'ensemble en un seul clic.
                </p>
              </div>
            </div>

            <BatchOperationForm
              key={`batch-form-${batchFormResetKey}`}
              members={membersWithPoints.filter((m) => m.nom !== 'Tous')}
              motifs={motifs}
              user={currentUser}
              userPermission={userPermission}
              onSignIn={handleSignIn}
              onSubmitBatch={handleBatchSubmit}
              isLoading={actionLoading}
            />
          </section>
        )}

        {/* Section: Filtered Operations List with Pencil & Trash */}
        <section id="recent-operations-section" className="scroll-mt-6">
          <RecentOperationsList
            operations={operations}
            selectedMember={selectedMember}
            spreadsheetName={sheetConfig.spreadsheetName}
            isGoogleConnected={isGoogleConnected}
            canWrite={Boolean(currentUser && userPermission?.canWrite)}
            onEditOperation={handleEditOperation}
            onDeleteOperation={handleDeleteOperation}
            onSelectMemberFilter={(nom) => {
              if (!nom || nom === 'Tous') {
                setSelectedMember(ALL_MEMBERS_OPTION);
                return;
              }
              const found = members.find((m) => m.nom.toLowerCase() === nom.toLowerCase());
              if (found) {
                setSelectedMember(found);
                const el = document.getElementById('recent-operations-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            onLoadDemoData={handleLoadDemoData}
          />
        </section>
      </main>

      {/* Modals */}
      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        initialName={newMemberInitialName}
        onClose={() => setIsNewMemberModalOpen(false)}
        onSubmit={handleAddMember}
        isLoading={actionLoading}
      />

      <NewMotifModal
        isOpen={isNewMotifModalOpen}
        onClose={() => setIsNewMotifModalOpen(false)}
        onSubmit={handleAddMotif}
        isLoading={actionLoading}
      />

      <EditMotifModal
        isOpen={isEditMotifModalOpen}
        currentMotif={currentMotifToEdit}
        onClose={() => setIsEditMotifModalOpen(false)}
        onSubmit={handleUpdateMotif}
        isLoading={actionLoading}
      />

      <ConfirmationModal
        isOpen={Boolean(confirmationData)}
        actionType={confirmationData?.actionType || 'insert'}
        memberName={confirmationData?.operation.membre || ''}
        dateRando={confirmationData?.operation.dateRando || ''}
        points={confirmationData?.operation.points || 0}
        motif={confirmationData?.operation.motif || ''}
        km={confirmationData?.operation.km}
        description={confirmationData?.operation.description || ''}
        dateOperation={confirmationData?.operation.dateOperation || ''}
        spreadsheetName={sheetConfig.spreadsheetName}
        isLoading={actionLoading}
        onConfirm={handleExecuteConfirmedAction}
        onCancel={() => setConfirmationData(null)}
      />

      <BatchConfirmationModal
        isOpen={Boolean(batchConfirmationItems && batchConfirmationItems.length > 0)}
        items={batchConfirmationItems || []}
        spreadsheetName={sheetConfig.spreadsheetName}
        isLoading={actionLoading}
        onConfirm={handleExecuteConfirmedBatch}
        onCancel={() => setBatchConfirmationItems(null)}
      />

      <SpreadsheetSettingsModal
        isOpen={isSettingsModalOpen}
        config={sheetConfig}
        user={currentUser}
        userPermission={userPermission}
        isCheckingPermission={isCheckingPermission}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveConfig={(newConfig) => {
          setSheetConfig(newConfig);
          showToast('Configuration enregistrée.', 'success');
        }}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onRecheckPermission={() => verifyIncomingPermission(currentUser?.email)}
      />

      {/* Footer */}
      <Footer sheetConfig={sheetConfig} onOpenSettings={() => setIsSettingsModalOpen(true)} />
    </div>
  );
}
