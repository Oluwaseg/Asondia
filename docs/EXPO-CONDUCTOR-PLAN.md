# Expo Conductor App Plan

> Conductor phone = GPS tracker. No extra hardware.  
> Backend: local Express at `http://<LAN-IP>:3000`  
> Database: local PostgreSQL (not Prisma Postgres)

---

## 1. What the conductor app does

| Action         | Backend call               | Real-time          |
| -------------- | -------------------------- | ------------------ |
| Log in         | `POST /api/auth/login`     | —                  |
| Start trip     | `POST /api/trips/start`    | —                  |
| Share location | Socket `update_location`   | Every 5–10 sec     |
| Update seats   | `PUT /api/trips/:id/seats` | On tap             |
| End trip       | `POST /api/trips/:id/end`  | Stops GPS + socket |

---

## 2. Architecture

```text
┌─────────────────────────────────────┐
│         Conductor Phone (Expo)       │
│  ┌─────────┐    ┌────────────────┐  │
│  │ Screens │───▶│ services/api   │──┼──▶ REST (auth, trips, seats)
│  └─────────┘    └────────────────┘  │
│       │         ┌────────────────┐  │
│       └────────▶│ services/socket│──┼──▶ Socket.IO (GPS stream)
│                 └────────────────┘  │
│  ┌──────────────────────────────┐   │
│  │ expo-location + task-manager│   │  Background GPS
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
                  │
                  ▼
         Express backend (local)
                  │
                  ▼
         PostgreSQL (local asondia DB)
```

---

## 3. Build order (do in this sequence)

### Step A — Project setup

1. Add packages (see CHECKLIST.md)
2. Create `constants/config.ts` with LAN IP
3. Create `services/api.ts` — shared fetch + `ApiResponse<T>` typing
4. Create `services/auth.ts` — login, logout, getToken

### Step B — Login

- Screen: email/password
- On success: store JWT in AsyncStorage
- Guard: only `role === "CONDUCTOR"` can proceed
- Redirect to dashboard

### Step C — Start trip

- Load buses from `GET /api/buses`
- Pre-fill route: Allen → Catarman
- Request location permission **before** start
- `POST /api/trips/start` → save `tripId` locally
- Navigate to active trip screen

### Step D — Socket + foreground GPS

- `services/socket.ts`: connect with `auth: { token }`
- On active trip mount: connect socket
- Use `Location.watchPositionAsync` first (foreground only) to prove the loop
- Emit `update_location` every 5–10 sec
- Show "Last sent: 3s ago" on UI

### Step E — Background GPS

- Define `LOCATION_TASK` in `tasks/locationTask.ts`
- Configure `app.config.ts` plugins for Android foreground service
- Switch from `watchPositionAsync` to `startLocationUpdatesAsync`
- Test with app minimized and screen off
- On end trip: `stopLocationUpdatesAsync` + `socket.disconnect()`

### Step F — Seats + end trip

- +/- buttons for `availableSeats`
- End trip button with confirmation
- Clear AsyncStorage tripId
- Return to dashboard

---

## 4. Key code patterns

### API service (match backend response)

```ts
// services/api.ts
const BASE = 'http://192.168.1.10:3000';

export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<{ success: boolean; message: string; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
}
```

### Socket connection

```ts
// services/socket.ts
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants/config';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function emitLocation(tripId: string, lat: number, lng: number) {
  socket?.emit('update_location', { tripId, lat, lng });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

### Active trip screen logic

```ts
// Pseudocode for active-trip.tsx
useEffect(() => {
  const token = await getToken();
  const tripId = await getActiveTripId();
  const s = connectSocket(token);

  // Phase 1: foreground watch (easier to debug)
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 8000,
      distanceInterval: 20,
    },
    (loc) => emitLocation(tripId, loc.coords.latitude, loc.coords.longitude)
  );

  return () => {
    sub.remove();
    disconnectSocket();
  };
}, []);
```

---

## 5. Permissions checklist

| Permission              | When to ask              | Why                                    |
| ----------------------- | ------------------------ | -------------------------------------- |
| Foreground location     | Before start trip        | Initial GPS                            |
| Background location     | After foreground granted | Tracking when app minimized            |
| Notifications (Android) | With foreground service  | Required for background on Android 13+ |

Ask in context — explain: _"Passengers need to see where the bus is."_

---

## 6. Testing plan (conductor app)

| Test           | Pass criteria                                  |
| -------------- | ---------------------------------------------- |
| Login          | JWT stored, wrong role blocked                 |
| Start trip     | Appears in `GET /api/trips/active`             |
| Foreground GPS | `bus_location_updated` received on test client |
| Background GPS | Still emits after minimizing app 5+ min        |
| Network drop   | Reconnect socket, resume emits                 |
| End trip       | GPS stops, trip status COMPLETED               |
| Battery        | < 10% drain per hour (Balanced accuracy)       |

Use a **second phone or laptop** running a simple Socket.IO listener or Postman to verify broadcasts.

---

## 7. Common pitfalls

| Problem                      | Fix                                                                    |
| ---------------------------- | ---------------------------------------------------------------------- |
| `localhost` on phone         | Use PC LAN IP in `config.ts`                                           |
| Socket won't connect         | Same Wi‑Fi, check firewall port 3000                                   |
| No background GPS on Android | Enable foreground service in `app.config.ts`                           |
| High battery drain           | `Accuracy.Balanced`, 8–10 sec interval, not every 1 sec                |
| Trip already active error    | Call end trip first, or handle 409 in UI                               |
| CORS errors from web only    | Native app doesn't use CORS — if testing in Expo web, set backend CORS |

---

## 8. After conductor app works

1. Build passenger map app (join_trip + marker)
2. Add ETA on passenger side
3. Add reservations
4. Build dispatch dashboard on `frontend/web`
5. Later: deploy backend + switch to hosted DB when ready for pilot

See [CHECKLIST.md](./CHECKLIST.md) for the full project tracker.
