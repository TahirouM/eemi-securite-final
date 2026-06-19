'use strict';

// Correction VULN-06 : handler d'erreurs générique.
// On journalise le détail côté serveur mais on ne renvoie JAMAIS la stack
// trace ni le message interne au client en production.
function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd ? 'Erreur interne du serveur' : err.message,
    // pas de champ `stack` dans la réponse
  });
}

module.exports = { errorHandler };
