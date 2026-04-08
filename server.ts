import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('yabamate.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    name TEXT,
    bio TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    last_login_date TEXT,
    consecutive_days INTEGER DEFAULT 0,
    last_task_reset_date TEXT
  );

  CREATE TABLE IF NOT EXISTS tiers (
    id TEXT PRIMARY KEY,
    creator_address TEXT,
    name TEXT,
    price REAL,
    period TEXT,
    description TEXT,
    auto_renew_enabled INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT,
    user_address TEXT,
    score INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_games (
    user_address TEXT,
    game_id TEXT,
    date TEXT,
    PRIMARY KEY (user_address, game_id, date)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Multer setup for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage });

  app.use('/uploads', express.static('uploads'));

  // API Routes
  
  // User Profile & Points
  app.post('/api/user/sync', (req, res) => {
    const { address } = req.body;
    let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    
    if (!user) {
      db.prepare('INSERT INTO users (address, points) VALUES (?, ?)').run(address, 0);
      user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    }
    
    res.json(user);
  });

  app.post('/api/user/update', upload.single('avatar'), (req, res) => {
    const { address, name, bio } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (avatar_url) {
      db.prepare('UPDATE users SET name = ?, bio = ?, avatar_url = ? WHERE address = ?')
        .run(name, bio, avatar_url, address);
    } else {
      db.prepare('UPDATE users SET name = ?, bio = ? WHERE address = ?')
        .run(name, bio, address);
    }

    res.json({ success: true });
  });

  app.post('/api/user/attendance', (req, res) => {
    const { address } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as any;

    if (user.last_login_date === today) {
      return res.json({ pointsEarned: 0, consecutiveDays: user.consecutive_days });
    }

    let newConsecutiveDays = 1;
    let pointsToAdd = 50;

    if (user.last_login_date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (user.last_login_date === yesterdayStr) {
        newConsecutiveDays = user.consecutive_days + 1;
      }
    }

    if (newConsecutiveDays >= 7) pointsToAdd = 80;

    db.prepare('UPDATE users SET points = points + ?, last_login_date = ?, consecutive_days = ? WHERE address = ?')
      .run(pointsToAdd, today, newConsecutiveDays, address);

    res.json({ pointsEarned: pointsToAdd, consecutiveDays: newConsecutiveDays });
  });

  app.post('/api/game/played', (req, res) => {
    const { address, gameId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
      db.prepare('INSERT INTO daily_games (user_address, game_id, date) VALUES (?, ?, ?)')
        .run(address, gameId, today);
      
      // Check if all 3 games played today
      const playedCount = db.prepare('SELECT COUNT(*) as count FROM daily_games WHERE user_address = ? AND date = ?')
        .get(address, today) as any;

      let bonus = 0;
      if (playedCount.count === 3) {
        db.prepare('UPDATE users SET points = points + 10 WHERE address = ?').run(address);
        bonus = 10;
      }

      res.json({ success: true, bonus });
    } catch (e) {
      res.json({ success: true, bonus: 0 }); // Already played today
    }
  });

  app.get('/api/user/daily-status/:address', (req, res) => {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const played = db.prepare('SELECT game_id FROM daily_games WHERE user_address = ? AND date = ?')
      .all(address) as any[];
    
    res.json({
      tetris: played.some(p => p.game_id === 'tetris'),
      pong: played.some(p => p.game_id === 'pong'),
      backgammon: played.some(p => p.game_id === 'backgammon'),
    });
  });

  app.post('/api/user/spend', (req, res) => {
    const { address, amount } = req.body;
    const user = db.prepare('SELECT points FROM users WHERE address = ?').get(address) as any;
    
    if (user.points < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    db.prepare('UPDATE users SET points = points - ? WHERE address = ?').run(amount, address);
    res.json({ success: true });
  });

  // Tiers
  app.get('/api/tiers/:address', (req, res) => {
    const tiers = db.prepare('SELECT * FROM tiers WHERE creator_address = ?').all(req.params.address);
    res.json(tiers);
  });

  app.post('/api/tiers', (req, res) => {
    const { id, creator_address, name, price, period, description, auto_renew_enabled } = req.body;
    db.prepare('INSERT OR REPLACE INTO tiers (id, creator_address, name, price, period, description, auto_renew_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, creator_address, name, price, period, description, auto_renew_enabled ? 1 : 0);
    res.json({ success: true });
  });

  // Rankings
  app.post('/api/rankings', (req, res) => {
    const { gameId, address, score } = req.body;
    db.prepare('INSERT INTO rankings (game_id, user_address, score) VALUES (?, ?, ?)')
      .run(gameId, address, score);
    res.json({ success: true });
  });

  app.get('/api/rankings/:gameId', (req, res) => {
    const rankings = db.prepare(`
      SELECT r.*, u.name as username 
      FROM rankings r 
      LEFT JOIN users u ON r.user_address = u.address 
      WHERE r.game_id = ? 
      ORDER BY r.score DESC 
      LIMIT 10
    `).all(req.params.gameId);
    res.json(rankings);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
