"""
Pytest configuration for SmokeSense AI backend tests.
Uses FastAPI TestClient with a temporary SQLite file per session.
"""
import os, tempfile, pytest
from fastapi.testclient import TestClient

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DB_PATH"] = _tmp.name
os.environ["SECRET_KEY"] = "test_secret_key_for_pytest_only"
os.environ["BCRYPT_ROUNDS"] = "4"  # fast rounds for tests; prod uses 12

from main import app, init_db

@pytest.fixture(scope="session")
def client():
    init_db()
    with TestClient(app) as c:
        yield c
    os.unlink(_tmp.name)

@pytest.fixture(scope="session")
def auth_token(client):
    resp = client.post("/auth/login", json={"username":"priya","password":"123456"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]

@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
