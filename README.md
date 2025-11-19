# Heating Oil Usage Tracker

This monorepo contains a lightweight Node.js API and a React/Vite web client for tracking heating oil consumption, deliveries, gauge snapshots (with local OpenCV-based vision), and cost insights. Data is persisted locally in SQLite so the backend can be restarted without losing history, making it easy to iterate on the UX while keeping your data.

## Project layout

- `backend/` – Express API that manages tank information, fill events, usage history, and simple forecasting logic.
- `frontend/` – React dashboard that visualizes tank status, usage trends, and allows you to log usage or fill events.

## Getting started

### Backend API

```bash
cd backend
npm install           # already done in this repo but safe to rerun
npm run dev           # start API on http://localhost:4000 with hot reload
```

The API stores everything in `backend/data/oiltracker.sqlite` (auto-created). If you ever want to reset completely, either hit `DELETE /api/state` or delete that file. Because we use [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3), make sure your machine has the necessary toolchain to build native modules (Node 18-compatible).

Key endpoints:

| Method | Path         | Description                                 |
| ------ | ------------ | ------------------------------------------- |
| GET    | `/api/state` | Snapshot with tank info, history, forecasts |
| POST   | `/api/tank`  | Configure tank capacity/current gallons     |
| POST   | `/api/usage` | Log heating oil usage                       |
| POST   | `/api/fill`  | Log fill/delivery (cost + gallons)          |
| POST   | `/api/gauge` | Upload dial snapshot + reading/detection    |
| DELETE | `/api/state` | Reset in-memory data                        |

Forecasting is currently based on a rolling average of all usage entries; as more data is collected this can evolve into more advanced seasonal or weather-aware models.

Gauge snapshots accept either:

- A `level` value (`FULL`, `THREE_QUARTERS`, `HALF`, `QUARTER`, `EMPTY`) **or**
- A base64 encoded image with `autoDetect: true`, which runs a local OpenCV (WASM) pipeline using Canny + Hough transforms to estimate the needle angle/percentage – no cloud services required. The detector assumes a dial where “empty” is pointing down and “full” is pointing up; tweak `FULL_ANGLE`/`EMPTY_ANGLE` in `backend/src/cv/gaugeDetector.js` if your gauge is oriented differently.

Each snapshot automatically adjusts the tank's current gallons and records whether the reading was manual or auto-detected (plus the detection confidence) so forecasting stays accurate.

### Frontend webapp

```bash
cd frontend
npm install           # already done in this repo but safe to rerun
npm run dev           # launches Vite dev server on http://localhost:5173
```

The web UI proxies `/api` requests to the backend (see `vite.config.js`) so both apps must run simultaneously for full functionality.

### Production build

```bash
# build frontend assets
cd frontend
npm run build

# run API in production mode
cd ../backend
npm start
```

## Next steps

- Add backup/sync tooling so the SQLite file can be replicated to other devices or the cloud.
- Add authentication/multi-tank support.
- Capture weather data to improve usage predictions.
- Build charts to visualize consumption and spending trends over time.
- Allow calibrating the gauge angle ranges or training a more advanced model for complex dials.
