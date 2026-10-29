import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Users,
  ChevronDown,
  Search,
  Pencil,
  UserCheck,
  Check,
  X,
  AlertCircle,
  Award,
} from 'lucide-react';
import { Member } from '../types';

export const ALL_MEMBERS_OPTION: Member = {
  id: 'mem-all',
  nom: 'Tous',
  prenom: 'les membres',
  afficherMajManuelle: true,
};

interface MemberSelectorProps {
  members: Member[];
  selectedMember: Member | null;
  onSelectMember: (member: Member | null) => void;
  onOpenNewMemberModal: (initialName?: string) => void;
  isLoading?: boolean;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMember,
  onSelectMember,
  onOpenNewMemberModal,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredMembers = members.filter((m) =>
    m.nom.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    (m.matricule && m.matricule.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <User className="w-4 h-4 text-emerald-700" />
          <span>Sélectionner le membre ou le bénévole RPA</span>
          <span className="text-red-500 font-bold">*</span>
        </span>
        <span className="text-xs text-emerald-700 font-normal bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {members.length} membre{members.length > 1 ? 's' : ''} éligible{members.length > 1 ? 's' : ''} (MAJ Manuelle)
        </span>
      </label>

      <div className="flex items-center gap-2">
        {/* Main Dropdown Button */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={`flex-1 flex items-center justify-between px-3.5 py-3 rounded-xl border bg-white cursor-pointer shadow-sm transition-all text-left ${
            isOpen
              ? 'border-emerald-600 ring-2 ring-emerald-500/20'
              : selectedMember
              ? 'border-emerald-500 bg-emerald-50/40'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {selectedMember ? (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  selectedMember.nom === 'Tous' ? 'bg-amber-600' : 'bg-emerald-700'
                }`}
              >
                {selectedMember.nom === 'Tous' ? (
                  <Users className="w-4 h-4 text-white" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </div>
              <div className="truncate">
                <div className="font-semibold text-gray-900 text-sm sm:text-base truncate flex items-center gap-2">
                  <span>{selectedMember.nom}</span>
                  {selectedMember.nom === 'Tous' && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Affichage de toutes les opérations
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                  {selectedMember.nom === 'Tous' ? (
                    <span className="text-gray-500 italic">
                      Mode consultation de l'historique complet
                    </span>
                  ) : (
                    <>
                      {selectedMember.matricule && (
                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-mono">
                          {selectedMember.matricule}
                        </span>
                      )}
                      {selectedMember.pointsActuels !== undefined && (
                        <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                          <Award className="w-3 h-3 inline text-amber-500" />
                          {selectedMember.pointsActuels} pts actuels
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-gray-500">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                {isLoading ? 'Chargement des membres...' : 'Cliquez pour choisir un membre dans la liste...'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-2">
            {selectedMember && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMember(null);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Désélectionner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </div>
        </div>

        {/* Pencil Button to Create a New Member */}
        <button
          type="button"
          onClick={() => onOpenNewMemberModal(searchQuery)}
          title="Ajouter un nouveau membre s'il n'existe pas"
          className="group relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-emerald-950 font-bold text-sm shadow-md hover:shadow-lg transition-all duration-150 shrink-0 border border-amber-600/40"
        >
          <Pencil className="w-4 h-4 text-emerald-950 transition-transform group-hover:rotate-12" />
          <span className="hidden sm:inline">Nouveau</span>
          {/* Tooltip helper */}
          <span className="sr-only">Nouveau Membre</span>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search box inside dropdown */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou prénom..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Member list items */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {/* Special 'Tous' option */}
            {(!searchQuery || 'tous'.includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={() => {
                  onSelectMember(ALL_MEMBERS_OPTION);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors border-b border-amber-100 ${
                  selectedMember?.nom === 'Tous'
                    ? 'bg-amber-50 text-amber-950 font-bold'
                    : 'bg-amber-50/40 hover:bg-amber-100/60 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center text-xs font-bold shadow-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 flex items-center gap-2">
                      <span>Tous les membres</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-1.5 py-0.2 rounded">
                        Consultation
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-800/80">
                      Affiche toutes les opérations du tableau
                    </div>
                  </div>
                </div>
                {selectedMember?.nom === 'Tous' && <Check className="w-4 h-4 text-amber-700 font-bold" />}
              </button>
            )}

            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const isSelected = selectedMember?.nom === member.nom;
                return (
                  <button
                    key={member.nom}
                    type="button"
                    onClick={() => {
                      onSelectMember(member);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/80 text-emerald-950 font-semibold'
                        : 'hover:bg-emerald-50/40 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {member.nom.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.nom}</div>
                        {member.matricule && (
                          <div className="text-[11px] text-gray-400 font-mono">
                            {member.matricule}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.pointsActuels !== undefined && (
                        <span className="text-xs text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          {member.pointsActuels} pts
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-emerald-700 font-bold" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-gray-800">
                  Aucun membre trouvé pour « {searchQuery} »
                </p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Seuls les membres avec la case « Afficher MAJ Manuelle » cochée apparaissent ici.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenNewMemberModal(searchQuery);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Créer ce membre maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
