'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');

// Base SQLite locale (fichier unique, zéro installation).
const storage = path.join(__dirname, '..', '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false,
});

module.exports = { sequelize, Sequelize };
