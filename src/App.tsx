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
  LOCAL_STORAGE_SHEET_KEY,
  LOCAL_STORAGE_SAVED_OPERATIONS,
  formatBelgianDateTime,
  formatBelgianDate,
  fetchFromAppsScript,
  postToAppsScript,
  parseOperationDateTime,
  checkUserSheetPermission,
} from './lib/googleSheets';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberSelector, ALL_MEMBERS_OPTION } from './components/MemberSelector';
import { OperationForm } from './components/OperationForm';
import { NewMemberModal } from './components/NewMemberModal';
import { NewMotifModal } from './components/NewMotifModal';
import { EditMotifModal } from './components/EditMotifModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RecentOperationsList } from './components/RecentOperationsList';
import { SpreadsheetSettingsModal } from './components/SpreadsheetSettingsModal';
import { Footer } from './components/Footer';

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxmzlZgSplShtZX_TkmrOKvC-R0Jvy5nAlS0tQgTYkKvprfXckTUJKt--aTgIjzdxeE/exec';

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
        if (!parsed.appsScriptUrl || parsed.appsScriptUrl.trim() === '') {
          parsed.appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
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

  // Modals state
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [newMemberInitialName, setNewMemberInitialName] = useState<string>('');
  const [isNewMotifModalOpen, setIsNewMotifModalOpen] = useState<boolean>(false);
  const [isEditMotifModalOpen, setIsEditMotifModalOpen] = useState<boolean>(false);
  const [currentMotifToEdit, setCurrentMotifToEdit] = useState<MotifKey | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Confirmation Modal state for mutating operations
  const [confirmationData, setConfirmationData] = useState<{
    actionType: 'insert' | 'update' | 'delete';
    operation: {
      id?: string;
      rowNumber?: number;
      dateRando: string;
      membre: string;
      points: number;
      description: string;
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
  const checkPermissions = useCallback(
    async (userToTest?: UserProfile | null) => {
      const targetUser = userToTest !== undefined ? userToTest : currentUser;
      if (!targetUser?.email || !sheetConfig.appsScriptUrl) {
        setUserPermission(null);
        return;
      }
      setIsCheckingPermission(true);
      try {
        const perm = await checkUserSheetPermission(sheetConfig.appsScriptUrl, targetUser.email);
        setUserPermission(perm);
      } catch (err) {
        console.warn('Erreur vérification permission:', err);
      } finally {
        setIsCheckingPermission(false);
      }
    },
    [currentUser, sheetConfig.appsScriptUrl]
  );

  // Initialize Firebase Auth listener (restaure automatiquement la session si déjà connecté)
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
        checkPermissions(profile);
      },
      () => {
        setCurrentUser(null);
        setIsGoogleConnected(false);
        setUserPermission(null);
      }
    );
    return () => unsubscribe();
  }, [checkPermissions]);

  // Fetch or reload data from Google Sheets via Apps Script
  const loadDataFromGoogleSheets = useCallback(async () => {
    if (!sheetConfig.appsScriptUrl) return;

    setIsSyncing(true);
    try {
      setIsLoadingMembers(true);
      const membersRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getMembers');
      if (membersRes?.success && Array.isArray(membersRes.members)) {
        setMembers(
          membersRes.members.map((m: any, i: number) => ({
            id: `mem-as-${i}`,
            nom: m.nom,
            matricule: m.matricule,
            afficherMajManuelle: true,
          }))
        );
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
                description: String(op.description || ''),
                colE: isChecked,
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

      showToast('Données synchronisées avec succès depuis Points RPA !', 'success');
      if (currentUser?.email) {
        checkPermissions(currentUser);
      }
    } catch (err: any) {
      console.error('Erreur Apps Script:', err);
      showToast(err?.message || 'Erreur lors de la synchronisation avec le script Apps Script.', 'error');
    } finally {
      setIsSyncing(false);
      setIsLoadingMembers(false);
    }
  }, [sheetConfig.appsScriptUrl, currentUser, checkPermissions]);

  useEffect(() => {
    if (sheetConfig.appsScriptUrl) {
      loadDataFromGoogleSheets();
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
        checkPermissions(profile);
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
    description: string;
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
          description: data.description,
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
          description: data.description,
          mail: verifiedUserMail,
          dateOperation: currentTimestamp,
        },
      });
    }
  };

  // 2. Trigger edit from list row (Pencil button)
  const handleEditOperation = (op: OperationRecord) => {
    if (op.isChecked) {
      showToast('Cette opération est validée dans Google Sheets (case cochée en colonne E). Modification verrouillée.', 'error');
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
      showToast('Cette opération est validée dans Google Sheets (case cochée en colonne E). Suppression verrouillée.', 'error');
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
        description: op.description,
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
          showToast('Opération validée dans Google Sheets (case cochée en colonne E) : action verrouillée.', 'error');
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
            description: op.description,
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
          description: op.description,
          colE: false,
          isChecked: false,
          source: 'WebApp RPA',
          mail: op.mail,
          dateOperation: op.dateOperation,
          syncedToGoogleSheets: true,
        };

        setOperations((prev) => [newOpRecord, ...prev]);

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
            description: op.description,
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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-gray-900 selection:bg-emerald-500 selection:text-white">
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
        {/* Section: Saisie Workflow */}
        <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
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
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5" />
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
                key={`${currentSelectedMemberWithPoints.nom}-${editingOperation ? editingOperation.id : 'create'}`}
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
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto font-bold">
                <User className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-bold text-gray-800">
                  Choisissez un membre RPA ou « Tous » dans la liste ci-dessus
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez un membre pour lui attribuer des points (date rando, points, description) ou choisissez <strong>« Tous »</strong> pour consulter l'ensemble des opérations du club.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Section: Filtered Operations List with Pencil & Trash */}
        <section>
          <RecentOperationsList
            operations={operations}
            selectedMember={selectedMember}
            spreadsheetName={sheetConfig.spreadsheetName}
            isGoogleConnected={isGoogleConnected}
            canWrite={Boolean(currentUser && userPermission?.canWrite)}
            onEditOperation={handleEditOperation}
            onDeleteOperation={handleDeleteOperation}
            onSelectMemberFilter={(nom) => {
              const found = members.find((m) => m.nom.toLowerCase() === nom.toLowerCase());
              if (found) {
                setSelectedMember(found);
                window.scrollTo({ top: 120, behavior: 'smooth' });
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
        description={confirmationData?.operation.description || ''}
        dateOperation={confirmationData?.operation.dateOperation || ''}
        spreadsheetName={sheetConfig.spreadsheetName}
        isLoading={actionLoading}
        onConfirm={handleExecuteConfirmedAction}
        onCancel={() => setConfirmationData(null)}
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
        onRecheckPermission={() => checkPermissions(currentUser)}
      />

      {/* Footer */}
      <Footer sheetConfig={sheetConfig} onOpenSettings={() => setIsSettingsModalOpen(true)} />
    </div>
  );
}
