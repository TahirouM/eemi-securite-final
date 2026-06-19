'use strict';

const { sequelize } = require('../db');
const User = require('./user');
const Product = require('./product');
const Order = require('./order');
const Comment = require('./comment');

// Associations
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Comment, { foreignKey: 'userId' });
Comment.belongsTo(User, { foreignKey: 'userId' });

Product.hasMany(Comment, { foreignKey: 'productId' });
Comment.belongsTo(Product, { foreignKey: 'productId' });

module.exports = { sequelize, User, Product, Order, Comment };
