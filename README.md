# 🐣 Tico farm Manager — Tableau de bord aviculteur

Application web autonome (PWA) pour suivre la couvaison de vos œufs de poules, du ramassage à l'éclosion. **Un seul fichier HTML** — fonctionne entièrement dans le navigateur, sans serveur ni base de données.

![Version](https://img.shields.io/badge/version-1.0-10b981) ![PWA](https://img.shields.io/badge/PWA-installable-0ea5e9) ![No backend](https://img.shields.io/badge/backend-none-f59e0b) ![FR](https://img.shields.io/badge/langue-FR-8b5cf6)

---

## ✨ Fonctionnalités

### 📋 Suivi des lots
- Tableau complet : collecte → mirage J7 → mirage J14 → éclosion → résultats
- **Colonnes calculées automatiques** : Bon à introduire, Fécondés J7, Bons J14, Résultat
- **Validation intelligente** : impossible de saisir plus de clairs que d'œufs introduits, etc.
- Édition inline des cellules, suppression, fiche détaillée par lot
- N° couveuse/lot pour gérer plusieurs couveuses en parallèle

### 📊 Tableau de bord (KPIs)
- Lots actifs, œufs collectés, poussins éclos
- Taux d'éclosion moyen vs objectif
- Taux de mortalité global, pertes mirage
- 4 graphiques : éclosion par lot, pertes par étape, répartition par couveuse, évolution temporelle

### 🌡️ Incubateurs
- Relevés quotidiens température & humidité
- Graphique multi-courbes (par couveuse)
- Alertes hors cible (T° ±0.5°C, humidité ±10%)

### 📅 Calendrier mensuel
- Vue d'ensemble : collecte, incubation, mirages J7/J14, arrêt retournement J19, éclosion J21
- Code couleur par type d'événement
- Navigation mois par mois

### 💰 Coûts de production
- Œufs + énergie + aliment + main d'œuvre
- Coût total par lot, coût/poussin, coût/œuf
- KPIs financiers agrégés

### 👥 Module clients
- Commandes de poussins : réservé / payé / livré / annulé
- Prix unitaire, total, contact, lot associé

### 🏆 Statistiques
- Performance par couveuse
- Performance par reproducteur/race
- Comparaison vs objectif (✅/⚠️/❌)

### 📖 Guide de couvaison intégré
- Timeline J0 → J21
- Conseils à chaque étape : retournement, mirages, humidité, éclosion
- Soins post-éclosion

### 🚨 Système d'alertes
- Éclosion proche (J-7, J-3, J-1, aujourd'hui)
- Mortalité > seuil paramétrable
- Pertes mirage > seuil
- Objectif non atteint

### ⚙️ Paramètres personnalisables
- Objectif d'éclosion (défaut 85%)
- Seuils d'alerte (mortalité, mirage)
- T° et humidité cibles
- Durée d'incubation (21j par défaut)

### 👤 Multi-utilisateurs
- Création de compte locale (chiffré)
- Chaque utilisateur a son propre espace de données
- Données stockées dans le navigateur (localStorage)

### 💾 Données
- Export JSON pour sauvegarde
- Import JSON pour restauration
- Données de démo pré-chargées (5 lots, relevés T°/hum., clients)
- Mode sombre / clair

---

## 🚀 Installation & déploiement

### Option 1 : GitHub Pages (gratuit, recommandé)

1. **Créez un nouveau repository** sur GitHub (nom public, ex: `couvease-pro`)
2. **Uploadez** le fichier `index.html` à la racine du repo
3. Allez dans **Settings → Pages**
4. Source : **Deploy from a branch** → `main` → `/ (root)`
5. Attendez 1-2 minutes, votre app sera en ligne à :
   ```
   https://VOTRE-USER.github.io/couvease-pro/
   ```
6. Sur mobile : ouvrez le lien → "Ajouter à l'écran d'accueil" → c'est installé comme une app !

> 💡 Le fichier `.nojekyll` est fourni pour éviter les problèmes de traitement Jekyll sur GitHub Pages.

### Option 2 : Netlify Drop (le plus rapide, 30 secondes)

1. Allez sur [app.netlify.com/drop](https://app.netlify.com/drop)
2. Glissez-déposez le dossier `couvease-pwa` 
3. Vous obtenez immédiatement une URL publique + PWA installable
4. (Optionnel) Créez un compte pour garder l'URL

### Option 3 : Vercel

1. Installez Vercel CLI : `npm i -g vercel`
2. Dans le dossier : `vercel`
3. Suivez les instructions

### Option 4 : Cloudflare Pages

1. Créez un compte sur [pages.cloudflare.com](https://pages.cloudflare.com)
2. "Upload assets" → glissez le dossier
3. App en ligne en 30 secondes

### Option 5 : Auto-hébergé

Vous pouvez aussi simplement :
- Double-cliquer sur `index.html` (fonctionne, mais service worker désactivé)
- Servir avec n'importe quel serveur statique : `python3 -m http.server`

---

## 🧪 Tester rapidement

```bash
# Cloner ou télécharger le repo
cd couvease-pwa

# Servir localement
python3 -m http.server 8000

# Ouvrir http://localhost:8000
```

Au premier lancement :
1. **Créez un compte** (n'importe quel nom d'utilisateur + mot de passe)
2. Cliquez sur **"🧪 Charger des données de démo"** dans Paramètres pour voir l'app remplie
3. Explorez les onglets !

---

## 🔒 Confidentialité

✅ **Toutes vos données restent sur votre appareil** (localStorage)
✅ Aucun serveur, aucune transmission, aucun tracking
✅ Vous pouvez exporter/importer à tout moment
⚠️  Effacer les données du navigateur = perdre les données. Pensez à exporter régulièrement !

---

## 🐣 L'exemple de calcul

Pour vérifier la logique avec votre exemple (100 œufs) :

| Étape | Événement | Cumul |
|------|-----------|-------|
| Collecte | 100 œufs | 100 |
| État | -3 fissurés | **97 bons à introduire** |
| Mirage J7 | -3 clairs, -2 morts | **92 fécondés** |
| Mirage J14 | -2 contaminés, -5 morts | **85 bons** |
| Éclosion | -2 malformés, -3 morts-nés | **80 poussins sains** |

→ **Taux d'éclosion : 80/97 = 82.5%**

---

## 🛠️ Stack technique

- HTML5 / CSS3 / Vanilla JavaScript (ES2020)
- [Chart.js 4.4](https://www.chartjs.org/) pour les graphiques (via CDN)
- Google Fonts (Inter, Plus Jakarta Sans)
- localStorage pour la persistance
- Service Worker inline pour le mode offline
- Web App Manifest inline pour l'installation PWA

**Aucune dépendance backend, aucun build, aucun framework.**
Tout est dans un seul fichier `index.html` (~135 Ko).

---

## 📜 Licence

MIT — faites-en ce que vous voulez 🐣

---

## 🐛 Bugs & suggestions

Ouvrez une issue sur le repo GitHub.
