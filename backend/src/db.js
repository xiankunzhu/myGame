import Database from 'better-sqlite3';
import path from 'node:path';
import crypto from 'node:crypto';

let db;

export function initDb() {
  if (db) return db;
  const dbFile = process.env.DB_FILE || path.resolve(process.cwd(), 'backend', 'data', 'game.db');
  db = new Database(dbFile);
  db.pragma('journal_mode = WAL');

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);

  return db;
}

function ensure() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

export function createUser({ username, passwordHash }) {
  const id = crypto.randomUUID();
  const stmt = ensure().prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
  stmt.run(id, username, passwordHash);
  return { id, username };
}

export function findUserByUsername(username) {
  const stmt = ensure().prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
  return stmt.get(username);
}

export function createScore({ userId, score }) {
  const id = crypto.randomUUID();
  const stmt = ensure().prepare('INSERT INTO scores (id, user_id, score) VALUES (?, ?, ?)');
  stmt.run(id, userId, score);
  return { id, userId, score };
}

export function getTopScores(limit = 10) {
  const stmt = ensure().prepare(`SELECT s.score, s.created_at, u.username
    FROM scores s JOIN users u ON s.user_id = u.id
    ORDER BY s.score DESC, s.created_at ASC
    LIMIT ?`);
  return stmt.all(limit);
}

export function getUserScores(userId) {
  const stmt = ensure().prepare('SELECT score, created_at FROM scores WHERE user_id = ? ORDER BY score DESC LIMIT 25');
  return stmt.all(userId);
}
