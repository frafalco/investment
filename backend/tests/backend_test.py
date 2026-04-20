"""Backend API tests for BetsTracker (FastAPI + MongoDB).

Covers: auth, strategies, bets, bonuses, export, WebSocket, authorization.
"""
import os
import time
import asyncio
import json
import uuid
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sports-bet-graph.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY_EMAIL = "giulio.mantioni@hotmail.it"
PRIMARY_PASSWORD = "giulio.mantioni@hotmail.it"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def primary_token(s):
    r = s.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": PRIMARY_PASSWORD})
    assert r.status_code == 200, f"Primary login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture
def auth_headers(primary_token):
    return {"Authorization": f"Bearer {primary_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def ephemeral_user(s):
    """Register a throw-away user used for destructive tests."""
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    pw = "TestPass!1234"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pw, "username": "TESTUSER"})
    assert r.status_code == 200, f"register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": pw, "token": data["token"], "id": data["user"]["id"]}


@pytest.fixture
def eph_headers(ephemeral_user):
    return {"Authorization": f"Bearer {ephemeral_user['token']}", "Content-Type": "application/json"}


# ---------------- health ----------------
def test_health(s):
    r = s.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------------- auth ----------------
class TestAuth:
    def test_login_success(self, s):
        r = s.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": PRIMARY_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 10
        assert data["user"]["email"] == PRIMARY_EMAIL

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, s, auth_headers):
        r = s.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == PRIMARY_EMAIL
        assert "id" in data

    def test_me_without_token(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_duplicate_email(self, s, ephemeral_user):
        r = s.post(f"{API}/auth/register", json={"email": ephemeral_user["email"], "password": "x1234567"})
        assert r.status_code == 400

    def test_change_password_wrong_current(self, s, eph_headers):
        r = s.post(f"{API}/auth/change-password", headers=eph_headers,
                   json={"current_password": "WRONG", "new_password": "Something123!"})
        assert r.status_code == 400

    def test_change_password_correct(self, s, ephemeral_user):
        h = {"Authorization": f"Bearer {ephemeral_user['token']}", "Content-Type": "application/json"}
        new_pw = "NewPass!9876"
        r = s.post(f"{API}/auth/change-password", headers=h,
                   json={"current_password": ephemeral_user["password"], "new_password": new_pw})
        assert r.status_code == 200
        # Login with new pw
        r2 = s.post(f"{API}/auth/login", json={"email": ephemeral_user["email"], "password": new_pw})
        assert r2.status_code == 200
        ephemeral_user["password"] = new_pw
        ephemeral_user["token"] = r2.json()["token"]

    def test_update_profile_username(self, s, ephemeral_user):
        h = {"Authorization": f"Bearer {ephemeral_user['token']}", "Content-Type": "application/json"}
        new_name = "UPDATED_NAME"
        r = s.patch(f"{API}/auth/profile", headers=h, json={"username": new_name})
        assert r.status_code == 200
        assert r.json()["username"] == new_name
        r2 = s.get(f"{API}/auth/me", headers=h)
        assert r2.json()["username"] == new_name


# ---------------- strategies ----------------
class TestStrategies:
    def test_list_requires_auth(self, s):
        r = requests.get(f"{API}/strategies")
        assert r.status_code == 401

    def test_list_only_own(self, s, auth_headers):
        r = s.get(f"{API}/strategies", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_crud_and_cascade(self, s, eph_headers, ephemeral_user):
        # create
        r = s.post(f"{API}/strategies", headers=eph_headers,
                   json={"name": "TEST_STR", "starting_bankroll": 1000, "type": "default"})
        assert r.status_code == 200, r.text
        strat = r.json()
        sid = strat["id"]
        assert strat["name"] == "TEST_STR"
        assert strat["starting_bankroll"] == 1000

        # list
        r = s.get(f"{API}/strategies", headers=eph_headers)
        assert any(x["id"] == sid for x in r.json())

        # update
        r = s.put(f"{API}/strategies/{sid}", headers=eph_headers,
                  json={"name": "TEST_STR2", "starting_bankroll": 2000, "type": "default", "archived": True})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_STR2"
        assert r.json()["archived"] is True

        # create a bet under this strategy for cascade test
        r = s.post(f"{API}/bets", headers=eph_headers, json={
            "strategy_id": sid, "date": "2026-01-10", "event": "TestEvent",
            "odds": 2.0, "unit": 2, "bet": 50, "result": "won"
        })
        assert r.status_code == 200
        bet_id = r.json()["id"]

        # bonus under strategy
        r = s.post(f"{API}/bonuses", headers=eph_headers,
                   json={"strategy_id": sid, "date": "2026-01-10", "amount": 20})
        assert r.status_code == 200

        # delete strategy -> cascades bets and bonuses
        r = s.delete(f"{API}/strategies/{sid}", headers=eph_headers)
        assert r.status_code == 200

        # bets gone
        r = s.get(f"{API}/bets", headers=eph_headers, params={"strategy_id": sid})
        assert r.status_code == 200
        assert not any(b["id"] == bet_id for b in r.json())

        # bonuses gone
        r = s.get(f"{API}/bonuses", headers=eph_headers, params={"strategy_id": sid})
        assert r.json() == []


# ---------------- bets ----------------
class TestBets:
    @pytest.fixture(scope="class")
    def strat_id(self, ephemeral_user):
        h = {"Authorization": f"Bearer {ephemeral_user['token']}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/strategies", headers=h,
                          json={"name": "TEST_BETSTR", "starting_bankroll": 1000, "type": "default"})
        assert r.status_code == 200
        return r.json()["id"]

    def test_profit_won(self, s, eph_headers, strat_id):
        r = s.post(f"{API}/bets", headers=eph_headers, json={
            "strategy_id": strat_id, "date": "2026-01-10", "event": "EvWon",
            "odds": 2.5, "unit": 1, "bet": 100, "result": "won"
        })
        assert r.status_code == 200
        assert r.json()["profit"] == 150.0

    def test_profit_lost(self, s, eph_headers, strat_id):
        r = s.post(f"{API}/bets", headers=eph_headers, json={
            "strategy_id": strat_id, "date": "2026-01-10", "event": "EvLost",
            "odds": 2.0, "unit": 1, "bet": 50, "result": "lost"
        })
        assert r.json()["profit"] == -50.0

    def test_profit_pending_and_void(self, s, eph_headers, strat_id):
        for res in ("pending", "void"):
            r = s.post(f"{API}/bets", headers=eph_headers, json={
                "strategy_id": strat_id, "date": "2026-01-10", "event": f"Ev_{res}",
                "odds": 2.0, "unit": 1, "bet": 10, "result": res
            })
            assert r.status_code == 200
            assert r.json()["profit"] == 0

    def test_update_recalculates_profit(self, s, eph_headers, strat_id):
        r = s.post(f"{API}/bets", headers=eph_headers, json={
            "strategy_id": strat_id, "date": "2026-01-10", "event": "ToUpdate",
            "odds": 2.0, "unit": 1, "bet": 100, "result": "pending"
        })
        bet_id = r.json()["id"]
        assert r.json()["profit"] == 0

        r2 = s.put(f"{API}/bets/{bet_id}", headers=eph_headers, json={
            "strategy_id": strat_id, "date": "2026-01-10", "event": "ToUpdate",
            "odds": 2.0, "unit": 1, "bet": 100, "result": "won"
        })
        assert r2.status_code == 200
        assert r2.json()["profit"] == 100.0

    def test_delete_bet(self, s, eph_headers, strat_id):
        r = s.post(f"{API}/bets", headers=eph_headers, json={
            "strategy_id": strat_id, "date": "2026-01-10", "event": "ToDelete",
            "odds": 2.0, "unit": 1, "bet": 10, "result": "won"
        })
        bet_id = r.json()["id"]
        r2 = s.delete(f"{API}/bets/{bet_id}", headers=eph_headers)
        assert r2.status_code == 200
        r3 = s.get(f"{API}/bets", headers=eph_headers, params={"strategy_id": strat_id})
        assert not any(b["id"] == bet_id for b in r3.json())


# ---------------- bonuses ----------------
class TestBonuses:
    def test_create_list_delete(self, s, eph_headers, ephemeral_user):
        h = eph_headers
        # create a strategy for bonuses
        r = s.post(f"{API}/strategies", headers=h,
                   json={"name": "TEST_BONSTR", "starting_bankroll": 500, "type": "bonus"})
        sid = r.json()["id"]
        r = s.post(f"{API}/bonuses", headers=h,
                   json={"strategy_id": sid, "date": "2026-01-10", "amount": 25, "note": "TESTBONUS"})
        assert r.status_code == 200
        bonus_id = r.json()["id"]
        assert r.json()["amount"] == 25

        # filter by strategy
        r = s.get(f"{API}/bonuses", headers=h, params={"strategy_id": sid})
        assert any(b["id"] == bonus_id for b in r.json())

        # delete
        r = s.delete(f"{API}/bonuses/{bonus_id}", headers=h)
        assert r.status_code == 200
        r = s.get(f"{API}/bonuses", headers=h, params={"strategy_id": sid})
        assert not any(b["id"] == bonus_id for b in r.json())


# ---------------- export ----------------
class TestExport:
    def test_export_structure(self, s, auth_headers):
        r = s.get(f"{API}/export", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ("exported_at", "user", "strategies", "bets", "bonuses"):
            assert k in data
        assert isinstance(data["strategies"], list)
        assert isinstance(data["bets"], list)


# ---------------- authorization ----------------
class TestAuthorization:
    def test_strategies_without_token(self):
        assert requests.get(f"{API}/strategies").status_code == 401

    def test_bets_without_token(self):
        assert requests.get(f"{API}/bets").status_code == 401

    def test_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code == 401


# ---------------- WebSocket ----------------
class TestWebSocket:
    def test_ws_connect_and_broadcast(self, primary_token):
        async def run():
            url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + f"/api/ws?token={primary_token}"
            async with websockets.connect(url, open_timeout=10) as ws:
                # trigger a broadcast via REST create/delete
                headers = {"Authorization": f"Bearer {primary_token}"}
                # create a bonus (simpler, no strategy FK constraint tricky, but we need strat_id)
                strategies = requests.get(f"{API}/strategies", headers=headers).json()
                assert strategies, "no strategies for primary user"
                sid = strategies[0]["id"]
                r = requests.post(f"{API}/bonuses", headers={**headers, "Content-Type": "application/json"},
                                  json={"strategy_id": sid, "date": "2026-01-10", "amount": 1, "note": "WS_TEST"})
                assert r.status_code == 200
                bonus_id = r.json()["id"]
                try:
                    msg_raw = await asyncio.wait_for(ws.recv(), timeout=8)
                    msg = json.loads(msg_raw)
                    assert msg["entity"] == "bonus"
                    assert msg["action"] == "create"
                finally:
                    requests.delete(f"{API}/bonuses/{bonus_id}", headers=headers)
        asyncio.run(run())

    def test_ws_invalid_token(self):
        async def run():
            url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws?token=bad"
            try:
                async with websockets.connect(url, open_timeout=10) as ws:
                    await asyncio.wait_for(ws.recv(), timeout=5)
                    assert False, "should have been closed"
            except Exception:
                assert True
        asyncio.run(run())
