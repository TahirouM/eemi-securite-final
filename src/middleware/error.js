'use strict';

// VULN-06 : handler d'erreurs qui RENVOIE la stack trace complète au client.
// Cela divulgue l'arborescence du projet, les versions, la logique interne.
// Sur la branche secure : message générique + pas de stack en réponse.
function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message,
    stack: err.stack, // <-- fuite d'information volontaire
  });
}

module.exports = { errorHandler };
