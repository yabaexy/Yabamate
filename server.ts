import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ✅ 기본 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Neon DB
const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : (() => { throw new Error("DATABASE_URL missing"); }) as any;

// ✅ Multer (Blob 업로드용)
const upload = multer({ storage: multer.memoryStorage() });

// =====================================
// ✅ AI Gateway 함수 (정상 버전)
// =====================================
async function callAIGateway(prompt: any, model: string) {
  const url = process.env.AI_GATEWAY_URL
    ? `${process.env.AI_GATEWAY_URL}/v1beta/models/${model}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}

// =====================================
// ✅ 기본 테스트 API (디버깅용)
// =====================================
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// =====================================
// ✅ USER
// =====================================
app.post('/api/user/sync', async (req, res) => {
  try {
    const { address } = req.body;

    let user = await sql`SELECT * FROM users WHERE address = ${address}`;

    if (user.length === 0) {
      await sql`INSERT INTO users (address, points) VALUES (${address}, 0)`;
      user = await sql`SELECT * FROM users WHERE address = ${address}`;
    }

    res.json(user[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'user sync failed' });
  }
});

// =====================================
// ✅ TIERS (Blob 포함)
// =====================================
app.post('/api/tiers', upload.single('tierImage'), async (req, res) => {
  try {
    const { id, creator_address, name, price, period, description, auto_renew_enabled } = req.body;

    let image_url = '';

    if (req.file) {
      const blob = await put(
        `tiers/${creator_address}-${Date.now()}.png`,
        req.file.buffer,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );
      image_url = blob.url;
    }

    await sql`
      INSERT INTO tiers (id, creator_address, name, price, period, description, image_url, auto_renew_enabled)
      VALUES (${id}, ${creator_address}, ${name}, ${price}, ${period}, ${description}, ${image_url}, ${auto_renew_enabled})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        image_url = CASE WHEN EXCLUDED.image_url <> '' THEN EXCLUDED.image_url ELSE tiers.image_url END
    `;

    res.json({ success: true, image_url });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'tier save failed' });
  }
});

// =====================================
// ✅ AI - 코치
// =====================================
app.post('/api/muse/ai/coach', async (req, res) => {
  try {
    const { museData } = req.body;

    const prompt = {
      contents: [{
        parts: [{
          text: `You are a cute anime idol coach. Muse: ${museData.name}, Level ${museData.level}`
        }]
      }]
    };

    const data = await callAIGateway(prompt, 'gemini-3-flash-preview');

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text
      || "오늘도 화이팅이에요!";

    res.json({ text });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI coach failed' });
  }
});

// =====================================
// ✅ AI 이미지 생성 + Blob 저장
// =====================================
app.post('/api/muse/ai/image', async (req, res) => {
  try {
    const { address, concept } = req.body;

    const prompt = {
      contents: [{
        parts: [{
          text: `anime girl idol, ${concept}, high quality`
        }]
      }]
    };

    const aiRes = await callAIGateway(prompt, 'gemini-2.5-flash-image');

    const base64 =
      aiRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64) throw new Error("no image");

    const buffer = Buffer.from(base64, 'base64');

    const blob = await put(
      `muse/${address}-${Date.now()}.png`,
      buffer,
      {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    res.json({ url: blob.url });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'image failed' });
  }
});

// =====================================
// ✅ Vercel 필수 export
// =====================================
export default app;