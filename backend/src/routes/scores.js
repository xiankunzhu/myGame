import express from 'express';
import jwt from 'jsonwebtoken';
import { createScore, getTopScores, getUserScores, findUserByUsername } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

router.get('/top', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  res.json({ scores: getTopScores(limit) });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ scores: getUserScores(req.user.id) });
});

router.post('/', authRequired, (req, res) => {
  const { score } = req.body || {};
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'invalid score' });
  }
  const created = createScore({ userId: req.user.id, score: Math.round(score) });
  res.status(201).json({ id: created.id });
});

export default router;
