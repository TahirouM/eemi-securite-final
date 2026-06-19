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
// VULN-01 : IDOR / BOLA.
// On récupère la commande par son ID SANS vérifier qu'elle appartient
// à l'utilisateur authentifié -> n'importe qui lit la commande de n'importe qui.
async function getOne(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id); // <-- pas de contrôle d'ownership
    if (!order) {
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
