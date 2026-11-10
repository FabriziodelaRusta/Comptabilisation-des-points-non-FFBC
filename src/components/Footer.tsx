import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SheetConfig } from '../types';

interface FooterProps {
  sheetConfig: SheetConfig;
  onOpenSettings: () => void;
  version?: string;
}

export const Footer: React.FC<FooterProps> = ({ sheetConfig, onOpenSettings, version = '1.4' }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500 space-y-1 select-none">
      {/* Signature avec id="footer" et sub id="version" comme dans Callendrier_FFBC_Abonnement */}
      <div id="footer" className="font-medium text-slate-700">
        v<sub id="version" className="font-bold text-blue-600">{version}</sub> — Fabrizio de la Rusta
      </div>

      {/* Ligne informative et liens contextuels */}
      <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2">
        <span>Roue Princière d'Allain (RPA)</span>
        <span>·</span>
        <span>Club affilié FFBC (Fédération Francophone Belge du Cyclotourisme)</span>
        {sheetConfig.spreadsheetId ? (
          <>
            <span>·</span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium"
            >
              <span>{sheetConfig.spreadsheetName || 'Classeur Sheets'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </>
        ) : null}
        <span>·</span>
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
        >
          Configuration
        </button>
      </div>
    </footer>
  );
};
