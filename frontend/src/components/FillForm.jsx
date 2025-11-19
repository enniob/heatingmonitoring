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

const FillForm = ({ disabled, onSubmit }) => {
  const [gallonsAdded, setGallonsAdded] = useState("");
  const [pricePerGallon, setPricePerGallon] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [recordedAt, setRecordedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!gallonsAdded) return;
    onSubmit({
      gallonsAdded: Number(gallonsAdded),
      pricePerGallon: pricePerGallon ? Number(pricePerGallon) : undefined,
      totalCost: totalCost ? Number(totalCost) : undefined,
      recordedAt: new Date(recordedAt).toISOString(),
    });
    setGallonsAdded("");
    setTotalCost("");
    setPricePerGallon("");
  };

  return (
    <Card>
      <CardHeader
        title="Fill event"
        subheader="Track deliveries, price per gallon, and total spend."
      />
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          <TextField
            label="Gallons added"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            required
            value={gallonsAdded}
            onChange={(event) => setGallonsAdded(event.target.value)}
            disabled={disabled}
          />
          <TextField
            label="Price per gallon"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={pricePerGallon}
            onChange={(event) => setPricePerGallon(event.target.value)}
            disabled={disabled}
          />
          <TextField
            label="Total cost"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={totalCost}
            onChange={(event) => setTotalCost(event.target.value)}
            disabled={disabled}
            helperText="Provide price per gallon or total cost (either works)."
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
            Add fill
          </Button>
          <Typography variant="caption" color="text.secondary">
            Deliveries automatically update the tank level and forecasts.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FillForm;
