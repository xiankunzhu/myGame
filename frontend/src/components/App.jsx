import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initGame, startGameLoop, stopGameLoop, shoot } from '../game/engine.js';
import { loadTopScores, submitScore, login, register, loadMyScores } from '../game/api.js';

// Simple utility for formatting seconds
function formatTime(s) {
  return s.toString().padStart(2, '0');
}

const GAME_DURATION = 60; // seconds

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null); // holds game state object from engine
  const [isReady, setReady] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('authUser') || '');
  const [authMode, setAuthMode] = useState('login');
  const [topScores, setTopScores] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Initialize Three.js scene once
  useEffect(() => {
    if (!canvasRef.current) return;
    gameRef.current = initGame({
      canvas: canvasRef.current,
      onScore: (newScore) => setScore(newScore),
    });
    setReady(true);
    // initial scoreboard fetch
    refreshTop();
    // Clean up WebGL resources on unmount
    return () => {
      stopGameLoop(gameRef.current);
      gameRef.current?.dispose?.();
    };
  }, []);

  // Game loop / timer management
  useEffect(() => {
    if (!isRunning) return;
    let last = performance.now();
    let acc = 0;
    function tick(now) {
      if (!isRunning) return; // stop if game ended
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      if (acc >= 1) {
        acc -= 1;
        setTimeLeft(t => {
          if (t <= 1) {
            endGame();
            return 0;
          }
          return t - 1;
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isRunning]);

  const beginGame = useCallback(() => {
    if (!gameRef.current) return;
    // Reset state
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setSubmitted(false);
    gameRef.current.reset();
    startGameLoop(gameRef.current);
    setRunning(true);
  }, []);

  function endGame() {
    stopGameLoop(gameRef.current);
    setRunning(false);
  }

  // Shooting handler
  useEffect(() => {
    const handle = (e) => {
      if (e.button !== 0) return;
      if (!isRunning) return;
      const hit = shoot(gameRef.current);
      if (hit) {
        // Score increment handled in engine callback
      }
    };
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [isRunning]);

  async function refreshTop() {
    setLoadingScores(true);
    try {
      const data = await loadTopScores();
      setTopScores(data.scores || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScores(false);
    }
  }

  async function refreshMine() {
    if (!token) return;
    try {
      const data = await loadMyScores(token);
      setMyScores(data.scores || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const u = fd.get('username');
    const p = fd.get('password');
    setError('');
    try {
      const fn = authMode === 'login' ? login : register;
      const { token: tk, username: un } = await fn(u, p);
      localStorage.setItem('authToken', tk);
      localStorage.setItem('authUser', un);
      setToken(tk);
      setUsername(un);
      refreshMine();
    } catch (err) {
      setError(err.message || 'Auth failed');
    }
  }

  function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUsername('');
    setMyScores([]);
  }

  async function submitCurrentScore() {
    if (!token || isRunning || submitted) return;
    try {
      await submitScore(token, score);
      setSubmitted(true);
      refreshTop();
      refreshMine();
    } catch (e) {
      console.error(e);
    }
  }

  // Pointer lock when clicking canvas (start game if not running)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onClick() {
      canvas.requestPointerLock?.();
      if (!isRunning) beginGame();
    }
    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [isRunning, beginGame]);

  return (
    <>
      <canvas ref={canvasRef} />
      <div className="overlay">
        <div>Score: {score}</div>
        <div>Time: {formatTime(timeLeft)}</div>
        {!isRunning && <button onClick={beginGame}>{timeLeft === GAME_DURATION ? 'Start' : 'Restart'}</button>}
        {token ? (
          <div className="panel" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <strong>{username}</strong>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <div className="panel">
            <form onSubmit={handleAuth} style={{ display: 'flex', gap: 4 }}>
              <input name="username" placeholder="user" required minLength={3} />
              <input name="password" placeholder="pass" type="password" required minLength={3} />
              <button type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
              <button type="button" onClick={() => setAuthMode(m => m === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Need account?' : 'Have account?'}</button>
            </form>
            {error && <div style={{ color: 'tomato', fontSize: 12 }}>{error}</div>}
          </div>
        )}
        <button onClick={refreshTop} disabled={loadingScores}>{loadingScores ? 'Loading...' : 'Refresh Top'}</button>
      </div>
      <div className="scoreboard">
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Top Scores</div>
        {topScores.map((s, i) => (
          <div key={i}>{i + 1}. {s.username}: {s.score}</div>
        ))}
        {token && (
          <>
            <hr style={{ margin: '8px 0' }} />
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>My Scores</div>
            {myScores.map((s, i) => <div key={i}>{s.score}</div>)}
            <button style={{ marginTop: 4 }} onClick={refreshMine}>Refresh Mine</button>
          </>
        )}
      </div>
      {!isRunning && timeLeft === 0 && (
        <div className="gameover">
          <div className="panel" style={{ textAlign: 'center' }}>
            <h2>Game Over</h2>
            <p>Final Score: {score}</p>
            {token ? (
              <>
                <button disabled={submitted} onClick={submitCurrentScore}>{submitted ? 'Submitted!' : 'Submit Score'}</button>
              </>
            ) : <p>Login to submit score.</p>}
            <button style={{ marginTop: 8 }} onClick={beginGame}>Play Again</button>
          </div>
        </div>
      )}
      {!isRunning && timeLeft === GAME_DURATION && (
        <div className="centerMessage">
          <h1>FPS Target Practice</h1>
          <p>Click to start. WASD move, Mouse look, Left click shoot targets.</p>
        </div>
      )}
    </>
  );
}
