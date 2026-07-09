"""
Real Bayesian inference for SmokeSense AI.

Loads the trained NumPyro AutoNormal SVI guide parameters from
data/artifacts/bayesian_vi_params.npz and draws genuine posterior
samples from the learned variational distribution — not a hand-tuned
approximation.

Artifacts are produced by scripts/train_bayesian_lr.py, which:
  1. Loads the real 100k-row synthetic dataset (Output_Column_Preprocessed.csv)
  2. Initializes the SVI prior at the values in LR_Prior_Weights.csv
     (the project's hand-derived sklearn LogisticRegression coefficients)
  3. Runs 3,000 Trace_ELBO steps with Adam(lr=0.01) — identical
     hyperparameters to NumPyro_Variational_inference.ipynb
  4. Saves the resulting AutoNormal guide's loc/scale parameters

For an AutoNormal guide, the variational posterior IS an independent
Normal(loc, scale) per latent site by construction — that's what
"mean-field Gaussian" means. So sampling alpha ~ N(alpha_loc, alpha_scale)
and beta ~ N(beta_loc, beta_scale) directly is mathematically identical
to numpyro.infer.Predictive(guide, params=...) for this guide type, but
skips NumPyro's trace/substitute machinery — meaningfully faster for a
live request-response API where every endpoint call samples 1000 times.

If the .npz file is missing (e.g. a fresh clone without re-running the
training script), this module raises ImportError at import time, and
backend/main.py falls back to a lightweight Gaussian-approximation
predictor so the API never breaks.
"""
import os
from functools import partial

import numpy as np
import jax
import jax.numpy as jnp
import numpyro
import numpyro.distributions as dist
from numpyro.infer import autoguide

ARTIFACT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "artifacts", "bayesian_vi_params.npz"
)

if not os.path.exists(ARTIFACT_PATH):
    raise ImportError(
        f"Trained artifact not found at {ARTIFACT_PATH}. "
        "Run `python scripts/train_bayesian_lr.py` first."
    )

_artifacts = np.load(ARTIFACT_PATH, allow_pickle=True)
FEATURE_COLUMNS = list(_artifacts["feature_columns"])
N_FEATURES = len(FEATURE_COLUMNS)

# AutoNormal guide's variational parameters — the actual learned posterior
_GUIDE_PARAMS = {
    "alpha_auto_loc": jnp.array(_artifacts["alpha_auto_loc"]),
    "alpha_auto_scale": jnp.array(_artifacts["alpha_auto_scale"]),
    "beta_auto_loc": jnp.array(_artifacts["beta_auto_loc"]),
    "beta_auto_scale": jnp.array(_artifacts["beta_auto_scale"]),
}
PRIOR_ALPHA = float(_artifacts["prior_alpha"])
PRIOR_BETA = np.asarray(_artifacts["prior_beta"])


def _model(X, y=None, prior_alpha=0.0, prior_beta_vec=None):
    """Model definition used at training time (kept for documentation / reproducibility)."""
    n = X.shape[1]
    pb = jnp.array(prior_beta_vec) if prior_beta_vec is not None else jnp.zeros(n)
    alpha = numpyro.sample("alpha", dist.Normal(prior_alpha, 2.0))
    beta = numpyro.sample("beta", dist.Normal(pb, 2.0))
    logits = jnp.matmul(X, beta) + alpha
    with numpyro.plate("data", X.shape[0]):
        numpyro.sample("y", dist.Bernoulli(logits=logits), obs=y)


_guide = autoguide.AutoNormal(_model)


@partial(jax.jit, static_argnames=("n_samples",))
def _sample_logits(x, key, n_samples):
    """JIT-compiled posterior sampling directly from the AutoNormal guide's
    learned Normal(loc, scale) parameters — see module docstring for why
    this is equivalent to Predictive() for this guide type."""
    key_a, key_b = jax.random.split(key)
    alpha_samples = (
        _GUIDE_PARAMS["alpha_auto_loc"]
        + _GUIDE_PARAMS["alpha_auto_scale"] * jax.random.normal(key_a, (n_samples,))
    )
    beta_samples = (
        _GUIDE_PARAMS["beta_auto_loc"]
        + _GUIDE_PARAMS["beta_auto_scale"] * jax.random.normal(key_b, (n_samples, N_FEATURES))
    )
    return beta_samples @ x + alpha_samples


def _warmup():
    """Pre-compile the JIT kernel at import time (one-time ~0.3s cost on
    server startup) so the first real API request isn't penalised."""
    _sample_logits(jnp.zeros(N_FEATURES), jax.random.PRNGKey(0), 1000).block_until_ready()

_warmup()


def build_feature_vector(feature_dict: dict) -> np.ndarray:
    """
    Maps a partial feature dict onto the full N_FEATURES-column vector
    the trained model expects, in the exact column order saved during
    training. Unspecified columns default to 0.
    """
    x = np.zeros(N_FEATURES, dtype=np.float32)
    for i, col in enumerate(FEATURE_COLUMNS):
        if col in feature_dict:
            x[i] = feature_dict[col]
    return x


# ── Raw-unit -> model-unit conversion ──────────────────────────────
# These constants come directly from the original project notebooks:
#   Preprocessing_Codes/Synthetic Generation_HR_HRV.ipynb:
#       df['HR_delta'] = (...).clip(lower=0, upper=25)        # raw bpm
#   Preprocessing_Codes/Preprocessing.ipynb:
#       df['HR_delta'] = (df['HR_delta'] - min) / (max - min)  # -> [0,1]
#       df['TSLS_Minutes'] = (df['TSLS_Minutes'] - min) / 120  # min ~= 0
# HRV_relative is generated directly in [0.5, 1.0] and needs no further scaling.
HR_DELTA_RAW_MIN, HR_DELTA_RAW_MAX = 0.0, 25.0  # bpm, matches .clip(lower=0, upper=25)
TSLS_RAW_MIN, TSLS_DIVISOR = 0.0, 120.0          # minutes


def raw_to_model_units(hr_delta_bpm: float, hrv_relative: float, tsls_minutes: float,
                        location: str, hour: int) -> dict:
    """
    Converts API-facing raw values (bpm, ratio, minutes, location name,
    24h hour) into the normalized feature dict the trained model expects.
    """
    hr_norm = (hr_delta_bpm - HR_DELTA_RAW_MIN) / (HR_DELTA_RAW_MAX - HR_DELTA_RAW_MIN)
    hr_norm = float(np.clip(hr_norm, 0.0, 1.0))
    tsls_norm = max(0.0, (tsls_minutes - TSLS_RAW_MIN)) / TSLS_DIVISOR

    hour_sin = float(np.sin(2 * np.pi * (hour % 24) / 24))
    hour_cos = float(np.cos(2 * np.pi * (hour % 24) / 24))

    features = {
        "HR_delta": hr_norm,
        "HRV_relative": float(np.clip(hrv_relative, 0.5, 1.0)),
        "TSLS_Minutes": tsls_norm,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "AGEP_A": 0.53,    # dataset mean — no per-user age signal at inference time
        "CIGNOW_A": 0.0,   # dataset mean is near 0 (binary "currently smoking" flag)
    }

    loc_col = f"Location_{location}"
    if loc_col in FEATURE_COLUMNS:
        features[loc_col] = 1.0
    else:
        # Also accept the lowercase short names used by the REST API
        short_to_col = {
            "home": "Location_Home", "office": "Location_Office",
            "public": "Location_Public_Places", "restaurants": "Location_Restaurants",
            "entertainment": "Location_Entertainment_Places", "malls": "Location_Shopping_Malls",
            "hotels": "Location_Hotels", "medical": "Location_Medical_Institutions",
            "schools": "Location_Schools",
        }
        mapped = short_to_col.get(location.lower())
        if mapped:
            features[mapped] = 1.0

    return features


def posterior_predict(feature_dict: dict, n_samples: int = 1000, seed: int | None = None) -> dict:
    """
    Draws real posterior samples from the trained AutoNormal guide and
    returns the mean probability + 95% credible interval, computed from
    the actual learned posterior — not a simulated approximation.
    """
    x = jnp.array(build_feature_vector(feature_dict))

    key = jax.random.PRNGKey(seed if seed is not None else int.from_bytes(os.urandom(4), "big"))
    logits = _sample_logits(x, key, n_samples)
    probs_np = np.asarray(jax.nn.sigmoid(logits))

    mean_prob = float(probs_np.mean())
    ci_lower = float(np.percentile(probs_np, 2.5))
    ci_upper = float(np.percentile(probs_np, 97.5))
    ci_width = ci_upper - ci_lower
    triggered = mean_prob > 0.5 and ci_width < 0.2

    return {
        "mean_prob": round(mean_prob, 4),
        "ci_lower": round(ci_lower, 4),
        "ci_upper": round(ci_upper, 4),
        "ci_width": round(ci_width, 4),
        "triggered": triggered,
        "n_samples": n_samples,
        "inference": "NumPyro AutoNormal SVI — real posterior sampling from trained guide params",
        "weights_source": "bayesian_vi_params.npz (trained on 70k rows, prior-initialised from LR_Prior_Weights.csv)",
        "policy": "mean > 0.5 AND CI_width < 0.2",
    }


def predict_from_raw(hr_delta_bpm: float, hrv_relative: float, tsls_minutes: float,
                      location: str, hour: int, n_samples: int = 1000,
                      seed: int | None = None) -> dict:
    """
    Convenience wrapper: takes the API's raw-unit inputs directly
    (bpm, ratio, minutes, location name, hour-of-day) and returns the
    real posterior prediction. This is what backend/main.py calls.
    """
    features = raw_to_model_units(hr_delta_bpm, hrv_relative, tsls_minutes, location, hour)
    return posterior_predict(features, n_samples=n_samples, seed=seed)


def get_posterior_weight_summary() -> dict:
    """Returns the posterior mean weight for every feature, sorted by |magnitude|."""
    beta_loc = np.asarray(_GUIDE_PARAMS["beta_auto_loc"])
    pairs = sorted(zip(FEATURE_COLUMNS, beta_loc.tolist()), key=lambda kv: -abs(kv[1]))
    return {
        "alpha": float(_GUIDE_PARAMS["alpha_auto_loc"]),
        "weights": dict(pairs),
        "top_features": pairs[:10],
    }
