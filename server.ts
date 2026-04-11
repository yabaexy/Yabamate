import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL;
const isValidDbUrl = dbUrl && dbUrl.startsWith('postgres');

if (!isValidDbUrl) {
  console.error('CRITICAL: DATABASE_URL is not set or is invalid. Please set it in Settings > Secrets.');
}

const sql = neon(isValidDbUrl ? dbUrl : 'postgresql://placeholder:placeholder@localhost:5432/placeholder');

async function initDb() {
  if (!isValidDbUrl) {
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

    await sql`
      CREATE TABLE IF NOT EXISTS muses (
        user_address TEXT PRIMARY KEY,
        name TEXT,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        charm INTEGER DEFAULT 0,
        talent INTEGER DEFAULT 0,
        fanbase INTEGER DEFAULT 0,
        skin_id TEXT DEFAULT 'default',
        background_id TEXT DEFAULT 'default'
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id SERIAL PRIMARY KEY,
        user_address TEXT,
        creator_address TEXT,
        amount REAL,
        is_recurring INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_missions_progress (
        user_address TEXT,
        mission_id TEXT,
        progress INTEGER DEFAULT 0,
        date TEXT,
        completed INTEGER DEFAULT 0,
        PRIMARY KEY (user_address, mission_id, date)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_achievements_unlocked (
        user_address TEXT,
        achievement_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_address, achievement_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_skins_unlocked (
        user_address TEXT,
        skin_id TEXT,
        PRIMARY KEY (user_address, skin_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_interactions (
        id SERIAL PRIMARY KEY,
        from_address TEXT,
        to_address TEXT,
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_stories (
        id SERIAL PRIMARY KEY,
        user_address TEXT,
        level INTEGER,
        title TEXT,
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS muse_generated_images (
        id SERIAL PRIMARY KEY,
        user_address TEXT,
        prompt TEXT,
        image_url TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  // Multer setup for memory storage (to upload to Blob)
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

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
    let avatar_url = undefined;

    try {
      if (req.file) {
        const blob = await put(`avatars/${address}-${Date.now()}${path.extname(req.file.originalname)}`, req.file.buffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        avatar_url = blob.url;
      }

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
      res.json({ success: true, avatar_url });
    } catch (error) {
      console.error('Failed to update user:', error);
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

  // Muse API
  app.get('/api/muse/:address', async (req, res) => {
    const { address } = req.params;
    try {
      const muses = await sql`SELECT * FROM muses WHERE user_address = ${address}`;
      if (muses.length === 0) {
        return res.status(404).json({ error: 'Muse not found' });
      }
      res.json(muses[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch Muse' });
    }
  });

  app.post('/api/muse/sync', async (req, res) => {
    const { address } = req.body;
    try {
      let muses = await sql`SELECT * FROM muses WHERE user_address = ${address}`;
      if (muses.length === 0) {
        await sql`INSERT INTO muses (user_address, name) VALUES (${address}, 'My Muse')`;
        muses = await sql`SELECT * FROM muses WHERE user_address = ${address}`;
      }
      res.json(muses[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync Muse' });
    }
  });

  app.post('/api/muse/update-name', async (req, res) => {
    const { address, name } = req.body;
    try {
      await sql`UPDATE muses SET name = ${name} WHERE user_address = ${address}`;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update Muse name' });
    }
  });

  app.get('/api/muse/missions/:address', async (req, res) => {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      const missions = await sql`
        SELECT * FROM muse_missions_progress 
        WHERE user_address = ${address} AND date = ${today}
      `;
      res.json(missions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch missions' });
    }
  });

  app.post('/api/muse/interact', async (req, res) => {
    const { from, to, message } = req.body;
    const today = new Date().toISOString().split('T')[0];
    try {
      await sql`
        INSERT INTO muse_interactions (from_address, to_address, message) 
        VALUES (${from}, ${to}, ${message})
      `;
      
      // Update mission: "다른 Muse 페이지 방문 및 응원 메시지 남기기 5회"
      const missionId = 'daily_interact';
      const progressResult = await sql`
        SELECT * FROM muse_missions_progress 
        WHERE user_address = ${from} AND mission_id = ${missionId} AND date = ${today}
      `;
      
      if (progressResult.length === 0) {
        await sql`
          INSERT INTO muse_missions_progress (user_address, mission_id, progress, date) 
          VALUES (${from}, mission_id, 1, ${today})
        `;
      } else if (progressResult[0].completed === 0) {
        const newProgress = progressResult[0].progress + 1;
        let completed = 0;
        if (newProgress >= 5) {
          completed = 1;
          // Award YMP
          await sql`UPDATE users SET points = points + 350 WHERE address = ${from}`;
          // Award Muse EXP
          await sql`UPDATE muses SET exp = exp + 50 WHERE user_address = ${from}`;
        }
        await sql`
          UPDATE muse_missions_progress 
          SET progress = ${newProgress}, completed = ${completed} 
          WHERE user_address = ${from} AND mission_id = ${missionId} AND date = ${today}
        `;
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to interact' });
    }
  });

  app.post('/api/sponsorship', async (req, res) => {
    const { address, creatorAddress, amount, isRecurring } = req.body;
    const today = new Date().toISOString().split('T')[0];
    try {
      // 1. Record sponsorship
      await sql`
        INSERT INTO sponsorships (user_address, creator_address, amount, is_recurring) 
        VALUES (${address}, ${creatorAddress}, ${amount}, ${isRecurring ? 1 : 0})
      `;

      // 2. Update Daily Missions
      
      // Mission: "Yabamate에서 후원 3회 이상 하기" -> 450 YMP
      const mCountId = 'daily_sponsor_count';
      const countRes = await sql`
        SELECT * FROM muse_missions_progress 
        WHERE user_address = ${address} AND mission_id = ${mCountId} AND date = ${today}
      `;
      if (countRes.length === 0) {
        await sql`INSERT INTO muse_missions_progress (user_address, mission_id, progress, date) VALUES (${address}, ${mCountId}, 1, ${today})`;
      } else if (countRes[0].completed === 0) {
        const newProgress = countRes[0].progress + 1;
        let completed = 0;
        if (newProgress >= 3) {
          completed = 1;
          await sql`UPDATE users SET points = points + 450 WHERE address = ${address}`;
          await sql`UPDATE muses SET exp = exp + 100 WHERE user_address = ${address}`;
        }
        await sql`UPDATE muse_missions_progress SET progress = ${newProgress}, completed = ${completed} WHERE user_address = ${address} AND mission_id = ${mCountId} AND date = ${today}`;
      }

      // Mission: "누적 후원 금액 250 WYDA 이상" -> 650 YMP
      const mAmountId = 'daily_sponsor_amount';
      const amountRes = await sql`
        SELECT * FROM muse_missions_progress 
        WHERE user_address = ${address} AND mission_id = ${mAmountId} AND date = ${today}
      `;
      if (amountRes.length === 0) {
        await sql`INSERT INTO muse_missions_progress (user_address, mission_id, progress, date) VALUES (${address}, ${mAmountId}, ${amount}, ${today})`;
      } else if (amountRes[0].completed === 0) {
        const newProgress = amountRes[0].progress + amount;
        let completed = 0;
        if (newProgress >= 250) {
          completed = 1;
          await sql`UPDATE users SET points = points + 650 WHERE address = ${address}`;
          await sql`UPDATE muses SET exp = exp + 150 WHERE user_address = ${address}`;
        }
        await sql`UPDATE muse_missions_progress SET progress = ${newProgress}, completed = ${completed} WHERE user_address = ${address} AND mission_id = ${mAmountId} AND date = ${today}`;
      }

      // Mission: "신규 크리에이터에게 첫 후원 하기" -> 550 YMP
      const mNewId = 'daily_new_creator';
      const prevSponsors = await sql`
        SELECT COUNT(*) as count FROM sponsorships 
        WHERE user_address = ${address} AND creator_address = ${creatorAddress} AND timestamp < CURRENT_TIMESTAMP - INTERVAL '1 second'
      `;
      if (parseInt(prevSponsors[0].count) === 0) {
        const newCreatorRes = await sql`
          SELECT * FROM muse_missions_progress 
          WHERE user_address = ${address} AND mission_id = ${mNewId} AND date = ${today}
        `;
        if (newCreatorRes.length === 0 || newCreatorRes[0].completed === 0) {
          await sql`
            INSERT INTO muse_missions_progress (user_address, mission_id, progress, date, completed) 
            VALUES (${address}, ${mNewId}, 1, ${today}, 1)
            ON CONFLICT (user_address, mission_id, date) DO UPDATE SET completed = 1
          `;
          await sql`UPDATE users SET points = points + 550 WHERE address = ${address}`;
          await sql`UPDATE muses SET exp = exp + 120 WHERE user_address = ${address}`;
        }
      }

      // Check for Level Up
      const museRes = await sql`SELECT * FROM muses WHERE user_address = ${address}`;
      if (museRes.length > 0) {
        let { level, exp } = museRes[0];
        while (exp >= level * 100 && level < 100) {
          exp -= level * 100;
          level += 1;
          // Level up bonus stats
          await sql`
            UPDATE muses 
            SET level = ${level}, exp = ${exp}, 
                charm = charm + 5, talent = talent + 5, fanbase = fanbase + 5 
            WHERE user_address = ${address}
          `;
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process sponsorship' });
    }
  });

  app.post('/api/muse/ai/save-image', async (req, res) => {
    const { address, prompt, base64Data } = req.body;
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      const blob = await put(`muse-ai/${address}-${Date.now()}.png`, buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      await sql`
        INSERT INTO muse_generated_images (user_address, prompt, image_url) 
        VALUES (${address}, ${prompt}, ${blob.url})
      `;

      res.json({ success: true, url: blob.url });
    } catch (error) {
      console.error('Failed to save AI image:', error);
      res.status(500).json({ error: 'Failed to save AI image' });
    }
  });

  app.post('/api/muse/ai/save-story', async (req, res) => {
    const { address, level, title, content } = req.body;
    try {
      await sql`
        INSERT INTO muse_stories (user_address, level, title, content) 
        VALUES (${address}, ${level}, ${title}, ${content})
      `;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save story' });
    }
  });

  app.get('/api/muse/ai/history/:address', async (req, res) => {
    const { address } = req.params;
    try {
      const images = await sql`SELECT * FROM muse_generated_images WHERE user_address = ${address} ORDER BY timestamp DESC`;
      const stories = await sql`SELECT * FROM muse_stories WHERE user_address = ${address} ORDER BY timestamp DESC`;
      res.json({ images, stories });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch AI history' });
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
