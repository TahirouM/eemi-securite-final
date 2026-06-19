'use strict';

const { Order } = require('../models');

// GET /api/orders
// Liste les commandes de l'utilisateur authentifié.
async function listMine(req, res, next) {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['id', 'ASC']],
    });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

// GET /api/orders/:id
// Correction VULN-01 : contrôle d'appartenance.
// Un utilisateur ne peut lire que SES commandes (where userId).
// Un admin (rôle vérifié explicitement) peut lire n'importe laquelle.
async function getOne(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (req.user.role !== 'admin') {
      where.userId = req.user.id;
    }
    const order = await Order.findOne({ where });
    if (!order) {
      // 404 indifférencié : ne révèle pas l'existence d'une commande d'autrui.
      return res.status(404).json({ error: 'Commande introuvable' });
    }
    return res.json(order);
  } catch (err) {
    return next(err);
  }
}

// POST /api/orders
async function create(req, res, next) {
  try {
    const { productName, total } = req.body;
    const order = await Order.create({
      userId: req.user.id,
      customerEmail: req.user.email,
      productName: productName || 'Article',
      total: Number(total) || 0,
      status: 'paid',
    });
    return res.status(201).json(order);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMine, getOne, create };
