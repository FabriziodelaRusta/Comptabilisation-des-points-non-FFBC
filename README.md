# RPA - Comptabilisation des Points Non-FFBC

Application web pour la saisie et la comptabilisation manuelle des points non FFBC des membres de la **RPA** (Randonneurs Pédestres & Cyclotouristes), synchronisée en temps réel avec le classeur **Google Sheets « Points RPA »**.

---

## ⚙️ Configuration de l'URL Google Apps Script (Pour tous les utilisateurs)

Pour que **tous les utilisateurs** arrivant sur la WebApp (notamment sur GitHub Pages) soient connectés automatiquement au classeur sans avoir à configurer l'URL manuellement, remplacez la valeur par défaut dans ces deux fichiers du code source :

### 1. Dans `src/App.tsx` (Lignes 57-58)
```typescript
const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/VOTRE_VRAIE_URL_APPS_SCRIPT/exec';
```

### 2. Dans `src/components/SpreadsheetSettingsModal.tsx` (Lignes 49-50)
```typescript
const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/VOTRE_VRAIE_URL_APPS_SCRIPT/exec';
```

> **Résultat :** Dès que ces deux lignes contiennent votre URL se terminant par `/exec`, aucun utilisateur n'aura à toucher aux réglages. La connexion est 100 % automatique dès l'ouverture du site.

---

## 🔒 Fonctionnement des Droits et de la Sécurité (Lecture / Écriture RW)

L'application utilise une architecture sécurisée native Google :

1. **Authentification Google en 1 clic :**
   - L'utilisateur se connecte avec son compte Google.
   - Son identité officielle et son adresse e-mail sont certifiées par Google.

2. **Vérification automatique des droits sur le Google Sheet :**
   - Dès la connexion, l'application interroge le script Apps Script (`action=checkAccess`).
   - Le script vérifie si l'e-mail connecté est **Propriétaire** ou **Éditeur** du classeur dans Google Drive.
   - **Si autorisé :** Le badge vert **« Éditeur RW validé »** s'affiche, les boutons d'ajout, modification et suppression sont débloqués, et son e-mail est inscrit automatiquement en colonne G.
   - **Si non autorisé :** L'application reste en **« Mode lecture seule »** (consultation uniquement).

3. **Gestion des accès dans Google Sheets :**
   - Vous n'avez pas besoin d'ajouter les utilisateurs dans Firebase !
   - Pour donner le droit d'encoder à un membre, ouvrez simplement le classeur Google Sheet **« Points RPA »**, cliquez sur le bouton vert **Partager**, et ajoutez son adresse e-mail comme **Éditeur**.

---

## 🚀 Déploiement du Script Google Apps Script (Code.gs)

1. Ouvrez votre classeur Google Sheet **« Points RPA »**.
2. Allez dans **Extensions** > **Apps Script**.
3. Remplacez le contenu de `Code.gs` par le code complet fourni dans l'application (accessible en 1 clic via le bouton *« Copier le code »* de la fenêtre *Réglages & Permissions*).
4. Cliquez sur **Enregistrer** (💾).
5. Cliquez sur **Déployer** > **Gérer les déploiements** :
   - Cliquez sur le **crayon (Modifier)**.
   - **Version :** Choisissez impérativement **« Nouvelle version »** (obligatoire pour appliquer les changements).
   - **Exécuter en tant que :** **Moi** *(votre adresse Gmail)*.
   - **Qui a accès :** **Tout le monde (Anyone)** *(indispensable pour éviter le blocage CORS)*.
6. Cliquez sur **Déployer** et récupérez l'URL Web se terminant par `/exec`.

---

## 🌐 Déploiement sur GitHub Pages

Le projet inclut le workflow GitHub Actions automatique (`.github/workflows/deploy.yml`).

### Configuration initiale sur GitHub :
1. Rendez-vous sur votre dépôt GitHub.
2. Allez dans **Settings** > onglet **Pages** (menu de gauche).
3. Sous **Build and deployment** > **Source**, sélectionnez : **GitHub Actions**.
4. L'application est alors accessible sur :
   `https://<votre-pseudo>.github.io/<nom-du-repo>/`

### Autorisation du domaine dans Firebase :
1. Ouvrez la [Console Firebase](https://console.firebase.google.com/).
2. Allez dans **Authentication** > onglet **Paramètres (Settings)** > **Domaines autorisés**.
3. Ajoutez votre domaine GitHub (ex : `fabriziodelarusta.github.io`).

---

## 📋 Schéma des 8 Colonnes de la feuille « Opérations »

| Colonne | Champ | Description |
| :--- | :--- | :--- |
| **Col A** | Date rando | Date de l'activité (`jj/mm/aaaa`) |
| **Col B** | Nom du membre | Nom et prénom du membre RPA |
| **Col C** | Points | Nombre entier de points attribués |
| **Col D** | Description / Motif | Motif issu de la feuille `Keys` |
| **Col E** | Validation | Case à cocher native (si cochée, modif et suppression verrouillées) |
| **Col F** | Source | `"WebApp RPA"` |
| **Col G** | Mail connexion | Adresse e-mail Google certifiée de l'encodeur |
| **Col H** | Date opération | Horodatage de l'opération (`jj/mm/aaaa hh:mm:ss`) |

---

## 🛠️ Développement Local

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement (port 3000)
npm run dev

# Vérification du typage TypeScript
npm run lint

# Compilation pour la production
npm run build
```
