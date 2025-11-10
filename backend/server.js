// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());
const SECRET = process.env.JWT_SECRET || 'clearvue-secret';

// Simple DB (file: carbon.db in backend/)
const db = new sqlite3.Database('./carbon.db');
db.run(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT,
  energy_kwh REAL
)`);

// Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const hash = bcrypt.hashSync(password, 8);
  db.run('INSERT INTO users(username, password) VALUES (?,?)', [username, hash], (err) => {
    if (err) return res.status(400).json({ error: 'User exists or invalid' });
    res.json({ message: 'User registered' });
  });
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username=?', [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '2h' });
    res.json({ token });
  });
});

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Create log
app.post('/logs', auth, (req, res) => {
  const { date, energy_kwh } = req.body;
  if (!date || energy_kwh == null) return res.status(400).json({ error: 'date and energy_kwh required' });
  db.run('INSERT INTO logs(user_id, date, energy_kwh) VALUES (?,?,?)', [req.userId, date, energy_kwh], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, date, energy_kwh });
  });
});

// Get logs
app.get('/logs', auth, (req, res) => {
  db.all('SELECT id, date, energy_kwh FROM logs WHERE user_id=? ORDER BY date DESC', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Basic health
app.get('/', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
