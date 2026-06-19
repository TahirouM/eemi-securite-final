'use strict';

// Seed des données de démonstration.
//
// Branche vulnerable : les mots de passe sont stockés EN CLAIR (volontaire, VULN-04).
// Les commandes #101 (user1) et #102 (user2) servent à la démo IDOR (VULN-01).

const { sequelize, User, Product, Order, Comment } = require('../models');

async function seed() {
  // Recrée le schéma à chaque seed pour partir d'un état propre.
  await sequelize.sync({ force: true });

  // --- Utilisateurs ---
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@test.local',
    password: 'Admin123!', // EN CLAIR (vulnerable)
    role: 'admin',
  });

  const user1 = await User.create({
    name: 'User One',
    email: 'user1@test.local',
    password: 'User123!',
    role: 'user',
  });

  const user2 = await User.create({
    name: 'User Two',
    email: 'user2@test.local',
    password: 'User123!',
    role: 'user',
  });

  // --- Produits ---
  const products = await Product.bulkCreate([
    { name: 'Clavier mécanique', description: 'Switches bleus, rétroéclairé', price: 79.9 },
    { name: 'Souris ergonomique', description: 'Capteur 16000 DPI', price: 49.5 },
    { name: 'Écran 27" QHD', description: 'IPS 144 Hz', price: 299.0 },
    { name: 'Casque audio', description: 'Réduction de bruit active', price: 149.99 },
    { name: 'Webcam 1080p', description: 'Micro intégré', price: 39.0 },
  ]);

  // --- Commandes (IDs imposés 101 et 102 pour la démo IDOR) ---
  await Order.create({
    id: 101,
    userId: user1.id,
    customerEmail: user1.email,
    productName: 'Clavier mécanique',
    total: 79.9,
    status: 'paid',
  });

  await Order.create({
    id: 102,
    userId: user2.id,
    customerEmail: user2.email,
    productName: 'Casque audio',
    total: 149.99,
    status: 'paid',
  });

  await Order.create({
    id: 103,
    userId: user1.id,
    customerEmail: user1.email,
    productName: 'Souris ergonomique',
    total: 49.5,
    status: 'pending',
  });

  // --- Commentaires ---
  await Comment.create({
    productId: products[0].id,
    userId: user1.id,
    author: user1.name,
    body: 'Excellent clavier, très réactif !',
  });
  await Comment.create({
    productId: products[0].id,
    userId: user2.id,
    author: user2.name,
    body: 'Un peu bruyant mais agréable.',
  });
  await Comment.create({
    productId: products[3].id,
    userId: user1.id,
    author: user1.name,
    body: 'La réduction de bruit est bluffante.',
  });

  console.log('✅ Seed terminé.');
  console.log('   Comptes :');
  console.log('   - admin@test.local / Admin123! (admin)');
  console.log('   - user1@test.local / User123!  (commande #101, #103)');
  console.log('   - user2@test.local / User123!  (commande #102)');
}

// Exécution directe en CLI : `npm run seed`
if (require.main === module) {
  seed()
    .then(() => sequelize.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erreur de seed :', err);
      process.exit(1);
    });
}

module.exports = seed;
