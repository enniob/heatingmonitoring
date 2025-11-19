import Grid from "@mui/material/Grid";
import {
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";

const StatsPanel = ({ stats, lastFillSummary }) => {
  if (!stats?.totals) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Welcome!
          </Typography>
          <Typography color="text.secondary">
            Configure your tank to start tracking levels, deliveries, and smart
            refills.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const percentFull = stats.totals.capacityGallons
    ? Math.round(
        (stats.totals.currentGallons / stats.totals.capacityGallons) * 100
      )
    : null;
  const friendlyLevel =
    percentFull === null
      ? "Add a reading to show an estimate."
      : percentFull >= 75
      ? "Plenty of fuel left."
      : percentFull >= 40
      ? "Comfortable range."
      : percentFull >= 20
      ? "Plan a delivery soon."
      : "Refill recommended now.";

  const daysRemaining = stats.forecast?.daysUntilEmpty;
  const runOutText = daysRemaining
    ? `About ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`
    : "Need more usage data";

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Current level
            </Typography>
            <Typography variant="h3" gutterBottom>
              {percentFull === null ? "—" : `${percentFull}% full`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={percentFull ?? 0}
              sx={{ height: 10, borderRadius: 999, mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {friendlyLevel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({stats.totals.currentGallons} of {stats.totals.capacityGallons} gallons)
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Daily usage
            </Typography>
            <Typography variant="h4">
              {stats.averages?.dailyUsage ?? "—"} gal/day
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {stats.averages?.dailyUsage
                ? "We base estimates on your recent logs."
                : "Log a few days of usage for smarter forecasts."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lifetime usage: {stats.totals.usageGallons} gallons
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Days remaining
            </Typography>
            <Typography variant="h4">{daysRemaining ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.forecast?.estimatedRunOutDate
                ? `Run-out estimate ${formatDate(stats.forecast.estimatedRunOutDate)}`
                : runOutText}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Last fill
            </Typography>
            <Typography variant="body1">
              {lastFillSummary || "No deliveries yet"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg fill cost:{" "}
              {stats.averages?.fillCost
                ? `$${stats.averages.fillCost.toFixed(2)}`
                : "—"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Last gauge snapshot
            </Typography>
            {stats.lastGauge ? (
              <Stack spacing={0.5}>
                <Typography variant="h5">
                  {Math.round(stats.lastGauge.ratio * 100)}% full
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {`Taken ${formatDate(stats.lastGauge.recordedAt)} · ${stats.lastGauge
                    .estimatedGallons} gal`}
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">
                Upload a photo or enter a manual reading to see trends.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default StatsPanel;
