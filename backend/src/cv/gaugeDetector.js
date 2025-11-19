const sharp = require("sharp");
const cv = require("@techstark/opencv-js");

const FULL_ANGLE = Math.PI / 2; // pointing straight up
const EMPTY_ANGLE = -Math.PI / 2; // pointing straight down

const ORIENTATIONS = [
  { key: "vertical", full: FULL_ANGLE, empty: EMPTY_ANGLE },
  { key: "horizontal", full: 0, empty: Math.PI }, // right (full) to left (empty)
  {
    key: "diagonalRight",
    full: Math.PI / 4,
    empty: (-3 * Math.PI) / 4,
  },
  {
    key: "diagonalLeft",
    full: (3 * Math.PI) / 4,
    empty: -Math.PI / 4,
  },
];

const cvReady = new Promise((resolve) => {
  if (cv.getBuildInformation) {
    resolve();
    return;
  }

  cv.onRuntimeInitialized = () => {
    resolve();
  };
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const detectGaugeRatio = async (imageData) => {
  if (!imageData) {
    throw new Error("Image data required for detection");
  }

  await cvReady;
  const mat = await decodeImageToMat(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const lines = new cv.Mat();
  const circles = new cv.Mat();

  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 40, 120, 3, false);

    const dial = detectDialCircle(blurred, circles, mat.cols, mat.rows);

    const rho = 1;
    const theta = Math.PI / 180;
    const threshold = 60;
    const minLineLength = Math.min(mat.rows, mat.cols) * 0.4;
    const maxLineGap = 30;
    cv.HoughLinesP(edges, lines, rho, theta, threshold, minLineLength, maxLineGap);
    if (!lines.rows) {
      throw new Error("No gauge needle detected");
    }

    const centerX = dial?.x ?? mat.cols / 2;
    const centerY = dial?.y ?? mat.rows / 2;
    const radius = dial?.r ?? Math.min(mat.cols, mat.rows) / 2;

    const selected = selectNeedleLine(lines, centerX, centerY, radius);
    if (!selected) {
      throw new Error("Unable to find needle line");
    }

    const angle = computeAngleFromLine(selected, centerX, centerY);
    const ratio = mapAngleToRatio(angle);

    return {
      ratio,
      angle,
      confidence: lines.rows ? clamp(selected.score, 0, 1) : 0.5,
    };
  } finally {
    mat.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
    circles.delete();
  }
};

const decodeImageToMat = async (dataUrl) => {
  const buffer = toBuffer(dataUrl);
  const { data, info } = await sharp(buffer)
    .resize({ width: 600, height: 600, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mat = new cv.Mat(info.height, info.width, cv.CV_8UC4);
  mat.data.set(data);
  return mat;
};

const toBuffer = (dataUrl) => {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl;
  return Buffer.from(base64, "base64");
};

const selectNeedleLine = (lines, centerX, centerY, radius) => {
  let best = null;
  for (let i = 0; i < lines.rows; i += 1) {
    const [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
    const dist1 = Math.hypot(x1 - centerX, y1 - centerY);
    const dist2 = Math.hypot(x2 - centerX, y2 - centerY);
    const nearDist = Math.min(dist1, dist2);
    const farDist = Math.max(dist1, dist2);

    if (nearDist > radius * 0.55) {
      continue;
    }
    if (farDist < radius * 0.35) {
      continue;
    }

    const length = Math.hypot(x2 - x1, y2 - y1);
    const centeredScore = 1 - nearDist / Math.max(radius, 1);
    const score = length / Math.max(radius, 1) + centeredScore;
    if (!best || score > best.score) {
      best = { x1, y1, x2, y2, score };
    }
  }
  return best;
};

const computeAngleFromLine = (line, centerX, centerY) => {
  const dist1 = Math.hypot(line.x1 - centerX, line.y1 - centerY);
  const dist2 = Math.hypot(line.x2 - centerX, line.y2 - centerY);
  const target =
    dist1 > dist2
      ? { dx: line.x1 - centerX, dy: line.y1 - centerY }
      : { dx: line.x2 - centerX, dy: line.y2 - centerY };

  return Math.atan2(-target.dy, target.dx);
};

const mapAngleToRatio = (angle) => {
  const normalizedAngle = wrapAngle(angle);
  let best = null;

  ORIENTATIONS.forEach((orientation) => {
    const ratio = projectRatio(normalizedAngle, orientation);
    if (ratio === null) {
      return;
    }
    const span = getSpan(orientation.full, orientation.empty);
    const center = wrapAngle(orientation.empty + span / 2);
    const distance = angleDistance(normalizedAngle, center);
    if (!best || distance < best.distance) {
      best = { ratio, distance };
    }
  });

  if (best) {
    return clamp(best.ratio, 0, 1);
  }

  const fallbackSpan = getSpan(FULL_ANGLE, EMPTY_ANGLE);
  const fallbackOffset = wrapAngle(normalizedAngle - EMPTY_ANGLE);
  return clamp(fallbackOffset / fallbackSpan, 0, 1);
};

const projectRatio = (angle, orientation) => {
  const span = getSpan(orientation.full, orientation.empty);
  const offset = wrapAngle(angle - orientation.empty);
  if (offset > span) {
    return null;
  }
  return offset / span;
};

const getSpan = (full, empty) => {
  const span = wrapAngle(full - empty);
  return span === 0 ? Math.PI : span;
};

const wrapAngle = (angle) => {
  let result = angle % (Math.PI * 2);
  if (result < 0) {
    result += Math.PI * 2;
  }
  return result;
};

const angleDistance = (a, b) => {
  const diff = Math.abs(a - b);
  return Math.min(diff, Math.PI * 2 - diff);
};

const detectDialCircle = (gray, circles, width, height) => {
  const minRadius = Math.min(width, height) * 0.3;
  const maxRadius = Math.min(width, height) * 0.6;
  cv.HoughCircles(
    gray,
    circles,
    cv.HOUGH_GRADIENT,
    1,
    gray.rows / 8,
    120,
    30,
    minRadius,
    maxRadius
  );

  if (!circles.rows) {
    return null;
  }

  const data = circles.data32F;
  return {
    x: data[0],
    y: data[1],
    r: data[2],
  };
};

module.exports = {
  detectGaugeRatio,
};
