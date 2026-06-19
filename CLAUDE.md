# CLAUDE.md — Projet « Application vulnérable, sécurisation & pipeline DevSecOps »

> Ce fichier guide la réalisation **complète** du projet, de A à Z. Il est destiné à être lu par
> Claude Code (ou tout agent) au début de chaque session. **Lis-le en entier avant d'écrire du code.**

---

## 0. Règles de travail (à respecter en permanence)

1. **Deux branches dans UN SEUL dépôt** : `vulnerable` et `secure`. La branche `secure` part de `vulnerable` puis corrige.
2. **Toutes les vulnérabilités sont VOLONTAIRES, LOCALES et NON DESTRUCTIVES.** Aucune ne doit pouvoir endommager un système réel ou des données réelles. Elles servent uniquement à la démonstration pédagogique.
3. Chaque vulnérabilité doit être : **exploitable localement, documentée, et corrigée dans `secure`** en traitant la **cause profonde** (pas un simple blocage de payload).
4. **Commits explicites et atomiques** (voir §6). Un commit = une intention.
5. À chaque faille ajoutée dans `vulnerable`, prévoir **comment on la prouvera** (requête HTTP + payload + réponse) pour le rapport.
6. Ne jamais committer de vrais secrets. Le `.env` « exposé volontairement » contient des secrets **factices** clairement marqués `DEMO_ONLY`.
7. Le rapport (`SECURITY_AUDIT.md`) et le README sont rédigés **en français**. Les messages de commit suivent la convention conventionnelle en anglais (cf. exemples du sujet).

---

## 1. Objectif & livrables

Reproduire un cycle complet de sécurité applicative : **dev vulnérable → audit → exploitation contrôlée → documentation → correction → sécurisation → pipeline DevSecOps**.

| Livrable | Attendu | Où |
|---|---|---|
| Code `vulnerable` | App fonctionnelle avec ≥ 6 failles | branche `vulnerable` |
| Code `secure` | App corrigée + pipeline | branche `secure` |
| Rapport Markdown | Audit complet des failles | `SECURITY_AUDIT.md` |
| Captures | Preuves d'exploitation | `screenshots/` |
| Pipeline | Workflow CI/CD fonctionnel | `.github/workflows/security.yml` |
| README | Install, lancement, comptes de test | `README.md` |
| Commits Git | Historique clair des corrections | log Git |

**Barème (25 pts)** : App fonctionnelle 2 · Version vulnérable 4 · Audit perso 4 · Captures/preuves 2 · Version sécurisée 4 · Pipeline 2 · Qualité dépôt/README 1 · Qualité rapport 1. *(Total visible : 20, plus exploitation/preuves selon grille — viser l'exhaustivité.)*

---

## 2. Thème retenu : Gestion de commandes (mini back-office)

Choisi car il colle aux exemples du sujet (IDOR sur `/api/orders/:id`) et offre une logique métier riche.

**Entités** : `User` (rôles `user`/`admin`), `Product`, `Order` (appartient à un user), `Comment` (avis sur un produit, écrit par un user).

**Fonctionnalités** : inscription/connexion, catalogue produits + recherche, passage de commande, consultation de SES commandes, dépôt d'avis, page profil, back-office admin (liste users, toutes les commandes).

> Principe directeur du sujet : « L'important n'est pas la complexité fonctionnelle, mais la qualité de la **logique de sécurité**. » Rester simple.

---

## 3. Stack technique

- **Runtime** : Node.js LTS (≥ 20)
- **Backend** : Express
- **ORM** : Sequelize (utilisé volontairement en mode non sécurisé dans `vulnerable`, ex. requêtes brutes)
- **Base de données** : SQLite (fichier local, zéro install) — `sequelize` + `sqlite3`
- **Auth** : JWT (`jsonwebtoken`) + `bcrypt` (mal/non utilisé dans `vulnerable`)
- **Frontend** : pages servies par Express + JS vanilla (`/public`). Volontairement minimal pour rendre le XSS démontrable via `innerHTML`.
- **Tests** : Jest + Supertest
- **Sécurité (branche secure)** : `helmet`, `express-rate-limit`, `cors` configuré, `express-validator` ou `zod`, `isomorphic-dompurify`
- **Pipeline** : GitHub Actions — Semgrep (SAST), `npm audit` (SCA), Gitleaks (secret scanning), OWASP ZAP baseline (DAST), `npm test`.

---

## 4. Architecture & arborescence cible

```
project/
├── README.md
├── SECURITY_AUDIT.md
├── package.json
├── .gitignore
├── .env.example            # variables attendues (sans secrets)
├── .env                     # DEMO_ONLY — secrets factices (exposé volontairement en branche vulnerable)
├── src/
│   ├── app.js               # config express, middlewares, routes
│   ├── server.js            # bootstrap + listen
│   ├── db/
│   │   ├── index.js         # init sequelize
│   │   └── seed.js          # comptes & données de test
│   ├── models/
│   │   ├── user.js
│   │   ├── product.js
│   │   ├── order.js
│   │   └── comment.js
│   ├── middleware/
│   │   ├── auth.js          # vérif JWT
│   │   └── error.js         # handler d'erreurs
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── products.routes.js
│   │   ├── orders.routes.js
│   │   └── admin.routes.js
│   └── controllers/         # logique métier (1 fichier par ressource)
├── public/                  # client minimal (html/js/css)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── tests/
│   ├── auth.test.js
│   ├── orders.test.js
│   └── security.test.js     # tests prouvant que les failles sont corrigées (secure)
├── screenshots/             # vuln-01-idor.png, vuln-02-sqli.png, ...
└── .github/
    └── workflows/
        └── security.yml
```

---

## 5. Comptes & données de test (seed)

`src/db/seed.js` doit créer (mots de passe simples = volontaire côté vulnerable) :

| Email | Mot de passe | Rôle | Note |
|---|---|---|---|
| `admin@test.local` | `Admin123!` | admin | accès back-office |
| `user1@test.local` | `User123!` | user | possède la commande #101 |
| `user2@test.local` | `User123!` | user | possède la commande #102 |

Seed aussi : 4–5 produits, quelques commandes (dont #101 → user1, #102 → user2), 2–3 commentaires. Ces données servent à **toutes** les démos (IDOR : user1 lit la commande #102, etc.).

---

## 6. Workflow Git

```bash
git init
# Construire d'abord toute la version vulnérable sur la branche vulnerable
git checkout -b vulnerable
# ... commits de l'app + des failles ...
# Puis créer secure À PARTIR de vulnerable
git checkout -b secure
# ... commits de corrections + pipeline ...
```

**Convention de commits** (exemples imposés par le sujet) :
- `feat(app): add vulnerable order API`
- `feat(vuln): add intentional IDOR on order endpoint`
- `fix(authz): enforce ownership on order endpoint`
- `fix(xss): sanitize comments before rendering`
- `fix(api): prevent mass assignment on user update`
- `chore(ci): add security pipeline`

Règle : sur `vulnerable`, préfixer chaque faille par `feat(vuln): ...`. Sur `secure`, chaque correction par `fix(<domaine>): ...`.

---

## 7. Commandes du projet (`package.json` scripts)

```jsonc
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "seed": "node src/db/seed.js",
    "test": "jest --runInBand"
  }
}
```

Lancement local :
```bash
npm install
cp .env.example .env      # puis remplir avec des valeurs DEMO_ONLY
npm run seed
npm start                 # http://localhost:3000
npm test
```

---

## 8. Les vulnérabilités à implémenter (branche `vulnerable`)

> Minimum **6 failles obligatoires** ci-dessous (VULN-01 → 06). Ajouter 2 optionnelles (VULN-07/08) pour viser le maximum de points.
> Pour CHAQUE faille : implémenter le code vulnérable **et** noter immédiatement l'endpoint, le payload de démo et la réponse attendue (matière du rapport).

### VULN-01 — IDOR / BOLA sur consultation de commande *(obligatoire)*
- **OWASP** : API1 BOLA / A01 Broken Access Control
- **Endpoint** : `GET /api/orders/:id`
- **Code vulnérable** : `Order.findByPk(req.params.id)` — aucun contrôle d'appartenance.
- **Exploitation** : user1 (token valide) appelle `GET /api/orders/102` → reçoit la commande de user2.
- **Impact** : fuite de données perso, historique d'achat, risque RGPD.

### VULN-02 — Injection SQL *(obligatoire)*
- **OWASP** : A03 Injection
- **Endpoint** : `GET /api/products/search?q=...`
- **Code vulnérable** : requête brute concaténée, ex. `sequelize.query("SELECT * FROM products WHERE name LIKE '%" + q + "%'")`.
- **Exploitation** : `q=' OR '1'='1` (dump catalogue) ou `q=' UNION SELECT ... --` selon la démo.
- **Impact** : exfiltration de données, contournement de filtres.
- **Non destructif** : ne pas exposer de payload `DROP`/`DELETE` dans la démo (lecture seule).

### VULN-03 — XSS stockée *(obligatoire)*
- **OWASP** : A03 Injection (XSS)
- **Endpoint** : `POST /api/products/:id/comments` puis rendu sur la page produit.
- **Code vulnérable** : commentaire stocké tel quel ; côté front rendu via `element.innerHTML = comment.body`.
- **Exploitation** : poster `<img src=x onerror=alert(document.cookie)>` ; s'exécute chez tout visiteur.
- **Impact** : vol de session, défacement, hameçonnage.

### VULN-04 — Authentification faible *(obligatoire)*
- **OWASP** : A07 Identification & Auth Failures
- **Zone** : `POST /api/auth/login`, génération du JWT.
- **Code vulnérable** (cumuler plusieurs symptômes) :
  - secret JWT faible/codé en dur (`"secret123"`),
  - **token sans expiration**,
  - message de login **précis** (« utilisateur inconnu » vs « mot de passe incorrect ») → énumération de comptes,
  - **pas de rate limiting** → brute force possible.
- **Exploitation** : énumération d'emails + brute force sur un compte ; forge possible si secret deviné.
- **Impact** : prise de contrôle de comptes.

### VULN-05 — Mass Assignment *(obligatoire)*
- **OWASP** : API6 / A08 ; A01.
- **Endpoint** : `PUT /api/users/me`
- **Code vulnérable** : `user.update(req.body)` — tout le body est accepté, y compris `role`.
- **Exploitation** : `PUT /api/users/me` avec `{ "role": "admin" }` → l'utilisateur devient admin.
- **Impact** : élévation de privilèges.

### VULN-06 — Security Misconfiguration / Information Disclosure *(obligatoire)*
- **OWASP** : A05 Security Misconfiguration / A09.
- **Zone** : config Express globale + handler d'erreurs.
- **Code vulnérable** (cumuler) :
  - **aucun header de sécurité** (pas de Helmet),
  - **stack traces renvoyées** dans les réponses 500,
  - **CORS** `origin: "*"` avec credentials,
  - route statique servant le `.env` (ex. `app.use(express.static('.'))` à la racine).
- **Exploitation** : déclencher une erreur → lire la stack ; `GET /.env` → lire les secrets.
- **Impact** : cartographie de l'app, fuite de secrets.

### VULN-07 — Broken Access Control sur route admin *(optionnel, recommandé)*
- **Endpoint** : `GET /api/admin/users`
- **Code vulnérable** : middleware `auth` présent mais **pas de vérification de rôle** → tout user connecté liste les users.
- **Exploitation** : user1 appelle l'endpoint admin et reçoit la liste complète.

### VULN-08 — Stockage du JWT dans `localStorage` + pas de rate limiting *(optionnel)*
- **Zone** : `public/app.js`
- **Code vulnérable** : `localStorage.setItem('token', jwt)` → accessible au JS (donc volable par la XSS de VULN-03 : chaîner les deux dans la démo).
- **Impact** : XSS → vol de token → usurpation.

---

## 9. Corrections (branche `secure`)

> Corriger la **cause profonde**, pas un payload précis. Chaque correction doit être **testée** (cf. `tests/security.test.js`).

| Faille | Correction attendue |
|---|---|
| VULN-01 IDOR | `Order.findOne({ where: { id: req.params.id, userId: req.user.id } })` + 404/403 si rien. Admin : autoriser via vérif de rôle explicite. |
| VULN-02 SQLi | Requêtes **paramétrées** / ORM avec `replacements` ou `Op.like` + binds ; validation stricte de `q`. |
| VULN-03 XSS | Sanitization serveur (`DOMPurify`) à l'écriture **et** rendu via `textContent` (jamais `innerHTML`) + en-tête **CSP**. |
| VULN-04 Auth | Secret JWT depuis `process.env` (fort), **expiration** (`expiresIn`), messages d'erreur **génériques** (« identifiants invalides »), `bcrypt` pour les mots de passe, **rate limiting** sur `/login`. |
| VULN-05 Mass Assignment | **Whitelist** des champs (`{ name, email } = req.body`), interdiction de modifier `role` hors d'un endpoint admin protégé. |
| VULN-06 Misconfig | `helmet()` (CSP, HSTS, X-Frame-Options…), **pas de stack trace en prod** (handler générique), `cors({ origin: 'http://localhost:3000' })`, retirer le service statique de la racine / sortir `.env` du dépôt servi. |
| VULN-07 Admin | Middleware `requireRole('admin')` sur toutes les routes `/api/admin/*`. |
| VULN-08 Token | Cookie `httpOnly`+`SameSite` (ou a minima documenter le compromis) ; en tout cas, la XSS étant corrigée, le vol n'est plus possible. |

**Limitation des champs API** : ne jamais renvoyer `password`/`passwordHash` ni champs internes (`scope`/`attributes` Sequelize).

---

## 10. Pipeline DevSecOps — `.github/workflows/security.yml`

Doit : se déclencher sur `push` et `pull_request` ; installer les dépendances ; lancer les tests ; au moins 1 SAST ; audit des dépendances ; secret scanning ; DAST si possible ; **échouer sur faille critique ou secret détecté**.

Jobs attendus :

1. **build-test** : `npm ci` → `npm test`.
2. **sast** : Semgrep (`p/owasp-top-ten`, `p/javascript`) — `--error` pour bloquer.
3. **sca** : `npm audit --audit-level=high` (bloquant) — ou Snyk.
4. **secret-scan** : Gitleaks (action officielle) — bloquant si secret réel détecté. *(Penser à un `.gitleaksignore` ou un commentaire pour les secrets DEMO_ONLY si nécessaire — mais idéalement le `.env` réel n'est pas dans `secure`.)*
5. **dast** : OWASP ZAP **baseline** contre l'app lancée en CI (démarrer le serveur en arrière-plan, attendre le port, scanner `http://localhost:3000`). Le job peut être informatif ou bloquant selon le seuil.

Squelette :
```yaml
name: security
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with: { config: "p/owasp-top-ten p/javascript" }
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm audit --audit-level=high
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
  dast:
    runs-on: ubuntu-latest
    needs: build-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run seed
      - run: npm start & npx wait-on http://localhost:3000
      - uses: zaproxy/action-baseline@v0.12.0
        with: { target: 'http://localhost:3000' }
```
> Vérifier les versions exactes des actions au moment de l'implémentation (Semgrep/ZAP/Gitleaks évoluent).

---

## 11. Rapport — `SECURITY_AUDIT.md` (structure imposée)

```
# Rapport d'audit sécurité
1. Présentation du projet
2. Architecture de l'application
3. Installation et lancement
4. Organisation Git
5. Liste des vulnérabilités intégrées
6. Audit détaillé des vulnérabilités
   ## VULN-01 — <nom>
   - Type (OWASP / API Top 10)
   - Endpoint / zone concernée
   - Description
   - Cause technique
   - Exploitation
   - Preuve (capture + requête HTTP + payload + réponse)
   - Impact (technique + métier)
   - Criticité (faible / moyenne / élevée / critique)
   - Correction appliquée (branche secure)
   - Validation après correction
   ## VULN-02 ...
7. Pipeline sécurité
8. Résultats des scans
9. Limites du projet
10. Conclusion
```

**Modèle de fiche** (à dupliquer pour chaque VULN) :
```markdown
## VULN-01 — IDOR sur consultation de commande
- **Type** : Broken Access Control / IDOR (API1 BOLA)
- **Endpoint** : `GET /api/orders/:id`
- **Description** : un utilisateur authentifié consulte n'importe quelle commande par ID.
- **Cause technique** : `Order.findByPk(req.params.id)` sans contrôle d'ownership.
- **Exploitation** : user1 appelle `GET /api/orders/102` (commande de user2).
- **Preuve** : `screenshots/vuln-01-idor.png` + requête/réponse ci-dessous.
- **Impact** : fuite de données personnelles, risque RGPD. **Criticité : Élevée**
- **Correction** : `Order.findOne({ where: { id: req.params.id, userId: req.user.id } })`.
- **Validation** : la même requête renvoie désormais `403/404`.
```

---

## 12. Captures obligatoires (`screenshots/`)

Pour chaque faille importante : capture (Burp Suite ou navigateur/DevTools) montrant **la requête HTTP, le payload, la réponse serveur, le résultat visible**, + extrait de code vulnérable et corrigé si pertinent. Nommage : `vuln-01-idor.png`, `vuln-02-sqli.png`, `vuln-03-xss.png`, etc.

Exemple IDOR à reproduire :
```
GET /api/orders/102 HTTP/1.1
Authorization: Bearer <token_user1>
```
→ réponse vulnérable contenant `{ "id":102, "userId":2, "customerEmail":"user2@test.local", "total":149.99 }`
→ après correction : `403 Forbidden` ou `404 Not Found`.

---

## 13. Plan d'exécution de A à Z (ordre conseillé)

**Phase 1 — Socle (branche `vulnerable`)**
1. `git init` + `git checkout -b vulnerable` ; init `package.json`, `.gitignore`, `.env.example`.
2. Sequelize + SQLite, modèles `User/Product/Order/Comment`, `seed.js`, comptes de test.
3. Auth (register/login → JWT), middleware `auth`.
4. CRUD : products, orders, comments, profil ; client minimal dans `public/`.
5. Commit : `feat(app): ...`. Vérifier que l'app tourne et que les comptes de test fonctionnent.

**Phase 2 — Injection des failles (branche `vulnerable`)**
6. Implémenter VULN-01 → VULN-06 (+ 07/08), un commit `feat(vuln): ...` par faille.
7. Pour chaque faille : exécuter l'exploitation, **capturer la preuve** dans `screenshots/`, noter requête/payload/réponse.

**Phase 3 — Sécurisation (branche `secure`)**
8. `git checkout -b secure`.
9. Corriger chaque faille (cause profonde), un commit `fix(...): ...` par correction.
10. Ajouter `tests/security.test.js` prouvant la correction (ex. user1 → 403 sur commande #102).
11. Vérifier la non-régression fonctionnelle : `npm test` vert.

**Phase 4 — Pipeline (branche `secure`)**
12. Ajouter `.github/workflows/security.yml` (commit `chore(ci): add security pipeline`).
13. Faire tourner la CI ; ajuster les seuils ; capturer les résultats de scans (§8 du rapport).

**Phase 5 — Documentation & finition**
14. Rédiger `SECURITY_AUDIT.md` (toutes les fiches) et `README.md` (install, lancement, comptes, branches).
15. Ranger les captures, relire, vérifier la checklist §14.

---

## 14. Checklist finale (avant rendu)

- [ ] Branches `vulnerable` et `secure` présentes et cohérentes.
- [ ] ≥ 6 failles obligatoires, **exploitables**, **non destructives**, dans `vulnerable`.
- [ ] Chaque faille a une fiche complète (type, endpoint, cause, exploitation, preuve, impact, criticité, correction, validation).
- [ ] `secure` corrige **toutes** les failles à la cause + ajoute headers/validation/auth/rate limiting.
- [ ] `tests/security.test.js` prouve les corrections ; `npm test` passe.
- [ ] Pipeline : SAST + SCA + secret scanning + DAST + tests, **bloquante** sur critique/secret.
- [ ] `screenshots/` : preuves lisibles (requête + payload + réponse) par faille importante.
- [ ] `README.md` : installation, lancement, comptes de test, description des branches.
- [ ] `SECURITY_AUDIT.md` : structure des 10 sections respectée.
- [ ] Aucun secret réel committé ; `.env` = `DEMO_ONLY`.
- [ ] App installable et testable en quelques commandes.

---

## 15. Anti-patterns à éviter (= mauvais projet selon le sujet)

- Failles non exploitables ou théoriques.
- Corrections superficielles (blocage d'un payload précis sans traiter la cause).
- Absence de contrôle backend (tout fait côté front).
- Rapport vague, sans captures.
- Pipeline non fonctionnelle.
- README insuffisant.

> Objectif : démontrer une vraie compréhension **offensive ET défensive**. Une app simple bien pensée > une app ambitieuse mal terminée.
