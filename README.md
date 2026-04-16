# 🎮 Multiplayer Tic-Tac-Toe with Nakama

A **production-ready, server-authoritative** multiplayer Tic-Tac-Toe game built with **Nakama** backend and **React** frontend. Features real-time matchmaking, leaderboards, timed game mode, and a stunning 3D-inspired dark-themed UI.

![Game Preview](https://img.shields.io/badge/Status-Production_Ready-10b981?style=for-the-badge)
![Nakama](https://img.shields.io/badge/Backend-Nakama_3.22-3b82f6?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React_19-8b5cf6?style=for-the-badge)

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API & Configuration](#api--configuration)
- [Testing Multiplayer](#testing-multiplayer)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)

---

## ✨ Features

### Core
- **Server-Authoritative Game Logic** — All moves validated server-side, preventing cheating
- **Real-time Matchmaking** — Automatic player pairing via Nakama matchmaker
- **WebSocket Communication** — Low-latency real-time state sync
- **Device-based Authentication** — Frictionless login with just a nickname

### Bonus
- ✅ **Concurrent Game Support** — Multiple simultaneous isolated game sessions
- ✅ **Leaderboard System** — Global rankings with W/L/D stats and win streaks
- ✅ **Timer-Based Game Mode** — 30-second turn limit with auto-forfeit
- ✅ **Mode Selection** — Classic and Timed matchmaking modes

### UI/UX
- 🌙 Premium dark theme with glassmorphism
- 🎨 3D perspective game board with hover effects
- ✨ Animated SVG X/O marks with draw animations
- 🎉 Confetti celebration on win
- 🔴 Connected particle background
- ⏱️ Circular countdown timer with color transitions
- 📱 Fully responsive mobile-first design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENTS                        │
│   ┌──────────┐    ┌──────────┐                  │
│   │ Player 1 │    │ Player 2 │    ...more       │
│   │  (React) │    │  (React) │                  │
│   └────┬─────┘    └────┬─────┘                  │
│        │               │                         │
│        │  WebSocket     │  WebSocket              │
│        ▼               ▼                         │
├─────────────────────────────────────────────────┤
│              NAKAMA SERVER                       │
│   ┌──────────────────────────────┐              │
│   │     Match Handler (TS)       │              │
│   │  • Validates moves           │              │
│   │  • Checks win conditions     │              │
│   │  • Manages game state        │              │
│   │  • Handles timers            │              │
│   │  • Updates leaderboards      │              │
│   └──────────────────────────────┘              │
│   ┌────────────┐  ┌──────────────┐              │
│   │ Matchmaker │  │  Leaderboard │              │
│   │  Service   │  │   Service    │              │
│   └────────────┘  └──────────────┘              │
│   ┌──────────────────────────────┐              │
│   │         PostgreSQL DB        │              │
│   └──────────────────────────────┘              │
└─────────────────────────────────────────────────┘
```

### Data Flow
1. **Player authenticates** using device ID + enters display name
2. **Matchmaker** queues players by game mode (`classic`/`timed`)
3. **Server creates** an authoritative match for 2 matched players
4. **Players send** move requests (cell position) via WebSocket
5. **Server validates**: correct turn? cell empty? game active?
6. **Server applies** valid moves, checks win conditions
7. **Server broadcasts** updated state to both clients
8. **On game end**: updates leaderboard + player stats in DB

---

## 🛠️ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Backend** | Nakama 3.22 (TypeScript runtime) | Purpose-built for multiplayer games |
| **Database** | PostgreSQL 12 | Reliable, Nakama's default DB |
| **Frontend** | React 19 + Vite 8 | Fast dev experience, modern React |
| **Styling** | Vanilla CSS | Maximum control, no dependencies |
| **Protocol** | WebSocket | Low-latency real-time communication |
| **Container** | Docker + Docker Compose | Consistent dev/prod environments |
| **Auth** | Device ID | Frictionless, no signup required |

---

## 📦 Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))
- **Git** (for cloning the repo)

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LILA-Assingment
```

### 2. Build & Start the Nakama Server

```bash
cd nakama

# Install dependencies (needed for TypeScript compilation)
npm install

# Start Nakama + PostgreSQL via Docker
docker-compose up --build -d
```

Wait ~30 seconds for services to initialize. Verify:
- **Nakama API**: http://localhost:7350
- **Nakama Console**: http://localhost:7351 (admin/password)
- **Nakama gRPC**: http://localhost:7349

### 3. Install & Start the Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

## 🎮 Running Locally

1. Ensure Docker Desktop is running
2. Start Nakama: `cd nakama && docker-compose up -d`
3. Start Frontend: `cd frontend && npm run dev`
4. Open **two browser tabs** at `http://localhost:5173`
5. Enter different nicknames in each tab
6. Select game mode and click "Continue"
7. Both players will be matched and game begins!

---

## 🌐 Deployment

### Backend (Nakama Server)

**Option A: DigitalOcean Droplet**

```bash
# 1. Create a Ubuntu 22.04 droplet (2GB+ RAM)
# 2. SSH into the droplet
ssh root@<droplet-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Clone repo and start Nakama
git clone <repo-url> && cd LILA-Assingment/nakama
docker-compose up --build -d
```

> ⚠️ For production, update `local.yml`:
> - Change console `password` and `signing_key`
> - Set appropriate log levels
> - Configure SSL/TLS

**Option B: AWS EC2 / GCP Compute Engine**
Same Docker Compose approach on a cloud VM with Docker installed.

### Frontend

**Option A: Vercel**

```bash
cd frontend

# Create production .env
echo "VITE_NAKAMA_HOST=<nakama-server-ip>" > .env.production
echo "VITE_NAKAMA_PORT=7350" >> .env.production
echo "VITE_NAKAMA_USE_SSL=false" >> .env.production

# Build and deploy
npm run build
npx vercel deploy dist/
```

**Option B: Netlify / Static Hosting**

```bash
npm run build
# Upload the `dist/` folder to any static hosting
```

---

## ⚙️ API & Configuration

### Nakama Server Endpoints

| Endpoint | Port | Description |
|----------|------|-------------|
| HTTP API | 7350 | REST API + WebSocket |
| gRPC | 7349 | gRPC API |
| Console | 7351 | Admin dashboard |

### WebSocket Message Format

#### OpCodes (Client ↔ Server)

| OpCode | Name | Direction | Description |
|--------|------|-----------|-------------|
| 1 | MOVE | Client → Server | Send move `{position: 0-8}` |
| 2 | STATE | Server → Client | Updated game state |
| 3 | DONE | Server → Client | Game over notification |
| 4 | REJECTED | Server → Client | Invalid move rejection |
| 5 | TIMER | Server → Client | Timer sync (timed mode) |
| 6 | START | Server → Client | Game started notification |

#### Game State Payload (OpCode 2)
```json
{
  "board": [0,0,0,0,0,0,0,0,0],
  "currentTurn": "user-id",
  "marks": {"user-id-1": 1, "user-id-2": 2},
  "names": {"user-id-1": "Alice", "user-id-2": "Bob"},
  "moveCount": 0,
  "deadline": 1713000000,
  "gameMode": 0
}
```

### RPC Functions

| Function | Description |
|----------|-------------|
| `get_leaderboard` | Returns top 20 players with W/L/D stats |
| `get_player_stats` | Returns authenticated player's stats |

### Environment Variables (Frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | Nakama server hostname |
| `VITE_NAKAMA_PORT` | `7350` | Nakama server port |
| `VITE_NAKAMA_USE_SSL` | `false` | Enable SSL for production |

---

## 🧪 Testing Multiplayer

### Local Testing (Two Tabs)
1. Open `http://localhost:5173` in two separate browser tabs
2. Enter a **different nickname** in each tab
3. Select the same game mode in both
4. Click "Continue" in both — matchmaker will pair them
5. Play the game alternating between tabs

### Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Valid move | Board updates, turn switches |
| Click occupied cell | Move rejected, no change |
| Click during opponent's turn | Move rejected |
| Close tab during game | Opponent wins by forfeit |
| Timer runs out (timed) | Opponent wins by timeout |
| 3 in a row | Winner declared, +200 points |
| All 9 cells filled | Draw, +50 points each |
| Play Again | Re-enters matchmaking queue |

### Admin Console
Access the Nakama admin console at `http://localhost:7351`:
- Username: `admin`
- Password: `password`

View active matches, user accounts, leaderboards, and storage data.

---

## 🎨 Design Decisions

### Server-Authoritative Architecture
All game logic runs on the Nakama server. The client is a "dumb" renderer that:
- Sends move **requests** (not moves)
- Receives **validated state** from server
- Cannot manipulate game state

This prevents all forms of client-side cheating.

### Device-Based Authentication
Uses unique browser IDs stored in `localStorage`. This provides:
- **Frictionless UX** — no registration required
- **Persistent identity** — same device = same account
- Display names can be customized without sign-up

### Match Handler Design
The Nakama TypeScript match handler uses all 7 lifecycle functions:
- `matchInit` → Set up empty board, configure tick rate
- `matchJoinAttempt` → Limit to 2 players
- `matchJoin` → Assign X/O, start game
- `matchLeave` → Handle forfeit
- `matchLoop` → Process moves, validate, check win, broadcast
- `matchTerminate` → Cleanup
- `matchSignal` → External signals

### Leaderboard Scoring
- **Win**: +200 points
- **Draw**: +50 points
- **Loss**: +0 points
- Using `INCREMENT` operator so scores accumulate over time

### Timer Implementation
Dual timer approach for robustness:
- **Server-side**: Authoritative deadline checked every tick
- **Client-side**: Local countdown for smooth UI, synced by server broadcasts

---

## 📁 Project Structure

```
LILA-Assingment/
├── nakama/                       # Nakama server-side code
│   ├── src/
│   │   ├── main.ts               # Entry: registers handlers, leaderboard
│   │   ├── match_handler.ts      # Server-authoritative match logic
│   │   ├── match_rpc.ts          # RPC: leaderboard & stats
│   │   └── messages.ts           # OpCodes, interfaces, constants
│   ├── build/                    # Compiled JS (auto-generated)
│   ├── Dockerfile                # Multi-stage build
│   ├── docker-compose.yml        # Nakama + PostgreSQL
│   ├── local.yml                 # Nakama server config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── App.jsx               # Main router + state management
│   │   ├── nakama.js             # Nakama client singleton
│   │   ├── main.jsx              # Entry point
│   │   ├── index.css             # Design system + animations
│   │   ├── screens/
│   │   │   ├── LoginScreen.jsx   # Nickname + mode selection
│   │   │   ├── MatchmakingScreen.jsx
│   │   │   ├── GameScreen.jsx    # 3D board + game UI
│   │   │   └── ResultScreen.jsx  # Winner + leaderboard
│   │   └── components/
│   │       ├── Board3D.jsx       # 3D game board
│   │       ├── XMark.jsx         # Animated X
│   │       ├── OMark.jsx         # Animated O
│   │       ├── Timer.jsx         # Countdown timer
│   │       ├── PlayerCard.jsx    # Player info card
│   │       ├── Leaderboard.jsx   # Leaderboard table
│   │       ├── ParticleBackground.jsx
│   │       └── Confetti.jsx      # Win celebration
│   ├── .env                      # Connection config
│   ├── vite.config.js
│   └── package.json
│
└── README.md                     # This file
```

---

## 📄 License

MIT

---

Built with ❤️ using [Nakama](https://heroiclabs.com/nakama/) and [React](https://react.dev/)
