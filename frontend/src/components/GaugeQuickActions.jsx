import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
} from "@mui/material";

const QUICK_LEVELS = [
  { value: "FULL", label: "Full", helper: "Needle at the top" },
  { value: "THREE_QUARTERS", label: "3/4", helper: "Between full and half" },
  { value: "HALF", label: "Half", helper: "Needle straight across" },
  { value: "QUARTER", label: "1/4", helper: "Needle near the bottom" },
  { value: "EMPTY", label: "Empty", helper: "Needle resting on empty" },
];

const GaugeQuickActions = ({ disabled, onQuickSelect }) => (
  <Card>
    <CardHeader
      title="Quick gauge entry"
      subheader="Tap the level that matches your dial."
    />
    <CardContent>
      <Grid container spacing={1.5}>
        {QUICK_LEVELS.map((level) => (
          <Grid key={level.value} item xs={6} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => onQuickSelect(level.value)}
              disabled={disabled}
            >
              {level.label}
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              align="center"
            >
              {level.helper}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </CardContent>
  </Card>
);

export default GaugeQuickActions;
