# AI Prompt Intelligence

An AI-powered Prompt Processing Page that extracts structured options from user prompts, handles partial data gracefully, enhances prompts using Groq, and generates cinematic-level video scripts.

## Workflow

```
User Prompt → Extract Options → Partial Data Handling & User Editing → Enhance Prompt (Refill in Prompt Box) → User Edits (Optional) → Generate Cinematic Video Script
```

## Project Structure

```
├── backend/          # Node.js Express API
│   ├── server.js     # Express app with /api/extract, /api/enhance, /api/generate-script
│   ├── package.json
│   └── .env.example
├── frontend/         # React (Vite) app
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── package.json      # Root scripts
```

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **LLM**: Groq API (llama-3.3-70b-versatile)

## Setup

### Prerequisites

- Node.js 18+
- [Groq API Key](https://console.groq.com/keys)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-prompt-intelligence

# Install all dependencies (root + backend + frontend)
npm run install:all

# Or install manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Environment Variables

Create `backend/.env`:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY
```

| Variable       | Description                  |
|----------------|------------------------------|
| `GROQ_API_KEY` | Your Groq API key (required) |
| `PORT`         | Backend port (default: 3001) |

### Local Development

**Option 1: Run both together (recommended)**

```bash
npm run dev
```

This starts the backend (port 3001) and frontend (port 5173) concurrently. The frontend proxies `/api` requests to the backend.

**Option 2: Run separately**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Build

```bash
npm run build:frontend
```

Output is in `frontend/dist/`.

### Production

For production, deploy backend and frontend separately:

- **Frontend**: Deploy `frontend/` to Vercel. Set `VITE_API_URL` to your backend URL (e.g. `https://your-backend.railway.app`).
- **Backend**: Deploy `backend/` to Railway, Render, Fly.io, or similar. Set `GROQ_API_KEY` in the environment.

## API Endpoints

| Method | Endpoint            | Body                          |
|--------|---------------------|-------------------------------|
| POST   | `/api/extract`      | `{ prompt: string }`          |
| POST   | `/api/enhance`      | `{ prompt: string, options }` |
| POST   | `/api/generate-script` | `{ prompt: string }`       |

## License

MIT
