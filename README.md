# AI Career Coach

A sharp, personalised career coaching app powered by Google Gemini. Users upload their resume (PDF) and get a focused one-conversation coaching session that surfaces real tensions in their career, suggests 3 tailored paths, and closes with a 30-day action plan.

## Features

- **Resume upload** — PDF parsed and sent directly to Gemini
- **Personalised opener** — AI identifies a specific tension or opportunity from the resume
- **3 path cards** — tailored career paths with fit scores and skill tags
- **Second round** — regenerate 3 entirely different paths if the first don't resonate
- **Action plan** — concrete 30-day steps after choosing a path
- **Streaming responses** — real-time text generation via SSE
- **Session management** — clean close + restart flow

---

## Local Development

### 1. Clone and install

```bash
git clone <your-repo>
cd career-coach
npm install
```

### 2. Set up your API key

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at: https://aistudio.google.com/app/apikey

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

When prompted, set the environment variable:
```
GEMINI_API_KEY = your_key_here
```

### Option B — Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In **Environment Variables**, add:
   - Key: `GEMINI_API_KEY`
   - Value: your Gemini API key
4. Click **Deploy**

---

## Project Structure

```
career-coach/
├── pages/
│   ├── index.js              # Main page — routes between upload and chat
│   ├── _app.js               # Global app wrapper
│   └── api/
│       ├── analyse.js        # POST /api/analyse — reads PDF, returns first AI message
│       └── chat.js           # POST /api/chat — streaming SSE chat endpoint
├── components/
│   ├── UploadScreen.jsx      # PDF upload UI
│   ├── UploadScreen.module.css
│   ├── ChatScreen.jsx        # Full chat interface with streaming
│   ├── ChatScreen.module.css
│   ├── PathCards.jsx         # Career path card grid
│   └── PathCards.module.css
├── lib/
│   └── gemini.js             # Gemini client + system prompt
├── styles/
│   └── globals.css           # CSS variables + reset
├── vercel.json               # Vercel function timeouts
├── next.config.js
└── package.json
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (required) |

---

## Model Used

`gemini-1.5-flash` — fast, capable, handles PDF natively.

To switch to Gemini 1.5 Pro (slower, more capable), update `lib/gemini.js` and both API routes:
```js
model: "gemini-1.5-pro"
```

---

## Conversation Flow

```
Upload PDF
    ↓
/api/analyse  →  Gemini reads PDF  →  Sharp personalised opener
    ↓
User responds with their goal
    ↓
/api/chat  →  3 Path Cards (round 1)
    ↓
[User can request 3 different paths — max 1 regen, 6 paths total]
    ↓
User selects a path
    ↓
30-day action plan  →  Session ends
```
