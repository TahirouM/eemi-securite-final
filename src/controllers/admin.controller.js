'use strict';

const { User, Order } = require('../models');

// GET /api/admin/users
// VULN-07 : Broken Access Control.
// La route est protégée par `auth` (authentification) mais AUCUNE vérification
// de rôle n'est faite -> n'importe quel utilisateur connecté liste tous les users.
async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    return res.json(users); // renvoie aussi les mots de passe (vulnerable)
  } catch (err) {
    return next(err);
  }
}

// GET /api/admin/orders
// Même problème : pas de contrôle de rôle.
async function listOrders(req, res, next) {
  try {
    const orders = await Order.findAll({ order: [['id', 'ASC']] });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers, listOrders };
