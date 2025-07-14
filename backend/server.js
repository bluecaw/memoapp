const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// Database connection
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

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
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.run(sql, [username, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            res.status(201).json({ id: this.lastID, username });
        });
    } catch {
        res.status(500).send();
    }
});

// ログイン
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        if (await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ accessToken });
        } else {
            res.status(400).json({ error: 'Invalid credentials' });
        }
    });
});

// メモの取得 (認証が必要)
app.get('/api/memos', authenticateToken, (req, res) => {
    const sql = 'SELECT * FROM memos WHERE userId = ? ORDER BY updatedAt DESC';
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// メモの作成 (認証が必要)
app.post('/api/memos', authenticateToken, (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    const sql = 'INSERT INTO memos (content, userId) VALUES (?, ?)';
    db.run(sql, [content, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, content, userId: req.user.id });
    });
});

// メモの更新 (認証が必要)
app.put('/api/memos/:id', authenticateToken, (req, res) => {
    const { content } = req.body;
    const { id } = req.params;
    const sql = 'UPDATE memos SET content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?';
    db.run(sql, [content, id, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Memo not found or user not authorized' });
        }
        res.json({ message: 'Memo updated successfully' });
    });
});

// メモの削除 (認証が必要)
app.delete('/api/memos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM memos WHERE id = ? AND userId = ?';
    db.run(sql, [id, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Memo not found or user not authorized' });
        }
        res.status(204).send();
    });
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
