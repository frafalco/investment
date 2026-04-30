"""Seed NHL games from CSV into MongoDB."""
import os
import csv
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from motor.motor_asyncio import AsyncIOMotorClient

IMPORT_PATH = os.path.join(os.path.dirname(__file__), "..", "imports", "nhl.csv")


def parse_num(s: str):
    if s is None or s == "":
        return None
    return float(s.replace(",", "."))


def season_from_date(d: datetime) -> str:
    """NHL seasons span Oct->Jun. Month >= 9 -> Y/Y+1, else Y-1/Y."""
    if d.month >= 9:
        return f"{d.year}-{d.year + 1}"
    return f"{d.year - 1}-{d.year}"


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    await db.nhl_games.drop()

    docs = []
    with open(IMPORT_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            try:
                date_nhl = datetime.strptime(row["date_nhl"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                continue
            try:
                home_score = int(row["home_score"])
                away_score = int(row["away_score"])
            except Exception:
                continue
            is_draw = str(row.get("is_draw", "")).strip().lower() == "true"
            doc = {
                "date": date_nhl,
                "date_str": row["date_nhl"],
                "season": season_from_date(date_nhl),
                "home_team": row["home_team"].strip(),
                "away_team": row["away_team"].strip(),
                "home_score": home_score,
                "away_score": away_score,
                "is_draw_regulation": is_draw,
                "odd_home": parse_num(row.get("odd_1")),
                "odd_away": parse_num(row.get("odd_2")),
                "odd_home_ah_minus15": parse_num(row.get("odd_h1")),
                "odd_away_ah_minus15": parse_num(row.get("odd_h2")),
            }
            docs.append(doc)

    if docs:
        await db.nhl_games.insert_many(docs)
    await db.nhl_games.create_index([("season", 1), ("date", 1)])
    await db.nhl_games.create_index("home_team")
    await db.nhl_games.create_index("away_team")

    seasons = await db.nhl_games.distinct("season")
    print(f"Inserted {len(docs)} NHL games across {len(seasons)} seasons: {sorted(seasons)}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
