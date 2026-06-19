'use strict';

const { User } = require('../models');

// Projection sûre : ne JAMAIS renvoyer le mot de passe (correction info disclosure).
const SAFE_ATTRS = ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'];

// GET /api/users/me
async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, { attributes: SAFE_ATTRS });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    return res.json(user);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/users/me
// Correction VULN-05 : whitelist stricte des champs modifiables.
// `role`, `id`, `password` (et tout autre champ) sont ignorés ici.
async function updateMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name;
    if (typeof req.body.email === 'string') updates.email = req.body.email;

    await user.update(updates); // seuls name/email sont appliqués
    const safe = await User.findByPk(user.id, { attributes: SAFE_ATTRS });
    return res.json(safe);
  } catch (err) {
    return next(err);
  }
}

module.exports = { me, updateMe };
