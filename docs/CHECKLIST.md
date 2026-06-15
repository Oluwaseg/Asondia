# Asondia Project Checklist

> **Pilot route:** Allen ↔ Catarman (AMOEC MPC)  
> **Stack:** Express · Local PostgreSQL · Prisma · Socket.IO · Expo  
> **Database:** Local PostgreSQL for now — **not** Prisma Postgres / Prisma Compute DB

---

## Progress at a glance

| Area | Status |
|------|--------|
| Backend API foundation | Done |
| Prisma schema + migration file | Done |
| Socket.IO tracking (server) | Done |
| Local PostgreSQL wired | **You — do this next** |
| Backend tested (API + sockets) | Not started |
| Expo conductor app | Not started |
| Expo passenger app / map | Not started |
| ETA | Not started |
| Reservations + notifications | Not started |
| Dispatch dashboard | Not started |
| Pilot with AMOEC commuters | Not started |

---

## Phase 0 — Local PostgreSQL setup

We are using **your machine's PostgreSQL**, not Prisma's hosted database.

### Install & create database

- [ ] Install PostgreSQL 15+ locally (or use existing install)
- [ ] Open pgAdmin or `psql` and create the database:

```sql
CREATE DATABASE asondia;
```

- [ ] Update `backend/.env` with your real local credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/asondia"
```

- [ ] Confirm connection works:

```bash
cd backend
pnpm db:migrate    # applies prisma/migrations to local DB
pnpm db:studio     # optional — browse tables in browser
```

### Verify tables exist

After migrate, you should see these tables in `asondia`:

- [ ] `User`
- [ ] `Bus`
- [ ] `Trip`
- [ ] `Reservation`
- [ ] `LocationHistory`

### Ignore Prisma Compute DB for now

- [ ] Keep using **local** `DATABASE_URL` in `.env`
- [ ] Do **not** point `.env` at `db.prisma.io` or `pooled.db.prisma.io`
- [ ] Prisma Compute deploy can wait until local dev is stable

---

## Phase 1 — Backend verification (local)

Run the API before building the Expo app.

### Start server

```bash
cd backend
pnpm dev          # nodemon — use this daily
# or
pnpm start        # builds + runs production mode
```

- [ ] `GET http://localhost:3000/health` returns `{ success: true }`
- [ ] Morgan logs appear in terminal for each request

### Auth

- [ ] `POST /api/auth/register` — create a **CONDUCTOR** user
- [ ] `POST /api/auth/register` — create a **PASSENGER** user
- [ ] `POST /api/auth/login` — returns JWT token
- [ ] `GET /api/auth/me` — works with `Authorization: Bearer <token>`

### Buses & trips (seed manually or via API)

- [ ] Register at least one bus (`POST /api/buses` — needs ADMIN, or insert via Prisma Studio)
- [ ] Conductor logs in and calls `POST /api/trips/start`:

```json
{
  "busId": "<bus-id>",
  "routeStart": "Allen",
  "routeEnd": "Catarman"
}
```

- [ ] `GET /api/trips/active` returns the active trip
- [ ] Conductor calls `POST /api/trips/:id/end` when done

### Socket.IO (use Postman, browser, or a test script)

Connect with JWT: `auth: { token: "<conductor-jwt>" }`

- [ ] Passenger/client emits `join_trip` with `{ tripId }`
- [ ] Conductor emits `update_location` with `{ tripId, lat, lng }`
- [ ] Client receives `bus_location_updated` event
- [ ] Coordinates appear in `GET /api/trips/active` after throttle (~20 sec)

**Phase 1 is done when:** mock GPS coordinates flow conductor → server → listener without errors.

---

## Phase 2 — Expo conductor app

The conductor phone is the GPS tracker. No hardware needed.

### Goal

```
Login → Start trip → Background GPS every 5–10 sec → Update seats → End trip
```

### Packages to add (`frontend/app`)

```bash
cd frontend/app
npx expo install expo-location expo-task-manager socket.io-client @react-native-async-storage/async-storage
```

| Package | Purpose |
|---------|---------|
| `expo-location` | Read phone GPS |
| `expo-task-manager` | Background location when trip is active |
| `socket.io-client` | Send `update_location` to backend |
| `@react-native-async-storage/async-storage` | Store JWT after login |

### App structure (recommended)

```text
frontend/app/
├── app/
│   ├── (auth)/
│   │   └── login.tsx              # Conductor login
│   ├── (conductor)/
│   │   ├── _layout.tsx            # Auth guard
│   │   ├── index.tsx              # Dashboard — active trip or start new
│   │   ├── start-trip.tsx         # Pick bus + route, start session
│   │   └── active-trip.tsx        # Live trip — GPS status, seats, end trip
│   └── _layout.tsx
├── services/
│   ├── api.ts                     # fetch wrapper + ApiResponse typing
│   ├── auth.ts                    # login, token storage
│   ├── trips.ts                   # start/end trip, update seats
│   └── socket.ts                  # Socket.IO connection
├── tasks/
│   └── locationTask.ts            # Background GPS task definition
├── constants/
│   └── config.ts                  # API_URL = http://YOUR_LAN_IP:3000
└── types/
    └── api.ts                     # Match backend ApiResponse shape
```

### Screen flow

#### 1. Login (`login.tsx`)

- [ ] Email + password form
- [ ] `POST /api/auth/login`
- [ ] Save `token` + `user` to AsyncStorage
- [ ] Redirect to conductor dashboard
- [ ] Show error if role is not `CONDUCTOR`

#### 2. Dashboard (`index.tsx`)

- [ ] If no active trip → show **Start Trip** button
- [ ] If active trip exists (check local storage or `GET /api/trips/active` filtered by conductor) → go to **Active Trip**

#### 3. Start trip (`start-trip.tsx`)

- [ ] Fetch buses: `GET /api/buses`
- [ ] Route defaults: Allen → Catarman (pilot scope)
- [ ] `POST /api/trips/start` with `busId`, `routeStart`, `routeEnd`
- [ ] Save `tripId` to AsyncStorage
- [ ] Navigate to active trip screen
- [ ] Request location permissions **before** starting

#### 4. Active trip (`active-trip.tsx`) — most important screen

- [ ] Show route, bus number, trip status
- [ ] Connect Socket.IO with stored JWT
- [ ] Start background location tracking
- [ ] Every 5–10 seconds emit `update_location`:

```ts
socket.emit("update_location", { tripId, lat, lng }, (ack) => {
  // show last sent time / error
});
```

- [ ] Seat counter UI: `+` / `-` buttons → `PUT /api/trips/:id/seats`
- [ ] **End Trip** button → stop background task → `POST /api/trips/:id/end` → clear storage → back to dashboard
- [ ] Show GPS status: permission granted, accuracy, last ping time

### Background location (Android-critical)

Android kills background apps aggressively. Plan for this early.

#### Permissions (`app.json` / `app.config.ts`)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Asondia needs your location to share the bus position with passengers.",
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ]
    ]
  }
}
```

#### Background task pattern

```ts
// tasks/locationTask.ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

export const LOCATION_TASK = "ASONDIA_CONDUCTOR_LOCATION";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  // emit via socket or queue for socket service
});
```

#### Start tracking when trip goes active

```ts
await Location.startLocationUpdatesAsync(LOCATION_TASK, {
  accuracy: Location.Accuracy.Balanced,   // saves battery vs BestForNavigation
  timeInterval: 8000,                      // ~8 sec
  distanceInterval: 20,                    // or every 20 meters
  foregroundService: {
    notificationTitle: "Asondia — Trip active",
    notificationBody: "Sharing bus location with passengers",
  },
  showsBackgroundLocationIndicator: true,
});
```

#### Stop when trip ends

```ts
await Location.stopLocationUpdatesAsync(LOCATION_TASK);
socket.disconnect();
```

### API base URL (physical device testing)

`localhost` does **not** work on a real phone. Use your PC's LAN IP:

```ts
// constants/config.ts
export const API_URL = "http://192.168.1.XXX:3000";
```

- [ ] Backend `CORS_ORIGIN=*` (already set)
- [ ] Phone and PC on same Wi‑Fi
- [ ] Windows firewall allows port 3000

### Conductor app checklist

- [ ] Install packages
- [ ] Create `services/api.ts` reusing backend `ApiResponse` shape
- [ ] Login screen + token storage
- [ ] Start trip screen
- [ ] Active trip screen with socket connection
- [ ] Foreground + background location permissions
- [ ] Background location task sending GPS every 5–10 sec
- [ ] Seat update UI
- [ ] End trip cleans up task + socket
- [ ] Test on **real Android phone** (not just emulator)
- [ ] Battery test: 30+ min active trip, check drain is acceptable

**Phase 2 is done when:** conductor starts trip on phone, walks/drives, and a second client (Postman or passenger prototype) sees `bus_location_updated` moving.

---

## Phase 3 — Expo passenger app (after conductor works)

- [ ] Map screen (react-native-maps or Mapbox)
- [ ] `GET /api/trips/active` — show buses on map
- [ ] Socket `join_trip` + listen for `bus_location_updated`
- [ ] Move marker when coordinates update
- [ ] Show available seats from trip data
- [ ] Simple ETA (distance ÷ avg speed) — Sprint 3

---

## Phase 4 — Kevin doc modules (research scope)

From `KEVIN-REVISED-REAL-1.docx`:

| # | Module | Checklist |
|---|--------|-----------|
| 1.1 | Real-time GPS tracking | Phase 2 + 3 |
| 1.2 | Passenger seat tracking | Conductor seat UI + passenger display |
| 1.3 | ETA prediction | Distance-based ETA on map |
| 1.4 | Seat reservation notifications | Reservation API + push/SMS later |
| 1.5 | Terminal dispatch dashboard | Admin web view (`frontend/web`) |

### Reservations (backend — not built yet)

- [ ] `POST /api/trips/:id/reservations`
- [ ] `GET /api/trips/:id/reservations` (conductor)
- [ ] `PATCH /api/reservations/:id` (confirm/cancel)

### Dispatch dashboard (`frontend/web`)

- [ ] Active trips table
- [ ] Map overview
- [ ] Bus list + status

---

## Phase 5 — Testing & pilot

### Technical testing

- [ ] API integration tests (auth, trips)
- [ ] Socket test script (automated GPS simulation)
- [ ] Conductor app on 2+ Android devices
- [ ] Passenger map with 2+ concurrent viewers
- [ ] Trip end/start edge cases (app killed, network drop, permission denied)
- [ ] DB: confirm `LocationHistory` not exploding (throttle working)

### Pilot (AMOEC MPC)

- [ ] Deploy backend somewhere passengers can reach (later — not Prisma DB yet)
- [ ] 1–2 conductors trained on the app
- [ ] Allen ↔ Catarman route only
- [ ] Survey instruments from Kevin's doc (usability + perceived commuter efficiency)
- [ ] Collect feedback from drivers/conductors

---

## Daily dev commands

```bash
# Terminal 1 — database (ensure PostgreSQL service is running)
# Terminal 2 — backend
cd backend && pnpm dev

# Terminal 3 — Expo conductor app
cd frontend/app && npx expo start
```

---

## What we are NOT using (for now)

- Prisma Postgres (`db.prisma.io`) — use local PostgreSQL
- Prisma Compute production deploy — defer until local loop works
- Polling for location — WebSockets only
- Saving every GPS point to DB — throttled writes only

---

## Suggested order (this week)

1. **Today:** Local PostgreSQL + `pnpm db:migrate` + test `/health` and auth
2. **Day 2:** Socket.IO test with Postman / script
3. **Day 3–4:** Expo conductor login + start trip
4. **Day 5–6:** Background GPS + socket emit on active trip
5. **Day 7:** End-to-end demo: phone moving → marker updates on test client

---

## Related docs

- [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md) — API design, models, sprints
- Kevin research doc: `KEVIN-REVISED-REAL-1.docx` — full thesis scope
