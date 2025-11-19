import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const UsageForm = ({ disabled, onSubmit }) => {
  const [gallons, setGallons] = useState("");
  const [recordedAt, setRecordedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!gallons) return;
    onSubmit({
      gallons: Number(gallons),
      recordedAt: new Date(recordedAt).toISOString(),
    });
    setGallons("");
  };

  return (
    <Card>
      <CardHeader
        title="Usage entry"
        subheader="Optional logs for when you know how much fuel was burned."
      />
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Gallons used"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={gallons}
            onChange={(event) => setGallons(event.target.value)}
            disabled={disabled}
            required
            helperText="Not sure? Skip this—gauge snapshots keep the tank estimate accurate."
          />
          <TextField
            label="Recorded"
            type="datetime-local"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
          <Button type="submit" variant="contained" disabled={disabled}>
            Add usage
          </Button>
          <Typography variant="caption" color="text.secondary">
            Use this when you have manual measurements from equipment or receipts.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default UsageForm;
