# Web FPS Target Shooting Game

This project implements the requirements listed in `requirements.txt` by providing a small first-person 3D target shooting web game with a React + Three.js frontend and a Node.js/Express backend for authentication and high scores.

## Features Implemented (Mapping to requirements.txt)
1. 3D game (Three.js WebGL engine replacement for Unity) (1, 22, 26)
2. JavaScript used across stack (2)
3. Player movement (WASD + mouse look), target interaction, scoring (3, 5)
4. First-person camera (4)
5. Shooting targets for points (5)
6. Simple procedural 3D models & basic colors/textures (6)
7. UI overlay: score, timer, game over, auth forms (7, 24)
8. Simple to understand (8)
9. Code comments explaining key logic (9)
10. Lightweight assets & simple scene for smooth performance (10, 15)
11. Build scripts for web distribution (11)
12. Documentation (this README) (12, 13)
13. Basic auth + high score submission & retrieval (18, 19, 20)
14. Responsive layout & cross-browser (21, 23, 25, 27)
15. Sound effect & music hooks (16) (stubbed, easy to extend)
16. Accessibility considerations: high contrast text, adjustable mouse sensitivity (17 partial)

## Tech Stack
Frontend: React, Vite, Three.js, CSS3
Backend: Node.js, Express, better-sqlite3, JWT, bcrypt
Database: SQLite (embedded file DB)

## Directory Structure
```
frontend/        React + Three.js client
  src/
    game/       Core game logic (render loop, targets, input)
    assets/     (place sounds/textures here)
backend/         Express API (auth + scores)
  data/         SQLite DB file auto-created
requirements.txt Original product requirements
README.md        Project documentation
```

## Prerequisites
- Node.js >= 18
- npm >= 9
- macOS / Windows / Linux (desktop browsers)

## Quick Start
Install dependencies:
```
cd backend
npm install
cp .env.example .env   # edit JWT_SECRET
npm run dev            # starts backend on :4000

cd ../frontend
npm install
npm run dev            # starts Vite on :5173
```
Open: http://localhost:5173 (expects API at http://localhost:4000)

Click inside the canvas to lock the pointer and start playing.

## Environment Variables
Backend (.env):
- PORT=4000 (default)
- JWT_SECRET=change_me
- DB_FILE=./data/game.db

Frontend (.env):
- VITE_API_BASE=http://localhost:4000

## Gameplay
- WASD: Move
- Mouse Move: Look
- Left Click: Shoot (raycast forward)
- Score: +10 per target destroyed
- Timer: 60s (configurable) then Game Over screen with option to submit score if logged in.

## Authentication Flow
1. Register (username + password) -> returns JWT
2. Login -> returns JWT
3. Frontend stores token in localStorage (simple approach) and attaches Authorization header for protected endpoints.
4. Submit score -> POST /api/scores

## API (Summary)
Auth:
- POST /api/auth/register {username, password}
- POST /api/auth/login {username, password}
Scores:
- GET /api/scores/top (query ?limit=10)
- POST /api/scores {score} (auth required)
- GET /api/scores/me (auth required)

Headers: Authorization: Bearer <token>

## Building for Production
Frontend:
```
cd frontend
npm run build
```
Outputs static assets to `dist/`.

Backend:
```
cd backend
npm run start
```
Serve `frontend/dist` via a static server (NGINX / CDN) and deploy backend separately. Configure CORS & HTTPS in production.

## Performance & Optimization
- Low poly procedural geometries (BoxGeometry for targets)
- Minimal texture usage
- Frustum culling inherent in Three.js
- Animation loop only minimal allocations
- Deferred audio loading (placeholder hook)

## Extending / TODO
- Add sound assets (place in frontend/src/assets)
- Add mobile touch controls
- Add different target types / difficulty scaling
- Add pagination and anti-cheat server validation
- Add unit tests (Jest) for game utilities & backend routes

## Accessibility
- High contrast overlay text
- Adjustable pointer sensitivity (future)
- Simple controls documented in UI

## Development Notes
- Keep render loop logic in dedicated game classes to avoid React re-renders
- Use small pure modules for math & spawning logic

## License
MIT (adjust if required).

## Credits
- Three.js (MIT)
- React (MIT)
- Icons / future assets: placeholders
