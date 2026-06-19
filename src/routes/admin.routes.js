'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

// VULN-07 : `auth` seul, AUCUN contrôle de rôle admin.
router.get('/users', auth, ctrl.listUsers);
router.get('/orders', auth, ctrl.listOrders);

module.exports = router;
