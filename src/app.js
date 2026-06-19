'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(express.json());

// Correction VULN-06 : Helmet pose les en-têtes de sécurité (HSTS, X-Frame-Options,
// X-Content-Type-Options…) et une Content-Security-Policy stricte.
// La CSP (default-src 'self', pas de inline) renforce la défense contre VULN-03 (XSS).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// Correction VULN-06 : CORS restreint à l'origine attendue, sans wildcard.
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Correction VULN-06 : on ne sert QUE le dossier public (jamais la racine),
// et les dotfiles (ex. .env) sont refusés.
app.use(
  express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny' })
);

// Handler d'erreurs générique en dernier (pas de stack en réponse — VULN-06).
app.use(errorHandler);

module.exports = app;
