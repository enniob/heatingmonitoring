const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "oiltracker.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tank (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  label TEXT NOT NULL,
  capacity_gallons REAL NOT NULL,
  current_gallons REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallons REAL NOT NULL,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fill_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallons_added REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  total_cost REAL,
  price_per_gallon REAL
);

CREATE TABLE IF NOT EXISTS gauge_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  ratio REAL,
  recorded_at TEXT NOT NULL,
  image_data TEXT,
  estimated_gallons REAL NOT NULL,
  source TEXT,
  confidence REAL
);
`);

module.exports = db;
