'use strict';

const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

// Correction VULN-07 : auth + contrôle de rôle admin sur TOUTES les routes /api/admin/*.
router.use(auth, requireRole('admin'));

router.get('/users', ctrl.listUsers);
router.get('/orders', ctrl.listOrders);

module.exports = router;
