const router = require('express').Router();
const db = require('../db');

router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories').all());
});

router.get('/', (req, res) => {
  const { category } = req.query;
  const base = 'SELECT p.*, c.name AS category FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1';
  const rows = category
    ? db.prepare(base + ' AND p.category_id = ?').all(category)
    : db.prepare(base).all();
  res.json(rows);
});

module.exports = router;
