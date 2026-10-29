import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Loader2,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { SheetConfig } from '../types';
import {
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  SAMPLE_APPS_SCRIPT_CODE,
  fetchFromAppsScript,
} from '../lib/googleSheets';

interface SpreadsheetSettingsModalProps {
  isOpen: boolean;
  config: SheetConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: SheetConfig) => void;
  onLoadDemoData: () => void;
  isGoogleConnected: boolean;
  onSignIn: () => void;
}

export const SpreadsheetSettingsModal: React.FC<SpreadsheetSettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
  onLoadDemoData,
  isGoogleConnected,
  onSignIn,
}) => {
  const DEFAULT_APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxmzlZgSplShtZX_TkmrOKvC-R0Jvy5nAlS0tQgTYkKvprfXckTUJKt--aTgIjzdxeE/exec';
  const [activeTab, setActiveTab] = useState<'oauth' | 'apps_script'>('apps_script');
  const [sheetInput, setSheetInput] = useState(config.spreadsheetId || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL);
  const [membresSheetName, setMembresSheetName] = useState(config.membresSheetName || 'Membres');
  const [keysSheetName, setKeysSheetName] = useState(config.keysSheetName || 'Keys');
  const [operationsSheetName, setOperationsSheetName] = useState(config.operationsSheetName || 'Opérations');
  
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
    if (activeTab === 'apps_script') {
      if (!appsScriptUrl.trim()) {
        setTestResult({
          success: false,
          error: 'Veuillez saisir l\'URL de votre Web App Google Apps Script (/exec).',
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
      } catch (err: any) {
        setTestResult({
          success: false,
          error: err?.message || 'Impossible de joindre le Web App Apps Script. Vérifiez que le déploiement est en mode "Tout le monde" (Anyone).',
        });
      } finally {
        setIsTesting(false);
      }
      return;
    }

    const cleanId = extractSpreadsheetId(sheetInput);
    if (!cleanId) {
      setTestResult({
        success: false,
        error: 'Veuillez saisir un identifiant ou une URL de feuille Google Sheets.',
      });
      return;
    }

    if (!isGoogleConnected) {
      setTestResult({
        success: false,
        error: 'Veuillez d\'abord cliquer sur "Se connecter avec Google" ci-dessous.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const meta = await fetchSpreadsheetMetadata(cleanId);
      setTestResult({
        success: true,
        title: meta.title,
        sheets: meta.sheets,
      });
      if (meta.sheets.some((s) => s.toLowerCase() === 'membres')) setMembresSheetName('Membres');
      if (meta.sheets.some((s) => s.toLowerCase() === 'keys')) setKeysSheetName('Keys');
      if (meta.sheets.some((s) => s.toLowerCase().includes('opér') || s.toLowerCase().includes('oper'))) {
        const found = meta.sheets.find((s) => s.toLowerCase().includes('opér') || s.toLowerCase().includes('oper'));
        if (found) setOperationsSheetName(found);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.message || 'Impossible de joindre le classeur. Vérifiez que votre compte Google y a bien accès.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const cleanId = extractSpreadsheetId(sheetInput);
    onSaveConfig({
      spreadsheetId: cleanId,
      spreadsheetName: testResult?.title || config.spreadsheetName || 'Classeur RPA',
      membresSheetName: membresSheetName.trim() || 'Membres',
      keysSheetName: keysSheetName.trim() || 'Keys',
      operationsSheetName: operationsSheetName.trim() || 'Opérations',
      isCustomConfigured: Boolean(cleanId || appsScriptUrl),
      appsScriptUrl: appsScriptUrl.trim(),
      syncMode: appsScriptUrl.trim() ? 'apps_script' : 'oauth',
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
              <h2 className="text-base font-bold">Liaison Google Sheets / Apps Script</h2>
              <p className="text-xs text-emerald-200">Projet Calcul des Points de la RPA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Option A : Connexion Google Directe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apps_script')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'apps_script'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Option B : Script Google Apps Script (.gs)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'oauth' ? (
            <>
              {/* Clarification banner about Google popup & project name */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pourquoi Google affiche le nom du projet technique ?</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-900/90">
                  Lors de la connexion, Google affiche le nom interne du projet Google Cloud créé par AI Studio pour héberger les autorisations de l'application. 
                  En validant, vous accordez simplement à <strong>votre propre application</strong> l'accès à vos Google Sheets pour enregistrer les points du club RPA.
                </p>
              </div>

              {/* Account connection status */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-emerald-950">Statut de la connexion Google</div>
                  <div className="text-emerald-700">
                    {isGoogleConnected
                      ? 'Compte Google connecté et prêt pour Sheets'
                      : 'Non connecté (vous choisirez le compte ayant accès au fichier)'}
                  </div>
                </div>
                {!isGoogleConnected && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
                  >
                    Se connecter
                  </button>
                )}
              </div>

              {/* Spreadsheet ID / URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>URL ou ID du Classeur Google Sheets</span>
                  <span className="text-[11px] text-gray-400 font-normal">Coller l'URL du navigateur</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold shrink-0 border border-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>Tester</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Option B: Google Apps Script Web App */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Zap className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Avantage de l'URL Web App (script gs) : Aucune fenêtre de connexion !</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-emerald-800">
                  Si vous avez déjà un script Google Apps Script dans votre classeur RPA, vous pouvez simplement déployer une application Web. Ainsi, les membres et encodeurs n'ont <strong>aucun compte Google à connecter</strong> !
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>URL de l'application Web Apps Script</span>
                  <span className="text-[11px] text-emerald-700 font-mono font-normal">se termine par /exec</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold shrink-0 border border-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>Tester</span>
                  </button>
                </div>

                {/* Important deployment tips */}
                <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600 space-y-1">
                  <div className="font-semibold text-gray-800">Points indispensables pour éviter l'erreur NetworkError :</div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">1.</span>
                    <span>Dans le déploiement Apps Script, réglez <strong>« Qui a accès »</strong> sur <strong>« Tout le monde » (Anyone)</strong>, et non pas sur « Moi uniquement ».</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">2.</span>
                    <span>L'URL doit se terminer par <code>/exec</code> (ne copiez pas l'URL de test <code>/dev</code> ni l'URL de l'éditeur <code>/edit</code>).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">3.</span>
                    <span>Si vous modifiez le code, cliquez sur <em>Gérer les déploiements &gt; Crayon &gt; Version : Nouvelle version &gt; Déployer</em>.</span>
                  </div>
                </div>
              </div>

              {/* Sample Code for Apps Script */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-900 text-gray-200">
                <div className="px-3 py-2 bg-gray-800 flex items-center justify-between text-xs border-b border-gray-700">
                  <span className="font-mono text-emerald-400">Code à ajouter dans votre script gs (Extensions &gt; Apps Script)</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copié !' : 'Copier le code gs'}</span>
                  </button>
                </div>
                <div className="p-3 text-[11px] font-mono max-h-36 overflow-y-auto leading-relaxed text-gray-300 whitespace-pre">
                  {SAMPLE_APPS_SCRIPT_CODE}
                </div>
              </div>
            </>
          )}

          {/* Test results banner */}
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
                    <span>Feuille connectée avec succès : {testResult.title}</span>
                  </div>
                  {testResult.sheets && (
                    <div className="text-gray-600 text-[11px]">
                      Onglets disponibles : {testResult.sheets.join(', ')}
                    </div>
                  )}
                  {testResult.detectedColumns && (
                    <div className="mt-2 p-2 bg-white/80 rounded-lg border border-emerald-300 text-[11px] text-emerald-950 font-mono">
                      <div className="font-bold mb-1 text-emerald-900">Mappage automatique des colonnes détecté :</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                        <div>• Date rando : Col {String.fromCharCode(64 + testResult.detectedColumns.dateRando)} ({testResult.detectedColumns.dateRando})</div>
                        <div>• Membre : Col {String.fromCharCode(64 + testResult.detectedColumns.membre)} ({testResult.detectedColumns.membre})</div>
                        <div>• Points : Col {String.fromCharCode(64 + testResult.detectedColumns.points)} ({testResult.detectedColumns.points})</div>
                        <div>• Motif : Col {String.fromCharCode(64 + testResult.detectedColumns.description)} ({testResult.detectedColumns.description})</div>
                        <div>• Checkbox : Col {String.fromCharCode(64 + testResult.detectedColumns.checkbox)} ({testResult.detectedColumns.checkbox})</div>
                        <div>• Source : Col {String.fromCharCode(64 + testResult.detectedColumns.source)} ({testResult.detectedColumns.source})</div>
                        <div>• Mail : Col {String.fromCharCode(64 + testResult.detectedColumns.mail)} ({testResult.detectedColumns.mail})</div>
                        <div>• Date opération : Col {String.fromCharCode(64 + testResult.detectedColumns.dateOperation)} ({testResult.detectedColumns.dateOperation})</div>
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

          {/* Tabs names configuration */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Noms des onglets dans le classeur Google
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                  Membres
                </label>
                <input
                  type="text"
                  value={membresSheetName}
                  onChange={(e) => setMembresSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                  Keys (Motifs)
                </label>
                <input
                  type="text"
                  value={keysSheetName}
                  onChange={(e) => setKeysSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 font-semibold mb-1">
                  Opérations
                </label>
                <input
                  type="text"
                  value={operationsSheetName}
                  onChange={(e) => setOperationsSheetName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg font-medium"
                />
              </div>
            </div>
          </div>

          {/* Demo Data button */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Mode démonstration :</span>
            <button
              type="button"
              onClick={() => {
                onLoadDemoData();
                onClose();
              }}
              className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Charger les données d'exemple RPA</span>
            </button>
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
