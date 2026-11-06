const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { auth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Créer une commande avec preuve de paiement BaridiMob
router.post('/', auth, upload.single('proof'), (req, res) => {
  const items = JSON.parse(req.body.items || '[]');
  const payment_ref = req.body.payment_ref || '';
  if (!items.length) return res.status(400).json({ error: 'Panier vide' });
  if (!payment_ref && !req.file) return res.status(400).json({ error: 'Référence ou capture de paiement obligatoire' });

  let total = 0;
  const lines = [];
  for (const i of items) {
    const p = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(i.product_id);
    if (!p) return res.status(400).json({ error: 'Produit introuvable' });
    const qty = Math.max(1, parseInt(i.quantity) || 1);
    total += p.price * qty;
    lines.push({ product_id: p.id, quantity: qty, price: p.price });
  }

  const info = db.prepare('INSERT INTO orders (user_id, total, payment_ref, payment_proof) VALUES (?,?,?,?)')
    .run(req.user.id, total, payment_ref, req.file ? req.file.filename : null);
  const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)');
  lines.forEach(l => insItem.run(info.lastInsertRowid, l.product_id, l.quantity, l.price));

  res.json({ id: info.lastInsertRowid, total, status: 'en_attente' });
});

// Historique du client
router.get('/mine', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  const itemsStmt = db.prepare('SELECT oi.*, p.name, p.duration FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?');
  orders.forEach(o => {
    o.items = itemsStmt.all(o.id);
    // Les identifiants ne sont visibles qu'après validation
    if (o.status !== 'valide') o.items.forEach(i => delete i.delivery_info);
  });
  res.json(orders);
});

module.exports = router;
