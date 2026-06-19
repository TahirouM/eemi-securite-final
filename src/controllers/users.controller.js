'use strict';

const { User } = require('../models');

// GET /api/users/me
// VULN (info disclosure mineure) : renvoie l'objet user complet, password inclus.
async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    return res.json(user); // renvoie aussi le champ password (vulnerable)
  } catch (err) {
    return next(err);
  }
}

// PUT /api/users/me
// VULN-05 : MASS ASSIGNMENT.
// Tout le corps de la requête est passé à user.update(), y compris `role`.
// Un utilisateur peut donc s'auto-promouvoir admin.
async function updateMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    await user.update(req.body); // <-- accepte role, id, etc. (vulnerable)
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}

module.exports = { me, updateMe };
