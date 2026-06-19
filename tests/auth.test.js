'use strict';

const request = require('supertest');
const app = require('../src/app');
const seed = require('../src/db/seed');
const { sequelize } = require('../src/models');

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Authentification (fonctionnel)', () => {
  test('login valide renvoie un token et le rôle', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.local', password: 'User123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe('user');
  });

  test('register crée un nouvel utilisateur', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Nouveau', email: 'new@test.local', password: 'Passw0rd!' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@test.local');
  });

  test('register d\'un email existant est refusé', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user1@test.local', password: 'x' });
    expect(res.status).toBe(409);
  });

  test('une route protégée sans token renvoie 401', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
