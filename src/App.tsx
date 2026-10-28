/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Member, MotifKey, OperationRecord, SheetConfig, UserProfile } from './types';
import {
  DEFAULT_MEMBERS,
  DEFAULT_MOTIFS,
  DEFAULT_OPERATIONS,
} from './lib/defaultData';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './lib/firebase';
import {
  LOCAL_STORAGE_SHEET_KEY,
  LOCAL_STORAGE_SAVED_OPERATIONS,
  formatBelgianDateTime,
  formatBelgianDate,
  fetchMembersFromSheet,
  fetchMotifsFromSheet,
  fetchRecentOperationsFromSheet,
  insertOperationToSheet,
  updateOperationInSheet,
  deleteOperationInSheet,
  addMemberToSheet,
  addMotifToSheet,
  fetchFromAppsScript,
  postToAppsScript,
  parseOperationDateTime,
} from './lib/googleSheets';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberSelector, ALL_MEMBERS_OPTION } from './components/MemberSelector';
import { OperationForm } from './components/OperationForm';
import { NewMemberModal } from './components/NewMemberModal';
import { NewMotifModal } from './components/NewMotifModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RecentOperationsList } from './components/RecentOperationsList';
import { SpreadsheetSettingsModal } from './components/SpreadsheetSettingsModal';
import { Footer } from './components/Footer';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  // Spreadsheet configuration state
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SHEET_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.spreadsheetName || parsed.spreadsheetName.includes('Calcul des Points')) {
          parsed.spreadsheetName = 'Points RPA';
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      spreadsheetId: '',
      spreadsheetName: 'Points RPA',
      membresSheetName: 'Membres',
      keysSheetName: 'Keys',
      operationsSheetName: 'Opérations',
      isCustomConfigured: false,
    };
  });

  // App data state
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [motifs, setMotifs] = useState<MotifKey[]>(DEFAULT_MOTIFS);
  const [operations, setOperations] = useState<OperationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SAVED_OPERATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_OPERATIONS;
  });

  // Active selections
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingOperation, setEditingOperation] = useState<OperationRecord | null>(null);

  // Loading & syncing states
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modals state
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState<boolean>(false);
  const [newMemberInitialName, setNewMemberInitialName] = useState<string>('');
  const [isNewMotifModalOpen, setIsNewMotifModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Confirmation Modal state for Workspace mutating operations
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

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        setIsGoogleConnected(true);
      },
      () => {
        setCurrentUser(null);
        setIsGoogleConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch or reload data from Google Sheets or Apps Script
  const loadDataFromGoogleSheets = useCallback(async () => {
    // Mode 1: Apps Script Web App URL
    if (sheetConfig.appsScriptUrl) {
      setIsSyncing(true);
      try {
        setIsLoadingMembers(true);
        const membersRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getMembers');
        if (membersRes?.success && Array.isArray(membersRes.members) && membersRes.members.length > 0) {
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
        if (keysRes?.success && Array.isArray(keysRes.motifs) && keysRes.motifs.length > 0) {
          setMotifs(keysRes.motifs);
        }

        const opsRes = await fetchFromAppsScript(sheetConfig.appsScriptUrl, 'getOperations');
        if (opsRes?.success && Array.isArray(opsRes.operations)) {
          setOperations(
            opsRes.operations
              .map((op: any, i: number) => ({
                id: `op-as-${i}`,
                rowNumber: op.rowNumber,
                dateRando: op.dateRando,
                membre: op.membre,
                points: Number(op.points) || 0,
                description: op.description,
                colE: '',
                mail: op.mail,
                dateOperation: op.dateOperation,
                syncedToGoogleSheets: true,
              }))
              .sort(
                (a: OperationRecord, b: OperationRecord) =>
                  parseOperationDateTime(b.dateOperation) - parseOperationDateTime(a.dateOperation)
              )
          );
        }

        showToast('Synchronisé avec succès via votre script Google Apps Script !', 'success');
      } catch (err: any) {
        console.error('Erreur Apps Script:', err);
        showToast(err?.message || 'Erreur lors de la synchronisation avec le script Apps Script.', 'error');
      } finally {
        setIsSyncing(false);
        setIsLoadingMembers(false);
      }
      return;
    }

    // Mode 2: Google Sheets API via OAuth
    if (!sheetConfig.spreadsheetId) return;

    const token = await getAccessToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      setIsLoadingMembers(true);
      const sheetMembers = await fetchMembersFromSheet(
        sheetConfig.spreadsheetId,
        sheetConfig.membresSheetName
      );
      if (sheetMembers && sheetMembers.length > 0) {
        setMembers(sheetMembers);
      }

      const sheetMotifs = await fetchMotifsFromSheet(
        sheetConfig.spreadsheetId,
        sheetConfig.keysSheetName
      );
      if (sheetMotifs && sheetMotifs.length > 0) {
        setMotifs(sheetMotifs);
      }

      const sheetOperations = await fetchRecentOperationsFromSheet(
        sheetConfig.spreadsheetId,
        sheetConfig.operationsSheetName
      );
      if (sheetOperations && sheetOperations.length > 0) {
        setOperations(sheetOperations);
      }

      showToast('Synchronisation avec Google Sheets réussie !', 'success');
    } catch (err: any) {
      console.error('Erreur de synchronisation Google Sheets:', err);
      showToast(err?.message || 'Erreur lors du chargement de la feuille Google Sheets.', 'error');
    } finally {
      setIsSyncing(false);
      setIsLoadingMembers(false);
    }
  }, [sheetConfig]);

  useEffect(() => {
    if (sheetConfig.appsScriptUrl) {
      loadDataFromGoogleSheets();
    } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
      loadDataFromGoogleSheets();
    }
  }, [isGoogleConnected, sheetConfig.spreadsheetId, sheetConfig.appsScriptUrl, loadDataFromGoogleSheets]);

  // Sign In handler
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser({
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        });
        setIsGoogleConnected(true);
        showToast(`Connecté avec le compte ${res.user.email}`, 'success');

        if (sheetConfig.spreadsheetId) {
          loadDataFromGoogleSheets();
        } else {
          setIsSettingsModalOpen(true);
        }
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
    showToast('Déconnecté du compte Google.', 'info');
  };

  // Add Member handler
  const handleAddMember = async (memberData: { nom: string; prenom?: string; matricule?: string }) => {
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
        });
      } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
        await addMemberToSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.membresSheetName,
          memberData
        );
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
    setActionLoading(true);
    try {
      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'addMotif',
          label,
          points: defaultPoints,
        });
      } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
        await addMotifToSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.keysSheetName,
          label,
          defaultPoints
        );
      }

      const newMotif: MotifKey = {
        key: 'Form_Points_non_FFBC',
        label,
        defaultPoints,
      };

      setMotifs((prev) => [newMotif, ...prev]);
      showToast(`Motif « ${label} » ajouté sous Form_Points_non_FFBC !`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de l\'ajout du motif.', 'error');
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
    if (!selectedMember || selectedMember.nom === 'Tous') {
      showToast('Veuillez sélectionner un membre spécifique pour cette opération.', 'error');
      return;
    }

    const currentTimestamp = formatBelgianDateTime(new Date());
    const userMail = currentUser?.email || 'secretaire@rpa.be';

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
          mail: editingOperation.mail || userMail,
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
          mail: userMail,
          dateOperation: currentTimestamp,
        },
      });
    }
  };

  // 2. Trigger edit from list row (Pencil button)
  const handleEditOperation = (op: OperationRecord) => {
    setEditingOperation(op);
    // Find member or set matching name
    const found = members.find((m) => m.nom.toLowerCase() === op.membre.toLowerCase());
    if (found) {
      setSelectedMember(found);
    } else {
      setSelectedMember({
        nom: op.membre,
        afficherMajManuelle: true,
      });
    }
    // Scroll smoothly to form
    window.scrollTo({ top: 180, behavior: 'smooth' });
    showToast(`Opération de ${op.membre} rechargée pour modification.`, 'info');
  };

  // 3. Trigger delete from list row (Trash button)
  const handleDeleteOperation = (op: OperationRecord) => {
    setConfirmationData({
      actionType: 'delete',
      operation: {
        id: op.id,
        rowNumber: op.rowNumber,
        dateRando: op.dateRando,
        membre: op.membre,
        points: op.points,
        description: op.description,
        mail: op.mail,
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
      if (actionType === 'insert') {
        let synced = false;

        if (sheetConfig.appsScriptUrl) {
          await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'addOperation',
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            description: op.description,
            mail: op.mail,
            dateOperation: op.dateOperation,
          });
          synced = true;
        } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
          await insertOperationToSheet(sheetConfig.spreadsheetId, sheetConfig.operationsSheetName, {
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            description: op.description,
            mail: op.mail,
            dateOperation: op.dateOperation,
          });
          synced = true;
        }

        const newOpRecord: OperationRecord = {
          id: `op-${Date.now()}`,
          rowNumber: operations.length + 2,
          dateRando: op.dateRando,
          membre: op.membre,
          points: op.points,
          description: op.description,
          colE: '',
          mail: op.mail,
          dateOperation: op.dateOperation,
          syncedToGoogleSheets: synced,
        };

        setOperations((prev) => [newOpRecord, ...prev]);

        // Update member points
        setMembers((prev) =>
          prev.map((m) =>
            m.nom === op.membre ? { ...m, pointsActuels: (m.pointsActuels || 0) + op.points } : m
          )
        );

        showToast(
          synced
            ? `Opération enregistrée dans Points RPA pour ${op.membre} (${op.points > 0 ? '+' : ''}${op.points} pts) !`
            : `Opération enregistrée en local pour ${op.membre} !`,
          'success'
        );
      } else if (actionType === 'update') {
        let synced = false;

        if (sheetConfig.appsScriptUrl) {
          await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'updateOperation',
            rowNumber: op.rowNumber,
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            description: op.description,
            mail: op.mail,
            dateOperation: op.dateOperation,
          });
          synced = true;
        } else if (isGoogleConnected && sheetConfig.spreadsheetId && op.rowNumber) {
          await updateOperationInSheet(sheetConfig.spreadsheetId, sheetConfig.operationsSheetName, {
            rowNumber: op.rowNumber,
            dateRando: op.dateRando,
            membre: op.membre,
            points: op.points,
            description: op.description,
            mail: op.mail,
            dateOperation: op.dateOperation,
          });
          synced = true;
        }

        // Update in local state
        setOperations((prev) =>
          prev.map((item) =>
            item.id === op.id || (op.rowNumber && item.rowNumber === op.rowNumber)
              ? {
                  ...item,
                  dateRando: op.dateRando,
                  points: op.points,
                  description: op.description,
                  mail: op.mail,
                  syncedToGoogleSheets: synced,
                }
              : item
          )
        );

        setEditingOperation(null);
        showToast('Opération modifiée avec succès dans Points RPA !', 'success');
      } else if (actionType === 'delete') {
        let synced = false;

        if (sheetConfig.appsScriptUrl) {
          await postToAppsScript(sheetConfig.appsScriptUrl, {
            action: 'deleteOperation',
            rowNumber: op.rowNumber,
          });
          synced = true;
        } else if (isGoogleConnected && sheetConfig.spreadsheetId && op.rowNumber) {
          await deleteOperationInSheet(sheetConfig.spreadsheetId, sheetConfig.operationsSheetName, op.rowNumber);
          synced = true;
        }

        // Remove from local state
        setOperations((prev) =>
          prev.filter((item) => item.id !== op.id && (op.rowNumber ? item.rowNumber !== op.rowNumber : true))
        );

        // Adjust member points
        setMembers((prev) =>
          prev.map((m) =>
            m.nom === op.membre ? { ...m, pointsActuels: (m.pointsActuels || 0) - op.points } : m
          )
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
    setMembers(DEFAULT_MEMBERS);
    setMotifs(DEFAULT_MOTIFS);
    setOperations(DEFAULT_OPERATIONS);
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: '',
      isCustomConfigured: false,
    }));
    showToast('Données de démonstration RPA rechargées.', 'info');
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
        isGoogleConnected={isGoogleConnected}
        isSyncing={isSyncing}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefreshData={loadDataFromGoogleSheets}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {/* Notice if Google Sheet not yet configured */}
        {!sheetConfig.spreadsheetId && !sheetConfig.appsScriptUrl && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs bg-white">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Liaison avec le classeur Google Sheets « Points RPA »
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Renseignez l'URL de votre script Apps Script ou connectez votre classeur pour mettre à jour la feuille{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-800 font-semibold">Opérations</code> et charger vos membres.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition-all active:scale-95"
              >
                Configurer le Classeur Google
              </button>
            </div>
          </div>
        )}

        {/* Section: Saisie Workflow */}
        <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {isAllMembersSelected ? 'Consultation Globale' : 'Saisie & Gestion'}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1">
                {isAllMembersSelected
                  ? 'Historique Global des Points Non-FFBC'
                  : 'Saisie d\'une Opération de Points Non-FFBC'}
              </h2>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Colonnes : A=Date Rando, B=Nom, C=Points, D=Descriptions, F=Mail, G=Date Opération</span>
            </div>
          </div>

          {/* Member Selector with Search, Pencil icon, and 'Tous' pseudo-member */}
          <div className="space-y-3">
            <MemberSelector
              members={members}
              selectedMember={selectedMember}
              onSelectMember={(mem) => {
                setSelectedMember(mem);
                if (editingOperation && mem?.nom !== editingOperation.membre) {
                  setEditingOperation(null);
                }
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
          ) : selectedMember ? (
            /* Specific member selected: display the 3 fields underneath */
            <div className="pt-2 animate-in fade-in duration-200">
              <OperationForm
                member={selectedMember}
                motifs={motifs}
                editingOperation={editingOperation}
                onCancelEdit={() => setEditingOperation(null)}
                onOpenNewMotifModal={() => setIsNewMotifModalOpen(true)}
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
            onEditOperation={handleEditOperation}
            onDeleteOperation={handleDeleteOperation}
            onSelectMemberFilter={(nom) => {
              const found = members.find((m) => m.nom.toLowerCase() === nom.toLowerCase());
              if (found) {
                setSelectedMember(found);
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }
            }}
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
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveConfig={(newConfig) => {
          setSheetConfig(newConfig);
          showToast('Configuration Google Sheets enregistrée.', 'success');
        }}
        onLoadDemoData={handleLoadDemoData}
        isGoogleConnected={isGoogleConnected}
        onSignIn={handleSignIn}
      />

      {/* Footer */}
      <Footer sheetConfig={sheetConfig} onOpenSettings={() => setIsSettingsModalOpen(true)} />
    </div>
  );
}
