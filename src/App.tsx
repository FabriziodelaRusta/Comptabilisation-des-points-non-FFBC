/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
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
  addMemberToSheet,
  addMotifToSheet,
  fetchFromAppsScript,
  postToAppsScript,
} from './lib/googleSheets';
import { HeaderBanner } from './components/HeaderBanner';
import { MemberSelector } from './components/MemberSelector';
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
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      spreadsheetId: '',
      spreadsheetName: 'Classeur RPA - Calcul des Points',
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
  const [pendingOperation, setPendingOperation] = useState<{
    member: Member;
    dateEvenement: string;
    points: number;
    motif: string;
    dateOperation: string;
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
        setOperations((prev) => {
          const map = new Map<string, OperationRecord>();
          sheetOperations.forEach((op) => map.set(`${op.dateOperation}-${op.membre}`, op));
          prev.forEach((op) => {
            const key = `${op.dateOperation}-${op.membre}`;
            if (!map.has(key)) map.set(key, op);
          });
          return Array.from(map.values()).sort(
            (a, b) => b.dateOperation.localeCompare(a.dateOperation)
          );
        });
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

  // Load when connected or config changes
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

        // If spreadsheet ID is already set, load data
        if (sheetConfig.spreadsheetId) {
          loadDataFromGoogleSheets();
        } else {
          // Open settings to let user paste their Google Sheet link
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

  // Handle adding a new member
  const handleAddMember = async (memberData: { nom: string; prenom?: string; matricule?: string }) => {
    setActionLoading(true);
    try {
      const fullName = memberData.prenom
        ? `${memberData.nom} ${memberData.prenom}`
        : memberData.nom;

      // If connected via Apps Script
      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'addMember',
          nom: fullName,
          matricule: memberData.matricule || '',
        });
      } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
        // If connected via Google Sheets OAuth API
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

  // Handle adding a new motif
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

  // Step 1 of operation submission: prompt user with confirmation dialog
  const handleInitiateOperation = (operationData: {
    dateEvenement: string;
    points: number;
    motif: string;
  }) => {
    if (!selectedMember) {
      showToast('Veuillez d\'abord sélectionner un membre RPA.', 'error');
      return;
    }

    const currentTimestamp = formatBelgianDateTime(new Date());

    setPendingOperation({
      member: selectedMember,
      dateEvenement: operationData.dateEvenement,
      points: operationData.points,
      motif: operationData.motif,
      dateOperation: currentTimestamp,
    });
  };

  // Step 2: Confirm and write to Google Sheets (Opérations sheet)
  const handleConfirmOperation = async () => {
    if (!pendingOperation) return;

    setActionLoading(true);
    try {
      const { member, dateEvenement, points, motif, dateOperation } = pendingOperation;

      let synced = false;

      // Mode 1: Apps Script Web App
      if (sheetConfig.appsScriptUrl) {
        await postToAppsScript(sheetConfig.appsScriptUrl, {
          action: 'addOperation',
          dateOperation,
          dateEvenement: formatBelgianDate(dateEvenement),
          membre: member.nom,
          points,
          motif,
          saisiPar: currentUser?.email || 'WebApp RPA',
        });
        synced = true;
      } else if (isGoogleConnected && sheetConfig.spreadsheetId) {
        // Mode 2: Direct Google Sheets API
        await insertOperationToSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.operationsSheetName,
          {
            dateOperation,
            dateEvenement,
            membre: member.nom,
            points,
            motif,
            saisiPar: currentUser?.email || 'WebApp RPA',
          }
        );
        synced = true;
      }

      // Add to local operation log
      const newOpRecord: OperationRecord = {
        id: `op-${Date.now()}`,
        dateOperation,
        dateEvenement: formatBelgianDate(dateEvenement),
        membre: member.nom,
        points,
        motif,
        saisiPar: currentUser?.email || 'WebApp RPA',
        syncedToGoogleSheets: synced,
      };

      setOperations((prev) => [newOpRecord, ...prev]);

      // Update member's current points in local state
      setMembers((prev) =>
        prev.map((m) =>
          m.nom === member.nom
            ? { ...m, pointsActuels: (m.pointsActuels || 0) + points }
            : m
        )
      );

      // Also update selectedMember's point cache
      setSelectedMember((prev) =>
        prev && prev.nom === member.nom
          ? { ...prev, pointsActuels: (prev.pointsActuels || 0) + points }
          : prev
      );

      showToast(
        synced
          ? `Opération enregistrée dans Google Sheets pour ${member.nom} (${points > 0 ? '+' : ''}${points} pts) !`
          : `Opération enregistrée en local pour ${member.nom} (${points > 0 ? '+' : ''}${points} pts) ! Connectez votre classeur pour la synchronisation Google Sheets.`,
        'success'
      );

      setPendingOperation(null);
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      showToast(err?.message || 'Erreur lors de l\'enregistrement dans Google Sheets.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Restore sample data
  const handleLoadDemoData = () => {
    setMembers(DEFAULT_MEMBERS);
    setMotifs(DEFAULT_MOTIFS);
    setOperations(DEFAULT_OPERATIONS);
    setSheetConfig((prev) => ({
      ...prev,
      spreadsheetId: '',
      isCustomConfigured: false,
    }));
    showToast('Données de démonstration RPA chargées avec succès.', 'info');
  };

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
        {!sheetConfig.spreadsheetId && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs bg-white">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Liaison avec la feuille Google Sheets du projet « Calcul des points de la RPA »
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Connectez votre classeur pour mettre à jour directement la feuille{' '}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-800 font-semibold">Opérations</code> et lire vos membres autorisés.
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

        {/* Card: Primary Saisie Workflow */}
        <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Étape 1 & 2
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mt-1">
                Saisie d'une Opération de Points Non-FFBC
              </h2>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Horodatage automatique : jj/mm/AAAA HH:MM:SS</span>
            </div>
          </div>

          {/* Step 1: Member Selector with Search and Pencil icon */}
          <div className="space-y-3">
            <MemberSelector
              members={members}
              selectedMember={selectedMember}
              onSelectMember={setSelectedMember}
              onOpenNewMemberModal={(initialName) => {
                setNewMemberInitialName(initialName || '');
                setIsNewMemberModalOpen(true);
              }}
              isLoading={isLoadingMembers}
            />
          </div>

          {/* Step 2: Once member is chosen, display the 3 fields underneath as requested */}
          {selectedMember ? (
            <div className="pt-2 animate-in fade-in duration-200">
              <OperationForm
                member={selectedMember}
                motifs={motifs}
                onOpenNewMotifModal={() => setIsNewMotifModalOpen(true)}
                onSubmit={handleInitiateOperation}
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
                  Veuillez choisir un membre RPA dans la liste déroulante ci-dessus
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Une fois le membre sélectionné, les champs pour choisir la <strong>date</strong>, le <strong>nombre de points (+/-)</strong> et le <strong>motif</strong> apparaîtront directement ici.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Section: Recent Operations History Table */}
        <section>
          <RecentOperationsList
            operations={operations}
            spreadsheetName={sheetConfig.spreadsheetName}
            isGoogleConnected={isGoogleConnected}
            onSelectMemberFilter={(nom) => {
              const found = members.find((m) => m.nom === nom);
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
        isOpen={Boolean(pendingOperation)}
        member={pendingOperation?.member || null}
        dateEvenement={pendingOperation ? formatBelgianDate(pendingOperation.dateEvenement) : ''}
        points={pendingOperation?.points || 0}
        motif={pendingOperation?.motif || ''}
        dateOperation={pendingOperation?.dateOperation || ''}
        spreadsheetName={sheetConfig.spreadsheetName}
        isLoading={actionLoading}
        onConfirm={handleConfirmOperation}
        onCancel={() => setPendingOperation(null)}
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
