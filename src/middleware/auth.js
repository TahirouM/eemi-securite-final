'use strict';

const jwt = require('jsonwebtoken');

// VULN-04 : secret JWT faible et codé en dur en repli (« secret123 »).
// Aucune validation forte du secret. Sur la branche secure, le secret vient
// exclusivement de process.env et est exigé fort.
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Vérifie la présence et la validité d'un JWT.
// NB : ce middleware ne vérifie QUE l'authentification, jamais le rôle.
// L'absence de contrôle de rôle sur les routes admin est VULN-07.
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = { auth, JWT_SECRET };
