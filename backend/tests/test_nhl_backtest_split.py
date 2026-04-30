"""NHL Backtest split-progression tests.

Covers the new `progression_mode='split'` logic on /api/backtest/nhl and
/api/backtest/nhl/grid, plus the `tracks` payload in per_team stats.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "giulio.mantioni@hotmail.it"
PASSWORD = "giulio.mantioni@hotmail.it"


@pytest.fixture(scope="module")
def auth():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _boston_body(mode):
    return {
        "season": "2023-2024",
        "start_date": "2023-10-10",
        "teams": ["Boston Bruins"],
        "initial_stake": 1.0,
        "starting_bankroll": 1000.0,
        "max_consecutive_losses": 8,
        "progression_mode": mode,
    }


# --- backward compatibility: single default behaves as before ---
class TestBackwardCompat:
    def test_default_is_single(self, auth):
        body = _boston_body("single")
        body.pop("progression_mode")
        r = requests.post(f"{API}/backtest/nhl", headers=auth, json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["params"]["progression_mode"] == "single"
        # reference numbers for Boston single cap=8
        team = data["per_team"][0]
        assert team["stats"]["total_profit"] == pytest.approx(86.73, abs=0.5)
        assert team["stats"]["max_stake"] == pytest.approx(64.0, abs=0.01)
        assert team["stats"]["busts"] == 0

    def test_single_vs_split_same_bet_count(self, auth):
        """Same bet universe; only stake/progression differ."""
        r1 = requests.post(f"{API}/backtest/nhl", headers=auth, json=_boston_body("single")).json()
        r2 = requests.post(f"{API}/backtest/nhl", headers=auth, json=_boston_body("split")).json()
        assert r1["per_team"][0]["stats"]["total_bets"] == r2["per_team"][0]["stats"]["total_bets"]
        # Profit/max_stake/busts should differ (split has worse outcome for Boston)
        assert r1["per_team"][0]["stats"]["total_profit"] != r2["per_team"][0]["stats"]["total_profit"]


# --- split mode: reference fixture Boston 2023-2024 ---
class TestSplitBostonReference:
    @pytest.fixture(scope="class")
    def resp(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        tok = r.json()["token"]
        r = s.post(f"{API}/backtest/nhl",
                   headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
                   json=_boston_body("split"))
        assert r.status_code == 200, r.text
        return r.json()

    def test_params_echo(self, resp):
        assert resp["params"]["progression_mode"] == "split"

    def test_overall_profit(self, resp):
        team = resp["per_team"][0]
        assert team["stats"]["total_profit"] == pytest.approx(-186.32, abs=1.0)
        assert team["stats"]["max_stake"] == pytest.approx(128.0, abs=0.01)
        assert team["stats"]["busts"] == 1

    def test_tracks_structure(self, resp):
        team = resp["per_team"][0]
        assert "tracks" in team
        tracks = team["tracks"]
        assert set(tracks.keys()) == {"favorite", "underdog"}
        for side in ("favorite", "underdog"):
            t = tracks[side]
            assert t is not None
            for k in ["total_bets", "wins", "losses", "win_rate",
                      "total_staked", "total_profit", "yield_pct",
                      "max_stake", "busts", "max_losing_streak"]:
                assert k in t, f"missing {k} in {side} track"

    def test_fav_track_reference(self, resp):
        fav = resp["per_team"][0]["tracks"]["favorite"]
        assert fav["total_bets"] == 71
        assert fav["busts"] == 1
        assert fav["total_profit"] == pytest.approx(-194.08, abs=1.0)

    def test_udg_track_reference(self, resp):
        udg = resp["per_team"][0]["tracks"]["underdog"]
        assert udg["total_bets"] == 11
        assert udg["total_profit"] == pytest.approx(7.76, abs=0.5)
        # udg had few consecutive losses
        assert udg["busts"] == 0


# --- split mode: per-bet step counts reflect track-specific streaks ---
class TestSplitPerBetLogic:
    def test_step_counts_are_track_specific(self, auth):
        r = requests.post(f"{API}/backtest/nhl", headers=auth, json=_boston_body("split"))
        assert r.status_code == 200
        bets = r.json()["per_team"][0]["bets"]
        fav_streak = 0
        udg_streak = 0
        for b in bets:
            expected_step = (fav_streak if b["is_favorite"] else udg_streak) + 1
            assert b["step"] == expected_step, \
                f"step mismatch at {b['date']}: got {b['step']}, expected {expected_step}"
            # update streak after this bet
            if b["is_favorite"]:
                if b["won"] or b["bust"]:
                    fav_streak = 0
                else:
                    fav_streak += 1
            else:
                if b["won"] or b["bust"]:
                    udg_streak = 0
                else:
                    udg_streak += 1

    def test_stakes_double_only_within_same_track(self, auth):
        r = requests.post(f"{API}/backtest/nhl", headers=auth, json=_boston_body("split"))
        bets = r.json()["per_team"][0]["bets"]
        last_stake = {"fav": 1.0, "udg": 1.0}
        last_won = {"fav": None, "udg": None}
        last_bust = {"fav": False, "udg": False}
        for b in bets:
            key = "fav" if b["is_favorite"] else "udg"
            if last_won[key] is None:
                # first bet of this track: initial stake
                assert b["stake"] == pytest.approx(1.0)
            elif last_won[key] or last_bust[key]:
                assert b["stake"] == pytest.approx(1.0), \
                    f"after win/bust in {key}, should reset; got {b['stake']} at {b['date']}"
            else:
                assert b["stake"] == pytest.approx(last_stake[key] * 2), \
                    f"after loss in {key}, should double {last_stake[key]}->{b['stake']} at {b['date']}"
            last_stake[key] = b["stake"]
            last_won[key] = b["won"]
            last_bust[key] = b["bust"]


# --- split mode: grid endpoint propagates param ---
class TestSplitGrid:
    def test_grid_accepts_split(self, auth):
        body = {
            "season": "2023-2024",
            "start_date": "2023-10-10",
            "teams": ["Boston Bruins"],
            "initial_stake": 1.0,
            "starting_bankroll": 1000.0,
            "caps": [6, 8, 10],
            "progression_mode": "split",
        }
        r = requests.post(f"{API}/backtest/nhl/grid", headers=auth, json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        # response should mention split somewhere in params and have per-cap rows
        assert data["params"]["progression_mode"] == "split"
        assert len(data["rows"]) == 3

    def test_grid_split_differs_from_single(self, auth):
        base = {
            "season": "2023-2024",
            "start_date": "2023-10-10",
            "teams": ["Boston Bruins"],
            "initial_stake": 1.0,
            "starting_bankroll": 1000.0,
            "caps": [8],
        }
        r_single = requests.post(f"{API}/backtest/nhl/grid", headers=auth,
                                 json={**base, "progression_mode": "single"}).json()
        r_split = requests.post(f"{API}/backtest/nhl/grid", headers=auth,
                                json={**base, "progression_mode": "split"}).json()
        # same number of bets, different profit
        assert r_single["rows"][0]["total_bets"] == r_split["rows"][0]["total_bets"]
        assert r_single["rows"][0]["total_profit"] != r_split["rows"][0]["total_profit"]


# --- split mode: tracks still present in single mode (derived from bets) ---
class TestSingleAlsoHasTracks:
    def test_single_mode_still_exposes_tracks(self, auth):
        r = requests.post(f"{API}/backtest/nhl", headers=auth, json=_boston_body("single"))
        assert r.status_code == 200
        team = r.json()["per_team"][0]
        assert "tracks" in team
        # favorite/underdog should be present (non-null) for Boston (has bets of both types)
        assert team["tracks"]["favorite"] is not None
        assert team["tracks"]["underdog"] is not None
