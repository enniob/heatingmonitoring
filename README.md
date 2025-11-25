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

### Google Security JSON

If your project requires interaction with Google Cloud services (e.g., Google Cloud Vision API, Google Cloud Storage), you will need to obtain a Google Service Account Key in JSON format. Follow these steps:

1.  **Create a Google Cloud Project**: If you don't have one, create a new project in the Google Cloud Console.
2.  **Enable necessary APIs**: Ensure that the Google APIs your application needs (e.g., Cloud Vision API) are enabled for your project.
3.  **Create a Service Account**:
    *   Navigate to "IAM & Admin" > "Service accounts" in the Google Cloud Console.
    *   Click "CREATE SERVICE ACCOUNT".
    *   Provide a service account name and description.
4.  **Grant Permissions**:
    *   Grant the service account the necessary roles for your project (e.g., "Cloud Vision API User", "Storage Object Admin"). Be judicious with permissions, granting only what is required.
5.  **Create and Download Key**:
    *   After creating the service account, click on its email address.
    *   Go to the "KEYS" tab.
    *   Click "ADD KEY" > "Create new key".
    *   Select "JSON" as the key type and click "CREATE".
    *   The JSON key file will be downloaded to your computer.
6.  **Securely Store the Key**:
    *   Rename the downloaded JSON file (e.g., `service-account-key.json`).
    *   Place this file in a secure location within your project directory, typically outside of version control (e.g., `.gitignore` it). The backend code will need to be configured to locate this file, usually by setting the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of this JSON file.

    Example environment variable setting (for local development):
    `export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"`

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
