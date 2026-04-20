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
