'use strict';

const jwt = require('jsonwebtoken');

// Correction VULN-04 : le secret vient EXCLUSIVEMENT de l'environnement et
// doit être suffisamment long. Aucun repli codé en dur.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET manquant ou trop court (>= 32 caractères requis). ' +
      'Définissez-le dans .env (voir .env.example).'
  );
}

// Durée de vie des tokens (correction VULN-04 : expiration obligatoire).
const JWT_EXPIRES_IN = '1h';

// Vérifie l'authentification (présence + validité du JWT).
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
}

// Correction VULN-07 : contrôle de rôle explicite.
// À appliquer APRÈS `auth` sur les routes sensibles.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    return next();
  };
}

module.exports = { auth, requireRole, JWT_SECRET, JWT_EXPIRES_IN };
