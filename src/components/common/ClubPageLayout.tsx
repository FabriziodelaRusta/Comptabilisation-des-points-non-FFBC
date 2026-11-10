import React, { useState } from 'react';
import {
  FileSpreadsheet,
  LogOut,
  Settings,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { UserProfile, SheetConfig, UserPermission } from '../../types';
import { Footer } from '../Footer';
import { ClubColorStripe } from '../HeaderBanner';

export interface ClubPageLayoutProps {
  /** Titre affiché dans l'en-tête (par défaut : Comptabilisation des points non-FFBC) */
  pageTitle?: string;
  /** Sous-titre ou localisation du club (par défaut : Roue Princière d'Allain) */
  clubSubtitle?: string;
  /** Label de la saison ou du module */
  badgeLabel?: string;
  /** Numéro de version affiché (ex : 0.14) */
  version?: string;
  /** Utilisateur Google connecté */
  user?: UserProfile | null;
  /** Configuration du classeur Google Sheets */
  sheetConfig?: SheetConfig;
  /** Droits de l'utilisateur (lecture ou écriture) */
  userPermission?: UserPermission | null;
  /** Indique si la vérification des permissions est en cours */
  isCheckingPermission?: boolean;
  /** Indique si une synchronisation de données est en cours */
  isSyncing?: boolean;
  /** Action au clic sur Connexion Google */
  onSignIn?: () => void;
  /** Action au clic sur Déconnexion */
  onSignOut?: () => void;
  /** Action pour ouvrir le panneau de réglages / configuration */
  onOpenSettings?: () => void;
  /** Action pour rafraîchir les données */
  onRefreshData?: () => void;
  /** Boutons ou éléments d'action supplémentaires dans l'en-tête */
  headerActions?: React.ReactNode;
  /** Le contenu principal de la page */
  children: React.ReactNode;
}

/**
 * Gabarit de page officiel RPA — Fidèle à 100% à l'application https://fabriziodelarusta.github.io/Callendrier_FFBC_Abonnement/
 * 
 * - Ruban aux couleurs officielles du club (Bleu ciel #009ee2, Blanc #ffffff, Vert #5daf32)
 * - Header : 'sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs'
 * - Logo officiel : 'https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png' (w-9 h-11 sm:w-12 sm:h-14 object-contain filter drop-shadow-xs)
 * - Titre : 'text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-tight'
 * - Badge version : 'text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800'
 * - Sous-titre club : 'text-xs sm:text-sm font-bold text-blue-600 leading-tight'
 * - Ambiance de page : 'bg-slate-50 text-slate-900 antialiased font-sans selection:bg-blue-600 selection:text-white'
 * - Footer : 'v<sub id="version" className="font-bold text-blue-600">0.14</sub> — Fabrizio de la Rusta'
 */
export const ClubPageLayout: React.FC<ClubPageLayoutProps> = ({
  pageTitle = 'Comptabilisation des points non-FFBC',
  clubSubtitle = "Roue Princière d'Allain",
  badgeLabel,
  version = '1.4',
  user,
  sheetConfig,
  userPermission,
  isCheckingPermission = false,
  isSyncing = false,
  onSignIn,
  onSignOut,
  onOpenSettings,
  onRefreshData,
  headerActions,
  children,
}) => {
  const [logoLoaded, setLogoLoaded] = useState(true);

  const defaultSheetConfig: SheetConfig = sheetConfig || {
    spreadsheetName: 'Points RPA',
    membresSheetName: 'Membres',
    keysSheetName: 'Keys',
    operationsSheetName: 'Opérations',
    isCustomConfigured: true,
    appsScriptUrl: '',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. HEADER BANNER — AUX COULEURS ET STYLE DE Callendrier_FFBC_Abonnement */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 min-h-[72px] sm:min-h-[80px] px-3 sm:px-6">
          {/* PARTIE GAUCHE DU HEADER : BANDES COLORÉES (À GAUCHE DU LOGO) + LOGO + TITRES */}
          <div className="flex items-center gap-3 sm:gap-3.5 py-2">
            {/* 1. Les 3 bandes colorées à gauche du logo et sur la hauteur du logo */}
            <ClubColorStripe className="h-12 sm:h-14 rounded-xs overflow-hidden" />

            {/* 2. Le logo RPA officiel */}
            <div className="shrink-0 flex items-center justify-center">
              {logoLoaded ? (
                <img
                  src="https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png"
                  alt="Logo Club RPA"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoLoaded(false)}
                  className="h-12 w-auto sm:h-14 object-contain filter drop-shadow-xs"
                />
              ) : (
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-[#009ee2] text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs">
                  RPA
                </div>
              )}
            </div>

            {/* 3. Titre et sous-titres */}
            <div className="min-w-0 py-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {pageTitle}
                </h1>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  v{version}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#009ee2] leading-tight">
                {clubSubtitle}
              </p>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Club affilié FFBC</span>
                <span>·</span>
                <span className="text-blue-800 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  {badgeLabel || defaultSheetConfig.spreadsheetName || 'Points RPA'}
                </span>
                {user && (
                  <>
                    <span>·</span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] sm:text-[11px] font-semibold border ${
                        userPermission?.canWrite
                          ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          : 'text-amber-800 bg-amber-50 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          userPermission?.canWrite ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {userPermission?.canWrite ? 'Éditeur RW' : 'Lecture seule'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* PARTIE DROITE DU HEADER : COMMANDES & AUTHENTIFICATION */}
          <div className="flex items-center flex-wrap gap-2 self-end md:self-auto shrink-0">
            {headerActions}

            {/* Barre d'outils */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1 text-xs">
              {onRefreshData && (
                <button
                  type="button"
                  onClick={onRefreshData}
                  disabled={isSyncing}
                  title="Rafraîchir les données de la feuille"
                  className="px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:text-blue-700 hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                  <span className="hidden sm:inline">Actualiser</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Paramètres de liaison Google Sheets"
                  className="px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:text-blue-700 hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Configuration</span>
                </button>
              )}
            </div>

            {/* Profil Google ou bouton de connexion */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 truncate max-w-[130px] flex items-center gap-1">
                    <span>{user.displayName || 'Connecté'}</span>
                    {isCheckingPermission ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                    ) : userPermission?.canWrite ? (
                      <span title="Éditeur autorisé sur le classeur" className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span title="Lecture seule (Pas accès éditeur sur le classeur)" className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={user.email || ''}>
                    {user.email}
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Se déconnecter"
                    className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignIn ? (
              <button
                type="button"
                onClick={onSignIn}
                className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-2xs border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Connexion Google</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* 2. CORPS PRINCIPAL DE LA PAGE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {children}
      </main>

      {/* 3. FOOTER OFFICIEL IDENTIQUE À Callendrier_FFBC_Abonnement */}
      <Footer
        sheetConfig={defaultSheetConfig}
        onOpenSettings={onOpenSettings || (() => {})}
        version={version}
      />
    </div>
  );
};
