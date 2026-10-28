import React from 'react';
import { FileSpreadsheet, ShieldCheck, Heart, Award, ExternalLink } from 'lucide-react';
import { SheetConfig } from '../types';

interface FooterProps {
  sheetConfig: SheetConfig;
  onOpenSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({ sheetConfig, onOpenSettings }) => {
  return (
    <footer className="bg-emerald-950 text-emerald-300/80 border-t-2 border-amber-500/80 text-xs mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Col 1: RPA Club */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-500 text-emerald-950 font-black px-2 py-0.5 rounded text-xs tracking-wider">
                RPA
              </span>
              <span className="font-bold text-white text-sm">
                RPA — Calcul des Points Club
              </span>
            </div>
            <p className="text-emerald-400/80 text-xs leading-relaxed">
              Comptabilisation spécifique des activités non répertoriées par la FFBC : bénévolat, balisage et fléchage des brevets, ravitaillements, tenue de la permanence club et manifestations sportives.
            </p>
          </div>

          {/* Col 2: Google Sheets Links & Sheets structure */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Structure Google Sheets</span>
            </h4>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-mono">•</span>
                <span><strong>Membres :</strong> Filtre <code>Afficher MAJ Manuelle = VRAI</code></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-mono">•</span>
                <span><strong>Keys :</strong> Motifs sous <code>Form_Points_non_FFBC</code></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-mono">•</span>
                <span><strong>Opérations :</strong> Horodatage <code>jj/mm/AAAA HH:MM:SS</code></span>
              </li>
            </ul>
          </div>

          {/* Col 3: Status & Configuration */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Liaison Classeur & Sécurité</span>
            </h4>
            <div className="space-y-2">
              {sheetConfig.spreadsheetId ? (
                <div className="flex items-center gap-2 text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="truncate">Classeur connecté</span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-white underline ml-auto inline-flex items-center gap-0.5"
                  >
                    Ouvrir <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-amber-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Classeur non configuré (Mode démonstration)</span>
                </div>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-emerald-300 hover:text-white underline text-xs block text-left"
              >
                Gérer l'identifiant du classeur Google Sheets
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 mt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-emerald-400/60">
          <div>
            © {new Date().getFullYear()} RPA — Randonneurs Pédestres & Cyclotouristes. Tous droits réservés.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span>Fait avec passion pour les bénévoles RPA</span>
              <Heart className="w-3 h-3 text-red-400 inline" />
            </span>
            <span>•</span>
            <span>Google Workspace Sheets API v4</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
