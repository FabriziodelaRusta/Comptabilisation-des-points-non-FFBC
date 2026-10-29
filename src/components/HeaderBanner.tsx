import React from 'react';
import {
  FileSpreadsheet,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Settings,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, SheetConfig } from '../types';

interface HeaderBannerProps {
  user: UserProfile | null;
  sheetConfig: SheetConfig;
  isGoogleConnected: boolean;
  isSyncing: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onRefreshData: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  user,
  sheetConfig,
  isGoogleConnected,
  isSyncing,
  onSignIn,
  onSignOut,
  onOpenSettings,
  onRefreshData,
}) => {
  return (
    <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl border-b-4 border-amber-500">
      {/* Top subtle notification / utility bar */}
      <div className="bg-emerald-950/70 px-4 py-1.5 text-xs border-b border-emerald-700/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-300 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Connexion directe Google Apps Script (Méthode B)</span>
        </div>

        <div className="flex items-center gap-2.5">
          {sheetConfig.appsScriptUrl ? (
            <span className="text-emerald-200 bg-emerald-900/90 border border-emerald-600/70 px-2 py-0.5 rounded-lg flex items-center gap-1.5 text-[11px]">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-white">Points RPA</strong>
              <span className="text-emerald-300 text-[10px] hidden sm:inline">(Script gs actif)</span>
            </span>
          ) : sheetConfig.spreadsheetId ? (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-700/60"
              title="Ouvrir le classeur Points RPA dans un nouvel onglet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-white">{sheetConfig.spreadsheetName || 'Points RPA'}</strong>
              <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
            </a>
          ) : (
            <span className="text-amber-300/95 flex items-center gap-1 text-[11px] bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-800/40">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <strong className="text-amber-200">Points RPA</strong>
              <span className="text-amber-300/70 text-[10px] hidden sm:inline">(En attente URL script gs)</span>
            </span>
          )}

          <button
            onClick={onOpenSettings}
            className="text-emerald-200 hover:text-white flex items-center gap-1 text-[11px] bg-emerald-800/80 hover:bg-emerald-700 px-2 py-0.5 rounded transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Feuille Google</span>
          </button>
        </div>
      </div>

      {/* Main Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Titles */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-lg flex items-center justify-center">
                <div className="w-full h-full bg-emerald-950 rounded-[14px] flex flex-col items-center justify-center text-center p-1">
                  <span className="text-amber-400 font-extrabold text-base sm:text-lg tracking-wider leading-none">
                    RPA
                  </span>
                  <span className="text-[9px] uppercase tracking-tighter text-emerald-300 font-semibold mt-0.5">
                    Points
                  </span>
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-emerald-950 text-[9px] font-black px-1 rounded-full border border-emerald-900 shadow">
                +pts
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Comptabilisation des Points Non FFBC</span>
                </h1>
                <span className="bg-emerald-700/80 text-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-600/60">
                  v2.5 Méthode B
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/95 mt-1 max-w-3xl leading-relaxed">
                Comptabilisation spécifique des activités non répertoriées par la FFBC : bénévolat, balisage et fléchage des brevets, ravitaillements, tenue de la permanence club et manifestations sportives.
              </p>
            </div>
          </div>

          {/* Sync & Auth Actions */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 self-end md:self-center">
            {/* Refresh button */}
            <button
              onClick={onRefreshData}
              disabled={isSyncing}
              title="Rafraîchir les données de la feuille"
              className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 hover:text-white border border-emerald-700/60 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Google Authentication Status */}
            {isGoogleConnected && user ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-1.5 shadow-inner">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilisateur'}
                    className="w-7 h-7 rounded-full border border-amber-400 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-amber-300 font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                    {user.displayName || 'Connecté'}
                  </div>
                  <div className="text-[10px] text-emerald-300 truncate max-w-[140px]" title={user.email || ''}>
                    {user.email || 'Compte Google'}
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  title="Se déconnecter ou changer de compte Google"
                  className="ml-1 p-1.5 rounded-lg text-emerald-300 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="group relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-semibold text-xs shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border border-emerald-200"
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
                <span>Connexion Google (Sheets)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
