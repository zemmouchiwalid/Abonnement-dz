require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { auth, adminOnly } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Crée le dossier des captures s'il n'existe pas
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

require('./db');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Infos de paiement BaridiMob affichées au checkout
app.get('/api/payment-info', (req, res) => {
  res.json({ rip: process.env.BARIDIMOB_RIP, nom: process.env.BARIDIMOB_NOM });
});

// Les captures de paiement ne sont visibles que par l'admin
app.use('/api/proofs', auth, adminOnly, express.static(path.join(__dirname, 'uploads')));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Serveur lancé sur le port ' + port));
