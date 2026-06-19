'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

router.get('/me', auth, ctrl.me);
router.put('/me', auth, ctrl.updateMe); // VULN-05 Mass Assignment

module.exports = router;
