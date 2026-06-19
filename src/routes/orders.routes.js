'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/orders.controller');

router.get('/', auth, ctrl.listMine);
router.post('/', auth, ctrl.create);
router.get('/:id', auth, ctrl.getOne); // VULN-01 IDOR

module.exports = router;
