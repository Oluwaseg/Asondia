# Asondia Backend Architecture Plan

> **Stack:** Express · PostgreSQL · Prisma · Socket.IO · TypeScript  
> **Pilot scope:** AMOEC MPC — Allen ↔ Catarman route  
> **Core loop first:** Conductor GPS → Backend → Passenger map

---

## 1. Why This Approach

Asondia is a **real-time transport monitoring system**. Everything depends on how trips are modeled and how coordinates are streamed. Starting with solid data models and a working tracking loop makes the React Native / web frontend straightforward later.

| Choice | Reason |
|--------|--------|
| **Express** | Simple, fast to ship, team already chose it |
| **PostgreSQL** | Buses, trips, reservations, and users are relational |
| **Prisma** | Type-safe ORM, great DX with Postgres |
| **Socket.IO** | Real-time location broadcast (not polling) |
| **Trip Session model** | Tracking, ETA, seats, and history all attach to one active run |
| **Phone GPS** | No hardware cost — conductor phone is the tracker |

**Do not build everything at once.** The doc lists tracking, ETA, reservations, dispatch, seats, and dashboards. Ship the core loop first; add modules in sprints.

---

## 2. Core Loop (MVP)

```
Conductor starts trip session
        ↓
Phone sends GPS every 5–10 sec (Socket.IO: update_location)
        ↓
Backend validates trip → updates DB (throttled) → broadcasts (bus_location_updated)
        ↓
Passenger app updates map marker in real time
```

If this works smoothly, ETA, seats, and reservations layer on cleanly.

---

## 3. Architecture Pattern: Trip Session Driven

Do **not** track “a bus forever.” Track **an active trip session**:

```
Bus 12 · Allen → Catarman · Started 8:30 AM · Conductor: Kevin · Status: ACTIVE
```

Benefits:

- ETA is per-trip, not per-vehicle guesswork  
- Seat count belongs to one run  
- History and analytics are queryable  
- Debugging is easy (“which session was broken?”)

---

## 4. Database Models (Prisma)

### Enums

```prisma
enum Role {
  PASSENGER
  CONDUCTOR
  ADMIN
}

enum TripStatus {
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

### User

Authentication and role-based access.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | |
| email | String | unique |
| password | String | bcrypt hash |
| role | Role | PASSENGER \| CONDUCTOR \| ADMIN |
| createdAt / updatedAt | DateTime | |

### Bus

Fleet registry for AMOEC MPC.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| busNumber | String | e.g. "12" |
| plateNumber | String | unique |
| cooperative | String | default "AMOEC MPC" |
| capacity | Int | max seats |
| isActive | Boolean | soft disable |

### Trip (heart of the system)

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| busId | String | FK → Bus |
| conductorId | String | FK → User |
| routeStart | String | e.g. "Allen" |
| routeEnd | String | e.g. "Catarman" |
| status | TripStatus | ACTIVE when tracking |
| currentLat / currentLng | Float? | latest position |
| locationUpdatedAt | DateTime? | last DB write |
| availableSeats | Int | conductor updates |
| startedAt | DateTime | |
| endedAt | DateTime? | set on complete |

### Reservation (Sprint 4)

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| tripId | String | FK → Trip |
| passengerId | String? | FK → User (optional for walk-in) |
| passengerName | String | |
| phone | String | |
| pickupPoint | String | terminal / stop |
| status | ReservationStatus | |
| createdAt | DateTime | |

### LocationHistory (optional, Sprint 2+)

Store throttled snapshots for ETA / analytics — **not every GPS ping**.

| Field | Type |
|-------|------|
| id, tripId, lat, lng, recordedAt | |

---

## 5. Real-Time Flow (Socket.IO)

### Rooms

- `trip:{tripId}` — passengers watching one bus run  
- `route:{routeStart}-{routeEnd}` — all active trips on a corridor (optional)

### Events

| Event | Direction | Payload | Action |
|-------|-----------|---------|--------|
| `join_trip` | Client → Server | `{ tripId }` | Join room after auth |
| `update_location` | Conductor → Server | `{ tripId, lat, lng }` | Validate ACTIVE trip + CONDUCTOR role |
| `bus_location_updated` | Server → Clients | `{ tripId, lat, lng, updatedAt }` | Broadcast to `trip:{tripId}` |

### GPS / DB throttling (important)

| Action | Interval |
|--------|----------|
| Socket broadcast | Every 5–10 sec (from phone) |
| PostgreSQL write | Every 15–30 sec |
| LocationHistory insert | Same as DB write |

Saving every coordinate will explode storage. Broadcast live; persist on a schedule.

### Separation of concerns

```
tracking.socket.ts   → Socket.IO events only
tracking.service.ts  → validate trip, throttle writes, broadcast
trip.service.ts      → start/end trip, seat updates
trip.controller.ts   → HTTP handlers
```

Never mix socket logic inside controllers.

---

## 6. REST API (consistent responses)

All HTTP handlers use a shared **`ApiResponse`** helper (`src/utils/apiResponse.ts`):

```json
{
  "success": true,
  "message": "Trip started",
  "data": { ... },
  "meta": null
}
```

Errors:

```json
{
  "success": false,
  "message": "Trip not found",
  "data": null,
  "errors": [{ "field": "tripId", "message": "Invalid id" }]
}
```

### Sprint 1 endpoints

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | public | Register passenger/conductor |
| POST | `/api/auth/login` | public | JWT login |
| GET | `/api/auth/me` | auth | Current user |
| POST | `/api/buses` | admin | Register bus |
| GET | `/api/buses` | auth | List buses |
| POST | `/api/trips/start` | conductor | Start trip session |
| POST | `/api/trips/:id/end` | conductor | End trip |
| GET | `/api/trips/active` | public/auth | Active trips for map |
| GET | `/api/trips/:id` | auth | Trip detail + location |

### Sprint 4 endpoints

| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/trips/:id/seats` | Conductor updates available seats |
| POST | `/api/trips/:id/reservations` | Passenger reserves |
| GET | `/api/trips/:id/reservations` | Conductor view queue |

---

## 7. Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validate.ts
│   │   └── errorHandler.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── buses/
│   │   ├── trips/
│   │   └── reservations/        # Sprint 4
│   ├── sockets/
│   │   ├── index.ts
│   │   └── tracking.socket.ts
│   ├── utils/
│   │   ├── apiResponse.ts       # ← reuse everywhere
│   │   └── asyncHandler.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 8. Auth Strategy

- **JWT** access tokens (Bearer header)  
- Passwords: **bcrypt**  
- Socket.IO: authenticate on connection (`auth.token`)  
- Roles: `PASSENGER`, `CONDUCTOR`, `ADMIN`  
- Conductors can only `update_location` on their own active trip  

---

## 9. Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/asondia"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="*"
LOCATION_DB_THROTTLE_MS=20000
```

---

## 10. Sprint Plan

### Sprint 1 — Backend foundation (current)

- [x] Architecture doc  
- [ ] Express + TypeScript + Prisma init  
- [ ] User, Bus, Trip models + migrate  
- [ ] ApiResponse utility + error middleware  
- [ ] Auth (register / login / me)  
- [ ] `POST /trips/start`, `GET /trips/active`  

**Done when:** conductor can start a trip via API and it appears in active trips list.

### Sprint 2 — Real-time tracking (MVP)

- [ ] Socket.IO server + JWT auth  
- [ ] `update_location` / `bus_location_updated`  
- [ ] DB throttle for coordinates  
- [ ] Test with mock GPS (Postman / script)  

**Done when:** mock coordinates move a listener in another client.

### Sprint 3 — Maps + ETA

- [ ] Frontend map (React Native / web)  
- [ ] ETA: distance ÷ average speed (no ML yet)  
- [ ] Optional LocationHistory for route polyline  

### Sprint 4 — Seats + reservations

- [ ] Seat count API  
- [ ] Reservation CRUD + conductor notifications  

### Sprint 5 — Dispatch dashboard

- [ ] Admin terminal view  
- [ ] Fleet overview, active trips table  

---

## 11. Mobile / GPS Notes (for later frontend)

- Use **Expo** first (`expo-location`, `expo-task-manager`)  
- Android needs **foreground service** for reliable background GPS  
- Send location every **5–10 sec** when trip is ACTIVE  
- Batch or pause when trip ends to save battery and data  

---

## 12. What We Are NOT Doing Yet

- Redis (add when scaling past single server)  
- Microservices  
- Saving every GPS point to Postgres  
- Push notifications (Sprint 4+)  
- Payment / fare integration  
- Allen ↔ San Jose or Calbayog routes (pilot = Allen ↔ Catarman only)  

---

## 13. Immediate Next Steps (today)

1. `pnpm install` in `backend/`  
2. Configure `.env` with local Postgres  
3. `pnpm db:migrate`  
4. Run dev server: `pnpm dev`  
5. Hit `POST /api/trips/start` then simulate socket GPS  
6. Confirm `GET /api/trips/active` returns live coordinates  

Once the marker moves on a test client, the backend foundation is complete.
