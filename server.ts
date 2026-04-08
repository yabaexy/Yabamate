import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith('postgres')) {
  console.error('CRITICAL: DATABASE_URL is not set or is invalid. Please set it in Settings > Secrets.');
}

const sql = neon(dbUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder');

async function initDb() {
  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    console.warn('Skipping database initialization: DATABASE_URL is missing or invalid.');
    return;
  }
  try {
    await sql`
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
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tiers (
        id TEXT PRIMARY KEY,
        creator_address TEXT,
        name TEXT,
        price REAL,
        period TEXT,
        description TEXT,
        auto_renew_enabled INTEGER DEFAULT 0
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rankings (
        id SERIAL PRIMARY KEY,
        game_id TEXT,
        user_address TEXT,
        score INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS daily_games (
        user_address TEXT,
        game_id TEXT,
        date TEXT,
        PRIMARY KEY (user_address, game_id, date)
      );
    `;
    console.log('Database initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

async function startServer() {
  await initDb();

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
  app.post('/api/user/sync', async (req, res) => {
    const { address } = req.body;
    try {
      let users = await sql`SELECT * FROM users WHERE address = ${address}`;
      
      if (users.length === 0) {
        await sql`INSERT INTO users (address, points) VALUES (${address}, 0)`;
        users = await sql`SELECT * FROM users WHERE address = ${address}`;
      }
      
      res.json(users[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  app.post('/api/user/update', upload.single('avatar'), async (req, res) => {
    const { address, name, bio } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
      if (avatar_url) {
        await sql`
          UPDATE users 
          SET name = ${name}, bio = ${bio}, avatar_url = ${avatar_url} 
          WHERE address = ${address}
        `;
      } else {
        await sql`
          UPDATE users 
          SET name = ${name}, bio = ${bio} 
          WHERE address = ${address}
        `;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.post('/api/user/attendance', async (req, res) => {
    const { address } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const users = await sql`SELECT * FROM users WHERE address = ${address}`;
      const user = users[0] as any;

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

      await sql`
        UPDATE users 
        SET points = points + ${pointsToAdd}, last_login_date = ${today}, consecutive_days = ${newConsecutiveDays} 
        WHERE address = ${address}
      `;

      res.json({ pointsEarned: pointsToAdd, consecutiveDays: newConsecutiveDays });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  });

  app.post('/api/game/played', async (req, res) => {
    const { address, gameId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
      await sql`
        INSERT INTO daily_games (user_address, game_id, date) 
        VALUES (${address}, ${gameId}, ${today})
      `;
      
      const result = await sql`
        SELECT COUNT(*) as count FROM daily_games 
        WHERE user_address = ${address} AND date = ${today}
      `;
      const playedCount = parseInt((result[0] as any).count);

      let bonus = 0;
      if (playedCount === 3) {
        await sql`UPDATE users SET points = points + 10 WHERE address = ${address}`;
        bonus = 10;
      }

      res.json({ success: true, bonus });
    } catch (e) {
      res.json({ success: true, bonus: 0 }); // Already played today or error
    }
  });

  app.get('/api/user/daily-status/:address', async (req, res) => {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      const played = await sql`
        SELECT game_id FROM daily_games 
        WHERE user_address = ${address} AND date = ${today}
      `;
      
      res.json({
        tetris: played.some((p: any) => p.game_id === 'tetris'),
        pong: played.some((p: any) => p.game_id === 'pong'),
        backgammon: played.some((p: any) => p.game_id === 'backgammon'),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch daily status' });
    }
  });

  app.post('/api/user/spend', async (req, res) => {
    const { address, amount } = req.body;
    try {
      const users = await sql`SELECT points FROM users WHERE address = ${address}`;
      const user = users[0] as any;
      
      if (user.points < amount) {
        return res.status(400).json({ error: 'Insufficient points' });
      }

      await sql`UPDATE users SET points = points - ${amount} WHERE address = ${address}`;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to spend points' });
    }
  });

  // Tiers
  app.get('/api/tiers/:address', async (req, res) => {
    try {
      const tiers = await sql`SELECT * FROM tiers WHERE creator_address = ${req.params.address}`;
      res.json(tiers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tiers' });
    }
  });

  app.post('/api/tiers', async (req, res) => {
    const { id, creator_address, name, price, period, description, auto_renew_enabled } = req.body;
    try {
      await sql`
        INSERT INTO tiers (id, creator_address, name, price, period, description, auto_renew_enabled) 
        VALUES (${id}, ${creator_address}, ${name}, ${price}, ${period}, ${description}, ${auto_renew_enabled ? 1 : 0})
        ON CONFLICT (id) DO UPDATE SET 
          creator_address = EXCLUDED.creator_address,
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          period = EXCLUDED.period,
          description = EXCLUDED.description,
          auto_renew_enabled = EXCLUDED.auto_renew_enabled
      `;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save tier' });
    }
  });

  // Rankings
  app.post('/api/rankings', async (req, res) => {
    const { gameId, address, score } = req.body;
    try {
      await sql`
        INSERT INTO rankings (game_id, user_address, score) 
        VALUES (${gameId}, ${address}, ${score})
      `;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save ranking' });
    }
  });

  app.get('/api/rankings/:gameId', async (req, res) => {
    try {
      const rankings = await sql`
        SELECT r.*, u.name as username 
        FROM rankings r 
        LEFT JOIN users u ON r.user_address = u.address 
        WHERE r.game_id = ${req.params.gameId} 
        ORDER BY r.score DESC 
        LIMIT 10
      `;
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch rankings' });
    }
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
