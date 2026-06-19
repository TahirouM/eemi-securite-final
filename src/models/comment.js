'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Comment = sequelize.define(
  'Comment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Branche vulnerable : stocké TEL QUEL, sans sanitization (VULN-03 XSS stockée).
    // Branche secure : nettoyé via DOMPurify à l'écriture + rendu en textContent.
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'comments',
    timestamps: true,
  }
);

module.exports = Comment;
