"""NHL Backtest API tests for BetsTracker.

Covers: /api/nhl/seasons, /api/nhl/teams, /api/nhl/season-range, /api/backtest/nhl
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://1e8bb98f-9e9c-40bf-9610-028a99df7277.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY_EMAIL = "giulio.mantioni@hotmail.it"
PRIMARY_PASSWORD = "giulio.mantioni@hotmail.it"

EXPECTED_SEASONS = ["2025-2026", "2024-2025", "2023-2024", "2022-2023", "2021-2022"]


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": PRIMARY_EMAIL, "password": PRIMARY_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# -------- /api/nhl/seasons --------
class TestSeasons:
    def test_seasons_requires_auth(self):
        r = requests.get(f"{API}/nhl/seasons")
        assert r.status_code == 401

    def test_seasons_list_desc(self, s, auth):
        r = s.get(f"{API}/nhl/seasons", headers=auth)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # all expected seasons must be present
        for sea in EXPECTED_SEASONS:
            assert sea in data, f"missing season {sea}"
        # sorted descending
        assert data == sorted(data, reverse=True)


# -------- /api/nhl/teams --------
class TestTeams:
    def test_teams_requires_auth(self):
        r = requests.get(f"{API}/nhl/teams", params={"season": "2023-2024"})
        assert r.status_code == 401

    def test_teams_count_and_sorted(self, s, auth):
        r = s.get(f"{API}/nhl/teams", headers=auth, params={"season": "2023-2024"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 32, f"expected 32 NHL teams, got {len(data)}"
        assert data == sorted(data), "teams must be sorted alphabetically"
        for t in ["Boston Bruins", "Colorado Avalanche", "Edmonton Oilers", "New York Rangers"]:
            assert t in data, f"missing {t}"


# -------- /api/nhl/season-range --------
class TestSeasonRange:
    def test_range_requires_auth(self):
        r = requests.get(f"{API}/nhl/season-range", params={"season": "2023-2024"})
        assert r.status_code == 401

    def test_range_returns_min_max(self, s, auth):
        r = s.get(f"{API}/nhl/season-range", headers=auth, params={"season": "2023-2024"})
        assert r.status_code == 200
        data = r.json()
        assert "min" in data and "max" in data
        assert data["min"] is not None and data["max"] is not None
        assert data["min"] <= data["max"]
        # NHL 2023-2024 starts in October 2023
        assert data["min"].startswith("2023-")
        assert data["max"].startswith("2024-")


# -------- /api/backtest/nhl --------
class TestBacktest:
    def test_requires_auth(self):
        r = requests.post(f"{API}/backtest/nhl", json={
            "season": "2023-2024", "start_date": "2023-10-10",
            "teams": ["Boston Bruins"], "initial_stake": 1, "starting_bankroll": 1000, "max_consecutive_losses": 8
        })
        assert r.status_code == 401

    def test_zero_teams_400(self, s, auth):
        r = s.post(f"{API}/backtest/nhl", headers=auth, json={
            "season": "2023-2024", "start_date": "2023-10-10",
            "teams": [], "initial_stake": 1, "starting_bankroll": 1000, "max_consecutive_losses": 8
        })
        assert r.status_code == 400

    def test_more_than_4_teams_400(self, s, auth):
        r = s.post(f"{API}/backtest/nhl", headers=auth, json={
            "season": "2023-2024", "start_date": "2023-10-10",
            "teams": ["Boston Bruins", "Colorado Avalanche", "Edmonton Oilers", "New York Rangers", "Toronto Maple Leafs"],
            "initial_stake": 1, "starting_bankroll": 1000, "max_consecutive_losses": 8
        })
        assert r.status_code == 400

    def test_full_response_shape_and_aggregate(self, s, auth):
        body = {
            "season": "2023-2024",
            "start_date": "2023-10-10",
            "teams": ["Boston Bruins", "Colorado Avalanche", "Edmonton Oilers", "New York Rangers"],
            "initial_stake": 1.0,
            "starting_bankroll": 1000.0,
            "max_consecutive_losses": 8,
        }
        r = s.post(f"{API}/backtest/nhl", headers=auth, json=body)
        assert r.status_code == 200, r.text
        data = r.json()

        # top-level structure
        assert set(["params", "per_team", "aggregate"]).issubset(data.keys())
        assert data["params"]["season"] == body["season"]
        assert len(data["per_team"]) == 4

        # per-team validation
        for team in data["per_team"]:
            assert {"team", "bets", "series", "stats"}.issubset(team.keys())
            stats = team["stats"]
            for k in ["total_bets", "wins", "losses", "busts", "win_rate",
                      "total_staked", "total_profit", "yield_pct", "max_stake",
                      "max_losing_streak", "max_drawdown"]:
                assert k in stats, f"missing stat {k} for {team['team']}"
            # bets must be sorted by date
            dates = [b["date"] for b in team["bets"]]
            assert dates == sorted(dates), f"bets not sorted by date for {team['team']}"
            # bet shape
            if team["bets"]:
                b0 = team["bets"][0]
                for k in ["date", "opponent", "is_home", "team_score", "opp_score",
                          "is_draw_regulation", "is_favorite", "market", "odds",
                          "stake", "won", "profit", "bust", "step"]:
                    assert k in b0
                assert b0["market"] in ("AH -1.5", "Moneyline")

        # aggregate stats
        agg = data["aggregate"]
        assert "series" in agg and "stats" in agg
        s_stats = agg["stats"]
        for k in ["total_profit", "total_bets", "total_wins", "win_rate",
                  "total_staked", "yield_pct", "roi", "final_bankroll", "max_stake"]:
            assert k in s_stats, f"missing aggregate stat {k}"

        # consistency: aggregate profit ≈ sum of per_team profits
        sum_team_profit = sum(t["stats"]["total_profit"] for t in data["per_team"])
        assert abs(s_stats["total_profit"] - round(sum_team_profit, 2)) < 0.5
        # final_bankroll = starting + total_profit
        assert abs(s_stats["final_bankroll"] - (body["starting_bankroll"] + s_stats["total_profit"])) < 0.01

        # aggregate.series sorted by date with cumulative monotonic in date
        if agg["series"]:
            series_dates = [pt["date"] for pt in agg["series"]]
            assert series_dates == sorted(series_dates)
            # final cumulative equals total_profit (within rounding)
            final_cum = agg["series"][-1]["cumulative"]
            assert abs(final_cum - s_stats["total_profit"]) < 0.5

        # validated reference: total_bets, win_rate, total_profit (already validated manually
        # ≈ +€353.70 / 328 bets / 45.4% WR / 0 bust)
        assert s_stats["total_bets"] == 328, f"expected 328 bets, got {s_stats['total_bets']}"
        assert 0.44 < s_stats["win_rate"] < 0.47
        assert 340 < s_stats["total_profit"] < 370
        assert s_stats["total_busts"] == 0

    def test_profit_logic_per_bet(self, s, auth):
        """Validate profit math at the bet level for one team."""
        body = {
            "season": "2023-2024",
            "start_date": "2023-10-10",
            "teams": ["Boston Bruins"],
            "initial_stake": 1.0,
            "starting_bankroll": 1000.0,
            "max_consecutive_losses": 8,
        }
        r = s.post(f"{API}/backtest/nhl", headers=auth, json=body)
        assert r.status_code == 200
        team = r.json()["per_team"][0]
        bets = team["bets"]
        assert len(bets) > 0

        # stake martingale rule
        prev = None
        for b in bets:
            if prev is not None:
                if prev["won"]:
                    assert b["stake"] == pytest.approx(body["initial_stake"]), \
                        f"after win, stake should reset; got {b['stake']}"
                elif prev["bust"]:
                    assert b["stake"] == pytest.approx(body["initial_stake"]), \
                        f"after bust, stake should reset; got {b['stake']}"
                else:
                    # progression doubles
                    assert b["stake"] == pytest.approx(prev["stake"] * 2), \
                        f"after loss, stake should double {prev['stake']}->{b['stake']}"
            prev = b

            # profit math
            if b["won"]:
                expected = b["stake"] * (b["odds"] - 1)
            else:
                expected = -b["stake"]
            assert abs(b["profit"] - round(expected, 4)) < 0.01

            # market chosen correctly per favorite flag
            assert (b["market"] == "AH -1.5") == b["is_favorite"]

            # win condition coherence
            if b["is_favorite"]:
                expected_won = (not b["is_draw_regulation"]) and (b["team_score"] - b["opp_score"] >= 2)
            else:
                expected_won = b["team_score"] > b["opp_score"]
            assert b["won"] == expected_won

    def test_cap_triggers_bust_when_low(self, s, auth):
        """With cap=2, expect at least one bust on a 4-team backtest."""
        body = {
            "season": "2023-2024",
            "start_date": "2023-10-10",
            "teams": ["Boston Bruins", "Colorado Avalanche", "Edmonton Oilers", "New York Rangers"],
            "initial_stake": 1.0,
            "starting_bankroll": 1000.0,
            "max_consecutive_losses": 2,
        }
        r = s.post(f"{API}/backtest/nhl", headers=auth, json=body)
        assert r.status_code == 200
        data = r.json()
        assert data["aggregate"]["stats"]["total_busts"] >= 1
        # find a bust bet and verify reset
        for team in data["per_team"]:
            for i, b in enumerate(team["bets"]):
                if b["bust"]:
                    if i + 1 < len(team["bets"]):
                        assert team["bets"][i + 1]["stake"] == pytest.approx(body["initial_stake"])
                    break

    def test_invalid_stake_400(self, s, auth):
        r = s.post(f"{API}/backtest/nhl", headers=auth, json={
            "season": "2023-2024", "start_date": "2023-10-10",
            "teams": ["Boston Bruins"], "initial_stake": 0, "starting_bankroll": 1000, "max_consecutive_losses": 8
        })
        assert r.status_code == 400
