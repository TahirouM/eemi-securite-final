'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Propriétaire de la commande. Le contrôle d'appartenance sur ce champ
    // est ABSENT côté vulnerable (VULN-01 IDOR) et ajouté côté secure.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Dénormalisé volontairement pour rendre la fuite IDOR plus parlante.
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'paid',
    },
  },
  {
    tableName: 'orders',
    timestamps: true,
  }
);

module.exports = Order;
