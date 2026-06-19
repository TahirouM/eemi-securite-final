'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');

// Correction VULN-04 : rate limiting sur les endpoints d'authentification
// pour limiter le brute force et l'énumération à grande échelle.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives par fenêtre et par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

module.exports = router;
