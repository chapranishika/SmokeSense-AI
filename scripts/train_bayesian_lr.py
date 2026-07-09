"""
Trains the real Bayesian Logistic Regression model for SmokeSense AI
and saves the artifacts that backend/bayesian_inference.py loads at
server startup.

This reproduces NumPyro_Variational_inference.ipynb from the original
project repository:
  - AutoNormal SVI guide
  - Adam optimizer, lr=0.01
  - 3,000 Trace_ELBO steps
  - Prior initialised at the values in LR_Prior_Weights.csv (the
    project's hand-derived sklearn LogisticRegression coefficients)
  - No StandardScaler — features are used in their native [0,1]-ish
    range, exactly as in the original notebook (confirmed by reading
    Preprocessing_Codes/LR_prior_training.ipynb)

Usage:
    python scripts/train_bayesian_lr.py [--data-dir PATH] [--steps N]

Requires the original project's "Preprocessed Dataset" directory,
containing:
    Output_Column_Preprocessed.csv   (100k-row feature matrix + label)
    LR_Prior_Weights.csv             (prior mean weights)

Outputs (written to data/artifacts/):
    bayesian_vi_params.npz   — AutoNormal guide's loc/scale parameters
    training_metadata.json   — feature columns, metrics, hyperparameters
"""
import argparse
import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score, brier_score_loss,
    precision_score, recall_score, average_precision_score, confusion_matrix,
)

warnings.filterwarnings("ignore")

SEED = 42
TARGET_COLUMN = "Smoke_next_10min"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--data-dir", type=Path,
        default=Path(__file__).parent.parent.parent / "LY-nega-project-main" / "Preprocessed Dataset",
        help="Directory containing Output_Column_Preprocessed.csv and LR_Prior_Weights.csv",
    )
    parser.add_argument("--steps", type=int, default=3000, help="Number of SVI training steps")
    parser.add_argument(
        "--output-dir", type=Path,
        default=Path(__file__).parent.parent / "data" / "artifacts",
        help="Where to save bayesian_vi_params.npz and training_metadata.json",
    )
    args = parser.parse_args()

    data_path = args.data_dir / "Output_Column_Preprocessed.csv"
    prior_path = args.data_dir / "LR_Prior_Weights.csv"
    if not data_path.exists() or not prior_path.exists():
        raise FileNotFoundError(
            f"Expected dataset files not found in {args.data_dir}.\n"
            f"  Need: {data_path.name}, {prior_path.name}\n"
            f"Pass --data-dir pointing at the original project's "
            f"'Preprocessed Dataset' folder."
        )

    args.output_dir.mkdir(parents=True, exist_ok=True)

    import jax
    import jax.numpy as jnp
    import numpyro
    import numpyro.distributions as dist
    from numpyro.infer import SVI, Trace_ELBO, Predictive, autoguide

    np.random.seed(SEED)
    t0 = time.time()

    df = pd.read_csv(data_path)
    X_full = df.drop(columns=[TARGET_COLUMN]).astype(np.float32)
    y_full = df[TARGET_COLUMN].astype(np.float32)
    feature_columns = X_full.columns.tolist()
    n_features = len(feature_columns)
    print(f"[{time.time()-t0:5.1f}s] Loaded {df.shape[0]:,} rows, {n_features} features")

    X_tv, X_test, y_tv, y_test = train_test_split(
        X_full, y_full, test_size=0.20, random_state=SEED, stratify=y_full
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_tv, y_tv, test_size=0.10 / 0.80, random_state=SEED, stratify=y_tv
    )
    X_train_np = X_train.to_numpy(np.float32)
    X_test_np = X_test.to_numpy(np.float32)
    y_train_np = y_train.to_numpy(np.float32)
    y_test_np = y_test.to_numpy(np.float32)
    print(f"[{time.time()-t0:5.1f}s] Split: train={len(y_train_np):,} "
          f"val={len(y_val):,} test={len(y_test_np):,}")

    prior_df = pd.read_csv(prior_path)
    prior_intercept = float(prior_df["Intercept"].iloc[0])
    prior_beta = prior_df[feature_columns].iloc[0].to_numpy(np.float32)
    hr_idx = feature_columns.index("HR_delta")
    print(f"[{time.time()-t0:5.1f}s] Prior loaded — HR_delta prior weight: {prior_beta[hr_idx]:+.4f}")

    def model(X, y=None, prior_alpha=0.0, prior_beta_vec=None):
        n = X.shape[1]
        pb = jnp.array(prior_beta_vec) if prior_beta_vec is not None else jnp.zeros(n)
        alpha = numpyro.sample("alpha", dist.Normal(prior_alpha, 2.0))
        beta = numpyro.sample("beta", dist.Normal(pb, 2.0))
        logits = jnp.matmul(X, beta) + alpha
        with numpyro.plate("data", X.shape[0]):
            numpyro.sample("y", dist.Bernoulli(logits=logits), obs=y)

    X_train_jnp = jnp.array(X_train_np)
    y_train_jnp = jnp.array(y_train_np)

    guide = autoguide.AutoNormal(model)
    optimizer = numpyro.optim.Adam(step_size=0.01)
    svi = SVI(model, guide, optimizer, loss=Trace_ELBO())

    rng_key = jax.random.PRNGKey(SEED)
    svi_state = svi.init(rng_key, X_train_jnp, y_train_jnp,
                          prior_alpha=prior_intercept, prior_beta_vec=prior_beta)
    print(f"[{time.time()-t0:5.1f}s] SVI initialised (JIT compiled). "
          f"Training for {args.steps} steps...")

    losses = []
    for step in range(args.steps):
        svi_state, loss = svi.update(
            svi_state, X_train_jnp, y_train_jnp,
            prior_alpha=prior_intercept, prior_beta_vec=prior_beta,
        )
        losses.append(float(loss))
        if step % 250 == 0 or step == args.steps - 1:
            print(f"[{time.time()-t0:5.1f}s] Step {step:4d} | ELBO: {loss:.2f}")

    bayesian_params = svi.get_params(svi_state)
    print(f"[{time.time()-t0:5.1f}s] Training complete.")

    beta_loc = np.asarray(bayesian_params["beta_auto_loc"])
    top = sorted(zip(feature_columns, beta_loc), key=lambda kv: -abs(kv[1]))[:6]
    print("\nTop 6 posterior weights by |magnitude|:")
    for name, w in top:
        print(f"  {name:30s} {w:+.4f}")

    def posterior_probs(X_np, seed=99, n=1000):
        pred = Predictive(guide, params=bayesian_params, num_samples=n,
                           return_sites=("alpha", "beta"))
        s = pred(jax.random.PRNGKey(seed), jnp.array(X_np), y=jnp.zeros(X_np.shape[0]),
                  prior_alpha=prior_intercept, prior_beta_vec=prior_beta)
        logits = jnp.einsum("nf,sf->sn", jnp.array(X_np), s["beta"]) + s["alpha"][:, None]
        return np.asarray(jax.nn.sigmoid(logits).mean(0))

    bayes_mean = posterior_probs(X_test_np)
    preds = bayes_mean >= 0.5
    metrics = {
        "accuracy": accuracy_score(y_test_np, preds),
        "precision": precision_score(y_test_np, preds),
        "recall": recall_score(y_test_np, preds),
        "f1": f1_score(y_test_np, preds),
        "roc_auc": roc_auc_score(y_test_np, bayes_mean),
        "pr_auc": average_precision_score(y_test_np, bayes_mean),
        "brier": brier_score_loss(y_test_np, bayes_mean),
    }
    tn, fp, fn, tp = confusion_matrix(y_test_np, preds).ravel()
    metrics["confusion"] = {"TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)}

    print(f"\n[{time.time()-t0:5.1f}s] Test set ({len(y_test_np):,} rows):")
    print(f"  Accuracy={metrics['accuracy']:.4f}  F1={metrics['f1']:.4f}  "
          f"ROC-AUC={metrics['roc_auc']:.4f}  Brier={metrics['brier']:.4f}")
    print(f"  Confusion: TN={tn} FP={fp} FN={fn} TP={tp}")

    npz_path = args.output_dir / "bayesian_vi_params.npz"
    np.savez(
        npz_path,
        **{k: np.asarray(v) for k, v in bayesian_params.items()},
        feature_columns=np.array(feature_columns, dtype=object),
        elbo_losses=np.array(losses),
        prior_alpha=prior_intercept,
        prior_beta=prior_beta,
    )
    print(f"\n[{time.time()-t0:5.1f}s] Saved {npz_path} ({npz_path.stat().st_size // 1024} KB)")

    meta_path = args.output_dir / "training_metadata.json"
    with open(meta_path, "w") as f:
        json.dump({
            "feature_columns": feature_columns,
            "n_features": n_features,
            "decision_threshold": 0.5,
            "ci_alert_threshold": 0.2,
            "preprocessing": "none (raw Output_Column_Preprocessed.csv features, "
                              "matches LR_prior_training.ipynb)",
            "bayesian_metrics": metrics,
            "svi_steps": args.steps,
            "svi_lr": 0.01,
            "n_posterior_samples": 1000,
            "train_size": len(y_train_np),
            "val_size": len(y_val),
            "test_size": len(y_test_np),
            "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }, f, indent=2)
    print(f"[{time.time()-t0:5.1f}s] Saved {meta_path}")
    print(f"\n✅ Done in {time.time()-t0:.1f}s. Restart the backend to load the new artifacts.")


if __name__ == "__main__":
    main()
