# IELTS Coach

**IELTS Coach** is a full-stack, AI-powered IELTS preparation platform built as a Final Year Project (FYP). It helps learners practice all four IELTS modules — Speaking, Listening, Reading, and Writing — with realistic simulations, instant AI feedback, progress tracking, and interactive learning tools.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication Setup](#authentication-setup)
- [Deployment](#deployment)
- [Scripts & Utilities](#scripts--utilities)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

IELTS Coach combines a modern React frontend with an Express backend to deliver an end-to-end exam preparation experience. Learners can:

- Practice individual skills or run a timed **full IELTS test simulation**
- Receive **AI-generated content** for Reading, Listening, Writing, and Speaking
- Get **band-score estimates** and detailed feedback aligned with official IELTS criteria
- Track progress across devices via **Firebase Authentication** and **Firestore**
- Chat with an **IELTS-focused AI assistant** powered by Google Gemini

The platform is designed for students targeting Band 6.0–9.0 who want structured practice with actionable feedback rather than passive study materials.

---

## Features

### Core Practice Modules

| Module | Highlights |
|--------|------------|
| **Speaking** | Real-time voice conversations with an AI examiner via OpenAI Realtime API and WebSocket fallback; Whisper transcription; TTS responses; band scoring and session summaries |
| **Listening** | AI-generated audio passages with official 4-section structure (40 questions, 30 minutes); section-level scoring |
| **Reading** | AI-generated passages with varied question types; timed practice aligned with IELTS format |
| **Writing** | Task 1 (Academic & General) and Task 2 prompts; hybrid AI + rule-based evaluation across four official criteria |

### Platform Features

- **Dashboard & Performance Analytics** — band trends, study streaks, weekly graphs, and recent activity
- **Full Test Simulator** — sequential Listening → Reading → Writing → Speaking with official time limits
- **MCQ Practice Bank** — timed multiple-choice drills for reading comprehension
- **AI Chatbot** — Gemini-powered IELTS study assistant (grammar, vocabulary, strategies)
- **Unity WebGL Mini Games** — gamified vocabulary and skills practice (`/game`, `/p4game`)
- **Progress Sync** — local storage with Firestore backup for cross-device history
- **Generation Cache** — caches AI-generated practice content for faster repeat visits

### Public Pages

- Landing page, About, Services, Contact
- Email/password and Google Sign-In registration

---

## Tech Stack

### Frontend (`client/`)

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool and dev server |
| React Router 7 | Client-side routing |
| Tailwind CSS 3 | Styling |
| Firebase SDK | Client auth and Firestore |
| Recharts | Performance charts |
| Socket.IO Client | Real-time voice sessions |
| Lucide React | Icons |

### Backend (`server/`)

| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | REST API server |
| Socket.IO | WebSocket voice conversations |
| Firebase Admin | Server-side auth verification & Firestore |
| OpenAI API | Speaking, Writing, Reading, Listening generation & evaluation |
| Google Gemini API | IELTS chatbot |
| JWT | Session tokens |
| Nodemailer | Password reset emails (optional) |

### Infrastructure

- **Frontend hosting:** Vercel (`vercel.json` SPA rewrites)
- **Backend hosting:** Render (or any Node.js host)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (email/password + Google)

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["React Client (Vite)"]
        UI[Pages & Components]
        AuthCtx[Auth Context]
        Progress[Progress Service]
        UI --> AuthCtx
        UI --> Progress
    end

    subgraph Server["Express API + Socket.IO"]
        REST[REST Routes]
        WS[WebSocket Voice Handler]
        REST --> OpenAI
        REST --> Gemini
        REST --> Firestore
        WS --> OpenAI
    end

    subgraph External["External Services"]
        OpenAI[OpenAI API]
        Gemini[Google Gemini]
        Firebase[Firebase Auth + Firestore]
    end

    Client -->|HTTP /api/*| REST
    Client -->|WebSocket| WS
    AuthCtx --> Firebase
    Progress -->|Sync| REST
```

**Request flow (typical practice session):**

1. User authenticates via Firebase; server issues a JWT.
2. Client requests AI-generated content (or loads from generation cache).
3. User completes the module; scores and history are saved locally and synced to Firestore.
4. Dashboard aggregates band scores and activity across modules.

---

## Project Structure

```
FYPProject/
├── client/                     # React frontend
│   ├── public/
│   │   ├── IELTSGame/          # Unity WebGL build (mini game 1)
│   │   └── IELTSGame2/         # Unity WebGL build (4Ps game)
│   ├── src/
│   │   ├── components/         # Shared UI (Layout, Sidebar, Navbar, etc.)
│   │   ├── contexts/           # Auth and app state
│   │   ├── features/           # Feature modules (auth, speaking)
│   │   ├── pages/              # Route-level views
│   │   ├── services/           # API clients, Firebase, progress sync
│   │   └── data/               # Static prompts and passages
│   ├── vite.config.js          # Dev proxy → localhost:5000
│   └── vercel.json             # SPA routing for production
│
└── server/                     # Express backend
    ├── src/
    │   ├── config/             # Firebase Admin setup
    │   ├── controllers/        # Auth handlers
    │   ├── middleware/         # JWT auth middleware
    │   ├── routes/             # API route definitions
    │   └── services/           # Business logic (scoring, generation, etc.)
    ├── scripts/                # Realtime API test utilities
    └── uploads/                # Temporary audio files (runtime)
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+
- A **Firebase** project with Authentication and Firestore enabled
- An **OpenAI API key** (Speaking, Writing, Reading, Listening features)
- A **Google Gemini API key** (Chatbot feature)
- *(Optional)* SMTP credentials for password-reset emails

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd FYPProject
```

### 2. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configure environment variables

Create `server/.env` and `client/.env` using the templates in [Environment Variables](#environment-variables).

### 4. Start the backend

```bash
cd server
npm run dev
```

The API will be available at `http://localhost:5000`. Verify with:

```bash
curl http://localhost:5000/health
```

### 5. Start the frontend

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` requests to the backend automatically.

### 6. Create an account

Navigate to `/register`, sign up with email/password or Google, then access the dashboard at `/dashboard`.

---

## Environment Variables

### Server (`server/.env`)

```env
# Server
PORT=5000
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=                          # Optional comma-separated extra origins

# JWT
JWT_SECRET=your_secure_random_secret
JWT_EXPIRES_IN=7d

# Firebase Admin (service account — must match client Firebase project)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your_firebase_web_api_key

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EVAL_MODEL=gpt-4o                  # Optional; used for writing evaluation
OPENAI_MATCH_MODEL=gpt-4o-mini            # Optional; used for answer matching
OPENAI_REALTIME_MODEL=                    # Optional; OpenAI Realtime model override

# Google Gemini (chatbot)
GEMINI_API_KEY=your_gemini_api_key

# Email (optional — password reset)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_NAME=IELTS Coach
```

### Client (`client/.env`)

```env
# API — omit in local dev to use Vite proxy; required for production builds
VITE_API_BASE_URL=http://localhost:5000

# Google OAuth 2.0 Web Client ID (same Firebase project)
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id

# WebSocket / Realtime (optional overrides)
VITE_SERVER_URL=http://localhost:5000
VITE_USE_OPENAI_REALTIME=true
```

> **Note:** Firebase web config is in `client/src/services/firebase/config.js`. For production, consider moving these values to environment variables.

---

## API Reference

| Prefix | Description |
|--------|-------------|
| `GET /health` | Server and environment health check |
| `GET /test-openai` | OpenAI connectivity test |
| `/api/auth` | Register, login, Google auth, password reset |
| `/api/speaking` | Speaking practice, realtime sessions, scoring |
| `/api/voice` | Voice/realtime session management |
| `/api/writing` | Writing task evaluation |
| `/api/reading` | Reading passage generation and scoring |
| `/api/listening` | Listening test generation and scoring |
| `/api/chatbot` | Gemini-powered IELTS assistant |
| `/api/progress` | User progress sync (Firestore) |
| `/api/generation-cache` | Cached AI-generated practice content |

**WebSocket events** (Socket.IO): `voice-conversation` → `voice-response` / `voice-error`

---

## Authentication Setup

### Firebase Console

1. Create a Firebase project (or use the existing `ielts-coach-351d1` project).
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains:** add `localhost` and your production domain.
4. **Firestore:** create a database (production or test mode).
5. **Project Settings → Service accounts:** generate a private key for the server `.env`.

### Google Sign-In

1. In Firebase Console → Authentication → Google → note the **Web client ID**.
2. Set `VITE_GOOGLE_CLIENT_ID` in `client/.env`.
3. Ensure server Firebase Admin credentials reference the **same** Firebase project.

### Health check validation

After starting the server, visit `/health` and confirm:

```json
{
  "status": "ok",
  "env": {
    "jwtSecret": true,
    "firebaseWebApiKey": true,
    "openaiApiKey": true,
    "firebaseAdmin": {
      "projectId": true,
      "clientEmail": true,
      "privateKey": true
    }
  }
}
```

---

## Deployment

### Frontend (Vercel)

1. Connect the `client/` directory to Vercel.
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables (`VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, etc.).
5. `vercel.json` handles SPA routing.

**Live demo:** [https://fyp-project-red.vercel.app](https://fyp-project-red.vercel.app)

### Backend (Render or similar)

1. Deploy `server/` as a Node.js web service.
2. Set start command: `npm start`
3. Add all server environment variables from [Environment Variables](#environment-variables).
4. Set `FRONTEND_URL` to your Vercel domain.
5. Verify: `https://your-backend.onrender.com/health`

**Production API:** [https://ielts-coach-backend.onrender.com](https://ielts-coach-backend.onrender.com)

---

## Scripts & Utilities

### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express server |
| `npm start` | Start Express server (production) |

### Server test scripts (`server/scripts/`)

| Script | Purpose |
|--------|---------|
| `test-realtime-connect.js` | Test OpenAI Realtime API connectivity |
| `test-realtime-flow.js` | End-to-end realtime session flow |
| `test-realtime-full.js` | Full realtime integration test |
| `test-session-config.js` | Validate session configuration |

Run with:

```bash
cd server
node scripts/test-realtime-flow.js
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Google Sign-In fails | Confirm client and server use the same Firebase project; check `VITE_GOOGLE_CLIENT_ID`; review server logs for `[GoogleAuth]` messages |
| CORS errors | Add your frontend URL to `FRONTEND_URL` or `ALLOWED_ORIGINS` in server `.env` |
| OpenAI features unavailable | Verify `OPENAI_API_KEY` in server `.env`; test via `GET /test-openai` |
| Chatbot returns 500 | Set `GEMINI_API_KEY` in server `.env` |
| Progress not syncing | Ensure user is logged in; check Firestore rules and `/api/progress` responses |
| Speaking audio issues | Allow microphone permissions; check WebSocket connection to backend |

---

## License

This project was developed as a Final Year Project (FYP). All rights reserved by the project authors unless otherwise stated.

---

<p align="center">
  <strong>IELTS Coach</strong> — Your smart path to a higher band.
</p>
