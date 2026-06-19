'use strict';

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/products.controller');

router.get('/', ctrl.list);
router.get('/search', ctrl.search); // VULN-02 SQLi
router.get('/:id', ctrl.getOne);
router.get('/:id/comments', ctrl.listComments);
router.post('/:id/comments', auth, ctrl.addComment); // VULN-03 XSS stockée

module.exports = router;
