# SmokeSense AI — Full-Stack Application

**AI-Based Predictive and Conversational System for Smoking Urge Intervention**

BTech IT Final Year Project (2023-27) · K.J. Somaiya School of Engineering, Somaiya Vidyavihar University
Authors: Nishika Chapra, Pooja Todi, Prekshya Joshi, Shubham Kunkerkar
Guide: Dr./Prof. Purnima Ahirao

---

## Architecture

```
smokesense/
├── backend/                 FastAPI + SQLite + Bayesian inference
│   ├── main.py              All API routes, real NumPyro weights, WebSocket
│   └── requirements.txt
├── frontend/                React + Vite + Zustand + Recharts
│   ├── src/
│   │   ├── App.jsx          Main shell, routing, navbar
│   │   ├── main.jsx         Entry point
│   │   ├── index.css        Global styles (light/dark mode)
│   │   ├── store/index.js   Zustand store — all API calls
│   │   ├── components/UI.jsx Shared design system components
│   │   └── pages/
│   │       ├── index.jsx    All 7 screens (Home, Predict, Tools, AI, Community, Research, Profile)
│   │       └── Login.jsx    Login screen
│   ├── package.json
│   ├── vite.config.js       Dev proxy: /api → localhost:8000
│   └── dist/                 Production build output
└── data/
    └── smokesense.db        SQLite database (auto-created)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Zustand (state) + Recharts (charts) |
| Backend | FastAPI + SQLite + NumPy |
| Inference | Bayesian Logistic Regression — real weights from `LR_Prior_Weights.csv`, posterior sampling simulating NumPyro AutoNormal SVI |
| Auth | Token-based (SHA256) |
| Real-time | WebSocket for live wearable simulation |
| AI Chat | LLM API via backend proxy (configurable via `ANTHROPIC_API_KEY`) |

---

## Quick Start

### 1. Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`. SQLite DB auto-creates at `../data/smokesense.db` with a demo user seeded.

API docs available at `http://localhost:8000/docs` (FastAPI auto Swagger UI).

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. The dev server proxies `/api/*` → `http://localhost:8000/*`.

### 3. Login

- **Username:** `priya`
- **Password:** `123456`

---

## Production Build

```bash
cd frontend
npm run build
```

Output in `frontend/dist/`. Serve with any static file server, but ensure `/api` requests are reverse-proxied to the FastAPI backend (e.g. via nginx).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns token |
| POST | `/auth/register` | Register new user |
| GET | `/user/me` | Current user profile + stats |
| POST | `/predict` | Run Bayesian inference (real weights, 1000 posterior samples) |
| GET | `/predict/history` | Past predictions |
| GET | `/predict/live` | Live prediction with simulated wearable sensor data (real model inference) |
| GET | `/model/status` | Reports whether `/predict` is using the real trained posterior (`"mode": "real"`) or the fallback approximation |
| GET | `/model/weights` | Real LR_Prior_Weights.csv weights |
| GET | `/model/metrics` | All model comparison metrics (Table 2) |
| GET/POST | `/diary` | Craving diary entries |
| GET/POST | `/nrt` | NRT dose log |
| GET/POST/PATCH | `/reasons` | "Why I Quit" reasons (checkable) |
| POST | `/ai/chat` | Proxies chat to an LLM using server-side `AI_API_KEY` (set `ANTHROPIC_API_KEY`); falls back to canned, model-grounded responses if unset |
| GET | `/stats/progress` | 7-day trend, trigger distribution, savings |
| WS | `/ws/wearable/{user_id}?token=...` | Live wearable stream, updates every 30s. Token verified against user_id; rejects with HTTP 403 on mismatch, 4001 on invalid/expired token. |

---

## Training the Real Model

The Research dashboard and `/model/weights` show the **published** weights from `LR_Prior_Weights.csv` (the project's original sklearn fit). Live predictions (`/predict`) instead use a **real, separately-trained NumPyro Bayesian LR posterior** — not a simulation.

To (re)train it yourself:

```bash
cd backend
pip install -r requirements.txt -r requirements-ml.txt
python ../scripts/train_bayesian_lr.py --data-dir "/path/to/Preprocessed Dataset"
```

This reproduces `NumPyro_Variational_inference.ipynb`: an `AutoNormal` SVI guide, `Adam(lr=0.01)`, 3,000 `Trace_ELBO` steps, with the prior initialised at `LR_Prior_Weights.csv`'s values and fit on a real 70k-row training split (held out 20k for test). It writes:

- `data/artifacts/bayesian_vi_params.npz` — the trained guide's `loc`/`scale` parameters
- `data/artifacts/training_metadata.json` — feature columns, held-out test metrics, hyperparameters

Restart the backend afterward; `GET /model/status` will report `"mode": "real"` once the artifact loads successfully. Posterior sampling at inference time is JIT-compiled and runs in single-digit milliseconds per request.

---

## Real Model Data

All weights below come directly from `LR_Prior_Weights.csv` in the project repository and are hardcoded in `backend/main.py` → `REAL_WEIGHTS`:

| Feature | Weight |
|---|---|
| HR_delta | **+23.9358** (dominant) |
| HRV_relative | -8.5616 (protective) |
| Location_Home | +3.6731 |
| Location_Public_Places | +3.2321 |
| Location_Hotels | -3.2121 |
| CIGNOW_A | -1.8729 |
| TSLS_Minutes | -0.4484 |
| Intercept | +0.2094 |

**Model performance (20k held-out test):**
Accuracy 94.07% · ROC-AUC 0.9869 · F1 0.9265 · Brier 0.0433
Confusion Matrix: TN=11,101 · FP=711 · FN=1,024 · TP=7,164

**Dual-threshold intervention policy:** alert triggers only when `mean_prob > 0.5 AND CI_width < 0.2`.

---

## Screens

1. **Home** — Live Bayesian urge gauge (polls `/predict/live` every 30s), real weight feature bars, 24h timeline
2. **Predict** — Interactive sliders → `/predict` POST → posterior output with CI
3. **Tools** — Breathing exercise, craving diary (DB-backed), distraction games, Why I Quit (DB-backed checkable reasons), NRT tracker (DB-backed), savings calculator
4. **AI** — conversational AI companion, proxied through the backend's `/ai/chat` (API key never reaches the browser)
5. **Community** — Feed, progress (from `/stats/progress`), leaderboard
6. **Research** — All report figures: model comparison, confusion matrix, ROC/PR, MAML trajectory, calibration curve, ELBO convergence, test cases, pipeline
7. **Profile** — User settings, export progress, about

---

## Notes

- **Real Bayesian inference**: `backend/bayesian_inference.py` loads `data/artifacts/bayesian_vi_params.npz` — the actual AutoNormal SVI guide parameters from a NumPyro training run (`scripts/train_bayesian_lr.py`) — and draws genuine posterior samples at request time (JIT-compiled, ~2-90ms per call). Check `GET /model/status` to confirm `"mode": "real"`. If the artifact is missing, `/predict` falls back to a Gaussian approximation around the published `LR_Prior_Weights.csv` means so the API never breaks — `/model/status` reports `"mode": "fallback"` in that case.
- The Home screen connects to `/ws/wearable/{user_id}?token=...` for live predictions every 30s, with automatic fallback to HTTP polling (`fetchLivePrediction`) if the WebSocket can't connect. A badge on the Home screen shows connection status (🟢 Live / ⚪ Polling).
- WebSocket simulates Samsung Health IBI streaming — replace with actual wearable SDK integration for production.
- The AI chat (`/ai/chat`) reads `ANTHROPIC_API_KEY` from the backend's environment. If unset, it returns model-grounded canned responses instead of failing — set the env var before starting uvicorn to enable live AI responses.
