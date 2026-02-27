<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7c3aed,50:3b82f6,100:06b6d4&height=220&section=header&text=Zee-AI&fontSize=80&fontColor=fff&animation=fadeIn&fontAlignY=35&desc=Self-Hosted%20AI%2FLLM%20Platform&descAlignY=55&descSize=20" alt="Zee-AI Banner" width="100%"/>

<br />

<p>
  <img src="https://img.shields.io/badge/Go-1.23-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Ollama-Latest-white?style=for-the-badge&logo=ollama" alt="Ollama"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

<h3>🚀 A powerful, beautiful, self-hosted AI/LLM platform</h3>

<p>
  Run AI models locally. Your data stays on your machine. Forever.
</p>

</div>

---

## ✨ Features

- ⚡ **Streaming Chat** — Real-time token-by-token response via SSE
- 🧠 **Multi-Model Support** — Switch between any Ollama model instantly
- 💬 **Conversation History** — Full chat persistence with SQLite
- 🎨 **Premium Dark UI** — Glassmorphism, smooth animations, responsive design
- 📦 **Model Management** — Pull, list, and delete models from the UI
- 🔒 **100% Privacy** — Everything runs locally, zero data leaves your device
- 🐳 **Docker Ready** — One command to deploy the entire stack
- 📊 **Smart Titles** — AI auto-generates conversation titles
- ⌨️ **Keyboard Shortcuts** — Enter to send, Shift+Enter for newline
- 📋 **Copy Code Blocks** — One-click copy for AI responses
- 🌊 **Markdown Rendering** — Tables, code blocks, lists, and more

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                    Client                        │
│              Next.js 16 + React 19               │
│         Zustand + Framer Motion + SSE            │
└──────────────┬───────────────────────────────────┘
               │ HTTP + SSE
               ▼
┌──────────────────────────────────────────────────┐
│                  Go API Server                   │
│         net/http + SQLite + SSE Streaming         │
└──────────────┬───────────────────────────────────┘
               │ HTTP (Ollama API)
               ▼
┌──────────────────────────────────────────────────┐
│                    Ollama                         │
│         Local LLM Runtime (GPU/CPU)              │
│    Gemma • Llama • Mistral • DeepSeek • etc.     │
└──────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | Next.js 16, React 19, TypeScript | UI Framework |
| **Styling** | Tailwind CSS 4, Framer Motion | Design System & Animations |
| **State** | Zustand | Client State Management |
| **Backend** | Go 1.23, net/http | API Server |
| **Database** | SQLite (WAL mode) | Conversation Persistence |
| **AI Engine** | Ollama | Local LLM Runtime |
| **Streaming** | SSE (Server-Sent Events) | Real-time Token Delivery |
| **Deployment** | Docker, Docker Compose | Containerization |

---

## 🚀 Quick Start

### Prerequisites

- **Go** 1.23+ → [Download](https://go.dev/dl/)
- **Node.js** 20+ & **pnpm** → [Download](https://nodejs.org/)
- **Ollama** → [Download](https://ollama.com/download)

### 1. Start Ollama & Pull a Model

```bash
# Start Ollama server
ollama serve

# Pull a model (in another terminal)
ollama pull gemma3
```

### 2. Clone & Setup

```bash
git clone https://github.com/ifauzeee/Zee-AI.git
cd Zee-AI

# Copy environment file
cp .env.example .env
```

### 3. Run Backend

```bash
# Install Go dependencies
go mod tidy

# Run the API server
go run ./cmd/server/
```

### 4. Run Frontend

```bash
cd web

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

### 5. Open

Visit **http://localhost:3000** and start chatting! 🎉

---

## 🐳 Docker Deployment

```bash
# One command to rule them all
docker compose up -d --build

# Services:
# - Ollama:   http://localhost:11434
# - API:      http://localhost:8080
# - Frontend: http://localhost:3000
```

### GPU Support (NVIDIA)

Uncomment the GPU section in `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

---

## 📁 Project Structure

```
Zee-AI/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── api/
│   │   ├── router.go            # HTTP router & middleware
│   │   └── handlers.go          # API handlers (chat, models, convos)
│   ├── config/
│   │   └── config.go            # Environment config
│   ├── db/
│   │   └── database.go          # SQLite layer
│   └── ollama/
│       └── client.go            # Ollama API client
├── web/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Main page
│   │   │   └── globals.css      # Design system
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Sidebar with convos & models
│   │   │   ├── ChatArea.tsx     # Main chat interface
│   │   │   └── MessageBubble.tsx # Message component
│   │   └── lib/
│   │       ├── api.ts           # API client & types
│   │       └── store.ts         # Zustand store
│   └── Dockerfile               # Frontend Docker
├── .env.example                  # Environment template
├── docker-compose.yml            # Full stack Docker
├── Dockerfile                    # Go API Docker
├── go.mod
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Health check (Ollama + API status) |
| `GET` | `/api/models` | List available Ollama models |
| `POST` | `/api/models/pull` | Pull a new model (SSE progress) |
| `DELETE` | `/api/models/{name}` | Delete a model |
| `GET` | `/api/conversations` | List all conversations |
| `POST` | `/api/conversations` | Create new conversation |
| `GET` | `/api/conversations/{id}` | Get conversation with messages |
| `PATCH` | `/api/conversations/{id}` | Update conversation title |
| `DELETE` | `/api/conversations/{id}` | Delete conversation |
| `POST` | `/api/chat` | Chat with AI (SSE streaming) |
| `GET` | `/api/stats` | Usage statistics |

---

## 🤝 Supported Models

Any model available on [Ollama](https://ollama.com/library) works with Zee-AI:

| Model | Size | Best For |
|:---|:---|:---|
| `gemma3` | 3.9 GB | General purpose, fast |
| `llama3.2` | 2 GB | Lightweight, fast responses |
| `mistral` | 4.1 GB | Balanced quality & speed |
| `deepseek-r1` | 4.7 GB | Reasoning, code |
| `codellama` | 3.8 GB | Code generation |
| `qwen2.5` | 4.7 GB | Multilingual support |

```bash
# Pull any model
ollama pull gemma3
ollama pull deepseek-r1
ollama pull codellama
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Made with ⚡ by **Muhammad Ibnu Fauzi**

[⬆ Back to Top](#zee-ai)

</div>
