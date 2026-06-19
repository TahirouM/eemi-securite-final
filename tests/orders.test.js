'use strict';

const request = require('supertest');
const app = require('../src/app');
const seed = require('../src/db/seed');
const { sequelize } = require('../src/models');

let token;

beforeAll(async () => {
  await seed();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user1@test.local', password: 'User123!' });
  token = res.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Commandes (fonctionnel)', () => {
  test('GET /api/orders liste les commandes de l\'utilisateur', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // user1 possède #101 et #103
    const ids = res.body.map((o) => o.id).sort();
    expect(ids).toEqual([101, 103]);
  });

  test('POST /api/orders crée une commande pour l\'utilisateur', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ productName: 'Webcam 1080p', total: 39 });
    expect(res.status).toBe(201);
    expect(res.body.productName).toBe('Webcam 1080p');
    expect(res.body.customerEmail).toBe('user1@test.local');
  });

  test('GET /api/orders/:id renvoie SA commande', async () => {
    const res = await request(app)
      .get('/api/orders/101')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(101);
  });
});
