# RPA - Comptabilisation des Points Non-FFBC (v1.0)

Application web officielle pour la gestion, la consultation et la saisie des points non-FFBC des membres et bénévoles de la **RPA (Roue Princière d'Allain)**, synchronisée en temps réel avec le classeur **Google Sheets « Points RPA »**.

---

## 🌟 Fonctionnalités v1.0

1. **Tableau des points (1er onglet)** :
   - Liste l'ensemble des membres RPA avec uniquement deux colonnes : **Membre** et **Points**.
   - Ligne de **Total des points** en fin de liste.
   - Moteur de recherche instantané et tri (points, nom alphabétique).
   - Bouton **« Exporter en PDF »** : génère un document officiel reprenant l'en-tête officiel du club RPA (logo, 3 bandes bleu/blanc/vert, métadonnées) et le tableau récapitulatif (Membre, Points, Total des points).

2. **Saisie unique (2e onglet)** :
   - Sélection du membre avec filtre `Maj_auto` cochée dans le fichier membre (avec option d'affichage des autres ou de recherche libre).
   - Date de randonnée (format belge `jj/mm/aaaa`).
   - Nombre de points (+1 pt par défaut).
   - **Motif (Col D)** : liste déroulante issue de la feuille `Keys` (`Form_Points_non_FFBC`).
   - **Km (Col E)** : distance en kilomètres (ex : 35, 45, 50).

3. **Saisie multiple (3e onglet)** :
   - Formulaire multi-lignes pour saisir en série plusieurs membres d'une même sortie avec colonne `Km (Col E)`.
   - Barre de pré-remplissage global (date commune, points, motif et kilomètres appliqués en 1 clic).
   - Même apparence soignée (cadre blanc aux bordures émeraude douces).
   - Modale récapitulative de confirmation avant envoi groupé vers Google Sheets.

4. **Animations interactives** :
   - Animations fluides au survol (`hover:scale-[1.02]`) et au clic (`active:scale-[0.98]`) sur tous les onglets.

---

## 📋 Schéma des 9 Colonnes de la feuille « Opérations »

| Colonne | En-tête Google Sheet | Format / Contenu | Rôle |
| :--- | :--- | :--- | :--- |
| **Col A** | `Date rando` | Date (`jj/mm/aaaa`) | Date de l'activité ou randonnée |
| **Col B** | `Membre` | Texte | Nom officiel du membre ou bénévole RPA |
| **Col C** | `Points` | Entier | Nombre de points attribués |
| **Col D** | `Motif` | Texte | Clé issue de la feuille `Keys` (`Form_Points_non_FFBC`) |
| **Col E** | `Km` | Nombre / Texte | Distance en kilomètres |
| **Col F** | `Validation` | Case à cocher | Si cochée (TRUE/VRAI), modification et suppression verrouillées |
| **Col G** | `Source` | Texte | Toujours `"WebApp RPA"` |
| **Col H** | `Mail` | Email | Adresse Google certifiée de l'encodeur |
| **Col I** | `Date opération` | Horodatage (`jj/mm/aaaa hh:mm:ss`) | Date et heure de l'enregistrement |

---

## 🚀 Procédure de Mise en Production (Zéro Configuration Utilisateur)

Pour qu'un utilisateur final n'ait **absolument rien à configurer** (il doit juste ouvrir la page web et se connecter avec son compte Google) :

### Étape 1 : Déployer Google Apps Script (`Code.gs`)
1. Ouvrez votre classeur Google Sheets **« Points RPA »**.
2. Dans le menu, cliquez sur **Extensions** > **Apps Script**.
3. Copiez le code Google Apps Script fourni (disponible dans la fenêtre *Réglages & Permissions* de l'application via le bouton *« Copier le code »*).
4. Collez-le dans `Code.gs` et enregistrez (**Ctrl+S** ou l'icône disquette).
5. En haut à droite, cliquez sur **Déployer** > **Gérer les déploiements** :
   - Cliquez sur l'icône **Crayon (Modifier)** à côté de votre déploiement existant (ou *Nouveau déploiement* de type *Application Web*).
   - **Version** : Sélectionnez obligatoirement **« Nouvelle version »**.
   - **Exécuter en tant que** : **Moi** *(votre adresse Gmail propriétaire)*.
   - **Qui a accès** : **Tout le monde (Anyone)** *(indispensable pour permettre les requêtes web sans blocage)*.
6. Cliquez sur **Déployer** et copiez l'URL Web se terminant par `/exec`.

### Étape 2 : Inscrire l'URL dans le code source avant le déploiement GitHub
Dans votre code source local ou sur GitHub, collez cette URL d'exécution dans les deux fichiers suivants :
1. `src/App.tsx` (ligne ~60) :
   ```typescript
   const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/VOTRE_ID_SCRIPT/exec';
   ```
2. `src/components/SpreadsheetSettingsModal.tsx` (ligne ~50) :
   ```typescript
   const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/VOTRE_ID_SCRIPT/exec';
   ```

### Étape 3 : Déployer sur GitHub Pages
1. Committez et poussez vos modifications vers votre dépôt GitHub :
   ```bash
   git add .
   git commit -m "feat: release v1.0 with points table, pdf export, batch entry and 9 columns"
   git push origin main
   ```
2. Sur GitHub, dans **Settings** > **Pages**, vérifiez que la source est **GitHub Actions**.
3. Dans la console Firebase (**Authentication** > **Paramètres** > **Domaines autorisés**), vérifiez que votre domaine GitHub (ex : `fabriziodelarusta.github.io`) est bien ajouté.

**Résultat :** Tout utilisateur qui se rend sur la page web voit immédiatement les données de la feuille, peut consulter le tableau et exporter le PDF. Pour encoder, il clique sur *Se connecter* et ses droits (Lecture ou Écriture RW) sont gérés automatiquement par les partages de votre Google Sheet !

---

## 🔒 Gestion des Droits d'Écriture (RW)

- Pour autoriser un membre à encoder des points : ouvrez le Google Sheet **« Points RPA »**, cliquez sur **Partager**, et ajoutez son adresse e-mail en tant qu'**Éditeur**.
- Tout utilisateur non partagé ou en *Lecteur* peut consulter l'historique et le tableau des points, mais les boutons d'enregistrement restent verrouillés en lecture seule.
