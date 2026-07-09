"""Tests for /auth/login, /auth/register and token security."""
import pytest


class TestLogin:
    def test_valid_login_returns_token(self, client):
        resp = client.post("/auth/login", json={"username": "priya", "password": "123456"})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data and "user" in data
        assert data["user"]["name"] == "Priya Sharma"

    def test_invalid_password_returns_401(self, client):
        resp = client.post("/auth/login", json={"username": "priya", "password": "wrong"})
        assert resp.status_code == 401

    def test_nonexistent_user_returns_401(self, client):
        resp = client.post("/auth/login", json={"username": "ghost", "password": "x"})
        assert resp.status_code == 401

    def test_empty_username_returns_422(self, client):
        resp = client.post("/auth/login", json={"username": "", "password": "123456"})
        assert resp.status_code == 422

    def test_empty_password_returns_422(self, client):
        resp = client.post("/auth/login", json={"username": "priya", "password": ""})
        assert resp.status_code == 422

    def test_missing_body_returns_422(self, client):
        resp = client.post("/auth/login", json={})
        assert resp.status_code == 422


class TestRegister:
    def test_register_new_user(self, client):
        resp = client.post("/auth/register?name=TestUser",
                           json={"username": "newuser_pytest", "password": "securepass"})
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_duplicate_username_returns_400(self, client):
        client.post("/auth/register", json={"username": "dupuser", "password": "pass"})
        resp = client.post("/auth/register", json={"username": "dupuser", "password": "pass"})
        assert resp.status_code == 400

    def test_registered_user_can_login(self, client):
        client.post("/auth/register", json={"username": "logintest", "password": "mypass99"})
        resp = client.post("/auth/login", json={"username": "logintest", "password": "mypass99"})
        assert resp.status_code == 200
        assert "token" in resp.json()


class TestTokenSecurity:
    def test_no_auth_header_returns_401(self, client):
        assert client.get("/user/me").status_code == 401

    def test_forged_old_style_token_returns_401(self, client):
        resp = client.get("/user/me", headers={"Authorization": "Bearer anything_1"})
        assert resp.status_code == 401

    def test_forged_new_style_bad_sig_returns_401(self, client):
        resp = client.get("/user/me", headers={"Authorization": "Bearer 1:9999999999:badsig"})
        assert resp.status_code == 401

    def test_tampered_user_id_returns_401(self, client, auth_token):
        parts = auth_token.split(":")
        tampered = f"999:{parts[1]}:{parts[2]}"
        resp = client.get("/user/me", headers={"Authorization": f"Bearer {tampered}"})
        assert resp.status_code == 401
