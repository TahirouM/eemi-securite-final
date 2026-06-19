# Mini back-office de commandes — Démo sécurité applicative & DevSecOps

Projet pédagogique (EEMI) illustrant un cycle complet de sécurité applicative :
**application vulnérable → audit → exploitation contrôlée → correction → pipeline DevSecOps**.

> ⚠️ **Avertissement.** Toutes les vulnérabilités sont **volontaires, locales et non
> destructives**. Cette application ne doit **jamais** être exposée sur Internet.
> Les secrets de la branche `vulnerable` sont **factices** (`DEMO_ONLY`).

---

## Stack technique

- **Node.js** ≥ 20, **Express**
- **Sequelize** + **SQLite** (fichier local, zéro installation)
- **JWT** (`jsonwebtoken`) + **bcryptjs**
- Frontend : pages servies par Express + JS vanilla (`/public`)
- Tests : **Jest** + **Supertest**
- Sécurité (branche `secure`) : **helmet**, **express-rate-limit**, **cors** configuré,
  **sanitize-html**
- Pipeline : **GitHub Actions** (Semgrep, npm audit, Gitleaks, OWASP ZAP)

---

## Organisation Git — deux branches

| Branche | Contenu |
|---|---|
| `vulnerable` | Application fonctionnelle **avec 8 failles** volontaires (VULN-01 → 08) |
| `secure` | Mêmes fonctionnalités **corrigées à la cause** + tests + pipeline CI |

La branche `secure` part de `vulnerable` puis applique les corrections, une par commit
(`fix(<domaine>): ...`). L'historique met en évidence chaque faille (`feat(vuln): ...`)
puis sa correction.

```bash
git checkout vulnerable   # version à exploiter
git checkout secure       # version corrigée
```

---

## Installation & lancement

```bash
npm install

# Branche secure : créer un .env avec un secret JWT fort
cp .env.example .env
# puis renseigner JWT_SECRET, par ex. :
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run seed              # crée la base + données de test
npm start                 # http://localhost:3000
npm test                  # lance la suite de tests (branche secure)
```

> Sur la branche `vulnerable`, un fichier `.env` (DEMO_ONLY) est déjà présent ;
> `npm run seed && npm start` suffisent.

---

## Comptes de test

| Email | Mot de passe | Rôle | Notes |
|---|---|---|---|
| `admin@test.local` | `Admin123!` | admin | accès back-office |
| `user1@test.local` | `User123!` | user | possède les commandes **#101** et **#103** |
| `user2@test.local` | `User123!` | user | possède la commande **#102** |

---

## API (résumé)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Inscription |
| POST | `/api/auth/login` | – | Connexion → JWT |
| GET | `/api/products` | – | Catalogue |
| GET | `/api/products/search?q=` | – | Recherche produits |
| GET | `/api/products/:id/comments` | – | Avis d'un produit |
| POST | `/api/products/:id/comments` | ✅ | Déposer un avis |
| GET | `/api/orders` | ✅ | Mes commandes |
| POST | `/api/orders` | ✅ | Passer commande |
| GET | `/api/orders/:id` | ✅ | Détail d'une commande |
| GET | `/api/users/me` | ✅ | Mon profil |
| PUT | `/api/users/me` | ✅ | Modifier mon profil |
| GET | `/api/admin/users` | admin | Liste des utilisateurs |
| GET | `/api/admin/orders` | admin | Toutes les commandes |

---

## Vulnérabilités intégrées (branche `vulnerable`)

| ID | Faille | OWASP | Endpoint / zone |
|---|---|---|---|
| VULN-01 | IDOR / BOLA | A01 / API1 | `GET /api/orders/:id` |
| VULN-02 | Injection SQL | A03 | `GET /api/products/search` |
| VULN-03 | XSS stockée | A03 | commentaires produits |
| VULN-04 | Authentification faible | A07 | `POST /api/auth/login` |
| VULN-05 | Mass Assignment | A08 / API6 | `PUT /api/users/me` |
| VULN-06 | Misconfiguration / fuite d'info | A05 / A09 | config Express, `.env`, erreurs |
| VULN-07 | Broken Access Control (admin) | A01 | `GET /api/admin/*` |
| VULN-08 | JWT en `localStorage` | A07 | `public/app.js` |

Détail complet, preuves et corrections : voir [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md).

---

## Pipeline DevSecOps

`.github/workflows/security.yml` exécute sur chaque `push`/`pull_request` :

1. **build-test** — `npm ci` + `npm test`
2. **sast** — Semgrep (`p/owasp-top-ten`, `p/javascript`)
3. **sca** — `npm audit` (bloquant ≥ high)
4. **secret-scan** — Gitleaks
5. **dast** — OWASP ZAP baseline contre l'app lancée en CI

---

## Structure du projet

```
src/
├── app.js            # config Express, middlewares, routes
├── server.js         # bootstrap
├── db/               # init Sequelize + seed
├── models/           # User, Product, Order, Comment
├── middleware/       # auth (JWT), error handler
├── routes/           # une par ressource
└── controllers/      # logique métier
public/               # frontend minimal
tests/                # auth, orders, security
.github/workflows/    # pipeline CI sécurité
```
