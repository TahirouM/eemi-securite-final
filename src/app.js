'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(express.json());

// VULN-06 : CORS totalement ouvert AVEC credentials.
// origin '*' + credentials est une mauvaise configuration classique.
app.use(cors({ origin: '*', credentials: true }));

// VULN-06 : AUCUN header de sécurité (pas de Helmet, pas de CSP).

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Front minimal
app.use(express.static(path.join(__dirname, '..', 'public')));

// VULN-06 : service statique de la RACINE du projet, dotfiles autorisés.
// -> GET /.env renvoie le fichier de secrets, GET /src/... expose le code source.
app.use(express.static(path.join(__dirname, '..'), { dotfiles: 'allow' }));

// Handler d'erreurs en dernier (renvoie la stack — VULN-06).
app.use(errorHandler);

module.exports = app;
