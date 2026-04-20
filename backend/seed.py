"""Seed MongoDB from Supabase CSV export."""
import os
import csv
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

import bcrypt
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

IMPORT_DIR = os.path.join(os.path.dirname(__file__), "..", "imports")

def hash_pw(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # Clean existing seeded data (optional – only during first import)
    await db.users.delete_many({})
    await db.strategies.delete_many({})
    await db.bets.delete_many({})
    await db.bonuses.delete_many({})

    # Users
    user_map = {}  # supabase_uuid -> mongo _id (str)
    with open(os.path.join(IMPORT_DIR, "profiles.csv")) as f:
        for row in csv.DictReader(f):
            email = row["email"].lower()
            pw_hash = hash_pw(email)  # temp password = email
            doc = {
                "email": email,
                "username": row.get("username") or email.split("@")[0],
                "password_hash": pw_hash,
                "created_at": datetime.now(timezone.utc),
                "legacy_id": row["id"],
            }
            res = await db.users.insert_one(doc)
            user_map[row["id"]] = str(res.inserted_id)
    print(f"Inserted {len(user_map)} users")

    # Strategies
    strategy_map = {}  # supabase_int_id -> mongo ObjectId
    with open(os.path.join(IMPORT_DIR, "strategies.csv")) as f:
        for row in csv.DictReader(f):
            sb_user_id = row["user_id"]
            mongo_uid = user_map.get(sb_user_id)
            if not mongo_uid:
                continue
            doc = {
                "user_id": mongo_uid,
                "name": row["name"],
                "starting_bankroll": float(row["starting_bankroll"] or 0),
                "type": "bonus" if (row.get("type") or "").lower() == "bonus" else "default",
                "archived": (row.get("archived") or "false").lower() == "true",
                "created_at": datetime.fromisoformat(row["created_at"].replace(" ", "T").split("+")[0]).replace(tzinfo=timezone.utc)
                if row.get("created_at") else datetime.now(timezone.utc),
                "legacy_id": int(row["id"]),
            }
            res = await db.strategies.insert_one(doc)
            strategy_map[int(row["id"])] = res.inserted_id
    print(f"Inserted {len(strategy_map)} strategies")

    # Bets
    inserted_bets = 0
    with open(os.path.join(IMPORT_DIR, "bets.csv")) as f:
        for row in csv.DictReader(f):
            sb_user_id = row["user_id"]
            mongo_uid = user_map.get(sb_user_id)
            sid = strategy_map.get(int(row["strategy_id"])) if row.get("strategy_id") else None
            if not mongo_uid or not sid:
                continue
            bet = float(row.get("bet") or 0)
            odds = float(row.get("odds") or 0)
            result = (row.get("result") or "pending").lower()
            profit_val = float(row.get("profit") or 0)
            doc = {
                "user_id": mongo_uid,
                "strategy_id": sid,
                "date": (row.get("date") or "").split("+")[0].strip() or None,
                "event": row.get("event") or "",
                "bookmaker": row.get("bookmaker") or "",
                "odds": odds,
                "unit": float(row.get("unit") or 0),
                "bet": bet,
                "result": result,
                "profit": profit_val,
                "notes": "",
                "created_at": datetime.now(timezone.utc),
            }
            await db.bets.insert_one(doc)
            inserted_bets += 1
    print(f"Inserted {inserted_bets} bets")

    await db.users.create_index("email", unique=True)
    await db.strategies.create_index("user_id")
    await db.bets.create_index([("user_id", 1), ("strategy_id", 1)])

    print("Done. Temp password for each user = their email.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
