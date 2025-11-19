import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const GAUGE_LEVELS = [
  { value: "FULL", label: "Full (100%)" },
  { value: "THREE_QUARTERS", label: "3/4 (75%)" },
  { value: "HALF", label: "Half (50%)" },
  { value: "QUARTER", label: "1/4 (25%)" },
  { value: "EMPTY", label: "Empty (0%)" },
];

const GaugeForm = ({ disabled, onSubmit }) => {
  const [level, setLevel] = useState("FULL");
  const [recordedAt, setRecordedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState("");
  const [autoDetect, setAutoDetect] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageData("");
      setImagePreview("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() ?? "";
      setImageData(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      autoDetect,
      level: autoDetect ? undefined : level,
      recordedAt: new Date(recordedAt).toISOString(),
      imageData: imageData || undefined,
    });
    setImageData("");
    setImagePreview("");
  };

  const clearImage = () => {
    setImageData("");
    setImagePreview("");
  };

  return (
    <Card>
      <CardHeader
        title="Gauge snapshot"
        subheader="Pick the dial level or upload a photo for auto-detection."
      />
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoDetect}
                onChange={(event) => setAutoDetect(event.target.checked)}
                disabled={disabled}
              />
            }
            label="Auto-detect level from photo (optional)"
          />
          <TextField
            label="Level"
            select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            disabled={disabled || autoDetect}
          >
            {GAUGE_LEVELS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Snapshot taken"
            type="datetime-local"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
            disabled={disabled}
            InputLabelProps={{ shrink: true }}
          />
          <Box>
            <Button
              variant="outlined"
              component="label"
              disabled={disabled}
              fullWidth
            >
              {imagePreview ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Keep files under 4MB. Images stay on your device.
            </Typography>
          </Box>
          {imagePreview && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                component="img"
                src={imagePreview}
                alt="Gauge preview"
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 2,
                  objectFit: "cover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
              <Button variant="text" onClick={clearImage} disabled={disabled}>
                Remove photo
              </Button>
            </Stack>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={disabled || (autoDetect && !imageData)}
          >
            Save snapshot
          </Button>
          <Typography variant="caption" color="text.secondary">
            For the fastest workflow, use the quick buttons above and skip the
            photo upload. Only add a photo when you want the system to detect
            the exact percentage visually.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default GaugeForm;
