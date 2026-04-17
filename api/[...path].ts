import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

let initPromise: Promise<void> | null = null;

async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
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
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_games (
          user_address TEXT,
          game_id TEXT,
          date TEXT,
          PRIMARY KEY (user_address, game_id, date)
        );
      `);

      await pool.query(`
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
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS tiers (
          id TEXT PRIMARY KEY,
          creator_address TEXT,
          name TEXT,
          price REAL,
          period TEXT,
          description TEXT,
          auto_renew_enabled INTEGER DEFAULT 0
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS sponsorships (
          id SERIAL PRIMARY KEY,
          user_address TEXT,
          creator_address TEXT,
          amount REAL,
          is_recurring INTEGER DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS muse_missions_progress (
          user_address TEXT,
          mission_id TEXT,
          progress INTEGER DEFAULT 0,
          date TEXT,
          completed INTEGER DEFAULT 0,
          PRIMARY KEY (user_address, mission_id, date)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS muse_interactions (
          id SERIAL PRIMARY KEY,
          from_address TEXT,
          to_address TEXT,
          message TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS muse_stories (
          id SERIAL PRIMARY KEY,
          user_address TEXT,
          level INTEGER,
          title TEXT,
          content TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS muse_generated_images (
          id SERIAL PRIMARY KEY,
          user_address TEXT,
          prompt TEXT,
          image_url TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    })();
  }
  return initPromise;
}

function json(res: VercelResponse, status: number, data: any) {
  res.status(status).json(data);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pathParts(req: VercelRequest) {
  const raw = req.query.path;
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr.map(String);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();
  } catch (error) {
    console.error('DB init failed:', error);
    return json(res, 500, { error: 'Database init failed' });
  }

  const parts = pathParts(req);
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (parts[0] === 'user' && parts[1] === 'sync' && method === 'POST') {
      const { address } = req.body || {};
      if (!address) return json(res, 400, { error: 'address required' });

      const existing = await pool.query('SELECT * FROM users WHERE address = $1', [address]);
      if (existing.rows.length === 0) {
        await pool.query('INSERT INTO users (address, points) VALUES ($1, 0)', [address]);
      }
      const result = await pool.query('SELECT * FROM users WHERE address = $1', [address]);
      return json(res, 200, result.rows[0]);
    }

    if (parts[0] === 'user' && parts[1]?.startsWith('daily-status') && method === 'GET') {
      const address = parts[2];
      if (!address) return json(res, 400, { error: 'address required' });
      const date = today();
      const rows = await pool.query(
        'SELECT game_id FROM daily_games WHERE user_address = $1 AND date = $2',
        [address, date]
      );
      const played = new Set(rows.rows.map(r => r.game_id));
      return json(res, 200, {
        tetris: played.has('tetris'),
        pong: played.has('pong'),
        backgammon: played.has('backgammon'),
      });
    }

    if (parts[0] === 'user' && parts[1] === 'attendance' && method === 'POST') {
      const { address } = req.body || {};
      if (!address) return json(res, 400, { error: 'address required' });

      const date = today();
      const existing = await pool.query('SELECT last_login_date, consecutive_days, points FROM users WHERE address = $1', [address]);
      if (existing.rows.length === 0) {
        await pool.query('INSERT INTO users (address, points, last_login_date, consecutive_days) VALUES ($1, 100, $2, 1)', [address, date]);
        return json(res, 200, { pointsEarned: 100 });
      }

      const user = existing.rows[0];
      const pointsEarned = user.last_login_date === date ? 0 : 100;
      const consecutive = user.last_login_date === date ? user.consecutive_days : (user.last_login_date ? user.consecutive_days + 1 : 1);

      await pool.query(
        'UPDATE users SET points = points + $1, last_login_date = $2, consecutive_days = $3 WHERE address = $4',
        [pointsEarned, date, consecutive, address]
      );
      return json(res, 200, { pointsEarned });
    }

    if (parts[0] === 'user' && parts[1] === 'spend' && method === 'POST') {
      const { address, amount } = req.body || {};
      if (!address || typeof amount !== 'number') return json(res, 400, { error: 'address and amount required' });

      const result = await pool.query('SELECT points FROM users WHERE address = $1', [address]);
      if (!result.rows.length || result.rows[0].points < amount) {
        return json(res, 400, { error: 'Insufficient points' });
      }

      await pool.query('UPDATE users SET points = points - $1 WHERE address = $2', [amount, address]);
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'game' && parts[1] === 'played' && method === 'POST') {
      const { address, gameId } = req.body || {};
      if (!address || !gameId) return json(res, 400, { error: 'address and gameId required' });

      const date = today();
      const exists = await pool.query(
        'SELECT 1 FROM daily_games WHERE user_address = $1 AND game_id = $2 AND date = $3',
        [address, gameId, date]
      );
      let bonus = 0;
      if (exists.rows.length === 0) {
        await pool.query(
          'INSERT INTO daily_games (user_address, game_id, date) VALUES ($1, $2, $3)',
          [address, gameId, date]
        );
        bonus = 50;
        await pool.query('UPDATE users SET points = points + $1 WHERE address = $2', [bonus, address]);
      }
      return json(res, 200, { bonus });
    }

    if (parts[0] === 'muse' && parts[1] === 'sync' && method === 'POST') {
      const { address } = req.body || {};
      if (!address) return json(res, 400, { error: 'address required' });

      const existing = await pool.query('SELECT * FROM muses WHERE user_address = $1', [address]);
      if (existing.rows.length === 0) {
        await pool.query('INSERT INTO muses (user_address, name) VALUES ($1, $2)', [address, 'New Muse']);
      }
      const result = await pool.query('SELECT * FROM muses WHERE user_address = $1', [address]);
      return json(res, 200, result.rows[0]);
    }

    if (parts[0] === 'muse' && parts[1] === 'missions' && method === 'GET') {
      const address = parts[2];
      if (!address) return json(res, 400, { error: 'address required' });
      const result = await pool.query(
        'SELECT mission_id, progress, completed FROM muse_missions_progress WHERE user_address = $1 ORDER BY mission_id',
        [address]
      );
      return json(res, 200, result.rows);
    }

    if (parts[0] === 'muse' && parts[1] === 'update-name' && method === 'POST') {
      const { address, name } = req.body || {};
      if (!address || !name) return json(res, 400, { error: 'address and name required' });
      await pool.query(
        'UPDATE muses SET name = $1 WHERE user_address = $2',
        [name, address]
      );
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'muse' && parts[1] === 'interact' && method === 'POST') {
      const { from, to, message } = req.body || {};
      if (!from || !to || !message) return json(res, 400, { error: 'from, to, message required' });
      await pool.query(
        'INSERT INTO muse_interactions (from_address, to_address, message) VALUES ($1, $2, $3)',
        [from, to, message]
      );
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'muse' && parts[1] === 'ai' && parts[2] === 'save-image' && method === 'POST') {
      const { address, prompt, base64Data } = req.body || {};
      if (!address || !base64Data) return json(res, 400, { error: 'address and base64Data required' });
      const url = `data:image/png;base64,${base64Data}`;
      await pool.query(
        'INSERT INTO muse_generated_images (user_address, prompt, image_url) VALUES ($1, $2, $3)',
        [address, prompt || '', url]
      );
      return json(res, 200, { url });
    }

    if (parts[0] === 'muse' && parts[1] === 'ai' && parts[2] === 'save-story' && method === 'POST') {
      const { address, level, title, content } = req.body || {};
      if (!address || !title || !content) return json(res, 400, { error: 'address, title, content required' });
      await pool.query(
        'INSERT INTO muse_stories (user_address, level, title, content) VALUES ($1, $2, $3, $4)',
        [address, level ?? 0, title, content]
      );
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'tiers' && parts.length === 1 && method === 'POST') {
      const tier = req.body || {};
      if (!tier.id || !tier.creator_address || !tier.name) return json(res, 400, { error: 'missing tier fields' });
      await pool.query(
        `INSERT INTO tiers (id, creator_address, name, price, period, description, auto_renew_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           creator_address = EXCLUDED.creator_address,
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           period = EXCLUDED.period,
           description = EXCLUDED.description,
           auto_renew_enabled = EXCLUDED.auto_renew_enabled`,
        [tier.id, tier.creator_address, tier.name, tier.price ?? 0, tier.period ?? 'Monthly', tier.description ?? '', tier.auto_renew_enabled ? 1 : 0]
      );
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'tiers' && parts[1] && method === 'GET') {
      const creatorAddress = parts[1];
      const result = await pool.query('SELECT * FROM tiers WHERE creator_address = $1 ORDER BY price ASC', [creatorAddress]);
      return json(res, 200, result.rows);
    }

    if (parts[0] === 'sponsorship' && method === 'POST') {
      const { address, creatorAddress, amount, isRecurring } = req.body || {};
      if (!address || !creatorAddress) return json(res, 400, { error: 'missing fields' });
      await pool.query(
        'INSERT INTO sponsorships (user_address, creator_address, amount, is_recurring) VALUES ($1, $2, $3, $4)',
        [address, creatorAddress, amount ?? 0, isRecurring ? 1 : 0]
      );
      return json(res, 200, { ok: true });
    }

    if (parts[0] === 'muse' && parts.length === 2 && method === 'GET') {
      const address = parts[1];
      const result = await pool.query('SELECT * FROM muses WHERE user_address = $1', [address]);
      return json(res, 200, result.rows[0] ?? null);
    }

    return json(res, 404, { error: 'Not found', path: parts.join('/') });
  } catch (error) {
    console.error('API error:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}
