# BetsTracker — Local Setup

App full-stack per il tracking delle scommesse sportive. Stack: React + FastAPI + MongoDB con sync real-time via WebSocket.

---

## Avvio rapido con Docker Compose (consigliato)

**Requisiti:** Docker Desktop (o Docker Engine) ≥ 20.10 con Compose V2.

```bash
# 1. (opzionale) personalizza il JWT secret
cp .env.example .env
# apri .env e sostituisci JWT_SECRET

# 2. build + up (al primo avvio ci mette 2-3 minuti)
docker compose up -d --build

# 3. (opzionale, una volta sola) seed dei dati migrati da Supabase
docker compose exec backend python seed.py
```

**Servizi attivi:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api/health
- MongoDB: mongodb://localhost:27017

**Login test dopo il seed:** `giulio.mantioni@hotmail.it` / `giulio.mantioni@hotmail.it`

**Comandi utili:**
```bash
docker compose logs -f backend        # guarda log backend in tempo reale
docker compose logs -f frontend       # log frontend
docker compose restart backend        # riavvia solo backend
docker compose down                   # ferma tutto (dati Mongo preservati)
docker compose down -v                # ferma e CANCELLA il database
docker compose up -d --build          # rebuild dopo modifiche al codice
```

---

## Avvio manuale senza Docker

### Prerequisiti
- Node.js 18+ e yarn
- Python 3.11+
- MongoDB locale o MongoDB Atlas

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# crea backend/.env:
cat > .env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=betstracker_db
JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
EOF

# (opzionale) seed dati migrati
python seed.py

# avvia
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install

# crea frontend/.env:
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

yarn start
```

---

## Struttura

```
/
├── docker-compose.yml     # orchestrazione Mongo + backend + frontend
├── .env.example           # template env per compose
├── backend/
│   ├── Dockerfile         # image FastAPI
│   ├── server.py          # REST + WebSocket
│   ├── seed.py            # import CSV → Mongo
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile         # multi-stage: build React + serve via nginx
│   ├── nginx.conf         # SPA routing + gzip
│   └── src/               # React app
├── imports/               # CSV Supabase (profiles, strategies, bets)
└── memory/                # PRD + credentials
```

---

## Feature highlights

- Auth JWT + bcrypt
- Strategie (default/bonus, archivia/ripristina)
- Bet con auto-calcolo profit (won/lost/pending/void)
- Bonus per strategie tipo "bonus"
- Grafico P&L cumulativo/giornaliero/settimanale/mensile
- KPI: ROI, yield, win rate, quota media, max drawdown, max losing streak
- Sync real-time multi-device via WebSocket `/api/ws`
- Export JSON + CSV dal profilo
- Dark mode "Performance Pro" con Chivo + IBM Plex
