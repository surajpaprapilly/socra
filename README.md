# Socra: General Paper Socratic Tutor

Socra is a premium AI-powered web application that teaches Singapore A-Level students to think critically through the Socratic method. Rather than providing answers, it makes the student's thinking visible and pushes against it, evaluating their inquiry depth and uncovering new perspectives.

## Technology Stack
- **Frontend:** React + Vite + Tailwind CSS (v3)
- **Backend:** Python + FastAPI + Uvicorn
- **AI:** Anthropic Claude API (`claude-3-7-sonnet-20250219` or `claude-sonnet-4-6`)
- **Package Management:** `uv` (Backend), `npm` (Frontend)

## Prerequisites
- Node.js (v18+)
- Python 3.9+
- An Anthropic API key

## Setup Instructions

### 1. Set the Anthropic API Key
Before running the backend, create a `.env` file inside the `backend` directory to store your API key. We have added `python-dotenv` so it will be loaded automatically!

```bash
cd backend
cp .env.example .env
```

Open the newly created `backend/.env` file and insert your API key:
```env
# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# (Optional) Model alias override
# ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 2. Backend Setup
The backend is set up using `uv` for lightning-fast package management and virtual environments. Ensure you run this inside the `backend` folder.

```bash
cd backend
```

Since we use `uv`, the virtual environment is already configured in `.venv`. To activate and run it:
```bash
# Activate the virtual environment
source .venv/bin/activate

# Run the FastAPI server in the active virtual environment
uvicorn main:app --reload --port 8000
```
*(Alternatively, you can run directly without activating: `uv run uvicorn main:app --reload --port 8000`)*

The backend will start on `http://localhost:8000`.

### 3. Frontend Setup
The frontend uses React and Tailwind CSS. Ensure you run this inside the `frontend` folder.

```bash
cd frontend
npm install
npm run dev
```

The frontend will start gracefully, usually at `http://localhost:5173`. Open this URL in your browser to begin the Socratic inquiry.

## Architecture Guidelines
- **System Prompt Engine:** Located in `backend/ai.py`. It rigorously enforces the 4-turn flow and uses JSON injection into a `<metadata>` block for extracting scores and unlocked insights.
- **Real-Time Streaming:** The backend streams Server-Sent Events (SSE) differentiating standard message chunks from metadata payload, giving an immediate, typewriter-like interface.
- **Aesthetics & UI:** The UI uses the "Refined Dark Academia" theme detailed in `tailwind.config.js` and `index.css`. typography leverages Google Fonts (`Playfair Display`, `DM Mono`, `Lora`) paired with `#C8963E` (amber) elements on a precise dark backdrop.
