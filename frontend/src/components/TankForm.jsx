import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const TankForm = ({ tank, disabled, onSubmit, layout = "card" }) => {
  const [capacityGallons, setCapacityGallons] = useState("");
  const [label, setLabel] = useState("");
  const [startingGallons, setStartingGallons] = useState("");

  useEffect(() => {
    if (tank) {
      setCapacityGallons(String(tank.capacityGallons ?? ""));
      setLabel(tank.label ?? "");
      setStartingGallons(String(tank.currentGallons ?? ""));
    }
  }, [tank]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!capacityGallons) return;
    onSubmit({
      capacityGallons: Number(capacityGallons),
      label: label || undefined,
      startingGallons: startingGallons
        ? Number(startingGallons)
        : undefined,
    });
  };

  const formFields = (
    <Stack component="form" spacing={2} onSubmit={handleSubmit}>
      <TextField
        label="Tank name"
        placeholder="Basement tank"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        disabled={disabled}
      />
      <TextField
        label="Capacity (gallons)"
        type="number"
        inputProps={{ min: 1 }}
        required
        value={capacityGallons}
        onChange={(event) => setCapacityGallons(event.target.value)}
        disabled={disabled}
      />
      <TextField
        label="Current gallons"
        helperText="Optional: helps the gauge estimate quickly."
        type="number"
        inputProps={{ min: 0 }}
        value={startingGallons}
        onChange={(event) => setStartingGallons(event.target.value)}
        disabled={disabled}
      />
      <Box>
        <Button type="submit" variant="contained" disabled={disabled}>
          {tank ? "Update tank" : "Save tank"}
        </Button>
        {!tank && (
          <Typography variant="caption" color="text.secondary" display="block">
            Once saved, you’ll see friendly fuel summaries.
          </Typography>
        )}
      </Box>
    </Stack>
  );

  if (layout === "column") {
    return (
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          maxWidth: 520,
          width: "100%",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Tank setup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define your tank name, capacity, and current level.
        </Typography>
        {formFields}
      </Box>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Tank setup"
        subheader="Define your tank name, capacity, and current level."
        action={
          tank ? (
            <Chip
              color="primary"
              variant="outlined"
              label={`${tank.currentGallons} / ${tank.capacityGallons} gal`}
            />
          ) : null
        }
      />
      <CardContent>{formFields}</CardContent>
    </Card>
  );
};

export default TankForm;
