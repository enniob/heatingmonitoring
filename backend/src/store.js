const DAY_IN_MS = 1000 * 60 * 60 * 24;

const GAUGE_LEVELS = {
  FULL: 1,
  THREE_QUARTERS: 0.75,
  HALF: 0.5,
  QUARTER: 0.25,
  EMPTY: 0,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const db = require("./db");

const selectTankStmt = db.prepare(
  "SELECT id, label, capacity_gallons, current_gallons, created_at, updated_at FROM tank WHERE id = 1"
);
const upsertTankStmt = db.prepare(`
INSERT INTO tank (id, label, capacity_gallons, current_gallons, created_at, updated_at)
VALUES (1, @label, @capacity_gallons, @current_gallons, @created_at, @updated_at)
ON CONFLICT(id) DO UPDATE SET
  label = excluded.label,
  capacity_gallons = excluded.capacity_gallons,
  current_gallons = excluded.current_gallons,
  updated_at = excluded.updated_at
`);
const updateTankGallonsStmt = db.prepare(
  "UPDATE tank SET current_gallons = @current_gallons, updated_at = @updated_at WHERE id = 1"
);
const deleteTankStmt = db.prepare("DELETE FROM tank");

const selectUsageEntriesStmt = db.prepare(
  "SELECT id, gallons, recorded_at FROM usage_entries ORDER BY datetime(recorded_at) DESC"
);
const insertUsageEntryStmt = db.prepare(
  "INSERT INTO usage_entries (gallons, recorded_at) VALUES (@gallons, @recorded_at)"
);
const deleteUsageEntriesStmt = db.prepare("DELETE FROM usage_entries");

const selectFillEventsStmt = db.prepare(
  "SELECT id, gallons_added, recorded_at, total_cost, price_per_gallon FROM fill_events ORDER BY datetime(recorded_at) DESC"
);
const insertFillEventStmt = db.prepare(
  `INSERT INTO fill_events (gallons_added, recorded_at, total_cost, price_per_gallon)
   VALUES (@gallons_added, @recorded_at, @total_cost, @price_per_gallon)`
);
const deleteFillEventsStmt = db.prepare("DELETE FROM fill_events");

const selectGaugeSnapshotsStmt = db.prepare(
  `SELECT id, level, ratio, recorded_at, image_data, estimated_gallons, source, confidence
   FROM gauge_snapshots
   ORDER BY datetime(recorded_at) DESC`
);
const insertGaugeSnapshotStmt = db.prepare(
  `INSERT INTO gauge_snapshots (level, ratio, recorded_at, image_data, estimated_gallons, source, confidence)
   VALUES (@level, @ratio, @recorded_at, @image_data, @estimated_gallons, @source, @confidence)`
);
const deleteGaugeSnapshotsStmt = db.prepare("DELETE FROM gauge_snapshots");

const snapshotState = () => {
  const tank = getTank();
  const usageEntries = getUsageEntries();
  const fillEvents = getFillEvents();
  const gaugeSnapshots = getGaugeSnapshots();

  return {
    tank,
    usageEntries,
    fillEvents,
    gaugeSnapshots,
    stats: calculateStats(tank, usageEntries, fillEvents, gaugeSnapshots),
  };
};

const ensureTankConfigured = () => {
  const tank = getTank();
  if (!tank) {
    const error = new Error("Tank must be configured first");
    error.statusCode = 409;
    throw error;
  }
  return tank;
};

const setTank = ({ capacityGallons, label, startingGallons }) => {
  const existing = getTank();
  const timestamp = new Date().toISOString();
  const resolvedLabel = label?.trim() || "Main Tank";
  const currentGallons = Math.min(
    typeof startingGallons === "number"
      ? startingGallons
      : existing?.currentGallons ?? capacityGallons,
    capacityGallons
  );

  upsertTankStmt.run({
    label: resolvedLabel,
    capacity_gallons: capacityGallons,
    current_gallons: currentGallons,
    created_at: existing?.createdAt ?? timestamp,
    updated_at: timestamp,
  });

  return snapshotState();
};

const addUsageEntry = ({ gallons, recordedAt }) => {
  const runUsageTx = db.transaction(() => {
    const tank = ensureTankConfigured();
    if (gallons > tank.currentGallons) {
      const error = new Error("Usage exceeds remaining gallons");
      error.statusCode = 400;
      throw error;
    }

    const newLevel = parseFloat(
      (tank.currentGallons - gallons).toFixed(2)
    );
    insertUsageEntryStmt.run({
      gallons,
      recorded_at: recordedAt,
    });
    updateTankGallonsStmt.run({
      current_gallons: newLevel,
      updated_at: recordedAt,
    });
  });

  runUsageTx();
  return snapshotState();
};

const addFillEvent = ({
  gallonsAdded,
  recordedAt,
  totalCost,
  pricePerGallon,
}) => {
  const runFillTx = db.transaction(() => {
    const tank = ensureTankConfigured();
    const resolvedPrice = resolvePrice(pricePerGallon, totalCost, gallonsAdded);
    const resolvedTotal =
      typeof totalCost === "number"
        ? totalCost
        : parseFloat((resolvedPrice * gallonsAdded).toFixed(2));

    const newLevel = Math.min(
      parseFloat((tank.currentGallons + gallonsAdded).toFixed(2)),
      tank.capacityGallons
    );

    insertFillEventStmt.run({
      gallons_added: gallonsAdded,
      recorded_at: recordedAt,
      total_cost: resolvedTotal,
      price_per_gallon: resolvedPrice,
    });
    updateTankGallonsStmt.run({
      current_gallons: newLevel,
      updated_at: recordedAt,
    });
  });

  runFillTx();
  return snapshotState();
};

const addGaugeSnapshot = ({
  level,
  recordedAt,
  imageData,
  ratio,
  source,
  confidence,
}) => {
  const runGaugeTx = db.transaction(() => {
    const tank = ensureTankConfigured();
    const resolvedRatio =
      typeof ratio === "number" ? clamp(ratio, 0, 1) : resolveRatio(level);
    const resolvedLevel = level ?? levelFromRatio(resolvedRatio);
    const estimatedGallons = estimateGallonsFromGauge(
      tank.capacityGallons,
      resolvedRatio
    );

    updateTankGallonsStmt.run({
      current_gallons: estimatedGallons,
      updated_at: recordedAt,
    });
    insertGaugeSnapshotStmt.run({
      level: resolvedLevel,
      ratio: resolvedRatio,
      recorded_at: recordedAt,
      image_data: imageData || null,
      estimated_gallons: estimatedGallons,
      source: source ?? (ratio ? "vision" : "manual"),
      confidence:
        typeof confidence === "number" ? clamp(confidence, 0, 1) : null,
    });
  });

  runGaugeTx();
  return snapshotState();
};

const resolveRatio = (level) => {
  const ratio = GAUGE_LEVELS[level];
  if (typeof ratio !== "number") {
    const error = new Error("Unsupported gauge level");
    error.statusCode = 400;
    throw error;
  }
  return ratio;
};

const resolvePrice = (pricePerGallon, totalCost, gallonsAdded) => {
  if (typeof pricePerGallon === "number") {
    return pricePerGallon;
  }
  if (typeof totalCost === "number") {
    return parseFloat((totalCost / gallonsAdded).toFixed(4));
  }
  const error = new Error(
    "Either pricePerGallon or totalCost must be provided"
  );
  error.statusCode = 400;
  throw error;
};

const resetState = () => {
  const runResetTx = db.transaction(() => {
    deleteGaugeSnapshotsStmt.run();
    deleteUsageEntriesStmt.run();
    deleteFillEventsStmt.run();
    deleteTankStmt.run();
  });
  runResetTx();
  return snapshotState();
};

const calculateStats = (tank, usageEntries, fillEvents, gaugeSnapshots) => {
  if (!tank) {
    return {
      totals: null,
      averages: null,
      forecast: null,
      lastFill: null,
      lastGauge: null,
    };
  }

  const usageTotal = usageEntries.reduce(
    (total, entry) => total + entry.gallons,
    0
  );
  const fillsTotal = fillEvents.reduce(
    (total, entry) => total + entry.gallonsAdded,
    0
  );
  const fillCostAverage =
    fillEvents.length > 0
      ? fillEvents.reduce((sum, entry) => sum + (entry.totalCost ?? 0), 0) /
        fillEvents.length
      : null;

  const averageDailyUsage = computeAverageDailyUsage(
    usageEntries,
    fillEvents,
    gaugeSnapshots
  );
  const daysRemaining =
    averageDailyUsage && averageDailyUsage > 0
      ? parseFloat((tank.currentGallons / averageDailyUsage).toFixed(1))
      : null;

  const nextFillDate =
    daysRemaining !== null
      ? new Date(Date.now() + daysRemaining * DAY_IN_MS).toISOString()
      : null;

  return {
    totals: {
      usageGallons: parseFloat(usageTotal.toFixed(2)),
      filledGallons: parseFloat(fillsTotal.toFixed(2)),
      currentGallons: parseFloat(tank.currentGallons.toFixed(2)),
      capacityGallons: tank.capacityGallons,
    },
    averages: {
      dailyUsage: averageDailyUsage,
      fillCost: fillCostAverage,
    },
    forecast: {
      daysUntilEmpty: daysRemaining,
      estimatedRunOutDate: nextFillDate,
    },
    lastFill: fillEvents[0] ?? null,
    lastGauge: gaugeSnapshots[0] ?? null,
  };
};

const computeAverageDailyUsage = (usageEntries, fillEvents, gaugeSnapshots) => {
  const segments = [];
  const addSegment = (gallons, start, end, minDays = 0) => {
    if (!gallons || gallons <= 0 || !start || !end) {
      return;
    }
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return;
    }
    const durationDays = (endMs - startMs) / DAY_IN_MS;
    if (durationDays <= minDays) {
      return;
    }
    segments.push({ gallons, days: durationDays });
  };

  const gaugeSorted = [...gaugeSnapshots].sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
  );
  for (let i = 1; i < gaugeSorted.length; i += 1) {
    const previous = gaugeSorted[i - 1];
    const current = gaugeSorted[i];
    const delta = (previous.estimatedGallons ?? 0) - (current.estimatedGallons ?? 0);
    if (delta > 0) {
      addSegment(delta, previous.recordedAt, current.recordedAt, 0);
    }
  }

  const fillSorted = [...fillEvents].sort(
    (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
  );
  for (let i = 1; i < fillSorted.length; i += 1) {
    const previous = fillSorted[i - 1];
    const current = fillSorted[i];
    addSegment(current.gallonsAdded, previous.recordedAt, current.recordedAt, 0);
  }

  if (segments.length === 0 && usageEntries.length > 0) {
    const manualSorted = [...usageEntries].sort(
      (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
    );
    const totalGallons = manualSorted.reduce(
      (sum, entry) => sum + entry.gallons,
      0
    );
    const first = new Date(manualSorted[0].recordedAt).getTime();
    const last = new Date(manualSorted[manualSorted.length - 1].recordedAt).getTime();
    const elapsedDays = Math.max(1, (last - first) / DAY_IN_MS);
    if (totalGallons > 0) {
      segments.push({ gallons: totalGallons, days: elapsedDays });
    }
  }

  if (segments.length === 0) {
    return null;
  }

  const totalGallons = segments.reduce((sum, segment) => sum + segment.gallons, 0);
  const totalDays = segments.reduce((sum, segment) => sum + segment.days, 0);
  if (!totalDays || totalDays <= 0) {
    return null;
  }

  return parseFloat((totalGallons / totalDays).toFixed(2));
};

const estimateGallonsFromGauge = (capacityGallons, ratio) =>
  parseFloat((capacityGallons * ratio).toFixed(2));

const levelFromRatio = (ratio) => {
  const entries = Object.entries(GAUGE_LEVELS);
  let closest = entries[0];
  let smallestDelta = Infinity;
  entries.forEach(([label, value]) => {
    const delta = Math.abs(value - ratio);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closest = [label, value];
    }
  });
  return closest[0];
};

const getTank = () => {
  const row = selectTankStmt.get();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    label: row.label,
    capacityGallons: row.capacity_gallons,
    currentGallons: row.current_gallons,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getUsageEntries = () =>
  selectUsageEntriesStmt.all().map((row) => ({
    id: row.id,
    gallons: row.gallons,
    recordedAt: row.recorded_at,
  }));

const getFillEvents = () =>
  selectFillEventsStmt.all().map((row) => ({
    id: row.id,
    gallonsAdded: row.gallons_added,
    recordedAt: row.recorded_at,
    totalCost: row.total_cost ?? null,
    pricePerGallon: row.price_per_gallon ?? null,
  }));

const getGaugeSnapshots = () =>
  selectGaugeSnapshotsStmt.all().map((row) => ({
    id: row.id,
    level: row.level,
    ratio: row.ratio,
    recordedAt: row.recorded_at,
    imageData: row.image_data,
    estimatedGallons: row.estimated_gallons,
    source: row.source,
    confidence: row.confidence,
  }));

module.exports = {
  snapshotState,
  setTank,
  addUsageEntry,
  addFillEvent,
  addGaugeSnapshot,
  resetState,
};
