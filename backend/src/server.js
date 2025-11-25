require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { z } = require("zod");

const {
  snapshotState,
  setTank,
  addUsageEntry,
  addFillEvent,
  addGaugeSnapshot,
  resetState,
} = require("./store");
const { detectGaugeRatio } = require("./cv/gaugeDetector");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const numberField = z.coerce.number();

const tankSchema = z
  .object({
    capacityGallons: numberField.positive(),
    label: z.string().trim().min(1).optional(),
    startingGallons: numberField.nonnegative().optional(),
  })
  .refine(
    (payload) =>
      typeof payload.startingGallons !== "number" ||
      payload.startingGallons <= payload.capacityGallons,
    {
      message: "startingGallons cannot exceed capacity",
      path: ["startingGallons"],
    }
  );

const usageSchema = z.object({
  gallons: numberField.positive(),
  recordedAt: z.string().datetime().optional(),
});

const fillSchema = z
  .object({
    gallonsAdded: numberField.positive(),
    pricePerGallon: numberField.positive().optional(),
    totalCost: numberField.positive().optional(),
    recordedAt: z.string().datetime().optional(),
  })
  .refine(
    (payload) =>
      typeof payload.pricePerGallon === "number" ||
      typeof payload.totalCost === "number",
    {
      message: "Provide either pricePerGallon or totalCost",
      path: ["pricePerGallon"],
    }
  );

const gaugeSchema = z
  .object({
    level: z.enum(["FULL", "THREE_QUARTERS", "HALF", "QUARTER", "EMPTY"]).optional(),
    autoDetect: z.boolean().optional(),
    recordedAt: z.string().datetime().optional(),
    imageData: z
      .string()
      .max(5 * 1024 * 1024, "Image payload too large")
      .optional(),
  })
  .refine(
    (payload) =>
      Boolean(payload.level) ||
      Boolean(payload.autoDetect && payload.imageData),
    {
      message: "Provide a level or enable auto detection with an image",
      path: ["level"],
    }
  );

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/state", (_req, res) => {
  res.json(snapshotState());
});

app.post("/api/tank", (req, res, next) => {
  try {
    const payload = tankSchema.parse(req.body);
    const result = setTank({
      capacityGallons: payload.capacityGallons,
      label: payload.label,
      startingGallons: payload.startingGallons,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/usage", (req, res, next) => {
  try {
    const payload = usageSchema.parse(req.body);
    const result = addUsageEntry({
      gallons: payload.gallons,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/fill", (req, res, next) => {
  try {
    const payload = fillSchema.parse(req.body);
    const result = addFillEvent({
      gallonsAdded: payload.gallonsAdded,
      pricePerGallon: payload.pricePerGallon,
      totalCost: payload.totalCost,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/gauge", async (req, res, next) => {
  try {
    const payload = gaugeSchema.parse(req.body);
    let detection = null;
    if (payload.autoDetect && payload.imageData) {
      try {
        detection = await detectGaugeRatio(payload.imageData);
      } catch (error) {
        if (!payload.level) {
          error.statusCode = error.statusCode ?? 422;
          throw error;
        }
      }
    }

    const result = addGaugeSnapshot({
      level: payload.level,
      ratio: detection?.ratio,
      recordedAt: payload.recordedAt ?? new Date().toISOString(),
      imageData: payload.imageData,
      source: detection ? "vision" : "manual",
      confidence: detection?.confidence,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/state", (_req, res) => {
  res.json(resetState());
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || (err.name === "ZodError" ? 422 : 500);
  res.status(status).json({
    error: err.message,
    details: err.errors ?? null,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
