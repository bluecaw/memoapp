const express = require('express');
require('dotenv').config(); // .envファイルを読み込む
const db = require('./database'); // PostgreSQL接続プールをインポート
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}

// CORS設定
const corsOptions = {
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://your-frontend-name.onrender.com'], // 自分のフロントエンドURLに後で変更
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Endpoints ---

// ユーザー登録
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username';
        const { rows } = await db.query(sql, [username, hashedPassword]);
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') { // unique_violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// ログイン
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = $1';
    try {
        const { rows } = await db.query(sql, [username]);
        const user = rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        if (await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ accessToken });
        } else {
            res.status(400).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// メモの取得 (認証が必要)
app.get('/api/memos', authenticateToken, async (req, res) => {
    const sql = 'SELECT * FROM memos WHERE "userId" = $1 ORDER BY "updatedAt" DESC';
    try {
        const { rows } = await db.query(sql, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// メモの作成 (認証が必要)
app.post('/api/memos', authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    const sql = 'INSERT INTO memos (content, "userId") VALUES ($1, $2) RETURNING *';
    try {
        const { rows } = await db.query(sql, [content, req.user.id]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// メモの更新 (認証が必要)
app.put('/api/memos/:id', authenticateToken, async (req, res) => {
    const { content } = req.body;
    const { id } = req.params;
    const sql = 'UPDATE memos SET content = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 AND "userId" = $3 RETURNING *';
    try {
        const { rows } = await db.query(sql, [content, id, req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Memo not found or user not authorized' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// メモの削除 (認証が必要)
app.delete('/api/memos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM memos WHERE id = $1 AND "userId" = $2';
    try {
        const result = await db.query(sql, [id, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Memo not found or user not authorized' });
        }
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await db.pool.end();
    console.log('Database connection pool closed.');
    process.exit(0);
});