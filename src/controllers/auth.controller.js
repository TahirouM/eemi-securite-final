'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

// POST /api/auth/register
// Correction VULN-04 : le mot de passe est haché avec bcrypt avant stockage.
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password requis' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      // Message volontairement neutre pour limiter l'énumération.
      return res.status(409).json({ error: 'Inscription impossible' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name || email,
      email,
      password: passwordHash,
      role: 'user', // le rôle n'est jamais pris depuis l'entrée utilisateur
    });
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
// Corrections VULN-04 :
//  - vérification du mot de passe via bcrypt.compare,
//  - message d'erreur GÉNÉRIQUE (anti-énumération),
//  - JWT signé avec un secret fort (env) et expiration,
//  - rate limiting appliqué au niveau de la route (voir app.js).
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    const GENERIC = { error: 'Identifiants invalides' };

    if (!user) {
      // Comparaison factice pour égaliser le temps de réponse (timing).
      await bcrypt.compare(password || '', '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      return res.status(401).json(GENERIC);
    }

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) {
      return res.status(401).json(GENERIC);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login };
