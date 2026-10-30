import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Code2,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { SheetConfig, UserPermission, UserProfile } from '../types';
import {
  SAMPLE_APPS_SCRIPT_CODE,
  fetchFromAppsScript,
  checkUserSheetPermission,
} from '../lib/googleSheets';

interface SpreadsheetSettingsModalProps {
  isOpen: boolean;
  config: SheetConfig;
  user: UserProfile | null;
  userPermission: UserPermission | null;
  isCheckingPermission?: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: SheetConfig) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRecheckPermission: () => void;
}

export const SpreadsheetSettingsModal: React.FC<SpreadsheetSettingsModalProps> = ({
  isOpen,
  config,
  user,
  userPermission,
  isCheckingPermission,
  onClose,
  onSaveConfig,
  onSignIn,
  onSignOut,
  onRecheckPermission,
}) => {
  const DEFAULT_APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxmzlZgSplShtZX_TkmrOKvC-R0Jvy5nAlS0tQgTYkKvprfXckTUJKt--aTgIjzdxeE/exec';

  const [appsScriptUrl, setAppsScriptUrl] = useState(
    config.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL
  );
  const [membresSheetName, setMembresSheetName] = useState(config.membresSheetName || 'Membres');
  const [keysSheetName, setKeysSheetName] = useState(config.keysSheetName || 'Keys');
  const [operationsSheetName, setOperationsSheetName] = useState(
    config.operationsSheetName || 'Opérations'
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    title?: string;
    sheets?: string[];
    detectedColumns?: Record<string, number>;
    error?: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      setTestResult({
        success: false,
        error: "Veuillez saisir l'URL de votre Web App Google Apps Script (/exec).",
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetchFromAppsScript(appsScriptUrl.trim(), 'status');
      setTestResult({
        success: true,
        title: res.title || 'Classeur RPA connecté via Apps Script',
        sheets: ['Membres', 'Keys', 'Opérations'],
        detectedColumns: res.detectedColumns || undefined,
      });
      if (user?.email) {
        onRecheckPermission();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error:
          err?.message ||
          'Impossible de joindre le Web App Apps Script. Vérifiez que le déploiement est en mode "Tout le monde" (Anyone).',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      spreadsheetName: testResult?.title || config.spreadsheetName || 'Points RPA',
      membresSheetName: membresSheetName.trim() || 'Membres',
      keysSheetName: keysSheetName.trim() || 'Keys',
      operationsSheetName: operationsSheetName.trim() || 'Opérations',
      isCustomConfigured: Boolean(appsScriptUrl.trim()),
      appsScriptUrl: appsScriptUrl.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden transform animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white px-5 py-4 flex items-center justify-between border-b-2 border-amber-500 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-emerald-950 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Configuration et Droits d'Accès</h2>
              <p className="text-xs text-emerald-200">Classeur « Points RPA »</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Compte Google & Permissions RW */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Compte Google & Droits d'Écriture (RW)</span>
              </span>
              {user && (
                <button
                  type="button"
                  onClick={onRecheckPermission}
                  disabled={isCheckingPermission}
                  className="text-xs text-emerald-800 hover:text-emerald-950 flex items-center gap-1 font-semibold hover:underline disabled:opacity-50"
                  title="Re-vérifier les permissions sur le classeur"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingPermission ? 'animate-spin' : ''}`} />
                  <span>Vérifier</span>
                </button>
              )}
            </div>

            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-200 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Compte Google'}
                        className="w-8 h-8 rounded-full border border-emerald-300 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-gray-900">{user.displayName || user.email}</div>
                      <div className="text-[11px] text-gray-500">{user.email}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Badge de droit d'accès */}
                {isCheckingPermission ? (
                  <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    <span>Contrôle des droits d'écriture sur le classeur « Points RPA » en cours...</span>
                  </div>
                ) : userPermission?.canWrite ? (
                  <div className="p-3 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-900">
                        Accès en écriture validé ({userPermission.role === 'OWNER' ? 'Propriétaire' : 'Éditeur'})
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Votre compte Google est bien autorisé à ajouter, modifier et supprimer des opérations. L'adresse <strong>{user.email}</strong> sera inscrite automatiquement en colonne G.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-900">Lecture seule : Droits d'écriture non accordés</div>
                      <p className="text-[11px] text-amber-800/95 mt-0.5">
                        {userPermission?.reason ||
                          `Le compte ${user.email} n'est pas configuré comme Éditeur sur le classeur « Points RPA ».`}
                      </p>
                      <p className="text-[11px] text-amber-900 font-semibold mt-1">
                        👉 Pour débloquer l'écriture : ouvrez le classeur Google Sheets, cliquez sur le bouton vert <strong>« Partager »</strong> en haut à droite, et ajoutez <strong>{user.email}</strong> en tant qu'<strong>Éditeur</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-3.5 border border-dashed border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-700">
                  <div className="font-bold text-gray-900">Connexion Google requise</div>
                  <div className="text-[11px] text-gray-500">
                    Connectez-vous pour vérifier automatiquement vos droits d'accès sur le classeur.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs whitespace-nowrap active:scale-95 transition-all"
                >
                  Se connecter avec Google
                </button>
              </div>
            )}
          </div>

          {/* Section 2: URL Web App Google Apps Script */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                URL Web App Google Apps Script (/exec)
              </label>
              <span className="text-[11px] text-emerald-700 font-medium">Déjà configurée par défaut</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Tester la liaison</span>
              </button>
            </div>

            {/* Test result display */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl text-xs border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.success ? (
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Classeur connecté avec succès : {testResult.title}</span>
                    </div>
                    {testResult.detectedColumns && (
                      <div className="mt-2 p-2 bg-white/80 rounded-lg border border-emerald-300 text-[11px] text-emerald-950 font-mono">
                        <div className="font-bold mb-1 text-emerald-900">Mappage des colonnes (A à H) :</div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                          <div>• Col A (Date rando) : index {testResult.detectedColumns.dateRando}</div>
                          <div>• Col B (Membre) : index {testResult.detectedColumns.membre}</div>
                          <div>• Col C (Points) : index {testResult.detectedColumns.points}</div>
                          <div>• Col D (Motif) : index {testResult.detectedColumns.description}</div>
                          <div>• Col E (Checkbox) : index {testResult.detectedColumns.checkbox}</div>
                          <div>• Col F (Source) : index {testResult.detectedColumns.source}</div>
                          <div>• Col G (Mail) : index {testResult.detectedColumns.mail}</div>
                          <div>• Col H (Date opération) : index {testResult.detectedColumns.dateOperation}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Résultat du test</div>
                      <div className="text-[11px] mt-0.5">{testResult.error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Code Apps Script (.gs) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Code2 className="w-4 h-4 text-emerald-700" />
                <span>Code Google Apps Script (Code.gs) avec vérification RW</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copié !' : 'Copier le code'}</span>
              </button>
            </div>
            <p className="text-[11.5px] text-slate-600 leading-relaxed">
              Ce script intègre la détection automatique des colonnes A à H, la case à cocher native en colonne E, le verrouillage des lignes validées, et le contrôle des droits d'écriture (Éditeurs Drive).
            </p>
            <div className="bg-slate-900 rounded-xl p-3 text-[11px] font-mono text-emerald-300 max-h-24 overflow-y-auto select-all">
              <pre className="whitespace-pre-wrap">{SAMPLE_APPS_SCRIPT_CODE.slice(0, 500)}... (cliquez sur Copier pour le code complet)</pre>
            </div>
          </div>

          {/* Section 4: Noms des feuilles */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Noms des onglets du classeur « Points RPA »
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">Membres</label>
                <input
                  type="text"
                  value={membresSheetName}
                  onChange={(e) => setMembresSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">Keys</label>
                <input
                  type="text"
                  value={keysSheetName}
                  onChange={(e) => setKeysSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">Opérations</label>
                <input
                  type="text"
                  value={operationsSheetName}
                  onChange={(e) => setOperationsSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition-all active:scale-95"
          >
            Enregistrer la configuration
          </button>
        </div>
      </div>
    </div>
  );
};
