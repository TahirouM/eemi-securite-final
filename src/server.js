'use strict';

require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function start() {
  // S'assure que le schéma existe (le seed le recrée avec des données).
  await sequelize.sync();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌ Échec du démarrage :', err);
  process.exit(1);
});
