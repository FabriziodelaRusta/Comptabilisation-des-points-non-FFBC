# RPA - Comptabilisation des Points Non-FFBC

Application web pour la saisie et la comptabilisation manuelle des points non FFBC des membres de la **RPA** (Randonneurs Pédestres & Cyclotouristes), synchronisée en temps réel avec un classeur **Google Sheets**.

---

## 🚀 Déploiement automatique sur GitHub (GitHub Pages)

Le projet contient déjà un workflow GitHub Actions prêt à l'emploi (`.github/workflows/deploy.yml`).

### Que faire après avoir cliqué sur « Publish to GitHub » ?

1. Rendez-vous sur votre dépôt GitHub.
2. Allez dans **Settings** (Paramètres du dépôt) > onglet **Pages** (dans le menu de gauche).
3. Sous **Build and deployment** > **Source**, sélectionnez :
   👉 **GitHub Actions** (au lieu de *Deploy from a branch*).
4. C'est tout ! L'action va se lancer automatiquement (visible dans l'onglet **Actions**) et déployer votre application sur :
   `https://<votre-nom-utilisateur>.github.io/<nom-du-repo>/`

---

## 📊 Configuration de la feuille Google Sheets

Vous avez deux méthodes au choix :

### Méthode 1 : URL Google Apps Script (.gs) — Sans connexion Google requise (Recommandé)
1. Ouvrez votre classeur Google Sheets de la RPA.
2. Cliquez sur **Extensions** > **Apps Script**.
3. Copiez le code prêt à l'emploi fourni dans les paramètres de la WebApp (bouton *Feuille Google* > onglet *Script Google Apps Script*).
4. Cliquez sur **Déployer** > **Nouveau déploiement** > Type : **Application Web**.
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Copiez l'URL se terminant par `/exec` et collez-la dans la WebApp.
6. ✅ Vos membres et bénévoles peuvent encoder directement sans avoir besoin de se connecter à Google !

### Méthode 2 : Connexion Google directe (OAuth)
1. Cliquez sur **Connexion Google (Sheets)** en haut à droite.
2. Choisissez le compte Google propriétaire de la feuille.
3. Collez l'URL ou l'identifiant du classeur Google Sheets dans les paramètres.

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

---

## 📁 Structure du classeur Google Sheets

- **Feuille `Membres`** : Colonne `Nom` et case `Afficher MAJ Manuelle` (TRUE/VRAI).
- **Feuille `Keys`** : Clé `Form_Points_non_FFBC` avec les motifs d'activités.
- **Feuille `Opérations`** : Lignes horodatées automatiquement (`jj/mm/AAAA HH:MM:SS`).
