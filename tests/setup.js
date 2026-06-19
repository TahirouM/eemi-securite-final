'use strict';

// Charge le .env (JWT_SECRET fort requis par le middleware auth).
// Repli : si aucun secret n'est défini (ex. CI sans .env), on en fournit un
// suffisamment long pour permettre le boot de l'application durant les tests.
require('dotenv').config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET =
    'test_secret_at_least_32_chars_long_0123456789_for_jest';
}
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
