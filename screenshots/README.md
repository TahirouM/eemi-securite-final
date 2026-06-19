# Captures de preuves

Ce dossier doit contenir les captures d'exploitation (Burp Suite ou navigateur/DevTools)
montrant, pour chaque faille importante : **la requête HTTP, le payload, la réponse
serveur et le résultat visible**.

Captures attendues (cf. `SECURITY_AUDIT.md`) :

| Fichier | Faille | À capturer |
|---|---|---|
| `vuln-01-idor.png` | IDOR | `GET /api/orders/102` avec le token de user1 → commande de user2 |
| `vuln-02-sqli.png` | SQLi | `q=' OR '1'='1` (dump) et/ou UNION exfiltrant les users |
| `vuln-03-xss.png` | XSS stockée | commentaire `<img src=x onerror=alert(...)>` exécuté sur la page produit |
| `vuln-04-auth.png` | Auth faible | messages distincts (énumération) + token forgé accepté |
| `vuln-05-mass-assignment.png` | Mass Assignment | `PUT /api/users/me {"role":"admin"}` → `role:"admin"` |
| `vuln-06-misconfig.png` | Misconfig | `GET /.env` (secrets) + stack trace dans une 500 |
| `vuln-07-bac.png` | Broken Access Control | `GET /api/admin/users` avec un token user → 200 + liste |
| `vuln-08-token.png` | JWT localStorage | `localStorage.getItem('token')` dans la console DevTools |

> Procédure : lancer la branche `vulnerable` (`npm run seed && npm start`), reproduire
> chaque exploitation (voir les requêtes du rapport), capturer. Puis, sur `secure`,
> capturer la réponse corrigée (403/404, 0 résultat, en-têtes Helmet, etc.) pour la
> section « Validation après correction ».
