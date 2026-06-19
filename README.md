# Mini back-office de commandes — Démo sécurité applicative & DevSecOps

Projet pédagogique (EEMI) : une application **volontairement vulnérable**, puis **sécurisée**, avec un **pipeline DevSecOps**. Cycle complet : dev vulnérable → audit → exploitation → correction → CI sécurité.

> ⚠️ Failles **volontaires, locales et non destructives**. Ne jamais exposer sur Internet. Secrets de la branche `vulnerable` = **factices** (`DEMO_ONLY`).

## Stack
Node.js ≥ 20 · Express · Sequelize + SQLite · JWT + bcrypt · Jest/Supertest · (secure) Helmet, rate-limit, CORS, sanitize-html · CI GitHub Actions.

## Deux branches

| Branche | Contenu |
|---|---|
| `vulnerable` | App fonctionnelle avec **8 failles** (VULN-01 → 08) |
| `secure` | Failles **corrigées à la cause** + 23 tests + pipeline CI |

```bash
git checkout vulnerable   # version à exploiter
git checkout secure       # version corrigée (+ tests + CI)
```

## Installation

```bash
npm install
cp .env.example .env       # renseigner JWT_SECRET (≥ 32 car. aléatoires)
                           # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run seed               # base + données de test
npm start                  # http://localhost:3000
npm test                   # 23 tests (branche secure)
```
> Sur `vulnerable`, un `.env` DEMO_ONLY est déjà fourni : `npm run seed && npm start`.

## Comptes de test

| Email | Mot de passe | Rôle | Commandes |
|---|---|---|---|
| `admin@test.local` | `Admin123!` | admin | — |
| `user1@test.local` | `User123!` | user | #101, #103 |
| `user2@test.local` | `User123!` | user | #102 |

## Les 8 vulnérabilités

| ID | Faille | OWASP | Zone | Correction (secure) |
|---|---|---|---|---|
| 01 | IDOR / BOLA | A01 | `GET /api/orders/:id` | contrôle d'appartenance (`where userId`) |
| 02 | Injection SQL | A03 | `GET /api/products/search` | requête paramétrée (ORM `Op.like`) |
| 03 | XSS stockée | A03 | commentaires produits | sanitize-html + `textContent` + CSP |
| 04 | Auth faible | A07 | `POST /api/auth/login` | secret fort, expiry, bcrypt, messages génériques, rate-limit |
| 05 | Mass Assignment | A08 | `PUT /api/users/me` | whitelist `{name, email}` |
| 06 | Misconfiguration | A05 | config Express, `.env`, erreurs | Helmet/CSP, CORS scoped, pas de static racine, pas de stack |
| 07 | Broken Access Control | A01 | `GET /api/admin/*` | `requireRole('admin')` |
| 08 | JWT en `localStorage` | A07 | `public/app.js` | XSS corrigée → vol impossible |

Audit détaillé (preuves HTTP, impact, validation) : [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md). Captures à produire : `screenshots/`.

## Pipeline DevSecOps

`.github/workflows/security.yml` — sur chaque `push`/`pull_request` :

| Job | Outil | Rôle |
|---|---|---|
| build-test | Jest + Supertest | tests fonctionnels & sécurité |
| sast | Semgrep (`p/owasp-top-ten`, `p/javascript`) | analyse statique |
| sca | npm audit (`--audit-level=critical`) | dépendances |
| secret-scan | Gitleaks | secrets committés |
| dast | OWASP ZAP baseline | analyse dynamique de l'app |

## Structure

```
src/
├── app.js · server.js     # config Express, bootstrap
├── db/                     # init Sequelize + seed
├── models/                 # User, Product, Order, Comment
├── middleware/             # auth (JWT, requireRole), error
├── routes/ · controllers/  # une par ressource
public/                     # frontend minimal
tests/                      # auth, orders, security (23 tests)
.github/workflows/          # pipeline CI sécurité
```
