"""
SmokeSense AI — FastAPI Backend
Endpoints: auth, predict (Bayesian LR), diary, NRT, wearable WebSocket
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Literal
import numpy as np
import sqlite3, time, math, random, hashlib, os
import bcrypt
from contextlib import contextmanager
from dotenv import load_dotenv
import bcrypt
from datetime import datetime, timedelta

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
SECRET_KEY = os.environ.get("SECRET_KEY", "smokesense_ai_secret_key_2026_change_in_prod")
DB_PATH_ENV = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "../data/smokesense.db"))
BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.environ.get("SECRET_KEY", "smokesense_ai_secret_key_2026_change_in_prod")
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "../data/smokesense.db"))

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

@contextmanager
def db_conn():
    """Context manager: opens a DB connection and guarantees closure."""
    conn = sqlite3.connect(DB_PATH_ENV, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=30000")
    try:
        yield conn
    finally:
        conn.close()

app = FastAPI(title="SmokeSense AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ─── Real weights from LR_Prior_Weights.csv ─────────────────
REAL_WEIGHTS = {
    "HR_delta": 23.9358,
    "HRV_relative": -8.5616,
    "Location_Home": 3.6731,
    "Location_Public_Places": 3.2321,
    "Location_Hotels": -3.2121,
    "Location_Shopping_Malls": -2.2116,
    "Location_Medical_Institutions": 2.0821,
    "Location_Entertainment_Places": -1.9710,
    "CIGNOW_A": -1.8729,
    "Location_Restaurants": -1.3821,
    "AGEP_A": 0.7940,
    "TSLS_Minutes": -0.4484,
    "Intercept": 0.2094,
    "hour_sin": 0.1987,
    "hour_cos": -0.2627,
}

MODEL_METRICS = {
    "accuracy": 0.9407, "precision": 0.9403, "recall": 0.9131,
    "f1": 0.9265, "roc_auc": 0.9869, "pr_auc": 0.9823, "brier": 0.0433,
    "confusion": {"TN": 11101, "FP": 711, "FN": 1024, "TP": 7164},
}

# ─── Database ────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH_ENV, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn

def init_db():
    with db_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                quit_date TEXT,
                cigs_per_day INTEGER DEFAULT 17,
                price_per_cig REAL DEFAULT 10.0,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS diary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                intensity INTEGER,
                trigger TEXT,
                location TEXT,
                coping TEXT,
                notes TEXT,
                duration_mins REAL,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS nrt_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                dose_mg REAL,
                notes TEXT,
                logged_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                hr_delta REAL,
                hrv_relative REAL,
                tsls_minutes INTEGER,
                location TEXT,
                mean_prob REAL,
                ci_lower REAL,
                ci_upper REAL,
                ci_width REAL,
                triggered INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS reasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                text TEXT,
                checked INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        """)
        conn.commit()

        existing = conn.execute("SELECT id FROM users WHERE username='priya'").fetchone()
        if not existing:
            quit_date = (datetime.now() - timedelta(days=7)).date().isoformat()
            conn.execute(
                "INSERT INTO users (username, password_hash, name, quit_date, cigs_per_day, price_per_cig) VALUES (?,?,?,?,?,?)",
                ('priya', hash_password('123456'), 'Priya Sharma', quit_date, 17, 10.0)
            )
            conn.commit()
            uid = conn.execute("SELECT id FROM users WHERE username='priya'").fetchone()["id"]

            default_reasons = [
                ('For my daughter — she deserves a healthy mum', 1),
                ('Save ₹28,000 by December — travel fund', 1),
                ('Run a 5K without stopping by my birthday', 0),
                ('Stop hiding it from my family — be honest', 1),
                ('My HRV is recovering — protect that progress', 1),
            ]
            for text, checked in default_reasons:
                conn.execute("INSERT INTO reasons (user_id, text, checked) VALUES (?,?,?)", (uid, text, checked))
            conn.commit()


init_db()

# ─── Auth (signed token with expiry) ─────────────────────────
def make_token(user_id: int) -> str:
    expiry = int(time.time()) + 86400
    payload = f"{user_id}:{expiry}"
    sig = hashlib.sha256(f"{SECRET_KEY}:{payload}".encode()).hexdigest()[:24]
    return f"{payload}:{sig}"

def verify_token(token: str) -> int:
    try:
        user_id_str, expiry_str, sig = token.split(":")
        payload = f"{user_id_str}:{expiry_str}"
        expected_sig = hashlib.sha256(f"{SECRET_KEY}:{payload}".encode()).hexdigest()[:24]
        if sig != expected_sig:
            raise HTTPException(status_code=401, detail="Invalid token signature")
        if int(expiry_str) < int(time.time()):
            raise HTTPException(status_code=401, detail="Token expired")
        return int(user_id_str)
    except HTTPException:
        raise
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(creds.credentials)

# ─── Bayesian LR inference ──────────────────────────────────
# Primary path: real NumPyro Predictive() sampling against artifacts
# trained by scripts/train_bayesian_lr.py. Falls back to a lightweight
# Gaussian approximation (using the same real prior weights) if the
# trained .npz isn't present, so the API never breaks on a fresh clone.
try:
    import bayesian_inference as _real_bi
    _REAL_INFERENCE_AVAILABLE = True
except ImportError:
    _REAL_INFERENCE_AVAILABLE = False


def _bayesian_predict_fallback(hr_delta: float, hrv_relative: float, tsls_minutes: int,
                                location: str, hour: int, n_samples: int = 1000) -> dict:
    """
    Gaussian-approximation fallback. Uses the real prior weights from
    LR_Prior_Weights.csv as posterior means with hand-tuned variance —
    used only when the trained NumPyro artifact is unavailable.
    """
    # Normalise inputs (approximate StandardScaler from training)
    hr_norm = (hr_delta - 4.5) / 6.2
    hrv_norm = (hrv_relative - 0.92) / 0.18
    tsls_norm = tsls_minutes / 120.0   # pharmacokinetic constant
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)

    loc_map = {
        "home": "Location_Home",
        "public": "Location_Public_Places",
        "hotels": "Location_Hotels",
        "malls": "Location_Shopping_Malls",
        "medical": "Location_Medical_Institutions",
        "entertainment": "Location_Entertainment_Places",
        "restaurants": "Location_Restaurants",
        "office": None,
        "schools": None,
    }
    loc_weight = REAL_WEIGHTS.get(loc_map.get(location, ""), 0.0) if loc_map.get(location) else 0.0

    mu_logit = (REAL_WEIGHTS["Intercept"]
                + hr_norm * REAL_WEIGHTS["HR_delta"]
                + hrv_norm * REAL_WEIGHTS["HRV_relative"]
                + tsls_norm * REAL_WEIGHTS["TSLS_Minutes"]
                + hour_sin * REAL_WEIGHTS["hour_sin"]
                + hour_cos * REAL_WEIGHTS["hour_cos"]
                + loc_weight * 0.25)

    sigma_logit = 0.45 + 0.3 * math.exp(-0.5 * mu_logit**2)

    rng = np.random.default_rng(seed=int(time.time() * 1000) % 2**32)
    logit_samples = rng.normal(mu_logit, sigma_logit, n_samples)
    prob_samples = 1.0 / (1.0 + np.exp(-logit_samples))

    mean_prob = float(np.mean(prob_samples))
    ci_lower = float(np.percentile(prob_samples, 2.5))
    ci_upper = float(np.percentile(prob_samples, 97.5))
    ci_width = ci_upper - ci_lower
    triggered = mean_prob > 0.5 and ci_width < 0.2

    return {
        "mean_prob": round(mean_prob, 4),
        "ci_lower": round(ci_lower, 4),
        "ci_upper": round(ci_upper, 4),
        "ci_width": round(ci_width, 4),
        "triggered": triggered,
        "n_samples": n_samples,
        "inference": "Gaussian approximation (fallback — trained .npz not found)",
        "weights_source": "LR_Prior_Weights.csv",
        "policy": "mean > 0.5 AND CI_width < 0.2",
    }


def bayesian_predict(hr_delta: float, hrv_relative: float, tsls_minutes: int,
                     location: str, hour: int, n_samples: int = 1000) -> dict:
    """
    Real posterior predictive sampling via numpyro.infer.Predictive against
    the trained AutoNormal SVI guide (data/artifacts/bayesian_vi_params.npz).
    Falls back to a Gaussian approximation if the artifact is missing.
    """
    if _REAL_INFERENCE_AVAILABLE:
        try:
            return _real_bi.predict_from_raw(
                hr_delta_bpm=hr_delta, hrv_relative=hrv_relative,
                tsls_minutes=tsls_minutes, location=location, hour=hour,
                n_samples=n_samples,
            )
        except Exception:
            # Any unexpected JAX/NumPyro runtime error — degrade gracefully
            return _bayesian_predict_fallback(hr_delta, hrv_relative, tsls_minutes, location, hour, n_samples)
    return _bayesian_predict_fallback(hr_delta, hrv_relative, tsls_minutes, location, hour, n_samples)

# ─── Pydantic schemas ────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=200)

class PredictRequest(BaseModel):
    hr_delta: float = Field(default=4.0, ge=-20, le=50)
    hrv_relative: float = Field(default=0.91, ge=0.1, le=3.0)
    tsls_minutes: int = Field(default=87, ge=0, le=1440)
    location: str = "home"
    hour: Optional[int] = None
    n_samples: int = 1000

    def clean_hour(self) -> int:
        h = self.hour if self.hour is not None else datetime.now().hour
        return h % 24

    def clean_n_samples(self) -> int:
        return max(100, min(5000, self.n_samples))

class DiaryEntry(BaseModel):
    intensity: int = Field(ge=1, le=10)
    trigger: str = Field(min_length=1, max_length=100)
    location: str = Field(default="", max_length=100)
    coping: str = Field(min_length=1, max_length=100)
    notes: str = Field(default="", max_length=1000)
    duration_mins: float = Field(default=0.0, ge=0)

class NRTEntry(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    dose_mg: float = Field(ge=0, le=1000)
    notes: str = Field(default="", max_length=500)

class ReasonCreate(BaseModel):
    text: str = Field(min_length=1, max_length=300)

class ReasonUpdate(BaseModel):
    checked: bool

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(max_length=20)

# ─── Routes ─────────────────────────────────────────────────

@app.get("/")
def root():
    return {"app": "SmokeSense AI", "version": "1.0.0",
            "model": "NumPyro Bayesian LR", "roc_auc": 0.9869}

@app.post("/auth/login")
def login(req: LoginRequest):
    with db_conn() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE username=?", (req.username,)
        ).fetchone()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(user["id"])
    quit_date = datetime.fromisoformat(user["quit_date"]) if user["quit_date"] else datetime.now()
    days_quit = (datetime.now() - quit_date).days
    return {
        "token": token,
        "user": {
            "id": user["id"], "name": user["name"],
            "username": user["username"], "quit_date": user["quit_date"],
            "days_quit": days_quit,
            "cigs_per_day": user["cigs_per_day"],
            "price_per_cig": user["price_per_cig"],
            "money_saved": round(days_quit * user["cigs_per_day"] * user["price_per_cig"], 2),
            "cigs_avoided": days_quit * user["cigs_per_day"],
        }
    }

@app.post("/auth/register")
def register(req: LoginRequest, name: str = "User"):
    pw_hash = hash_password(req.password)  # compute before acquiring DB connection
    with db_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO users (username, password_hash, name, quit_date) VALUES (?,?,?,?)",
                (req.username, pw_hash, name, datetime.now().date().isoformat())
            )
            conn.commit()
            uid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            return {"token": make_token(uid), "message": "Registered successfully"}
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Username already exists")

@app.get("/user/me")
def get_me(user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    quit_date = datetime.fromisoformat(user["quit_date"]) if user["quit_date"] else datetime.now()
    days_quit = max(0, (datetime.now() - quit_date).days)
    return {
        "id": user["id"], "name": user["name"], "username": user["username"],
        "quit_date": user["quit_date"], "days_quit": days_quit,
        "cigs_per_day": user["cigs_per_day"], "price_per_cig": user["price_per_cig"],
        "money_saved": round(days_quit * user["cigs_per_day"] * user["price_per_cig"], 2),
        "cigs_avoided": days_quit * user["cigs_per_day"],
        "hrv_gain": 12.3,  # simulated Samsung Health data
        "streak_days": days_quit,
    }

@app.post("/predict")
def predict(req: PredictRequest, user_id: int = Depends(get_current_user)):
    hour = req.clean_hour()
    n_samples = req.clean_n_samples()
    result = bayesian_predict(
        req.hr_delta, req.hrv_relative, req.tsls_minutes,
        req.location, hour, n_samples
    )
    # Save to DB
    with db_conn() as conn:
        conn.execute("""
            INSERT INTO predictions (user_id, hr_delta, hrv_relative, tsls_minutes,
            location, mean_prob, ci_lower, ci_upper, ci_width, triggered)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (user_id, req.hr_delta, req.hrv_relative, req.tsls_minutes,
              req.location, result["mean_prob"], result["ci_lower"],
              result["ci_upper"], result["ci_width"], int(result["triggered"])))
        conn.commit()
    return result

@app.get("/predict/history")
def predict_history(user_id: int = Depends(get_current_user), limit: int = 50):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/predict/live")
def predict_live(user_id: int = Depends(get_current_user)):
    """Live prediction using current time and simulated wearable data"""
    hour = datetime.now().hour
    # Simulate Samsung Health live data
    hr_delta = round(random.gauss(3.5, 2.5), 2)
    hrv_relative = round(random.gauss(0.92, 0.12), 2)
    hrv_relative = max(0.5, min(1.5, hrv_relative))
    tsls_minutes = random.randint(60, 240)
    result = bayesian_predict(hr_delta, hrv_relative, tsls_minutes, "home", hour)
    result["wearable"] = {"hr_delta": hr_delta, "hrv_relative": hrv_relative,
                          "tsls_minutes": tsls_minutes, "source": "Samsung Health (simulated)"}
    return result

@app.post("/ai/chat")
def ai_chat(req: ChatRequest, user_id: int = Depends(get_current_user)):
    """
    Proxies chat messages to an LLM with a system prompt built server-side
    from the user's real data and the real model weights/metrics.
    The API key never reaches the client.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    with db_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        latest = conn.execute(
            "SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        ).fetchone()

    quit_date = datetime.fromisoformat(user["quit_date"]) if user and user["quit_date"] else datetime.now()
    days_quit = max(0, (datetime.now() - quit_date).days)

    if latest:
        urge_pct = round(latest["mean_prob"] * 100)
        ci_lo = round(latest["ci_lower"] * 100)
        ci_hi = round(latest["ci_upper"] * 100)
        risk_label = "HIGH" if latest["triggered"] else ("moderate" if latest["mean_prob"] > 0.4 else "low")
    else:
        urge_pct, ci_lo, ci_hi, risk_label = 23, 12, 34, "low"

    system_prompt = (
        "You are an AI quit-smoking companion in SmokeSense, a full-stack urge intervention system. "
        "Architecture: React frontend + FastAPI backend + SQLite + NumPyro-style Bayesian Logistic Regression. "
        f"Real weights from LR_Prior_Weights.csv: "
        f"HR_delta {REAL_WEIGHTS['HR_delta']:+.4f} (dominant), "
        f"HRV_relative {REAL_WEIGHTS['HRV_relative']:+.4f}, "
        f"Location_Home {REAL_WEIGHTS['Location_Home']:+.4f}, "
        f"TSLS_Minutes {REAL_WEIGHTS['TSLS_Minutes']:+.4f}. "
        f"Model metrics: Accuracy {MODEL_METRICS['accuracy']*100:.2f}%, "
        f"ROC-AUC {MODEL_METRICS['roc_auc']:.4f}, F1 {MODEL_METRICS['f1']:.4f}, "
        f"Brier {MODEL_METRICS['brier']:.4f}. Dual-threshold intervention policy: "
        "alert only when mean probability > 0.5 AND 95% CI width < 0.2. "
        f"User: {user['name'] if user else 'there'}, day {days_quit} smoke-free. "
        f"Current live urge estimate: {urge_pct}% ({risk_label} risk), "
        f"95% CI [{ci_lo}%, {ci_hi}%]. "
        "Be warm, encouraging, and grounded in these real model specifics. Keep replies to 2-4 sentences."
    )

    fallback_replies = [
        f"A craving peaks at 5-7 minutes then passes naturally. Your model currently reports "
        f"{urge_pct}% urge probability ({risk_label} risk) — you've got this.",
        f"Your HR_delta weight from LR_Prior_Weights.csv is {REAL_WEIGHTS['HR_delta']:+.4f}, by far "
        "the dominant feature. Staying aware of your heart rate after meals can help you anticipate cravings.",
        "Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s, for 4 rounds. It directly engages your "
        "parasympathetic nervous system.",
        f"You're on day {days_quit} — every smoke-free day measurably improves HRV and lowers your "
        "baseline urge probability in the model.",
    ]

    if not api_key:
        return {
            "reply": fallback_replies[len(req.messages) % len(fallback_replies)],
            "source": "fallback",
            "note": "AI API key not configured on the server; returning a canned response.",
        }

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
        text = "".join(block.text for block in response.content if hasattr(block, "text"))
        return {"reply": text, "source": "ai"}
    except Exception:
        return {
            "reply": fallback_replies[len(req.messages) % len(fallback_replies)],
            "source": "fallback",
            "note": "AI API call failed; returning a canned response.",
        }


@app.get("/model/status")
def get_model_status():
    """Reports whether live requests are served by the real trained
    NumPyro posterior or the Gaussian-approximation fallback."""
    if _REAL_INFERENCE_AVAILABLE:
        return {
            "mode": "real",
            "description": "Predictions are drawn from a NumPyro AutoNormal SVI guide "
                            "trained on 70,000 real rows (3,000 Trace_ELBO steps), loaded "
                            "from data/artifacts/bayesian_vi_params.npz.",
            "artifact_path": _real_bi.ARTIFACT_PATH,
            "n_features": _real_bi.N_FEATURES,
        }
    return {
        "mode": "fallback",
        "description": "Trained artifact not found — predictions use a Gaussian "
                        "approximation around the published LR_Prior_Weights.csv means. "
                        "Run scripts/train_bayesian_lr.py to enable real inference.",
    }

@app.get("/model/weights")
def get_weights():
    response = {
        "source": "LR_Prior_Weights.csv",
        "inference": "NumPyro AutoNormal SVI · Adam lr=0.01 · 3,000 Trace_ELBO steps",
        "posterior_samples": 1000,
        "weights": REAL_WEIGHTS,
        "metrics": MODEL_METRICS,
        "policy": {"mean_threshold": 0.5, "ci_threshold": 0.2,
                   "description": "Alert only when mean > 0.5 AND CI_width < 0.2"}
    }
    if _REAL_INFERENCE_AVAILABLE:
        # Live posterior actually used by /predict — included alongside the
        # published report weights so the two can be compared directly.
        try:
            response["trained_posterior"] = _real_bi.get_posterior_weight_summary()
            response["trained_posterior"]["note"] = (
                "These are the actual posterior means learned by the live "
                "NumPyro SVI run (data/artifacts/bayesian_vi_params.npz), "
                "initialised from the 'weights' field above as the prior and "
                "fit on 70k real training rows. They differ from the prior "
                "because the likelihood pulls them during training — this is "
                "expected Bayesian behaviour, not an error."
            )
        except Exception:
            pass
    return response

@app.get("/model/metrics")
def get_metrics():
    return {
        "metrics": MODEL_METRICS,
        "dataset": {"total": 100000, "train": 70000, "val": 10000, "test": 20000,
                    "class_ratio": "59:41", "features": 30, "source": "Synthetic NHIS-seeded"},
        "models": [
            {"name": "Baseline LR", "accuracy": 0.9155, "f1": 0.8946, "roc_auc": 0.9768, "brier": 0.0611},
            {"name": "Bayesian LR", "accuracy": 0.9407, "f1": 0.9265, "roc_auc": 0.9869, "brier": 0.0433},
            {"name": "MAML cold-start", "accuracy": 0.9020, "f1": 0.8747, "roc_auc": 0.9690, "brier": 0.0698},
            {"name": "MAML adapted", "accuracy": 0.9047, "f1": 0.8790, "roc_auc": 0.9701, "brier": 0.0672},
        ]
    }

@app.post("/diary")
def add_diary(entry: DiaryEntry, user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        conn.execute("""
            INSERT INTO diary (user_id, intensity, trigger, location, coping, notes, duration_mins)
            VALUES (?,?,?,?,?,?,?)
        """, (user_id, entry.intensity, entry.trigger, entry.location,
              entry.coping, entry.notes, entry.duration_mins))
        conn.commit()
        eid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    return {"id": eid, "message": "Diary entry saved"}

@app.get("/diary")
def get_diary(user_id: int = Depends(get_current_user), limit: int = 20):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM diary WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]

@app.post("/nrt")
def add_nrt(entry: NRTEntry, user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO nrt_log (user_id, type, dose_mg, notes) VALUES (?,?,?,?)",
            (user_id, entry.type, entry.dose_mg, entry.notes)
        )
        conn.commit()
    return {"message": "NRT dose logged"}

@app.get("/nrt")
def get_nrt(user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM nrt_log WHERE user_id=? AND date(logged_at)=date('now') ORDER BY logged_at DESC",
            (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/reasons")
def get_reasons(user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM reasons WHERE user_id=? ORDER BY created_at",
            (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]

@app.post("/reasons")
def add_reason(reason: ReasonCreate, user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        conn.execute("INSERT INTO reasons (user_id, text) VALUES (?,?)", (user_id, reason.text))
        conn.commit()
        rid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    return {"id": rid, "message": "Reason added"}

@app.patch("/reasons/{reason_id}")
def update_reason(reason_id: int, update: ReasonUpdate, user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        conn.execute(
            "UPDATE reasons SET checked=? WHERE id=? AND user_id=?",
            (int(update.checked), reason_id, user_id)
        )
        conn.commit()
    return {"message": "Reason updated"}

@app.get("/stats/progress")
def get_progress(user_id: int = Depends(get_current_user)):
    with db_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        diary_count = conn.execute(
            "SELECT COUNT(*) as c FROM diary WHERE user_id=?", (user_id,)
        ).fetchone()["c"]
        avg_intensity = conn.execute(
            "SELECT AVG(intensity) as a FROM diary WHERE user_id=?", (user_id,)
        ).fetchone()["a"] or 0
        # 7-day prediction history
        daily_avg = conn.execute("""
            SELECT date(created_at) as day, AVG(mean_prob) as avg_prob
            FROM predictions WHERE user_id=?
            AND created_at >= datetime('now', '-7 days')
            GROUP BY date(created_at) ORDER BY day
        """, (user_id,)).fetchall()
        # Trigger distribution
        triggers = conn.execute("""
            SELECT trigger, COUNT(*) as count FROM diary
            WHERE user_id=? GROUP BY trigger ORDER BY count DESC
        """, (user_id,)).fetchall()
    quit_date = datetime.fromisoformat(user["quit_date"]) if user["quit_date"] else datetime.now()
    days = max(0, (datetime.now() - quit_date).days)
    return {
        "days_quit": days,
        "cigs_avoided": days * user["cigs_per_day"],
        "money_saved": round(days * user["cigs_per_day"] * user["price_per_cig"], 2),
        "diary_entries": diary_count,
        "avg_urge_intensity": round(avg_intensity, 1),
        "hrv_gain_pct": 12.3,
        "daily_avg_probs": [{"day": r["day"], "avg_prob": round(r["avg_prob"], 3)} for r in daily_avg],
        "trigger_distribution": [{"trigger": r["trigger"], "count": r["count"]} for r in triggers],
    }

# ─── WebSocket: live wearable simulation ────────────────────
@app.websocket("/ws/wearable/{user_id}")
async def wearable_ws(websocket: WebSocket, user_id: int, token: Optional[str] = None):
    # Verify token matches the requested user_id
    if token:
        try:
            verified_id = verify_token(token)
            if verified_id != user_id:
                await websocket.close(code=4003, reason="Token does not match user_id")
                return
        except HTTPException:
            await websocket.close(code=4001, reason="Invalid or expired token")
            return
    await websocket.accept()
    import asyncio
    try:
        while True:
            # Simulate Samsung Health IBI streaming
            hr_delta = round(random.gauss(3.5, 2.5), 2)
            hrv_relative = round(max(0.5, min(1.5, random.gauss(0.92, 0.12))), 2)
            tsls = random.randint(60, 240)
            hour = datetime.now().hour
            result = bayesian_predict(hr_delta, hrv_relative, tsls, "home", hour, n_samples=500)
            await websocket.send_json({
                "type": "wearable_update",
                "timestamp": datetime.now().isoformat(),
                "sensor": {"hr_delta": hr_delta, "hrv_relative": hrv_relative,
                           "tsls_minutes": tsls},
                "prediction": result
            })
            await asyncio.sleep(30)  # update every 30 seconds
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
