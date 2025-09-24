const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
}));

const db = new sqlite3.Database('./notes.db', (err) => {
  if (err) {
    console.error('Could not open database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL
    )
  `);
});

function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.send('Username and password are required. <a href="/register">Try again</a>');
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.send('Username already taken. <a href="/register">Try again</a>');
          }
          return res.status(500).send('Server error. Please try again later.');
        }
        res.send('Registration successful! <a href="/">Login here</a>');
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error. Please try again later.');
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.send('Username and password are required. <a href="/">Try again</a>');
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error. Please try again later.');
    }
    if (!user) {
      return res.send('Invalid username or password. <a href="/">Try again</a>');
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.userId = user.id;
      res.redirect('/notes');
    } else {
      res.send('Invalid username or password. <a href="/">Try again</a>');
    }
  });
});

app.get('/notes', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'notes.html'));
});

app.get('/api/notes', authMiddleware, (req, res) => {
  db.all('SELECT * FROM notes', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/notes', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === '') {
    res.status(400).json({ error: 'Note content is required' });
    return;
  }
  db.run('INSERT INTO notes (content) VALUES (?)', [content], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, content });
  });
});

app.delete('/api/notes/:id', authMiddleware, (req, res) => {
  const noteId = req.params.id;
  db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ message: 'Note deleted', id: noteId });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});