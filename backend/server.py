from dotenv import load_dotenv
load_dotenv()

import os
import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

mongo_client: Optional[AsyncIOMotorClient] = None
db = None


# ---------- auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


# ---------- WebSocket manager ----------
class WSManager:
    def __init__(self):
        self.conns: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.conns.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.conns and ws in self.conns[user_id]:
            self.conns[user_id].remove(ws)

    async def broadcast(self, user_id: str, msg: dict):
        if user_id not in self.conns:
            return
        dead = []
        for ws in self.conns[user_id]:
            try:
                await ws.send_json(msg)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.disconnect(user_id, d)


ws_manager = WSManager()


# ---------- lifespan ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]
    await db.users.create_index("email", unique=True)
    await db.strategies.create_index("user_id")
    await db.bets.create_index([("user_id", 1), ("strategy_id", 1)])
    await db.bonuses.create_index([("user_id", 1), ("strategy_id", 1)])
    yield
    mongo_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str


class UpdateProfileReq(BaseModel):
    username: Optional[str] = None


class StrategyReq(BaseModel):
    name: str
    starting_bankroll: float
    type: str = "default"  # default | bonus
    archived: bool = False


class BetReq(BaseModel):
    strategy_id: str
    date: str
    event: str
    bookmaker: Optional[str] = ""
    odds: float
    unit: float  # percentage (e.g. 3 -> 3%)
    bet: float   # money wagered
    result: str  # pending | won | lost | void
    notes: Optional[str] = ""


class BonusReq(BaseModel):
    strategy_id: str
    date: str
    amount: float
    note: Optional[str] = ""


# ---------- helpers ----------
def compute_profit(bet: float, odds: float, result: str) -> float:
    if result == "won":
        return round(bet * odds - bet, 2)
    if result == "lost":
        return round(-bet, 2)
    return 0.0


def strategy_dto(s: dict) -> dict:
    return {
        "id": str(s["_id"]),
        "name": s["name"],
        "starting_bankroll": s.get("starting_bankroll", 0),
        "type": s.get("type", "default"),
        "archived": s.get("archived", False),
        "created_at": s.get("created_at").isoformat() if s.get("created_at") else None,
    }


def bet_dto(b: dict) -> dict:
    return {
        "id": str(b["_id"]),
        "strategy_id": str(b["strategy_id"]),
        "date": b.get("date"),
        "event": b.get("event", ""),
        "bookmaker": b.get("bookmaker", ""),
        "odds": b.get("odds", 0),
        "unit": b.get("unit", 0),
        "bet": b.get("bet", 0),
        "result": b.get("result", "pending"),
        "profit": b.get("profit", 0),
        "notes": b.get("notes", ""),
    }


def bonus_dto(b: dict) -> dict:
    return {
        "id": str(b["_id"]),
        "strategy_id": str(b["strategy_id"]),
        "date": b.get("date"),
        "amount": b.get("amount", 0),
        "note": b.get("note", ""),
    }


async def broadcast_change(user_id: str, entity: str, action: str, data: dict):
    await ws_manager.broadcast(user_id, {"entity": entity, "action": action, "data": data})


# ---------- Auth routes ----------
@app.post("/api/auth/register")
async def register(body: RegisterReq, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email già registrata")
    doc = {
        "email": email,
        "username": body.username or email.split("@")[0],
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    return {"token": token, "user": {"id": uid, "email": email, "username": doc["username"]}}


@app.post("/api/auth/login")
async def login(body: LoginReq):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    return {
        "token": token,
        "user": {"id": uid, "email": email, "username": user.get("username", "")},
    }


@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "username": user.get("username", "")}


@app.post("/api/auth/change-password")
async def change_password(body: ChangePasswordReq, user=Depends(get_current_user)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Password corrente errata")
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    return {"ok": True}


@app.patch("/api/auth/profile")
async def update_profile(body: UpdateProfileReq, user=Depends(get_current_user)):
    update = {}
    if body.username is not None:
        update["username"] = body.username
    if update:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"id": str(doc["_id"]), "email": doc["email"], "username": doc.get("username", "")}


# ---------- Strategies ----------
@app.get("/api/strategies")
async def list_strategies(user=Depends(get_current_user)):
    cursor = db.strategies.find({"user_id": user["id"]}).sort("created_at", -1)
    return [strategy_dto(s) async for s in cursor]


@app.post("/api/strategies")
async def create_strategy(body: StrategyReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"],
        "name": body.name,
        "starting_bankroll": body.starting_bankroll,
        "type": body.type,
        "archived": body.archived,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.strategies.insert_one(doc)
    doc["_id"] = res.inserted_id
    out = strategy_dto(doc)
    await broadcast_change(user["id"], "strategy", "create", out)
    return out


@app.put("/api/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, body: StrategyReq, user=Depends(get_current_user)):
    res = await db.strategies.find_one_and_update(
        {"_id": ObjectId(strategy_id), "user_id": user["id"]},
        {"$set": body.model_dump()},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Strategia non trovata")
    out = strategy_dto(res)
    await broadcast_change(user["id"], "strategy", "update", out)
    return out


@app.delete("/api/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, user=Depends(get_current_user)):
    res = await db.strategies.delete_one({"_id": ObjectId(strategy_id), "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategia non trovata")
    await db.bets.delete_many({"user_id": user["id"], "strategy_id": ObjectId(strategy_id)})
    await db.bonuses.delete_many({"user_id": user["id"], "strategy_id": ObjectId(strategy_id)})
    await broadcast_change(user["id"], "strategy", "delete", {"id": strategy_id})
    return {"ok": True}


# ---------- Bets ----------
@app.get("/api/bets")
async def list_bets(strategy_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if strategy_id:
        query["strategy_id"] = ObjectId(strategy_id)
    cursor = db.bets.find(query).sort("date", -1)
    return [bet_dto(b) async for b in cursor]


@app.post("/api/bets")
async def create_bet(body: BetReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"],
        "strategy_id": ObjectId(body.strategy_id),
        "date": body.date,
        "event": body.event,
        "bookmaker": body.bookmaker,
        "odds": body.odds,
        "unit": body.unit,
        "bet": body.bet,
        "result": body.result,
        "notes": body.notes,
        "profit": compute_profit(body.bet, body.odds, body.result),
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.bets.insert_one(doc)
    doc["_id"] = res.inserted_id
    out = bet_dto(doc)
    await broadcast_change(user["id"], "bet", "create", out)
    return out


@app.put("/api/bets/{bet_id}")
async def update_bet(bet_id: str, body: BetReq, user=Depends(get_current_user)):
    update = body.model_dump()
    update["strategy_id"] = ObjectId(body.strategy_id)
    update["profit"] = compute_profit(body.bet, body.odds, body.result)
    res = await db.bets.find_one_and_update(
        {"_id": ObjectId(bet_id), "user_id": user["id"]},
        {"$set": update},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Bet non trovato")
    out = bet_dto(res)
    await broadcast_change(user["id"], "bet", "update", out)
    return out


@app.delete("/api/bets/{bet_id}")
async def delete_bet(bet_id: str, user=Depends(get_current_user)):
    res = await db.bets.delete_one({"_id": ObjectId(bet_id), "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bet non trovato")
    await broadcast_change(user["id"], "bet", "delete", {"id": bet_id})
    return {"ok": True}


# ---------- Bonuses ----------
@app.get("/api/bonuses")
async def list_bonuses(strategy_id: Optional[str] = None, user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if strategy_id:
        query["strategy_id"] = ObjectId(strategy_id)
    cursor = db.bonuses.find(query).sort("date", -1)
    return [bonus_dto(b) async for b in cursor]


@app.post("/api/bonuses")
async def create_bonus(body: BonusReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"],
        "strategy_id": ObjectId(body.strategy_id),
        "date": body.date,
        "amount": body.amount,
        "note": body.note,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.bonuses.insert_one(doc)
    doc["_id"] = res.inserted_id
    out = bonus_dto(doc)
    await broadcast_change(user["id"], "bonus", "create", out)
    return out


@app.delete("/api/bonuses/{bonus_id}")
async def delete_bonus(bonus_id: str, user=Depends(get_current_user)):
    res = await db.bonuses.delete_one({"_id": ObjectId(bonus_id), "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bonus non trovato")
    await broadcast_change(user["id"], "bonus", "delete", {"id": bonus_id})
    return {"ok": True}


# ---------- WebSocket ----------
@app.websocket("/api/ws")
async def ws_endpoint(websocket: WebSocket, token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload["sub"]
    except Exception:
        await websocket.close(code=1008)
        return
    await ws_manager.connect(uid, websocket)
    try:
        while True:
            await websocket.receive_text()  # keepalive from client
    except WebSocketDisconnect:
        ws_manager.disconnect(uid, websocket)


@app.get("/api/export")
async def export_all(user=Depends(get_current_user)):
    """Export all data (strategies, bets, bonuses) as JSON."""
    strategies = [strategy_dto(s) async for s in db.strategies.find({"user_id": user["id"]})]
    bets = [bet_dto(b) async for b in db.bets.find({"user_id": user["id"]})]
    bonuses = [bonus_dto(b) async for b in db.bonuses.find({"user_id": user["id"]})]
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {"id": user["id"], "email": user["email"], "username": user.get("username", "")},
        "strategies": strategies,
        "bets": bets,
        "bonuses": bonuses,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ============================================================================
# NHL BACKTEST
# ============================================================================
class NHLBacktestReq(BaseModel):
    season: str
    start_date: str  # ISO YYYY-MM-DD
    teams: List[str]  # up to 4
    initial_stake: float = 1.0
    starting_bankroll: float = 1000.0
    max_consecutive_losses: int = 8  # 0 or negative = unlimited
    progression_mode: str = "single"  # 'single' | 'split' (fav vs underdog separated)


class NHLBacktestGridReq(BaseModel):
    season: str
    start_date: str
    teams: List[str]
    initial_stake: float = 1.0
    starting_bankroll: float = 1000.0
    caps: List[int]  # e.g. [6, 8, 10, 12]
    progression_mode: str = "single"


@app.get("/api/nhl/seasons")
async def nhl_seasons(user=Depends(get_current_user)):
    seasons = await db.nhl_games.distinct("season")
    return sorted(seasons, reverse=True)


@app.get("/api/nhl/teams")
async def nhl_teams(season: str, user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"season": season}},
        {"$project": {"teams": ["$home_team", "$away_team"]}},
        {"$unwind": "$teams"},
        {"$group": {"_id": "$teams"}},
        {"$sort": {"_id": 1}},
    ]
    teams = [d["_id"] async for d in db.nhl_games.aggregate(pipeline)]
    return teams


@app.get("/api/nhl/season-range")
async def nhl_season_range(season: str, user=Depends(get_current_user)):
    """Min and max date of games for the given season."""
    pipeline = [
        {"$match": {"season": season}},
        {"$group": {"_id": None, "min": {"$min": "$date_str"}, "max": {"$max": "$date_str"}}},
    ]
    async for d in db.nhl_games.aggregate(pipeline):
        return {"min": d["min"], "max": d["max"]}
    return {"min": None, "max": None}


def _run_team_backtest(games: list, team: str, initial_stake: float, max_consecutive_losses: int, progression_mode: str = "single"):
    """Run martingale backtest for a single team.

    progression_mode:
      - "single": one progression for the team regardless of fav/udg role
      - "split":  two independent progressions, one for games as favorite, one as underdog

    Rules:
    - Favorite = team's moneyline odds < opponent moneyline odds → bet on their -1.5 AH.
      Win = is_draw_regulation is False AND |score diff| >= 2 in favor of the team.
    - Underdog = their moneyline odds >= opponent's → bet on their moneyline.
      Win = final score in favor of the team (OT/SO included).
    - Stake starts at `initial_stake`, doubles after each loss, resets to initial after each win.
    - If consecutive_losses reaches `max_consecutive_losses` (>0), progression busts:
      we record a BUST event (P&L = -cumulative_stake_since_reset), reset stake to initial and continue.
    """
    bets = []
    cap_on = max_consecutive_losses and max_consecutive_losses > 0

    # State containers: single holds one, split holds "fav" and "udg"
    state = {
        "single": {"stake": initial_stake, "streak": 0},
        "fav": {"stake": initial_stake, "streak": 0},
        "udg": {"stake": initial_stake, "streak": 0},
    }

    def track_key(is_fav: bool) -> str:
        if progression_mode == "split":
            return "fav" if is_fav else "udg"
        return "single"

    for g in games:
        is_home = g["home_team"] == team
        if not is_home and g["away_team"] != team:
            continue  # safety

        team_score = g["home_score"] if is_home else g["away_score"]
        opp_score = g["away_score"] if is_home else g["home_score"]
        opp_team = g["away_team"] if is_home else g["home_team"]
        ml_team = g["odd_home"] if is_home else g["odd_away"]
        ml_opp = g["odd_away"] if is_home else g["odd_home"]
        ah_team = g["odd_home_ah_minus15"] if is_home else g["odd_away_ah_minus15"]
        is_draw_reg = g.get("is_draw_regulation", False)

        if ml_team is None or ml_opp is None:
            continue  # skip if no odds
        is_favorite = ml_team < ml_opp

        if is_favorite:
            market = "AH -1.5"
            odds = ah_team
            won = (not is_draw_reg) and (team_score - opp_score >= 2)
        else:
            market = "Moneyline"
            odds = ml_team
            won = team_score > opp_score

        if odds is None:
            continue

        key = track_key(is_favorite)
        st = state[key]
        current_stake = st["stake"]

        profit = current_stake * (odds - 1) if won else -current_stake

        bet_record = {
            "date": g["date_str"],
            "opponent": opp_team,
            "is_home": is_home,
            "team_score": team_score,
            "opp_score": opp_score,
            "is_draw_regulation": is_draw_reg,
            "is_favorite": is_favorite,
            "market": market,
            "odds": odds,
            "stake": round(current_stake, 4),
            "won": won,
            "profit": round(profit, 4),
            "bust": False,
            "step": st["streak"] + 1,
            "track": key,  # "single" | "fav" | "udg"
        }
        bets.append(bet_record)

        if won:
            st["stake"] = initial_stake
            st["streak"] = 0
        else:
            st["streak"] += 1
            if cap_on and st["streak"] >= max_consecutive_losses:
                bet_record["bust"] = True
                st["stake"] = initial_stake
                st["streak"] = 0
            else:
                st["stake"] *= 2

    # Aggregate team stats
    total_profit = sum(b["profit"] for b in bets)
    total_staked = sum(b["stake"] for b in bets)
    wins = sum(1 for b in bets if b["won"])
    losses = sum(1 for b in bets if not b["won"])
    busts = sum(1 for b in bets if b["bust"])

    # Cumulative series
    cum = 0.0
    series = []
    max_profit_peak = 0.0
    max_dd = 0.0
    for b in bets:
        cum += b["profit"]
        max_profit_peak = max(max_profit_peak, cum)
        max_dd = min(max_dd, cum - max_profit_peak)
        series.append({"date": b["date"], "cumulative": round(cum, 2)})

    max_stake = max((b["stake"] for b in bets), default=0)

    # Per-track stats (useful especially in split mode)
    def _track_stats(filter_fn):
        sub = [b for b in bets if filter_fn(b)]
        if not sub:
            return None
        w = sum(1 for b in sub if b["won"])
        pf = sum(b["profit"] for b in sub)
        stk = sum(b["stake"] for b in sub)
        max_streak = 0
        cur = 0
        for b in sub:
            if not b["won"]:
                cur += 1
                max_streak = max(max_streak, cur)
            else:
                cur = 0
        return {
            "total_bets": len(sub),
            "wins": w,
            "losses": len(sub) - w,
            "win_rate": w / len(sub) if sub else 0,
            "total_staked": round(stk, 2),
            "total_profit": round(pf, 2),
            "yield_pct": (pf / stk) if stk else 0,
            "max_stake": round(max((b["stake"] for b in sub), default=0), 2),
            "busts": sum(1 for b in sub if b["bust"]),
            "max_losing_streak": max_streak,
        }

    # Global max losing streak (across everything, ordered)
    global_streak = 0
    max_global_streak = 0
    for b in bets:
        if not b["won"]:
            global_streak += 1
            max_global_streak = max(max_global_streak, global_streak)
        else:
            global_streak = 0

    return {
        "team": team,
        "bets": bets,
        "series": series,
        "progression_mode": progression_mode,
        "stats": {
            "total_bets": len(bets),
            "wins": wins,
            "losses": losses,
            "busts": busts,
            "win_rate": wins / len(bets) if bets else 0,
            "total_staked": round(total_staked, 2),
            "total_profit": round(total_profit, 2),
            "yield_pct": (total_profit / total_staked) if total_staked else 0,
            "max_stake": round(max_stake, 2),
            "max_losing_streak": max_global_streak,
            "max_drawdown": round(max_dd, 2),
        },
        "tracks": {
            "favorite": _track_stats(lambda b: b["is_favorite"]),
            "underdog": _track_stats(lambda b: not b["is_favorite"]),
        },
    }


@app.post("/api/backtest/nhl")
async def nhl_backtest(body: NHLBacktestReq, user=Depends(get_current_user)):
    if not body.teams:
        raise HTTPException(status_code=400, detail="Seleziona almeno una squadra")
    if len(body.teams) > 4:
        raise HTTPException(status_code=400, detail="Massimo 4 squadre")
    if body.initial_stake <= 0:
        raise HTTPException(status_code=400, detail="initial_stake deve essere > 0")

    # fetch all games of the season from start_date onwards for the selected teams
    cursor = db.nhl_games.find({
        "season": body.season,
        "date_str": {"$gte": body.start_date},
        "$or": [{"home_team": {"$in": body.teams}}, {"away_team": {"$in": body.teams}}],
    }).sort("date", 1)
    all_games = [g async for g in cursor]

    results = []
    for team in body.teams:
        team_games = [g for g in all_games if g["home_team"] == team or g["away_team"] == team]
        res = _run_team_backtest(team_games, team, body.initial_stake, body.max_consecutive_losses, body.progression_mode)
        results.append(res)

    # Aggregate: sum profit by date across teams
    agg_map = {}
    for r in results:
        for b in r["bets"]:
            agg_map.setdefault(b["date"], 0.0)
            agg_map[b["date"]] += b["profit"]
    dates_sorted = sorted(agg_map.keys())
    cum = 0.0
    aggregate_series = []
    for d in dates_sorted:
        cum += agg_map[d]
        aggregate_series.append({"date": d, "cumulative": round(cum, 2)})

    total_profit = sum(r["stats"]["total_profit"] for r in results)
    total_bets = sum(r["stats"]["total_bets"] for r in results)
    total_staked = sum(r["stats"]["total_staked"] for r in results)
    total_wins = sum(r["stats"]["wins"] for r in results)
    total_busts = sum(r["stats"]["busts"] for r in results)
    total_max_stake = max((r["stats"]["max_stake"] for r in results), default=0)

    return {
        "params": body.model_dump(),
        "per_team": results,
        "aggregate": {
            "series": aggregate_series,
            "stats": {
                "total_bets": total_bets,
                "total_wins": total_wins,
                "total_losses": total_bets - total_wins,
                "total_busts": total_busts,
                "win_rate": total_wins / total_bets if total_bets else 0,
                "total_staked": round(total_staked, 2),
                "total_profit": round(total_profit, 2),
                "yield_pct": (total_profit / total_staked) if total_staked else 0,
                "roi": total_profit / body.starting_bankroll if body.starting_bankroll else 0,
                "final_bankroll": round(body.starting_bankroll + total_profit, 2),
                "max_stake": round(total_max_stake, 2),
            },
        },
    }


@app.post("/api/backtest/nhl/grid")
async def nhl_backtest_grid(body: NHLBacktestGridReq, user=Depends(get_current_user)):
    """Run the same NHL martingale backtest across multiple cap values for comparison."""
    if not body.teams:
        raise HTTPException(status_code=400, detail="Seleziona almeno una squadra")
    if len(body.teams) > 4:
        raise HTTPException(status_code=400, detail="Massimo 4 squadre")
    if not body.caps or len(body.caps) == 0:
        raise HTTPException(status_code=400, detail="Seleziona almeno un cap")
    if len(body.caps) > 10:
        raise HTTPException(status_code=400, detail="Massimo 10 cap per grid search")

    # fetch games once (shared across all caps)
    cursor = db.nhl_games.find({
        "season": body.season,
        "date_str": {"$gte": body.start_date},
        "$or": [{"home_team": {"$in": body.teams}}, {"away_team": {"$in": body.teams}}],
    }).sort("date", 1)
    all_games = [g async for g in cursor]

    # precompute per-team games (avoid filtering in each iteration)
    team_games_map = {t: [g for g in all_games if g["home_team"] == t or g["away_team"] == t] for t in body.teams}

    rows = []
    best_roi = None
    for cap in body.caps:
        results = [
            _run_team_backtest(team_games_map[t], t, body.initial_stake, int(cap), body.progression_mode)
            for t in body.teams
        ]
        # aggregate series (for sparkline)
        agg_map = {}
        for r in results:
            for b in r["bets"]:
                agg_map[b["date"]] = agg_map.get(b["date"], 0.0) + b["profit"]
        dates_sorted = sorted(agg_map.keys())
        cum = 0.0
        series = []
        for d in dates_sorted:
            cum += agg_map[d]
            series.append({"date": d, "cumulative": round(cum, 2)})

        total_profit = sum(r["stats"]["total_profit"] for r in results)
        total_bets = sum(r["stats"]["total_bets"] for r in results)
        total_staked = sum(r["stats"]["total_staked"] for r in results)
        total_wins = sum(r["stats"]["wins"] for r in results)
        total_busts = sum(r["stats"]["busts"] for r in results)
        total_max_stake = max((r["stats"]["max_stake"] for r in results), default=0)
        total_max_dd = min((r["stats"]["max_drawdown"] for r in results), default=0)
        total_max_streak = max((r["stats"]["max_losing_streak"] for r in results), default=0)

        row = {
            "cap": int(cap),
            "total_bets": total_bets,
            "wins": total_wins,
            "losses": total_bets - total_wins,
            "win_rate": total_wins / total_bets if total_bets else 0,
            "total_profit": round(total_profit, 2),
            "total_staked": round(total_staked, 2),
            "yield_pct": (total_profit / total_staked) if total_staked else 0,
            "roi": total_profit / body.starting_bankroll if body.starting_bankroll else 0,
            "final_bankroll": round(body.starting_bankroll + total_profit, 2),
            "max_stake": round(total_max_stake, 2),
            "max_drawdown": round(total_max_dd, 2),
            "max_losing_streak": total_max_streak,
            "busts": total_busts,
            "series": series,
        }
        rows.append(row)
        if best_roi is None or row["roi"] > best_roi:
            best_roi = row["roi"]

    # flag the best config
    for r in rows:
        r["is_best_roi"] = (r["roi"] == best_roi)

    return {
        "params": body.model_dump(),
        "rows": rows,
    }


# ---- WebSocket (bottom of file) ----
