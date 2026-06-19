'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const seed = require('../src/db/seed');
const { sequelize } = require('../src/models');

let tokenUser1;
let tokenAdmin;

async function login(email, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  await seed();
  tokenUser1 = await login('user1@test.local', 'User123!');
  tokenAdmin = await login('admin@test.local', 'Admin123!');
});

afterAll(async () => {
  await sequelize.close();
});

describe('VULN-01 — IDOR sur /api/orders/:id', () => {
  test('user1 ne peut PAS lire la commande #102 (de user2) -> 404', async () => {
    const res = await request(app)
      .get('/api/orders/102')
      .set('Authorization', `Bearer ${tokenUser1}`);
    expect(res.status).toBe(404);
  });

  test('user1 peut lire SA propre commande #103 -> 200', async () => {
    const res = await request(app)
      .get('/api/orders/103')
      .set('Authorization', `Bearer ${tokenUser1}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(103);
  });

  test('admin peut lire n\'importe quelle commande -> 200', async () => {
    const res = await request(app)
      .get('/api/orders/102')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
  });
});

describe('VULN-02 — Injection SQL sur /api/products/search', () => {
  test("le payload \"' OR '1'='1\" ne dump PAS le catalogue", async () => {
    const res = await request(app).get("/api/products/search?q=' OR '1'='1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0); // aucune correspondance littérale
  });

  test('une recherche normale fonctionne toujours', async () => {
    const res = await request(app).get('/api/products/search?q=Clavier');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe('VULN-03 — XSS stockée sur les commentaires', () => {
  test('le HTML/JS injecté est nettoyé à l\'écriture', async () => {
    const res = await request(app)
      .post('/api/products/1/comments')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ body: '<img src=x onerror=alert(document.cookie)>texte' });
    expect(res.status).toBe(201);
    expect(res.body.body).not.toMatch(/<img/i);
    expect(res.body.body).not.toMatch(/onerror/i);
    expect(res.body.body).toContain('texte');
  });
});

describe('VULN-04 — Authentification', () => {
  test('message générique pour un email inconnu', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@x.com', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  test('même message générique pour un mauvais mot de passe (anti-énumération)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@test.local', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  test('le token a une expiration (exp présent)', () => {
    const decoded = jwt.decode(tokenUser1);
    expect(decoded.exp).toBeDefined();
  });

  test('un token forgé avec le secret faible "secret123" est rejeté', async () => {
    const forged = jwt.sign(
      { id: 1, email: 'admin@test.local', role: 'admin' },
      'secret123'
    );
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });
});

describe('VULN-05 — Mass Assignment sur PUT /api/users/me', () => {
  test('un user ne peut PAS se promouvoir admin', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ role: 'admin', name: 'Nouveau Nom' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('user'); // role inchangé
    expect(res.body.name).toBe('Nouveau Nom'); // champ whitelisté appliqué
    expect(res.body.password).toBeUndefined(); // jamais renvoyé
  });
});

describe('VULN-06 — Misconfiguration / Information Disclosure', () => {
  test('les en-têtes de sécurité (Helmet) sont présents', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('GET /.env ne renvoie pas le fichier de secrets', async () => {
    const res = await request(app).get('/.env');
    expect(res.status).not.toBe(200);
  });

  test('CORS n\'est pas un wildcard', async () => {
    const res = await request(app).get('/').set('Origin', 'http://evil.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});

describe('VULN-07 — Broken Access Control sur /api/admin/*', () => {
  test('un user simple est refusé -> 403', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${tokenUser1}`);
    expect(res.status).toBe(403);
  });

  test('un admin est autorisé -> 200, sans fuite de mot de passe', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body[0].password).toBeUndefined();
  });
});
