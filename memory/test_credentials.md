# Test Credentials — BetsTracker

## Primary test user (owner, migrated from Supabase)
- **Email:** giulio.mantioni@hotmail.it
- **Password:** giulio.mantioni@hotmail.it
- **Username:** Levi
- Role: regular user, data: 1 strategy with 101 bets

## Other migrated users (temporary password = email)
- admin@investment.com → password: admin@investment.com (username: Des792)
- erwin@smith.com → password: erwin@smith.com
- satana@investment.com → password: satana@investment.com

## Auth endpoints
- POST /api/auth/register — {email, password, username?}
- POST /api/auth/login — {email, password}
- GET  /api/auth/me — Bearer token
- POST /api/auth/change-password — {current_password, new_password}
- PATCH /api/auth/profile — {username?}

## Notes
- JWT token is stored in localStorage on the frontend
- Token is sent via `Authorization: Bearer <token>` header
- WebSocket endpoint: /api/ws?token=<jwt>
