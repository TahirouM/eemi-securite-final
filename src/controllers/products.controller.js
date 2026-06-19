'use strict';

const { sequelize, Product, Comment } = require('../models');
const { QueryTypes } = require('sequelize');

// GET /api/products
async function list(req, res, next) {
  try {
    const products = await Product.findAll({ order: [['id', 'ASC']] });
    return res.json(products);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/search?q=...
// VULN-02 : INJECTION SQL.
// La valeur de `q` est CONCATÉNÉE directement dans la requête SQL brute.
// Exemple d'exploitation (lecture seule) : q=' OR '1'='1
async function search(req, res, next) {
  try {
    const q = req.query.q || '';
    // Requête brute vulnérable — concaténation de chaîne non échappée.
    const rows = await sequelize.query(
      `SELECT * FROM products WHERE name LIKE '%${q}%'`,
      { type: QueryTypes.SELECT }
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/:id
async function getOne(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }
    return res.json(product);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/:id/comments
async function listComments(req, res, next) {
  try {
    const comments = await Comment.findAll({
      where: { productId: req.params.id },
      order: [['id', 'ASC']],
    });
    return res.json(comments);
  } catch (err) {
    return next(err);
  }
}

// POST /api/products/:id/comments
// VULN-03 : XSS STOCKÉE.
// Le corps du commentaire est stocké TEL QUEL, sans aucune sanitization.
// Combiné au rendu front via innerHTML, tout payload HTML/JS s'exécute.
async function addComment(req, res, next) {
  try {
    const { body } = req.body;
    if (!body) {
      return res.status(400).json({ error: 'body requis' });
    }
    const comment = await Comment.create({
      productId: req.params.id,
      userId: req.user.id,
      author: req.user.email,
      body, // <-- stocké sans nettoyage (vulnerable)
    });
    return res.status(201).json(comment);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, search, getOne, listComments, addComment };
