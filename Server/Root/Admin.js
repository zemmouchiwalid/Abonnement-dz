const router = require('express').Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);

// Toutes les commandes
router.get('/orders', (req, res) => {
  const orders = db.prepare('SELECT o.*, u.name, u.email, u.phone FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC').all();
  const itemsStmt = db.prepare('SELECT oi.*, p.name, p.duration FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?');
  orders.forEach(o => { o.items = itemsStmt.all(o.id); });
  res.json(orders);
});

// Valider une commande et saisir les identifiants livrés
router.post('/orders/:id/validate', (req, res) => {
  const { deliveries } = req.body; // [{ item_id, delivery_info }]
  const upd = db.prepare('UPDATE order_items SET delivery_info = ? WHERE id = ? AND order_id = ?');
  (deliveries || []).forEach(d => upd.run(d.delivery_info, d.item_id, req.params.id));
  db.prepare("UPDATE orders SET status = 'valide' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Refuser une commande
router.post('/orders/:id/reject', (req, res) => {
  db.prepare("UPDATE orders SET status = 'refuse', admin_note = ? WHERE id = ?").run(req.body.note || '', req.params.id);
  res.json({ ok: true });
});

// Gestion du catalogue
router.post('/products', (req, res) => {
  const { category_id, name, description, duration, price } = req.body;
  const info = db.prepare('INSERT INTO products (category_id, name, description, duration, price) VALUES (?,?,?,?,?)')
    .run(category_id, name, description, duration, price);
  res.json({ id: info.lastInsertRowid });
});

router.put('/products/:id', (req, res) => {
  const { name, description, duration, price, active } = req.body;
  db.prepare('UPDATE products SET name = ?, description = ?, duration = ?, price = ?, active = ? WHERE id = ?')
    .run(name, description, duration, price, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.post('/categories', (req, res) => {
  const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(req.body.name);
  res.json({ id: info.lastInsertRowid });
});

module.exports = router;
