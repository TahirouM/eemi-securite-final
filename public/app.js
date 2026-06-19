'use strict';

// VULN-08 : le JWT est stocké dans localStorage -> accessible au JavaScript,
// donc volable par une XSS (VULN-03). On chaîne les deux dans la démo.
function getToken() {
  return localStorage.getItem('token');
}
function setToken(t) {
  localStorage.setItem('token', t);
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, { ...opts, headers });
  return res.json();
}

// --- Connexion ---
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const msg = document.getElementById('login-msg');
  if (data.token) {
    setToken(data.token); // VULN-08
    document.getElementById('auth-status').textContent =
      'Connecté : ' + data.email + ' (' + data.role + ')';
    msg.textContent = 'Connexion réussie';
  } else {
    msg.textContent = data.error || 'Échec';
  }
});

// --- Produits ---
async function loadProducts(query) {
  const path = query
    ? '/api/products/search?q=' + encodeURIComponent(query)
    : '/api/products';
  const products = await api(path);
  const ul = document.getElementById('products-list');
  ul.innerHTML = '';
  (products || []).forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${p.price} €`;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => openProduct(p));
    ul.appendChild(li);
  });
}

document.getElementById('search-btn').addEventListener('click', () => {
  loadProducts(document.getElementById('search-input').value);
});

// --- Détail produit + commentaires ---
async function openProduct(p) {
  document.getElementById('product-detail').hidden = false;
  document.getElementById('product-title').textContent = p.name;
  document.getElementById('product-detail').dataset.id = p.id;
  await loadComments(p.id);
}

async function loadComments(productId) {
  const comments = await api('/api/products/' + productId + '/comments');
  const container = document.getElementById('comments');
  // VULN-03 : rendu via innerHTML -> exécution de tout HTML/JS injecté.
  container.innerHTML = (comments || [])
    .map((c) => `<div class="comment"><b>${c.author}</b><br>${c.body}</div>`)
    .join('');
}

document.getElementById('comment-btn').addEventListener('click', async () => {
  const id = document.getElementById('product-detail').dataset.id;
  const body = document.getElementById('comment-body').value;
  await api('/api/products/' + id + '/comments', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  document.getElementById('comment-body').value = '';
  await loadComments(id);
});

// --- Commandes ---
document.getElementById('orders-btn').addEventListener('click', async () => {
  const orders = await api('/api/orders');
  const ul = document.getElementById('orders-list');
  ul.innerHTML = '';
  (orders || []).forEach((o) => {
    const li = document.createElement('li');
    li.textContent = `#${o.id} — ${o.productName} — ${o.total} € (${o.status})`;
    ul.appendChild(li);
  });
});

// Chargement initial
loadProducts();
