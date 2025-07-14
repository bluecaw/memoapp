const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    // ユーザーテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);
    console.log("Users table created or already exists.");

    // メモテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS memos (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        "userId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log("Memos table created or already exists.");

  } catch (err) {
    console.error('Error creating tables:', err.stack);
  } finally {
    client.release();
  }
};

// サーバー起動時にテーブル作成を実行
createTables().catch(err => {
    console.error('Failed to initialize database:', err.stack);
    process.exit(1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};