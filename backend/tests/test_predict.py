"""Tests for /predict, /predict/history, /predict/live endpoints."""
import pytest


class TestPredict:
    def test_predict_defaults_returns_200(self, client, auth_headers):
        resp = client.post("/predict", json={}, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        for key in ("mean_prob", "ci_lower", "ci_upper", "ci_width", "triggered"):
            assert key in data
        assert isinstance(data["triggered"], bool)

    def test_mean_prob_in_unit_interval(self, client, auth_headers):
        resp = client.post("/predict", json={}, headers=auth_headers)
        p = resp.json()["mean_prob"]
        assert 0.0 <= p <= 1.0

    def test_ci_ordering(self, client, auth_headers):
        data = client.post("/predict", json={}, headers=auth_headers).json()
        assert data["ci_lower"] <= data["mean_prob"] <= data["ci_upper"]

    def test_dual_threshold_policy_consistent(self, client, auth_headers):
        """triggered=True iff mean>0.5 AND ci_width<0.2."""
        data = client.post("/predict", json={}, headers=auth_headers).json()
        if data["triggered"]:
            assert data["mean_prob"] > 0.5
            assert data["ci_width"] < 0.2
        else:
            assert data["mean_prob"] <= 0.5 or data["ci_width"] >= 0.2

    def test_prediction_persists_in_history(self, client, auth_headers):
        client.post("/predict", json={"hr_delta": 5}, headers=auth_headers)
        hist = client.get("/predict/history", headers=auth_headers).json()
        assert len(hist) >= 1

    # ── Validation ────────────────────────────────────────────
    def test_hr_delta_too_high_422(self, client, auth_headers):
        assert client.post("/predict", json={"hr_delta": 999}, headers=auth_headers).status_code == 422

    def test_hr_delta_too_low_422(self, client, auth_headers):
        assert client.post("/predict", json={"hr_delta": -999}, headers=auth_headers).status_code == 422

    def test_hrv_too_high_422(self, client, auth_headers):
        assert client.post("/predict", json={"hrv_relative": 5.0}, headers=auth_headers).status_code == 422

    def test_tsls_negative_422(self, client, auth_headers):
        assert client.post("/predict", json={"tsls_minutes": -1}, headers=auth_headers).status_code == 422

    def test_tsls_too_large_422(self, client, auth_headers):
        assert client.post("/predict", json={"tsls_minutes": 99999}, headers=auth_headers).status_code == 422

    def test_n_samples_zero_clamped_no_crash(self, client, auth_headers):
        assert client.post("/predict", json={"n_samples": 0}, headers=auth_headers).status_code == 200

    def test_hour_wraps_correctly(self, client, auth_headers):
        assert client.post("/predict", json={"hour": 25}, headers=auth_headers).status_code == 200

    def test_unknown_location_graceful(self, client, auth_headers):
        assert client.post("/predict", json={"location": "narnia"}, headers=auth_headers).status_code == 200

    def test_no_auth_returns_401(self, client):
        assert client.post("/predict", json={}).status_code == 401


class TestPredictLive:
    def test_live_returns_wearable_data(self, client, auth_headers):
        data = client.get("/predict/live", headers=auth_headers).json()
        assert "mean_prob" in data
        assert "wearable" in data
        assert "hr_delta" in data["wearable"]

    def test_live_no_auth_returns_401(self, client):
        assert client.get("/predict/live").status_code == 401
