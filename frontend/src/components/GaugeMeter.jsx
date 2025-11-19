import {
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import WaterDropIcon from "@mui/icons-material/WaterDrop";

const LEVELS = [
  { key: "FULL", label: "Full", ratio: 1 },
  { key: "THREE_QUARTERS", label: "3/4", ratio: 0.75 },
  { key: "HALF", label: "1/2", ratio: 0.5 },
  { key: "QUARTER", label: "1/4", ratio: 0.25 },
  { key: "EMPTY", label: "Empty", ratio: 0 },
];

const ratioLookup = LEVELS.reduce((acc, level) => {
  acc[level.key] = level.ratio;
  return acc;
}, {});

const getStatus = (percent) => {
  if (percent === null) {
    return { label: "No reading yet", color: "default" };
  }
  if (percent >= 75) return { label: "Full", color: "success" };
  if (percent >= 45) return { label: "Comfortable", color: "primary" };
  if (percent >= 25) return { label: "Plan delivery", color: "warning" };
  return { label: "Refill soon", color: "error" };
};

const GaugeMeter = ({ tank, lastGauge, disabled }) => {
  if (!tank) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tank gauge
          </Typography>
          <Typography color="text.secondary">
            Add a tank to unlock simplified readings and automatic updates.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const ratio = lastGauge
    ? lastGauge.ratio ?? ratioLookup[lastGauge.level] ?? null
    : tank.currentGallons / tank.capacityGallons;
  const percent =
    ratio !== null ? Math.max(0, Math.min(1, ratio)) * 100 : null;
  const percentRounded = percent === null ? null : Math.round(percent);
  const status = getStatus(percentRounded);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" component="h2">
              Tank gauge
            </Typography>
            <Chip
              size="small"
              color={status.color}
              icon={<WaterDropIcon sx={{ fontSize: 16 }} />}
              label={status.label}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            We translate gauge readings into an easy-to-read status so you never
            need to think in raw gallons.
          </Typography>
          <Typography variant="h3" component="p">
            {percentRounded === null ? "—" : `${percentRounded}% full`}
          </Typography>
          <LinearProgress
            variant={percent === null ? "indeterminate" : "determinate"}
            value={percentRounded ?? 0}
            sx={{ height: 12, borderRadius: 999 }}
          />
          <Typography variant="body2" color="text.secondary">
            {tank.currentGallons} gal estimated out of {tank.capacityGallons} gal
            capacity.
          </Typography>

          {lastGauge ? (
            <>
              <Divider />
              <Typography variant="subtitle2">Latest snapshot</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(lastGauge.recordedAt)} · {lastGauge.estimatedGallons} gallons ·{" "}
                {formatSource(lastGauge.source)}
                {typeof lastGauge.confidence === "number"
                  ? ` (${Math.round(lastGauge.confidence * 100)}% confidence)`
                  : ""}
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary">
              No gauge snapshots yet. Add one to get automatic level tracking.
            </Typography>
          )}

          {disabled && (
            <Typography variant="caption" color="text.secondary">
              Snapshots automatically keep the tank level in sync with analytics.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatSource = (source) =>
  source === "vision"
    ? "Auto-detected"
    : source === "manual"
    ? "Manual entry"
    : "Unknown";

export default GaugeMeter;
