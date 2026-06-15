# Asondia Backend

Real-time transport monitoring API for AMOEC MPC (Allen ↔ Catarman).

**Stack:** Express · PostgreSQL · Prisma · Socket.IO · TypeScript

See [../docs/BACKEND-ARCHITECTURE.md](../docs/BACKEND-ARCHITECTURE.md) for the full architecture plan.

## Setup

1. Copy environment file:

```bash
cp .env.example .env
```

2. **Use local PostgreSQL** — create the database and set `DATABASE_URL` in `.env`:

```sql
CREATE DATABASE asondia;
```

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/asondia"
```

> Do not use Prisma Postgres (`db.prisma.io`) for local development. Hosted DB is for production deploy later.

3. Install dependencies:

```bash
pnpm install
```

4. Run migrations:

```bash
pnpm db:migrate
```

5. Start dev server:

```bash
pnpm dev
```

Server runs at `http://localhost:3000`.

## API Response Format

All endpoints use a consistent shape via `src/utils/apiResponse.ts`:

```json
{
  "success": true,
  "message": "Trip started successfully",
  "data": { },
  "meta": null
}
```

## Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | JWT | Current profile |
| GET | `/api/buses` | JWT | List buses |
| POST | `/api/buses` | Admin | Register bus |
| GET | `/api/trips/active` | — | Active trips for map |
| POST | `/api/trips/start` | Conductor | Start trip session |
| POST | `/api/trips/:id/end` | Conductor | End trip |
| PUT | `/api/trips/:id/seats` | Conductor | Update seat count |

## Socket.IO Events

Connect with JWT: `auth: { token: "<jwt>" }`

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_trip` | Client → Server | Join `trip:{id}` room |
| `update_location` | Conductor → Server | `{ tripId, lat, lng }` |
| `bus_location_updated` | Server → Clients | Live coordinates |

## Scripts

- `pnpm dev` — development with nodemon + hot reload
- `pnpm build` — compile TypeScript
- `pnpm start` — build then run production server
- `pnpm db:migrate` — run Prisma migrations
- `pnpm db:studio` — open Prisma Studio
