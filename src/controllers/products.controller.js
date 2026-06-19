'use strict';

const sanitizeHtml = require('sanitize-html');
const { Op } = require('sequelize');
const { Product, Comment } = require('../models');

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
// Correction VULN-02 : recherche via l'ORM avec Op.like (requête paramétrée,
// binds gérés par Sequelize) + validation/longueur de `q`. Plus de SQL brut.
async function search(req, res, next) {
  try {
    const q = (req.query.q || '').toString().slice(0, 100);
    const products = await Product.findAll({
      where: { name: { [Op.like]: `%${q}%` } },
      order: [['id', 'ASC']],
    });
    return res.json(products);
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
// Correction VULN-03 : le contenu est NETTOYÉ côté serveur à l'écriture
// (sanitize-html, défense en profondeur) et le front rend via textContent + CSP.
async function addComment(req, res, next) {
  try {
    const raw = (req.body.body || '').toString();
    if (!raw.trim()) {
      return res.status(400).json({ error: 'body requis' });
    }
    // allowedTags: [] -> supprime tout HTML, ne conserve que le texte.
    const clean = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} });
    const comment = await Comment.create({
      productId: req.params.id,
      userId: req.user.id,
      author: req.user.email,
      body: clean,
    });
    return res.status(201).json(comment);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, search, getOne, listComments, addComment };
