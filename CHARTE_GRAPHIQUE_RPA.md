# Charte Graphique & Maquette Réutilisable du Club RPA 🚴‍♂️🥾

Ce guide définit le gabarit type et les composants réutilisables basés **directement et fidèlement sur l'application officielle `https://fabriziodelarusta.github.io/Callendrier_FFBC_Abonnement/`**.

Toutes les applications actuelles et futures du club (Calcul des points, Calendrier FFBC, Permanences, Inscriptions, Palmarès...) peuvent reprendre cette structure pour une uniformité parfaite de la suite logicielle RPA.

---

## 1. Couleurs & Ambiance de la Page (Thème `Callendrier_FFBC_Abonnement`)

L'application `Callendrier_FFBC_Abonnement` utilise les couleurs officielles du club avec une ambiance épurée, sportive et moderne :

* **Arrière-plan global de la page :** `bg-slate-50` (Fond gris-bleu très clair, propre et reposant)
* **Couleur du texte principal :** `text-slate-900` avec anti-aliasing (`antialiased font-sans`)
* **Sélection de texte :** `selection:bg-blue-600 selection:text-white`
* **Polices officielles :** `Plus Jakarta Sans` (interface) et `JetBrains Mono` (données chiffrées / dates / matricules)
* **Couleur thème navigateur mobile :** `<meta name="theme-color" content="#1e3a8a" />`
* **Cartes de contenu / Panneaux :** `bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs`
* **Accents & Boutons actifs :** Bleu roi / RPA (`text-blue-600`, `bg-blue-600 hover:bg-blue-700`, `bg-blue-50`, `border-blue-200`)
* **Bordures & Séparateurs :** `border-slate-200` et `border-slate-100`

---

## 2. Le Header (Bannière officielle du Club)

### A. Structure, fond et effet verre dépoli
* **Conteneur :** `<header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">`
* **Largeur & Espacement :** `max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3`

### B. Partie Gauche du Header (Signature Visuelle `Callendrier_FFBC_Abonnement`)
1. **Ruban des couleurs du Club RPA (`ClubColorStripe`) :**
   * Trois bandes verticales officielles :
     * Bleu ciel (`#009ee2`, largeur 8px)
     * Blanc (`#ffffff`, largeur 4px)
     * Vert (`#5daf32`, largeur 4px)
   * Conteneur : `flex flex-row shrink-0 rounded-xs overflow-hidden border border-slate-300/80 shadow-2xs select-none h-9 sm:h-12`

2. **Logo officiel du Club :**
   * Conteneur : `w-9 h-11 sm:w-12 sm:h-14 shrink-0 flex items-center justify-center relative`
   * Image : `<img src="https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png" alt="Logo Club RPA" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain filter drop-shadow-xs" />`
   * Repli en cas d'erreur de chargement réseau : carré bleu avec texte `RPA`.

3. **Titres et Badges :**
   * Encapsulé dans : `flex items-center gap-2 sm:gap-2.5 bg-slate-50/80 sm:bg-transparent p-1.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200/70`
   * **Titre principal :** `text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-tight`
   * **Badge version :** `text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800` (ex: `v0.14`)
   * **Sous-titre club :** `text-xs sm:text-sm font-bold text-blue-600 leading-tight` (ex: `Roue Princière d'Allain`)
   * **Sous-ligne d'information :** `text-[10px] sm:text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5`

### C. Partie Droite du Header
* **Barre d'outils groupée :** `bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1 text-xs`
  * Bouton d'actualisation (`RefreshCw text-slate-600 hover:text-blue-700 hover:bg-white`) avec rotation pendant le chargement.
  * Bouton de réglages / configuration (`Settings text-slate-600 hover:text-blue-700 hover:bg-white`).
* **Bloc Utilisateur Google & Permissions :**
  * `bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs`
  * Avatar rond ou initiale sur fond bleu roi (`w-7 h-7 rounded-full bg-blue-600 text-white font-bold`).
  * Nom de l'utilisateur et pastille d'autorisation Google Drive :
    * Pastille verte (`bg-emerald-500`) = Éditeur RW validé sur le classeur.
    * Pastille ambre (`bg-amber-500`) = Lecture seule.
  * Bouton de déconnexion rapide (`LogOut text-slate-400 hover:text-red-600`).
* **Si déconnecté :** Bouton épuré `Connexion Google` avec logo officiel Google SVG.

---

## 3. Le Footer (Pied de Page)

Le pied de page reprend la structure exacte de `Callendrier_FFBC_Abonnement` :
* **Conteneur :** `<footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500 space-y-1 select-none">`
* **Signature officielle avec indice de version :**
  ```html
  <div id="footer" className="font-medium text-slate-700">
    v<sub id="version" className="font-bold text-blue-600">0.14</sub> — Fabrizio de la Rusta
  </div>
  ```
* **Sous-ligne informative et liens :**
  ```html
  <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2">
    <span>Roue Princière d'Allain (RPA)</span>
    <span>·</span>
    <span>Club affilié FFBC (Fédération Francophone Belge du Cyclotourisme)</span>
    <span>·</span>
    <a href="..." className="text-blue-600 hover:text-blue-800 underline font-medium">Classeur Sheets</a>
    <span>·</span>
    <button onClick={...} className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium">Configuration</button>
  </div>
  ```

---

## 4. Composant Réutilisable : `<ClubPageLayout />`

Le composant `/src/components/common/ClubPageLayout.tsx` encapsule tout ce gabarit prêt à l'emploi :

```tsx
import { ClubPageLayout } from './components/common/ClubPageLayout';

function MaPageClub() {
  return (
    <ClubPageLayout
      pageTitle="Comptabilisation des points non-FFBC"
      clubSubtitle="Roue Princière d'Allain"
      badgeLabel="Points RPA"
      version="0.14"
      user={currentUser}
      sheetConfig={sheetConfig}
      userPermission={userPermission}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
      onOpenSettings={() => setIsSettingsModalOpen(true)}
      onRefreshData={handleRefresh}
    >
      {/* Contenu spécifique à l'application */}
    </ClubPageLayout>
  );
}
```

---

## 5. Précision sur les Membres RPA

Dans le formulaire de sélection :
* À côté de **Sélectionner le membre ou le bénévole RPA\*** :
  * Mention explicative en petit italique : `(Apparaissent ici les noms dont la case Maj_auto est cochée dans le fichier membre)`
