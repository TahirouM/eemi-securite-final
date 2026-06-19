'use strict';

const { User, Order } = require('../models');

const SAFE_USER_ATTRS = ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'];

// GET /api/admin/users
// Correction VULN-07 : la route est désormais protégée par requireRole('admin')
// (voir admin.routes.js). On ne renvoie jamais les mots de passe.
async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRS,
      order: [['id', 'ASC']],
    });
    return res.json(users);
  } catch (err) {
    return next(err);
  }
}

// GET /api/admin/orders
async function listOrders(req, res, next) {
  try {
    const orders = await Order.findAll({ order: [['id', 'ASC']] });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers, listOrders };
