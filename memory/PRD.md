# BetsTracker — Performance Pro

## Original Problem Statement
App Angular + Supabase esistente per tracciare scommesse sportive con strategie multiple (ognuna con bet e grafico proprio) e home con grafico aggregato. L'utente richiedeva: **UI più moderna, miglior gestione degli stati, sync real-time cross-device** (problema principale: aggiornamento incoerente tra dispositivi).

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Recharts + Framer Motion + Phosphor Icons (no shadcn, componenti custom)
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt
- **Database**: MongoDB (`betstracker_db`)
- **Real-time sync**: WebSocket `/api/ws?token=<jwt>` con auto-reconnect client-side, broadcast per-utente su create/update/delete di strategie, bet, bonuses
- **Auth**: JWT custom (Bearer token in Authorization header, salvato in localStorage, 7 giorni expiry)
- **Design**: "Performance Pro" dark fintech — #0A0A0A bg, #007AFF primary, #00FF88 success, #FF3B30 danger, font Chivo (heading) + IBM Plex Sans (body) + IBM Plex Mono (numeri)

## User Personas
- **Scommettitore professionista** che gestisce multiple strategie e vuole monitorare ROI, yield, drawdown, win rate in tempo reale su più dispositivi

## Core Requirements (static)
1. Login email/password con JWT
2. Gestione strategie (CRUD, archivia/ripristina, tipo default/bonus)
3. Gestione bet (CRUD, auto-calcolo profit, risultato pending/won/lost/void)
4. Gestione bonus su strategie tipo "bonus"
5. Grafico aggregato home + grafico per strategia
6. KPI: ROI, yield, win rate, max drawdown, max losing streak, quota media
7. Filtri bet (stato, ricerca evento, data)
8. Sync real-time multi-device via WebSocket
9. Import dati da Supabase (già eseguito)
10. Export JSON + CSV dal profilo

## What's Been Implemented (2026-01-XX)
- [x] Rewrite completo: da Angular+Supabase → React+FastAPI+MongoDB
- [x] Migrazione dati: 6 utenti, 44 strategie, 2758 bet (password temp = email)
- [x] Login/register/logout/change-password/update-profile
- [x] Strategie: list/create/edit/archive/delete con cascata su bet
- [x] Bet: list/create/edit/delete + auto-calcolo profit + filtri + ricerca + quick-result
- [x] Bonus: list/create/delete per strategie tipo bonus
- [x] Home: cruscotto aggregato con 6 KPI, grafico P&L area cumulativo, card strategie con sparkline
- [x] Strategy detail: 8 KPI, chart con switch cumulativo/giornaliero/settimanale/mensile, tabella bet completa, modal edit bet/bonus/strategy
- [x] AddBet: form con auto-calcolo puntata da unit%, calcolatrice vincita potenziale
- [x] Profile: update username, change password, export JSON, export CSV bet
- [x] Header: logo, nav, indicatore Live Sync animato, username, logout
- [x] WebSocket bidirezionale con auto-reconnect e ping keepalive client-side
- [x] Design dark "Performance Pro" con grid background, motion, typography custom

## Backlog / Future
- **P1**: moduli backtest (HT, Over, Under, D'Alembert) — rimandati come da accordo
- **P2**: rate-limiting brute-force su login (5 tentativi → 15min lockout)
- **P2**: reset password via email
- **P2**: datetime picker stilizzato custom (sostituire browser default)
- **P2**: import da JSON/CSV in-app (UI) per nuovi utenti
- **P3**: charts confronto multi-strategia overlay in home
- **P3**: PWA / install prompt per uso mobile nativo
- **P3**: notifiche push su cambio risultato da altro dispositivo

## Test Results (iteration_1)
- Backend: 24/24 pytest passati (auth, strategies, bets, bonuses, export, WebSocket)
- Frontend: 100% flussi critici (login, home KPI, strategy detail, add-bet, strategies, profile, Live Sync)
- 0 bug bloccanti

## Credentials (migrated users)
Tutti gli utenti migrati hanno password temporanea = email. Vedi `/app/memory/test_credentials.md`.
