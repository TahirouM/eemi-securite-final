'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
// Inscription simple. Mot de passe stocké EN CLAIR (VULN-04).
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password requis' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }
    const user = await User.create({
      name: name || email,
      email,
      password, // EN CLAIR (vulnerable)
      role: 'user',
    });
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
// VULN-04 (cumul de symptômes) :
//  - comparaison de mot de passe EN CLAIR (pas de bcrypt),
//  - messages d'erreur PRÉCIS -> énumération de comptes,
//  - JWT signé avec un secret faible et SANS expiration,
//  - pas de rate limiting (voir app.js).
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Message précis : révèle que l'email n'existe pas (énumération).
      return res.status(401).json({ error: 'Utilisateur inconnu' });
    }

    if (user.password !== password) {
      // Message précis : confirme que l'email existe mais le mot de passe est faux.
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Token SANS expiration, secret faible.
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET
    );

    return res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login };
